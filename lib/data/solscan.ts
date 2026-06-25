// lib/data/solscan.ts
// Solscan Pro API v2 — free tier (Level 1) key works with these endpoints.
// Header auth: `token: <key>`. Base: pro-api.solscan.io/v2.0

export type SolscanWalletData = {
  balanceSol: number | null;
  balanceUsd: number | null;
  firstTxTime: string | null;
  lastTxTime: string | null;
  txCount: number | null;
  tokenCount: number | null;
};

const EMPTY: SolscanWalletData = {
  balanceSol: null, balanceUsd: null, firstTxTime: null,
  lastTxTime: null, txCount: null, tokenCount: null,
};

const BASE = 'https://pro-api.solscan.io/v2.0';

async function solscanFetch(path: string, key: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { token: key, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    console.error(`[solscan] ${path} → HTTP ${res.status}`);
    return null;
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchSolscanWallet(address: string): Promise<SolscanWalletData> {
  const key = process.env.SOLSCAN_API_KEY;
  if (!key) return EMPTY;

  try {
    const [detail, tokens, txs] = await Promise.all([
      solscanFetch(`/account/detail?address=${address}`, key),
      solscanFetch(`/account/token-accounts?address=${address}&type=token&page=1&page_size=40`, key),
      solscanFetch(`/account/transactions?address=${address}&limit=10`, key),
    ]);

    // /account/detail → { data: { lamports, ... } }
    const detailData = (detail?.data as Record<string, unknown>) ?? {};
    const lamports = (detailData.lamports as number | undefined) ?? null;
    const balanceSol = lamports !== null ? lamports / 1e9 : null;

    // /account/token-accounts → { data: [...] }
    const tokenList = (tokens?.data as unknown[]) ?? [];
    const tokenCount = Array.isArray(tokenList) ? tokenList.length : null;

    // /account/transactions → { data: [ { block_time }, ... ] } (newest first)
    const txList = (txs?.data as Array<{ block_time?: number }>) ?? [];
    const lastTx = txList[0]?.block_time;
    const lastTxTime = lastTx ? new Date(lastTx * 1000).toISOString() : null;

    return {
      balanceSol,
      balanceUsd: null,
      firstTxTime: null,
      lastTxTime,
      txCount: null,
      tokenCount,
    };
  } catch (err) {
    console.error('[solscan] fetch error:', (err as Error).message);
    return EMPTY;
  }
}
