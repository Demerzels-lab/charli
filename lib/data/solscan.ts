// lib/data/solscan.ts

export type SolscanWalletData = {
  balanceSol: number | null;
  balanceUsd: number | null;
  firstTxTime: string | null;
  lastTxTime: string | null;
  txCount: number | null;
};

const BASE = 'https://pro-api.solscan.io/v2.0';

async function solscanFetch(path: string): Promise<unknown> {
  const key = process.env.SOLSCAN_API_KEY;
  if (!key) throw new Error('Missing SOLSCAN_API_KEY');

  const res = await fetch(`${BASE}${path}`, {
    headers: { token: key },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Solscan ${res.status}`);
  return res.json();
}

export async function fetchSolscanWallet(address: string): Promise<SolscanWalletData> {
  try {
    const [account, txList] = await Promise.all([
      solscanFetch(`/account/${address}`),
      solscanFetch(`/account/transactions?address=${address}&page=1&page_size=10&sort_by=block_time&sort_order=asc`),
    ]);

    const acc = account as Record<string, unknown>;
    const txs = (txList as { data?: Array<{ block_time?: number }> }).data ?? [];

    const balanceLamports = (acc.lamports as number | undefined) ?? null;
    const balanceSol = balanceLamports !== null ? balanceLamports / 1e9 : null;
    const solPrice = (acc.sol_price as number | undefined) ?? null;
    const balanceUsd = balanceSol !== null && solPrice !== null ? balanceSol * solPrice : null;

    const firstTx = txs[0]?.block_time;
    const firstTxTime = firstTx ? new Date(firstTx * 1000).toISOString() : null;

    const lastTxRes = await solscanFetch(
      `/account/transactions?address=${address}&page=1&page_size=1&sort_by=block_time&sort_order=desc`
    );
    const lastTxs = (lastTxRes as { data?: Array<{ block_time?: number }> }).data ?? [];
    const lastTx = lastTxs[0]?.block_time;
    const lastTxTime = lastTx ? new Date(lastTx * 1000).toISOString() : null;

    return { balanceSol, balanceUsd, firstTxTime, lastTxTime, txCount: null };
  } catch (err) {
    console.error('[solscan] fetch error:', (err as Error).message);
    return { balanceSol: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null };
  }
}
