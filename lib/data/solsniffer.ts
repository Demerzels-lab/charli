// lib/data/solsniffer.ts

export type SolsnifferData = {
  snifScore: number | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenImg: string | null;
  mintAuthorityRisk: boolean | null;
  freezeAuthorityRisk: boolean | null;
  lpBurned: boolean | null;
  top10HoldersRisk: boolean | null;
  holderConcentrationPct: number | null;
  auditStatus: string | null;
  isHoneypot: boolean | null;
  marketCap: number | null;
  deployer: string | null;
  website: string | null;
  telegram: string | null;
  twitter: string | null;
  liquidityUsd: number | null;
  deployTime: string | null;
};

const EMPTY: SolsnifferData = {
  snifScore: null, tokenName: null, tokenSymbol: null, tokenImg: null,
  mintAuthorityRisk: null, freezeAuthorityRisk: null, lpBurned: null,
  top10HoldersRisk: null, holderConcentrationPct: null, auditStatus: null,
  isHoneypot: null, marketCap: null, deployer: null,
  website: null, telegram: null, twitter: null, liquidityUsd: null, deployTime: null,
};

export async function fetchSolsnifferRisk(contractAddress: string): Promise<SolsnifferData> {
  const key = process.env.SOLSNIFFER_API_KEY;
  if (!key) return EMPTY;

  try {
    const res = await fetch(
      `https://solsniffer.com/api/v2/token/${contractAddress}`,
      { headers: { 'X-Api-Key': key }, next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error(`Solsniffer ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    const tokenData = (json.tokenData as Record<string, unknown>) ?? {};
    const indicatorData = (tokenData.indicatorData as Record<string, unknown>) ?? {};
    const high = (indicatorData.high as Record<string, unknown>) ?? {};
    const highDetails = typeof high.details === 'string' ? JSON.parse(high.details) as Record<string, unknown> : {};
    const auditRisk = (tokenData.auditRisk as Record<string, unknown>) ?? {};
    const tokenOverview = (tokenData.tokenOverview as Record<string, unknown>) ?? {};
    const externals = typeof tokenData.externals === 'string' ? JSON.parse(tokenData.externals) as Record<string, unknown> : {};
    const liquidityList = (tokenData.liquidityList as Array<Record<string, unknown>>) ?? [];
    const score = (tokenData.score as number | null) ?? null;

    const liquidityUsd = liquidityList.reduce((sum, pool) => {
      const poolData = Object.values(pool)[0] as Record<string, unknown> | undefined;
      return sum + ((poolData?.amount as number) ?? 0);
    }, 0) || null;

    const mintDisabled = (auditRisk.mintDisabled as boolean | null) ?? null;
    const freezeDisabled = (auditRisk.freezeDisabled as boolean | null) ?? null;

    return {
      snifScore: score,
      tokenName: (tokenData.tokenName as string | null) ?? null,
      tokenSymbol: (tokenData.tokenSymbol as string | null) ?? null,
      tokenImg: (tokenData.tokenImg as string | null) ?? null,
      mintAuthorityRisk: mintDisabled !== null ? !mintDisabled : (highDetails['Mintable risks found'] as boolean | null) ?? null,
      freezeAuthorityRisk: freezeDisabled !== null ? !freezeDisabled : (highDetails['Freeze risks found'] as boolean | null) ?? null,
      lpBurned: (auditRisk.lpBurned as boolean | null) ?? null,
      top10HoldersRisk: (auditRisk.top10Holders as boolean | null) ?? null,
      holderConcentrationPct: null,
      auditStatus: score !== null ? (score >= 80 ? 'low risk' : score >= 50 ? 'medium risk' : 'high risk') : null,
      isHoneypot: null,
      marketCap: (tokenData.marketCap as number | null) ?? null,
      deployer: (tokenOverview.deployer as string | null) ?? null,
      website: (externals.website as string | null) ?? null,
      telegram: (externals.telegram_handle as string | null) ?? null,
      twitter: (externals.twitter_handle as string | null) ?? null,
      liquidityUsd,
      deployTime: (tokenData.deployTime as string | null) ?? null,
    };
  } catch (err) {
    console.error('[solsniffer] error:', (err as Error).message);
    return {
      snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null,
      holderConcentrationPct: null, auditStatus: null, isHoneypot: null,
    };
  }
}
