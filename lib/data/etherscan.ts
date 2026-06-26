// lib/data/etherscan.ts
// Etherscan V2 — one API key for 50+ EVM chains. Free tier: 5 req/sec.

export type EtherscanWalletData = {
  balanceWei: string | null;
  balanceUsd: number | null;
  firstTxTime: string | null;
  lastTxTime: string | null;
  txCount: number | null;
  fundedBy: string | null;
  fundedDaysAgo: number | null;
  erc20Tokens: Array<{ contractAddress: string; name: string; symbol: string; balance: string }> | null;
};

const EMPTY: EtherscanWalletData = {
  balanceWei: null, balanceUsd: null, firstTxTime: null, lastTxTime: null,
  txCount: null, fundedBy: null, fundedDaysAgo: null, erc20Tokens: null,
};

const BASE = 'https://api.etherscan.io/api';

export async function fetchEtherscanWallet(address: string): Promise<EtherscanWalletData> {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return EMPTY;

  try {
    // Fan out: balance, first tx, last tx, tx count, token holdings
    const [balRes, firstTxRes, lastTxRes, countRes, tokenRes] = await Promise.all([
      fetch(`${BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${key}`, {
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.json()) as Promise<{ result?: string }>,
      fetch(`${BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${key}`, {
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.json()) as Promise<{ result?: Array<{ timeStamp?: string; from?: string }> }>,
      fetch(`${BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${key}`, {
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.json()) as Promise<{ result?: Array<{ timeStamp?: string }> }>,
      fetch(`${BASE}?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${key}`, {
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.json()) as Promise<{ result?: string }>,
      fetch(`${BASE}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${key}`, {
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.json()) as Promise<{ result?: Array<{ contractAddress?: string; tokenName?: string; tokenSymbol?: string; tokenDecimal?: string; value?: string; from?: string }> }>,
    ]);

    // Balance
    const balanceWei: string | null = balRes?.result ?? null;

    // First transaction (wallet age)
    const firstTxs = (firstTxRes?.result as Array<{ timeStamp?: string; from?: string }> | undefined) ?? [];
    const firstTxTime = firstTxs[0]?.timeStamp
      ? new Date(parseInt(firstTxs[0].timeStamp) * 1000).toISOString()
      : null;

    // Funding source: "from" of first incoming tx (if not self-sent)
    const fundedBy = firstTxs[0]?.from && firstTxs[0].from.toLowerCase() !== address.toLowerCase()
      ? firstTxs[0].from
      : null;
    const fundedDaysAgo = firstTxTime
      ? Math.floor((Date.now() - new Date(firstTxTime).getTime()) / 86_400_000)
      : null;

    // Last transaction
    const lastTxs = (lastTxRes?.result as Array<{ timeStamp?: string }> | undefined) ?? [];
    const lastTxTime = lastTxs[0]?.timeStamp
      ? new Date(parseInt(lastTxs[0].timeStamp) * 1000).toISOString()
      : null;

    // Transaction count (hex → decimal)
    const txCountHex = countRes?.result ?? null;
    const txCount = txCountHex ? parseInt(txCountHex, 16) : null;

    // ERC-20 token holdings — deduplicate by contract, keep latest balance
    const tokenTxs = (tokenRes?.result as Array<{ contractAddress?: string; tokenName?: string; tokenSymbol?: string; value?: string }> | undefined) ?? [];
    const tokenMap = new Map<string, { contractAddress: string; name: string; symbol: string; balance: string }>();
    for (const tx of tokenTxs) {
      const addr = tx.contractAddress?.toLowerCase();
      if (addr && !tokenMap.has(addr)) {
        tokenMap.set(addr, {
          contractAddress: tx.contractAddress ?? '',
          name: tx.tokenName ?? 'Unknown',
          symbol: tx.tokenSymbol ?? '???',
          balance: tx.value ?? '0',
        });
      }
    }
    const erc20Tokens = tokenMap.size > 0 ? Array.from(tokenMap.values()) : null;

    return {
      balanceWei,
      balanceUsd: null,
      firstTxTime,
      lastTxTime,
      txCount,
      fundedBy,
      fundedDaysAgo,
      erc20Tokens,
    };
  } catch (err) {
    console.error('[etherscan] fetch error:', (err as Error).message);
    return EMPTY;
  }
}
