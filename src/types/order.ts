export type Side = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type TimeInForce = 'gtc' | 'ioc' | 'fok';
export type OrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'expired' | 'rejected';

export interface Order {
  id: string;
  outcomeId: string;
  userPubkey: string;
  side: Side;
  orderType: OrderType;
  timeInForce: TimeInForce;
  price: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  nonce: number;
  signature: string;
  createdAt: string;
  updatedAt: string;
  clientOrderId?: string;
}

export interface PlaceOrderParams {
  outcomeId: string;
  side: Side;
  orderType: OrderType;
  timeInForce: TimeInForce;
  price: number;
  quantity: number;
  nonce: number;
  signature: string;
  clientOrderId?: string;
}

export interface PlaceOrderResponse {
  orderId: string;
  status: 'accepted';
  clientOrderId?: string;
}
