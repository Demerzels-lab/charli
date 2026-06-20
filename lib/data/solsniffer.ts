// lib/data/solsniffer.ts

export type SolsnifferData = {
  snifScore: number | null;
  mintAuthorityRisk: boolean | null;
  freezeAuthorityRisk: boolean | null;
  holderConcentrationPct: number | null;
  auditStatus: string | null;
  isHoneypot: boolean | null;
};

export async function fetchSolsnifferRisk(contractAddress: string): Promise<SolsnifferData> {
  const key = process.env.SOLSNIFFER_API_KEY;
  if (!key) return {
    snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null,
    holderConcentrationPct: null, auditStatus: null, isHoneypot: null,
  };

  try {
    const res = await fetch(
      `https://api.solsniffer.com/v1/token/${contractAddress}`,
      { headers: { 'X-Api-Key': key }, next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error(`Solsniffer ${res.status}`);
    const json = await res.json() as Record<string, unknown>;

    return {
      snifScore: (json.score as number | null) ?? null,
      mintAuthorityRisk: (json.mint_authority as boolean | null) ?? null,
      freezeAuthorityRisk: (json.freeze_authority as boolean | null) ?? null,
      holderConcentrationPct: (json.top10_holder_pct as number | null) ?? null,
      auditStatus: (json.audit_status as string | null) ?? null,
      isHoneypot: (json.is_honeypot as boolean | null) ?? null,
    };
  } catch (err) {
    console.error('[solsniffer] error:', (err as Error).message);
    return {
      snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null,
      holderConcentrationPct: null, auditStatus: null, isHoneypot: null,
    };
  }
}
