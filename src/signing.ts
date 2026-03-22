import type { PlaceOrderParams } from './types/order';
import bs58 from 'bs58';

/**
 * Build the canonical byte message for an order that the wallet signs.
 * Must match server-side verification format exactly.
 */
export function buildOrderMessage(
  params: Omit<PlaceOrderParams, 'signature'>,
): Uint8Array {
  const message = [
    'hexmarket:place_order',
    `outcome_id:${params.outcomeId}`,
    `side:${params.side}`,
    `price:${params.price}`,
    `quantity:${params.quantity}`,
    `nonce:${params.nonce}`,
  ].join('\n');

  return new TextEncoder().encode(message);
}

/**
 * Generate a nonce for replay protection.
 * Uses timestamp in ms * 1000 + random suffix for uniqueness.
 */
export function generateNonce(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

/**
 * Auth message prefix. Must match server-side AUTH_MESSAGE_PREFIX.
 */
const AUTH_MESSAGE_PREFIX = 'hexmarket:auth\n';

/**
 * Build the auth message bytes for a given timestamp.
 * Format: `hexmarket:auth\n{timestamp}`
 */
export function buildAuthMessage(timestamp: number): Uint8Array {
  return new TextEncoder().encode(`${AUTH_MESSAGE_PREFIX}${timestamp}`);
}

/**
 * Build a signed auth token.
 * Format: `{pubkey}.{timestamp}.{signature}`
 *
 * @param pubkey - Base58 Solana public key
 * @param signMessage - Wallet's signMessage function (returns signature bytes)
 * @returns The auth token string
 */
export async function buildAuthToken(
  pubkey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = buildAuthMessage(timestamp);
  const signatureBytes = await signMessage(message);
  const signatureB58 = bs58.encode(signatureBytes);
  return `${pubkey}.${timestamp}.${signatureB58}`;
}

/**
 * Parse the timestamp from an auth token without validating.
 * Returns null if the format is invalid.
 */
export function parseAuthTokenTimestamp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const ts = parseInt(parts[1]!, 10);
  return isNaN(ts) ? null : ts;
}

// ---------------------------------------------------------------------------
// Session Key Delegation
// ---------------------------------------------------------------------------

const DELEGATION_MESSAGE_PREFIX = 'hexmarket:delegate_session\n';

/**
 * Build the delegation message that the wallet signs to authorize a session key.
 * Format: `hexmarket:delegate_session\nsession_key:{sessionPubkey}\nexpires:{expiresAt}`
 */
export function buildDelegationMessage(sessionPubkey: string, expiresAt: number): Uint8Array {
  return new TextEncoder().encode(
    `${DELEGATION_MESSAGE_PREFIX}session_key:${sessionPubkey}\nexpires:${expiresAt}`,
  );
}

/**
 * Build a session-key-signed auth token.
 * Format: `{userPubkey}.{timestamp}.{signature}.{sessionPubkey}`
 *
 * @param userPubkey - The user's wallet public key (base58)
 * @param sessionPubkey - The session key's public key (base58)
 * @param signMessage - Session key's signMessage (signs with session private key)
 */
export async function buildSessionAuthToken(
  userPubkey: string,
  sessionPubkey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = buildAuthMessage(timestamp);
  const signatureBytes = await signMessage(message);
  const signatureB58 = bs58.encode(signatureBytes);
  return `${userPubkey}.${timestamp}.${signatureB58}.${sessionPubkey}`;
}

// ---------------------------------------------------------------------------
// L2 API Key Authentication
// ---------------------------------------------------------------------------

const API_KEY_MESSAGE_PREFIX = 'hexmarket:create_api_key\n';

/**
 * Build the message for API key creation/derivation.
 * The wallet signs this to prove ownership and derive deterministic credentials.
 * Format: `hexmarket:create_api_key\n{nonce}`
 */
export function buildApiKeyMessage(nonce: number): Uint8Array {
  return new TextEncoder().encode(`${API_KEY_MESSAGE_PREFIX}${nonce}`);
}

/** Stored API credentials from POST /auth/api-key */
export interface ApiCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

/**
 * Base64url encode a Uint8Array (RFC 4648 §5, no padding).
 */
function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url decode a string to Uint8Array (RFC 4648 §5).
 */
function base64urlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Build the HMAC-SHA256 payload for L2 request signing.
 * Format: `{timestamp}{METHOD}{path}[{body}]`
 */
export function buildL2SigningPayload(
  timestamp: number,
  method: string,
  path: string,
  body?: string,
): string {
  let payload = `${timestamp}${method}${path}`;
  if (body) payload += body;
  return payload;
}

/**
 * Sign an L2 request payload using HMAC-SHA256.
 * Uses the Web Crypto API (works in browsers and Node 18+).
 *
 * @param secretB64 - base64url-encoded HMAC secret from API key creation
 * @param payload - the signing payload string
 * @returns base64url-encoded HMAC signature
 */
export async function signL2(secretB64: string, payload: string): Promise<string> {
  const secretBytes = base64urlDecode(secretB64);
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const data = new TextEncoder().encode(payload);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return base64urlEncode(new Uint8Array(sig));
}

/**
 * Build L2 authentication headers for an API request.
 *
 * @param creds - API credentials (apiKey, secret, passphrase)
 * @param pubkey - Solana pubkey (base58)
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path including query string (e.g. /api/v1/orders?user=...)
 * @param body - Request body string (for POST/PUT/DELETE), omit for GET
 * @returns Headers object with HEX_* L2 auth headers
 */
export async function buildL2Headers(
  creds: ApiCredentials,
  pubkey: string,
  method: string,
  path: string,
  body?: string,
): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = buildL2SigningPayload(timestamp, method, path, body);
  const signature = await signL2(creds.secret, payload);

  return {
    'HEX-ADDRESS': pubkey,
    'HEX-API-KEY': creds.apiKey,
    'HEX-PASSPHRASE': creds.passphrase,
    'HEX-TIMESTAMP': String(timestamp),
    'HEX-SIGNATURE': signature,
  };
}
