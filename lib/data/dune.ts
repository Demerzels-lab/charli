// lib/data/dune.ts

export type DuneWalletData = {
  totalProfitUsd: number | null;
  tradeCount: number | null;
  classification: 'dev' | 'whale' | 'flipper' | 'fresh' | 'mixed' | null;
};

export async function fetchDuneWalletActivity(_address: string): Promise<DuneWalletData> {
  // Dune query disabled — no public pump.fun query available.
  return { totalProfitUsd: null, tradeCount: null, classification: null };

  const key = process.env.DUNE_API_KEY;
  if (!key) return { totalProfitUsd: null, tradeCount: null, classification: null };

  try {
    const execRes = await fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/execute`, {
      method: 'POST',
      headers: { 'X-Dune-API-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_parameters: { wallet_address: address } }),
    });
    if (!execRes.ok) throw new Error(`Dune execute ${execRes.status}`);
    const { execution_id } = await execRes.json() as { execution_id: string };

    let result: Record<string, unknown> | null = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.dune.com/api/v1/execution/${execution_id}/results`, {
        headers: { 'X-Dune-API-Key': key },
      });
      if (!statusRes.ok) continue;
      const statusJson = await statusRes.json() as Record<string, unknown>;
      if (statusJson.state === 'QUERY_STATE_COMPLETED') {
        result = statusJson;
        break;
      }
    }

    if (!result) return { totalProfitUsd: null, tradeCount: null, classification: null };

    const rows = (result as { result?: { rows?: Array<Record<string, unknown>> } }).result?.rows ?? [];
    if (rows.length === 0) return { totalProfitUsd: null, tradeCount: null, classification: 'fresh' };

    const row = rows[0];
    const totalProfitUsd = (row.total_profit_usd as number | null) ?? null;
    const tradeCount = (row.trade_count as number | null) ?? null;

    let classification: DuneWalletData['classification'] = 'mixed';
    if (!tradeCount || tradeCount === 0) classification = 'fresh';
    else if (tradeCount > 100 && totalProfitUsd !== null && totalProfitUsd > 10000) classification = 'whale';
    else if (tradeCount > 50) classification = 'flipper';

    return { totalProfitUsd, tradeCount, classification };
  } catch (err) {
    console.error('[dune] fetch error:', (err as Error).message);
    return { totalProfitUsd: null, tradeCount: null, classification: null };
  }
}
