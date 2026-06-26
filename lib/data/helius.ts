// lib/data/helius.ts
// Primary Solana wallet data source via Helius RPC.
// Free tier: 100K credits/month. Archival data included on all plans.

export type HeliusWalletData = {
  balanceSol: number | null;
  balanceUsd: number | null;
  tokenHoldings: Array<{ mint: string; amount: number; decimals: number }> | null;
  firstTxTime: string | null;
  lastTxTime: string | null;
  txCount: number | null;
  fundedBy: string | null;
  fundedDaysAgo: number | null;
};

const SOL_PRICE_USD = 150; // rough estimate — could swap for live price later

const EMPTY: HeliusWalletData = {
  balanceSol: null,
  balanceUsd: null,
  tokenHoldings: null,
  firstTxTime: null,
  lastTxTime: null,
  txCount: null,
  fundedBy: null,
  fundedDaysAgo: null,
};

async function heliusRpc(method: string, params: unknown[], key: string): Promise<unknown> {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Helius RPC ${method} → HTTP ${res.status}`);
  const json = await res.json() as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(`Helius RPC ${method}: ${json.error.message}`);
  return json.result;
}

type HeliusTxn = {
  timestamp?: number;
  description?: string;
  feePayer?: string;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
  }>;
};

async function getTransactionsForAddress(
  address: string,
  key: string,
  sortOrder: 'asc' | 'desc',
  limit: number
): Promise<HeliusTxn[]> {
  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=${limit}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) return [];
  const txs = (await res.json()) as HeliusTxn[];
  // Helius returns newest first; sort if needed
  if (sortOrder === 'asc') {
    return txs.filter(t => t.timestamp).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }
  return txs;
}

export async function fetchHeliusWallet(address: string): Promise<HeliusWalletData> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return EMPTY;

  try {
    // Fan out: balance, token accounts, recent txs
    type TokenAccountsResult = { value?: Array<{ account?: { data?: { parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string; decimals?: number } } } } } }> };
    const [balanceResult, tokenAccounts, recentTxs] = await Promise.all([
      heliusRpc('getBalance', [address], key) as Promise<{ value?: number }>,
      heliusRpc('getTokenAccountsByOwner', [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' },
      ], key) as Promise<TokenAccountsResult>,
      getTransactionsForAddress(address, key, 'desc', 100),
    ]);

    // Balance
    const lamports = balanceResult?.value ?? null;
    const balanceSol = lamports !== null ? lamports / 1e9 : null;
    const balanceUsd = balanceSol !== null ? Math.round(balanceSol * SOL_PRICE_USD * 100) / 100 : null;

    // Token holdings
    const rawTokens = tokenAccounts?.value ?? [];
    const tokenHoldings = rawTokens.length > 0
      ? rawTokens.map(t => {
          const info = t.account?.data?.parsed?.info;
          const amt = info?.tokenAmount;
          return {
            mint: info?.mint ?? 'unknown',
            amount: parseFloat(amt?.amount ?? '0'),
            decimals: amt?.decimals ?? 0,
          };
        }).filter(t => t.amount > 0)
      : null;

    // Transaction timeline
    const sorted = recentTxs.filter(t => t.timestamp).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const lastTxTime = sorted.length > 0 && sorted[sorted.length - 1].timestamp
      ? new Date(sorted[sorted.length - 1].timestamp! * 1000).toISOString()
      : null;

    // For first tx + funding source, we need the oldest txs
    // Helius returns newest first, so fetch separately with low limit for first tx
    let firstTxTime: string | null = null;
    let fundedBy: string | null = null;
    let fundedDaysAgo: number | null = null;

    try {
      // Fetch oldest transactions — Helius doesn't support sort order directly,
      // so we fetch many and sort ascending to get the earliest.
      const oldestTxs = await getTransactionsForAddress(address, key, 'asc', 100);
      if (oldestTxs.length > 0 && oldestTxs[0].timestamp) {
        firstTxTime = new Date(oldestTxs[0].timestamp * 1000).toISOString();
        // Try to identify funder from first tx description
        const desc = oldestTxs[0].description ?? '';
        const sentMatch = desc.match(/sent\s+(\S+)\s+to/i);
        if (!sentMatch && oldestTxs[0].feePayer !== address) {
          fundedBy = oldestTxs[0].feePayer ?? null;
        }
      }
    } catch {
      // First tx fetch is best-effort
    }

    // Estimate tx count from available data
    const txCount = recentTxs.length >= 100 ? 100 : recentTxs.length || null;

    // Calculate fundedDaysAgo
    if (firstTxTime && fundedBy) {
      fundedDaysAgo = Math.floor((Date.now() - new Date(firstTxTime).getTime()) / 86_400_000);
    }

    return {
      balanceSol,
      balanceUsd,
      tokenHoldings,
      firstTxTime,
      lastTxTime,
      txCount,
      fundedBy,
      fundedDaysAgo,
    };
  } catch (err) {
    console.error('[helius] fetch error:', (err as Error).message);
    return EMPTY;
  }
}
