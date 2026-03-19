import {
  CrossOutcomeMatch,
  MergedOrderBookSnapshot,
  OrderBookSnapshot,
  Trade,
} from '../types/trade';

type Callback<T> = (data: T) => void;

interface WsMessage {
  type: string;
  channel?: string;
  payload?: unknown;
  message?: string;
}

export class HexWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<Callback<unknown>>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private authToken: string | null = null;

  constructor(private url: string) {}

  /** Set the auth token used for user-channel subscriptions. */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Resubscribe to all active channels
      for (const channel of this.subscriptions.keys()) {
        const msg: Record<string, unknown> = { type: 'subscribe', channel };
        if (channel.startsWith('user:') && this.authToken) {
          msg.token = this.authToken;
        }
        this.send(msg);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.reconnect();
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribeOrderBook(
    outcomeId: string,
    callback: Callback<OrderBookSnapshot>,
  ): () => void {
    return this.subscribe(`orderbook:${outcomeId}`, callback as Callback<unknown>);
  }

  subscribeTrades(outcomeId: string, callback: Callback<Trade>): () => void {
    return this.subscribe(`trades:${outcomeId}`, callback as Callback<unknown>);
  }

  subscribeMergedOrderBook(
    outcomeId: string,
    callback: Callback<MergedOrderBookSnapshot>,
  ): () => void {
    return this.subscribe(`merged_orderbook:${outcomeId}`, callback as Callback<unknown>);
  }

  subscribeCrossOutcomeMatch(
    marketId: string,
    callback: Callback<CrossOutcomeMatch>,
  ): () => void {
    return this.subscribe(`cross_outcome_match:${marketId}`, callback as Callback<unknown>);
  }

  subscribeUser(pubkey: string, callback: Callback<unknown>): () => void {
    return this.subscribe(`user:${pubkey}`, callback);
  }

  private subscribe(channel: string, callback: Callback<unknown>): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      const msg: Record<string, unknown> = { type: 'subscribe', channel };
      if (channel.startsWith('user:') && this.authToken) {
        msg.token = this.authToken;
      }
      this.send(msg);
    }
    this.subscriptions.get(channel)!.add(callback);

    return () => {
      this.subscriptions.get(channel)?.delete(callback);
      if (this.subscriptions.get(channel)?.size === 0) {
        this.send({ type: 'unsubscribe', channel });
        this.subscriptions.delete(channel);
      }
    };
  }

  private handleMessage(msg: WsMessage): void {
    if (msg.type === 'data' && msg.channel && msg.payload) {
      const callbacks = this.subscriptions.get(msg.channel);
      if (callbacks) {
        for (const cb of callbacks) {
          cb(msg.payload);
        }
      }
    }
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}
