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
  /** Session key public key. When present, signature is verified against the session key. */
  sessionPubkey?: string;
}

export interface PlaceOrderResponse {
  orderId: string;
  status: 'accepted';
  clientOrderId?: string;
}

export interface CancelOrderResponse {
  order_id: string;
  client_order_id?: string;
  status: 'cancelled';
}

export interface CancelAllOrdersResponse {
  cancelled_count: number;
  status: 'cancelled';
  orders: Array<{ order_id: string; client_order_id?: string }>;
}

export interface BatchPlaceResult {
  index: number;
  order_id?: string;
  client_order_id?: string;
  status: 'accepted' | 'rejected';
  error?: string;
}

export interface BatchCancelResult {
  order_id: string;
  client_order_id?: string;
  status: 'cancelled' | 'failed';
  error?: string;
}

export interface BatchUpdateResponse {
  cancel_results: BatchCancelResult[];
  place_results: BatchPlaceResult[];
}
