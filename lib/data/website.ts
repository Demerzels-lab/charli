// lib/data/website.ts
// Free, no-key website liveness + metadata probe for domain investigations.

export type WebsiteData = {
  isLive: boolean;
  statusCode: number | null;
  title: string | null;
  description: string | null;
  hasCryptoKeywords: boolean;
  socialLinks: string[];
};

const EMPTY: WebsiteData = {
  isLive: false, statusCode: null, title: null,
  description: null, hasCryptoKeywords: false, socialLinks: [],
};

const CRYPTO_KEYWORDS = [
  'token', 'crypto', 'presale', 'whitelist', 'airdrop', 'staking', 'defi',
  'web3', 'nft', 'mint', 'launchpad', 'tokenomics', 'roadmap', 'whitepaper',
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export async function fetchWebsiteMeta(domain: string): Promise<WebsiteData> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    });

    const statusCode = res.status;
    if (!res.ok) return { ...EMPTY, statusCode, isLive: statusCode < 500 };

    const html = (await res.text()).slice(0, 200_000);

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 160) : null;

    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const description = descMatch ? descMatch[1].trim().slice(0, 240) : null;

    const haystack = `${title ?? ''} ${description ?? ''} ${html.slice(0, 50_000)}`.toLowerCase();
    const hasCryptoKeywords = CRYPTO_KEYWORDS.some(kw => haystack.includes(kw));

    const socialLinks: string[] = [];
    const socialPatterns = [
      /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i,
      /https?:\/\/(?:www\.)?t\.me\/[A-Za-z0-9_]+/i,
      /https?:\/\/(?:www\.)?discord\.(?:gg|com)\/[A-Za-z0-9/]+/i,
    ];
    for (const re of socialPatterns) {
      const m = html.match(re);
      if (m) socialLinks.push(m[0]);
    }

    return { isLive: true, statusCode, title, description, hasCryptoKeywords, socialLinks };
  } catch (err) {
    console.error('[website] error:', (err as Error).message);
    return EMPTY;
  }
}
