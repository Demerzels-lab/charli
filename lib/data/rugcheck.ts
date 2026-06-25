// lib/data/rugcheck.ts
// Free, no-key Solana token risk report.

export type RugcheckData = {
  score: number | null;
  mintAuthorityActive: boolean | null;
  freezeAuthorityActive: boolean | null;
  lpLockedPct: number | null;
  top10HoldersPct: number | null;
  rugged: boolean | null;
};

const EMPTY: RugcheckData = {
  score: null, mintAuthorityActive: null, freezeAuthorityActive: null,
  lpLockedPct: null, top10HoldersPct: null, rugged: null,
};

export async function fetchRugcheckReport(mint: string): Promise<RugcheckData> {
  try {
    const res = await fetch(
      `https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Rugcheck ${res.status}`);
    const json = await res.json() as Record<string, unknown>;

    // Rugcheck score: LOW score = SAFE, HIGH score = RISKY. risks[] lists only detected problems.
    const risks = (json.risks as Array<Record<string, unknown>>) ?? [];
    const mintRisk = risks.find(r => (r.name as string)?.toLowerCase().includes('mint'));
    const freezeRisk = risks.find(r => (r.name as string)?.toLowerCase().includes('freeze'));
    const holderRisk = risks.find(r => (r.name as string)?.toLowerCase().includes('top') || (r.name as string)?.toLowerCase().includes('holder'));

    return {
      score: (json.score_normalised as number) ?? (json.score as number) ?? null,
      mintAuthorityActive: mintRisk ? true : false,
      freezeAuthorityActive: freezeRisk ? true : false,
      lpLockedPct: (json.lpLockedPct as number) ?? null,
      top10HoldersPct: (holderRisk?.value as number) ?? null,
      rugged: (json.rugged as boolean) ?? null,
    };
  } catch (err) {
    console.error('[rugcheck] error:', (err as Error).message);
    return EMPTY;
  }
}
