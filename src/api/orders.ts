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
    const body: Record<string, unknown> = {
      outcome_id: params.outcomeId,
      side: params.side,
      order_type: params.orderType,
      time_in_force: params.timeInForce,
      price: params.price,
      quantity: params.quantity,
      nonce: params.nonce,
      signature: params.signature,
    };
    if (params.clientOrderId) {
      body.client_order_id = params.clientOrderId;
    }

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

  /** Get an order by client_order_id. */
  async getByClientId(clientOrderId: string): Promise<Order> {
    const res = await fetch(`${this.baseUrl}/api/v1/orders/client/${clientOrderId}`, {
      headers: this.headers(true),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to get order by client_order_id: ${text}`);
    }
    return res.json() as Promise<Order>;
  }

  /** Cancel an order by client_order_id. */
  async cancelByClientId(clientOrderId: string): Promise<{ order_id: string; client_order_id: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/orders/client/${clientOrderId}`, {
      method: 'DELETE',
      headers: this.headers(true),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to cancel order by client_order_id: ${text}`);
    }
    return res.json() as Promise<{ order_id: string; client_order_id: string; status: string }>;
  }

  /** Cancel all open orders, optionally filtered by market or event. */
  async cancelAll(opts?: { marketId?: string; eventId?: string }): Promise<{ cancelled_count: number }> {
    const query = new URLSearchParams();
    if (opts?.marketId) query.set('market_id', opts.marketId);
    if (opts?.eventId) query.set('event_id', opts.eventId);
    const qs = query.toString();
    const url = `${this.baseUrl}/api/v1/orders${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(true),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to cancel all orders: ${text}`);
    }
    return res.json() as Promise<{ cancelled_count: number }>;
  }

  /** Place multiple orders in a single batch. All orders must belong to the same market. */
  async batchPlace(marketId: string, orders: PlaceOrderParams[]): Promise<{ results: Array<{ index: number; order_id?: string; status: string; error?: string }> }> {
    const body = {
      market_id: marketId,
      orders: orders.map(p => {
        const o: Record<string, unknown> = {
          outcome_id: p.outcomeId,
          side: p.side,
          order_type: p.orderType,
          time_in_force: p.timeInForce,
          price: p.price,
          quantity: p.quantity,
          nonce: p.nonce,
          signature: p.signature,
        };
        if (p.clientOrderId) o.client_order_id = p.clientOrderId;
        return o;
      }),
    };

    const res = await fetch(`${this.baseUrl}/api/v1/orders/batch`, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to batch place orders: ${text}`);
    }
    return res.json() as Promise<{ results: Array<{ index: number; order_id?: string; status: string; error?: string }> }>;
  }

  /** Cancel multiple orders in a single batch. All orders must belong to the same market.
   *  Supports cancellation by order_ids and/or client_order_ids. */
  async batchCancel(marketId: string, orderIds: string[], clientOrderIds?: string[]): Promise<{ results: Array<{ order_id: string; status: string; error?: string }> }> {
    const body: Record<string, unknown> = {
      market_id: marketId,
      order_ids: orderIds,
    };
    if (clientOrderIds?.length) {
      body.client_order_ids = clientOrderIds;
    }

    const res = await fetch(`${this.baseUrl}/api/v1/orders/batch`, {
      method: 'DELETE',
      headers: this.headers(true),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to batch cancel orders: ${text}`);
    }
    return res.json() as Promise<{ results: Array<{ order_id: string; status: string; error?: string }> }>;
  }

  async getOpen(userPubkey: string, outcomeId?: string): Promise<Order[]> {
    const query = new URLSearchParams({ user: userPubkey });
    if (outcomeId) query.set('outcome_id', outcomeId);

    const res = await fetch(`${this.baseUrl}/api/v1/orders?${query}`);
    if (!res.ok) throw new Error(`Failed to get orders: ${res.statusText}`);
    return res.json() as Promise<Order[]>;
  }
}
