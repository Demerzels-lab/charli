// lib/types.ts

export type RateLimitMeta = {
  remaining: number;
  resetAt: string; // ISO date string (midnight of next day UTC)
};

export type ApiMeta = {
  cached: boolean;
  tookMs: number;
  ratelimit: RateLimitMeta;
};

export type ApiResponse<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: { code: string; message: string }; meta: ApiMeta };

export type SignalDirection = 'ok' | 'warn' | 'bad';
export type Confidence = 'UNKNOWN' | 'TENTATIVE' | 'FIRM' | 'CONFIRMED';
export type WalletLevel = 'CLEAN' | 'WATCH' | 'FLAGGED' | 'UNVERIFIABLE';
export type WalletClassification = 'dev' | 'whale' | 'flipper' | 'fresh' | 'mixed';
export type Chain = 'solana' | 'evm';

export type Signal = {
  label: string;
  value: string;
  direction: SignalDirection;
};

export type LinkedProject = {
  name: string;
  role: string;
  note: string;
};

export type WalletVerdict = {
  address: string;
  chain: Chain;
  level: WalletLevel;
  confidence: Confidence;
  classification: WalletClassification;
  summary: string;
  balanceUsd: number | null;
  firstSeen: string | null; // ISO
  lastActive: string | null; // ISO
  linkedProjects: LinkedProject[];
  signals: Signal[];
};

// --- Project types ---

export type ProjectLevel = 'SAFE' | 'DYOR' | 'HIGH_RISK' | 'LIKELY_RUG';
export type ProjectResolvedAs = 'contract' | 'domain' | 'name';

export type ProjectFinding = {
  label: string;
  detail: string;
  direction: SignalDirection;
  confidence: Confidence;
};

export type ProjectVerdict = {
  query: string;
  resolvedAs: ProjectResolvedAs;
  level: ProjectLevel;
  confidence: Confidence;
  riskScore: number; // 0-100
  summary: string;
  tokenName?: string | null;
  tokenSymbol?: string | null;
  tokenImg?: string | null;
  marketCap?: number | null;
  deployer?: string | null;
  liquidityUsd?: number | null;
  domain?: {
    ageDays: number | null;
    registrar: string | null;
    createdAt: string | null;
  };
  socials?: {
    x?: string;
    telegram?: string;
    site?: string;
  };
  wallets?: Array<{
    address: string;
    role: 'deployer' | 'funder' | 'linked';
    note: string;
  }>;
  narrativeFlags: string[];
  findings: ProjectFinding[];
};

// --- X Account types (redesigned per X ACCOUNT BRIEF) ---

export type AccountType =
  | 'PROJECT_CRYPTO'
  | 'KOL_INFLUENCER'
  | 'BRAND_OFFICIAL'
  | 'PUBLIC_FIGURE'
  | 'PERSONAL_PRIVATE'
  | 'ADULT_CONTENT'
  | 'IMPERSONATOR'
  | 'UNKNOWN';

export type XAccountLevel =
  | 'LIKELY_OFFICIAL'
  | 'UNVERIFIED'
  | 'MISMATCH'
  | 'IMPERSONATION'
  | 'INFORMATIONAL'
  | 'UNVERIFIABLE';

export type XMetrics = {
  accountAgeDays: number | null;
  followers: number | null;
  following: number | null;
  followerGrowthRate: number | null;
  engagementRate: number | null;
  usernameChanges: number | null;
  firstCryptoMentionDays: number | null;
  verification: string | null;
};

export type DataSourceStatus = 'available' | 'not_found' | 'failed' | 'no_data';

export type XDataSources = {
  twitter: DataSourceStatus;
  memoryLol: DataSourceStatus;
};

export type DataCompleteness = 'full' | 'partial' | 'minimal';

export type ImpersonationSignals = {
  nameMatchesKnownEntity: boolean;
  caMismatch: boolean | null;
  visualMimicry: boolean;
};

export type TokenCrossCheck = {
  ca: string;
  tokenName: string | null;
  ticker: string | null;
  chain: string | null;
  dexscreenerMatch: 'MATCH' | 'MISMATCH' | 'NOT_LISTED';
  accountAgeConsistent: boolean | null;
  riskScore: number | null;
  tokenVerdict: ProjectLevel | null;
} | null;

export type XAccountVerdict = {
  handle: string;
  displayName: string | null;
  isVerified: boolean;
  accountType: AccountType;
  level: XAccountLevel;
  confidence: Confidence;
  summary: string;
  metrics: XMetrics;
  impersonationSignals: ImpersonationSignals;
  tokenCrossCheck: TokenCrossCheck;
  signals: Signal[];
  redFlags: string[];
  dataSources: XDataSources;
  dataCompleteness: DataCompleteness;
};

// --- Agent types ---

export type AgentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentIntent =
  | { type: 'wallet'; address: string }
  | { type: 'project'; query: string }
  | { type: 'x-account'; handle: string }
  | { type: 'chat' };

export type SSEEventType = 'token' | 'tool' | 'verdict' | 'done' | 'error';

export type SSEEvent =
  | { event: 'token'; data: { text: string } }
  | { event: 'tool'; data: { name: string; status: 'running' | 'done' | 'failed' } }
  | { event: 'verdict'; data: WalletVerdict | ProjectVerdict | XAccountVerdict }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } };
