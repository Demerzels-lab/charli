// lib/data/whois.ts

export type WhoisData = {
  createdAt: string | null;
  registrar: string | null;
  ageDays: number | null;
};

export async function fetchWhoisDomain(domain: string): Promise<WhoisData> {
  try {
    const whoisModule = await import('whois-json');
    const whois = whoisModule.default;
    const result = await Promise.race([
      whois(domain) as Promise<Record<string, unknown>>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('whois timeout')), 8000)
      ),
    ]);

    const createdRaw =
      (result.creationDate as string | undefined) ??
      (result.domainRegisteredOn as string | undefined) ??
      null;

    const registrar =
      (result.registrar as string | undefined) ??
      (result.registrarName as string | undefined) ??
      null;

    let createdAt: string | null = null;
    let ageDays: number | null = null;

    if (createdRaw) {
      const created = new Date(createdRaw);
      if (!isNaN(created.getTime())) {
        createdAt = created.toISOString();
        ageDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return { createdAt, registrar, ageDays };
  } catch (err) {
    console.error('[whois] error:', (err as Error).message);
    return { createdAt: null, registrar: null, ageDays: null };
  }
}
