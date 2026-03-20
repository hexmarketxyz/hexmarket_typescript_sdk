import { MarketsApi } from './api/markets';
import { OrdersApi } from './api/orders';
import { TradesApi } from './api/trades';
import { VaultApi } from './api/vault';
import { HexMarketWebSocket, HexUserWebSocket } from './ws/client';

export interface HexMarketClientConfig {
  apiUrl: string;
  wsUrl: string;
  solanaRpcUrl?: string;
  programId?: string;
}

export class HexMarketClient {
  public readonly markets: MarketsApi;
  public readonly orders: OrdersApi;
  public readonly trades: TradesApi;
  public readonly vault: VaultApi;
  public readonly marketWs: HexMarketWebSocket;
  public readonly userWs: HexUserWebSocket;

  constructor(config: HexMarketClientConfig) {
    this.markets = new MarketsApi(config.apiUrl);
    this.orders = new OrdersApi(config.apiUrl);
    this.trades = new TradesApi(config.apiUrl);
    this.vault = new VaultApi(config.apiUrl);
    this.marketWs = new HexMarketWebSocket(`${config.wsUrl}/ws/market`);
    this.userWs = new HexUserWebSocket(`${config.wsUrl}/ws/user`);
  }

  setL2Headers(headers: Record<string, string> | null): void {
    this.orders.setL2Headers(headers);
    this.vault.setL2Headers(headers);
  }
}
