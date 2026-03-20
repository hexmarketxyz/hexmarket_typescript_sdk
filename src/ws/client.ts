import {
  CrossOutcomeMatch,
  MergedOrderBookSnapshot,
  OrderBookSnapshot,
  Trade,
} from '../types/trade';

type Callback<T> = (data: T) => void;

// ---------------------------------------------------------------------------
// Market WebSocket — public, no auth required
// ---------------------------------------------------------------------------

export interface MarketSubscribeMessage {
  assets_ids: string[];
  type: 'market';
}

export interface MarketDynamicMessage {
  operation: 'subscribe' | 'unsubscribe';
  assets_ids: string[];
}

export interface MarketEvent {
  event_type: 'book' | 'last_trade_price' | string;
  asset_id: string;
  [key: string]: unknown;
}

export class HexMarketWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private callbacks: Set<Callback<MarketEvent>> = new Set();
  private subscribedAssets: Set<string> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private url: string) {}

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startPing();
      // Resubscribe on reconnect
      if (this.subscribedAssets.size > 0) {
        this.send({
          assets_ids: Array.from(this.subscribedAssets),
          type: 'market',
        });
      }
    };

    this.ws.onmessage = (event) => {
      const data = event.data as string;
      if (data === 'PONG') return;
      try {
        const msg: MarketEvent = JSON.parse(data);
        for (const cb of this.callbacks) {
          cb(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.reconnect();
    };
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Subscribe to market events for the given outcome (asset) IDs. */
  subscribe(assetIds: string[], callback: Callback<MarketEvent>): () => void {
    this.callbacks.add(callback);
    const newIds = assetIds.filter((id) => !this.subscribedAssets.has(id));
    for (const id of newIds) this.subscribedAssets.add(id);

    if (newIds.length > 0) {
      if (this.subscribedAssets.size === newIds.length) {
        // First subscription — send initial message
        this.send({ assets_ids: newIds, type: 'market' });
      } else {
        this.send({ operation: 'subscribe', assets_ids: newIds });
      }
    }

    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0 && assetIds.length > 0) {
        this.send({ operation: 'unsubscribe', assets_ids: assetIds });
        for (const id of assetIds) this.subscribedAssets.delete(id);
      }
    };
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
      }
    }, 10_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => this.connect(), delay);
  }
}

// ---------------------------------------------------------------------------
// User WebSocket — requires L2 API key authentication
// ---------------------------------------------------------------------------

export interface UserAuth {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface UserEvent {
  event?: string;
  [key: string]: unknown;
}

export class HexUserWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private callbacks: Set<Callback<UserEvent>> = new Set();
  private auth: UserAuth | null = null;
  private markets: string[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private url: string) {}

  connect(auth: UserAuth, markets: string[] = []): void {
    this.auth = auth;
    this.markets = markets;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startPing();
      // Authenticate
      this.send({
        auth: this.auth,
        type: 'user',
        markets: this.markets,
      });
    };

    this.ws.onmessage = (event) => {
      const data = event.data as string;
      if (data === 'PONG') return;
      try {
        const msg: UserEvent = JSON.parse(data);
        for (const cb of this.callbacks) {
          cb(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.reconnect();
    };
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Register a callback for user events (orders, trades). */
  onEvent(callback: Callback<UserEvent>): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** Dynamically subscribe to additional markets. */
  subscribeMarkets(markets: string[]): void {
    this.send({ operation: 'subscribe', markets });
  }

  /** Dynamically unsubscribe from markets. */
  unsubscribeMarkets(markets: string[]): void {
    this.send({ operation: 'unsubscribe', markets });
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
      }
    }, 10_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => this.connect(this.auth!, this.markets), delay);
  }
}

// ---------------------------------------------------------------------------
// Legacy WebSocket client (backward-compatible with /ws endpoint)
// ---------------------------------------------------------------------------

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
