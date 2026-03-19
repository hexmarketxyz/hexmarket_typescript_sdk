import { Outcome } from '../types/market';

export class MarketsApi {
  constructor(private baseUrl: string) {}

  async list(params?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Outcome[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const res = await fetch(`${this.baseUrl}/api/v1/markets?${query}`);
    if (!res.ok) throw new Error(`Failed to list markets: ${res.statusText}`);
    return res.json() as Promise<Outcome[]>;
  }

  async get(outcomeId: string): Promise<Outcome> {
    const res = await fetch(`${this.baseUrl}/api/v1/markets/${outcomeId}`);
    if (!res.ok) throw new Error(`Failed to get market: ${res.statusText}`);
    return res.json() as Promise<Outcome>;
  }
}
