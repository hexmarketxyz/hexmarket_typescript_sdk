import { Trade } from '../types/trade';

export class TradesApi {
  constructor(private baseUrl: string) {}

  async getByOutcome(outcomeId: string, limit?: number): Promise<Trade[]> {
    const query = new URLSearchParams({ outcome_id: outcomeId });
    if (limit) query.set('limit', limit.toString());

    const res = await fetch(`${this.baseUrl}/api/v1/trades?${query}`);
    if (!res.ok) throw new Error(`Failed to get trades: ${res.statusText}`);
    return res.json() as Promise<Trade[]>;
  }
}
