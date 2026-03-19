export interface TransactionResponse {
  transaction: string; // base64-encoded partially-signed transaction
}

export interface SubmitResponse {
  signature: string;
}

export interface VaultBalanceResponse {
  user: string;
  vaultPubkey: string;
  usdcBalance: number;
}

export class VaultApi {
  private l2Headers: Record<string, string> | null = null;

  constructor(private baseUrl: string) {}

  setL2Headers(headers: Record<string, string> | null): void {
    this.l2Headers = headers;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.l2Headers) {
      Object.assign(h, this.l2Headers);
    }
    return h;
  }

  /** Build a create_vault transaction (operator-signed, user co-signs). */
  async createVault(): Promise<TransactionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/vault/create`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to create vault: ${text}`);
    }
    return res.json() as Promise<TransactionResponse>;
  }

  /** Build a deposit transaction (operator-signed, user co-signs). */
  async deposit(amount: number): Promise<TransactionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/vault/deposit`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to build deposit tx: ${text}`);
    }
    return res.json() as Promise<TransactionResponse>;
  }

  /** Build a withdraw transaction (operator-signed, user co-signs). */
  async withdraw(amount: number): Promise<TransactionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/vault/withdraw`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to build withdraw tx: ${text}`);
    }
    return res.json() as Promise<TransactionResponse>;
  }

  /** Submit a fully-signed transaction to Solana. */
  async submit(transaction: string): Promise<SubmitResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/vault/submit`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ transaction }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Transaction submission failed: ${text}`);
    }
    return res.json() as Promise<SubmitResponse>;
  }

  /** Get on-chain vault USDC balance. */
  async getBalance(userPubkey: string): Promise<VaultBalanceResponse> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/vault/balance?user=${userPubkey}`,
    );
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to get vault balance: ${text}`);
    }
    return res.json() as Promise<VaultBalanceResponse>;
  }
}
