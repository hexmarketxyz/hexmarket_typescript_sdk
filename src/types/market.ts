export type MarketStatus = 'active' | 'paused' | 'resolution_proposed' | 'resolved' | 'voided' | 'unlisted';
export type OutcomeResult = 'unresolved' | 'yes' | 'no' | 'void';
export type MarketType = 'binary' | 'categorical';

/** An outcome (e.g. Yes, No, Win, Lose, Draw) within a market. */
export interface Outcome {
  id: string;
  marketId: string;
  label: string;
  labelTranslations?: Record<string, string>;
  sortOrder: number;
  outcomeIndex: number;
  mint?: string;
  price?: number;
  question: string;
  questionTranslations?: Record<string, string>;
  description?: string;
  category?: string;
  imageUrl?: string;
  status: MarketStatus;
  outcome?: OutcomeResult;
  volume24h: number;
  totalVolume: number;
  liquidity: number;
  closeTime?: string;
  resolutionTime?: string;
  createdAt: string;
  resolvedAt?: string;
}

/** A market that groups N outcomes under an event. */
export interface Market {
  id: string;
  eventId: string;
  title: string;
  titleTranslations?: Record<string, string>;
  description?: string;
  imageUrl?: string;
  iconUrl?: string;
  marketType: MarketType;
  status: string;
  startTime?: string;
  closeTime?: string;
  resolutionTime?: string;
  createdAt: string;
  resolvedAt?: string;
  sortOrder: number;
  // On-chain fields
  onchainMarketId?: number;
  pubkey?: string;
  vaultPubkey?: string;
  collateralMint?: string;
  numOutcomes: number;
  priceIncrement: number;
}

export interface Tag {
  id: string;
  slug: string;
  label: string;
  labelTranslations?: Record<string, string>;
  parentId?: string;
  sortOrder: number;
  iconUrl?: string;
  createdAt: string;
}

export interface TagDetail {
  id: string;
  slug: string;
  label: string;
  labelTranslations?: Record<string, string>;
  parentId?: string;
  sortOrder: number;
  iconUrl?: string;
  createdAt: string;
  children: Tag[];
}

export interface HexEvent {
  id: string;
  slug: string;
  title: string;
  titleTranslations?: Record<string, string>;
  description?: string;
  imageUrl?: string;
  iconUrl?: string;
  status: string;
  closeTime: string;
  resolutionTime?: string;
  createdAt: string;
  resolvedAt?: string;
  isArchived: boolean;
}

/** A market with its nested outcomes. */
export interface MarketDetail extends Market {
  outcomes: Outcome[];
  /** Market probability (first outcome's merged best ask), 0-1 */
  probability?: number;
  /** Merged best-ask per outcome: { outcomeId: price } */
  bestAsks?: Record<string, number>;
}

export interface EventListItem extends HexEvent {
  markets: MarketDetail[];
  tags: Tag[];
}

export interface EventDetail extends HexEvent {
  markets: MarketDetail[];
  tags: Tag[];
}

export interface HexComment {
  id: string;
  eventId?: string;
  outcomeId?: string;
  userPubkey: string;
  parentId?: string;
  body: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceSnapshot {
  id: string;
  outcomeId: string;
  price: number;
  volume: number;
  capturedAt: string;
}

// ---------------------------------------------------------------------------
// Admin types
// ---------------------------------------------------------------------------

/** Flat tag row (used in admin responses) — alias for Tag */
export type TagRow = Tag;

export interface ProtocolState {
  pda: string;
  authority: string;
  operator: string;
  feeRecipient: string;
  feeBps: number;
  marketCount: number;
  paused: boolean;
}

export interface OnChainMarketState {
  marketId: number;
  pda: string;
  authority: string;
  questionHash: string;
  status: string;
  winningOutcome: number;
  numOutcomes: number;
  outcomeMints: string[];
  collateralMint: string;
  collateralVault: string;
  totalCollateral: number;
  createdAt: number;
  closeTime: number;
  resolutionTime: number;
  feeBps: number;
  bump: number;
  vaultBump: number;
}

export interface TxResult {
  signature: string;
}
