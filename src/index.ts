export { HexMarketClient, type HexMarketClientConfig } from './client';
export { MarketsApi } from './api/markets';
export { OrdersApi } from './api/orders';
export { TradesApi } from './api/trades';
export { VaultApi, type TransactionResponse, type SubmitResponse, type VaultBalanceResponse } from './api/vault';
export { HexWebSocket, HexMarketWebSocket, HexUserWebSocket, type MarketEvent, type UserEvent, type UserAuth } from './ws/client';
export * from './types/market';
export * from './types/order';
export * from './types/trade';
export {
  buildOrderMessage, generateNonce, buildAuthMessage, buildAuthToken, parseAuthTokenTimestamp,
  buildApiKeyMessage, buildL2Headers, buildL2SigningPayload, signL2,
  type ApiCredentials,
} from './signing';
