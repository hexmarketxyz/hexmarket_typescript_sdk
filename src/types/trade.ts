import { Side } from './order';

export type SettlementStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface Trade {
  id: string;
  outcomeId: string;
  makerOrderId: string;
  takerOrderId: string;
  makerPubkey: string;
  takerPubkey: string;
  side: Side;
  price: number;
  quantity: number;
  makerFee: number;
  takerFee: number;
  settlementStatus: SettlementStatus;
  settlementTx?: string;
  createdAt: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBookSnapshot {
  outcomeId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  timestamp: string;
}

// --- Cross-outcome matching types ---

export interface CrossOutcomeLeg {
  outcomeId: string;
  orderId: string;
  userPubkey: string;
  price: number;
  priceTick: number;
}

export interface CrossOutcomeMatch {
  id: string;
  marketId: string;
  legs: CrossOutcomeLeg[];
  quantity: number;
  totalPriceTicks: number;
  surplusTicks: number;
  settlementStatus: SettlementStatus;
  settlementTx?: string;
  timestamp: string;
}

// --- Merged orderbook types ---

export type LiquiditySource = 'direct' | 'cross_outcome' | 'mixed';

export interface MergedOrderBookLevel {
  price: number;
  quantity: number;
  source: LiquiditySource;
}

export interface MergedOrderBookSnapshot {
  outcomeId: string;
  bids: OrderBookLevel[];
  asks: MergedOrderBookLevel[];
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
}
