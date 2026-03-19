import { Order, PlaceOrderParams, PlaceOrderResponse } from '../types/order';

export class OrdersApi {
  private l2Headers: Record<string, string> | null = null;

  constructor(private baseUrl: string) {}

  setL2Headers(headers: Record<string, string> | null): void {
    this.l2Headers = headers;
  }

  private headers(withAuth = false): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (withAuth && this.l2Headers) {
      Object.assign(h, this.l2Headers);
    }
    return h;
  }

  async place(params: PlaceOrderParams): Promise<PlaceOrderResponse> {
    // Map camelCase TS fields to snake_case for the Rust API
    const body = {
      outcome_id: params.outcomeId,
      side: params.side,
      order_type: params.orderType,
      time_in_force: params.timeInForce,
      price: params.price,
      quantity: params.quantity,
      nonce: params.nonce,
      signature: params.signature,
    };

    const res = await fetch(`${this.baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to place order: ${text}`);
    }
    return res.json() as Promise<PlaceOrderResponse>;
  }

  async cancel(orderId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}`, {
      method: 'DELETE',
      headers: this.headers(true),
    });
    if (!res.ok) throw new Error(`Failed to cancel order: ${res.statusText}`);
  }

  async getOpen(userPubkey: string, outcomeId?: string): Promise<Order[]> {
    const query = new URLSearchParams({ user: userPubkey });
    if (outcomeId) query.set('outcome_id', outcomeId);

    const res = await fetch(`${this.baseUrl}/api/v1/orders?${query}`);
    if (!res.ok) throw new Error(`Failed to get orders: ${res.statusText}`);
    return res.json() as Promise<Order[]>;
  }
}
