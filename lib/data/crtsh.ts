// lib/data/crtsh.ts

export type CrtshData = {
  firstIssuedAt: string | null;
  certCount: number | null;
};

export async function fetchCrtshDomainAge(domain: string): Promise<CrtshData> {
  try {
    const res = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`crt.sh ${res.status}`);
    const certs = await res.json() as Array<{ not_before?: string }>;
    if (!certs.length) return { firstIssuedAt: null, certCount: 0 };

    const dates = certs
      .map(c => c.not_before)
      .filter((d): d is string => typeof d === 'string')
      .map(d => new Date(d).getTime())
      .filter(t => !isNaN(t));

    const earliest = dates.length ? new Date(Math.min(...dates)).toISOString() : null;
    return { firstIssuedAt: earliest, certCount: certs.length };
  } catch (err) {
    console.error('[crtsh] error:', (err as Error).message);
    return { firstIssuedAt: null, certCount: null };
  }
}
