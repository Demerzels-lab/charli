// lib/data/dexscreener.ts
// Free, no-key token identity + socials.

export type DexscreenerData = {
  tokenName: string | null;
  tokenSymbol: string | null;
  pairCreatedAt: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
};

const EMPTY: DexscreenerData = {
  tokenName: null, tokenSymbol: null, pairCreatedAt: null,
  website: null, twitter: null, telegram: null,
};

export async function fetchDexscreenerToken(tokenAddress: string, chainId: 'solana' | 'ethereum' = 'solana'): Promise<DexscreenerData> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Dexscreener ${res.status}`);
    const pairs = await res.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(pairs) || pairs.length === 0) return EMPTY;

    const pair = pairs[0];
    const baseToken = (pair.baseToken as Record<string, unknown>) ?? {};
    const info = (pair.info as Record<string, unknown>) ?? {};
    const socials = (info.socials as Array<Record<string, unknown>>) ?? [];
    const websites = (info.websites as Array<Record<string, unknown>>) ?? [];

    const twitter = socials.find(s => s.platform === 'twitter')?.handle as string | undefined;
    const telegram = socials.find(s => s.platform === 'telegram')?.handle as string | undefined;
    const website = websites[0]?.url as string | undefined;
    const pairCreatedAt = pair.pairCreatedAt
      ? new Date(pair.pairCreatedAt as number).toISOString()
      : null;

    return {
      tokenName: (baseToken.name as string) ?? null,
      tokenSymbol: (baseToken.symbol as string) ?? null,
      pairCreatedAt,
      website: website ?? null,
      twitter: twitter ?? null,
      telegram: telegram ?? null,
    };
  } catch (err) {
    console.error('[dexscreener] error:', (err as Error).message);
    return EMPTY;
  }
}
