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

// --- X Account types ---

export type XAccountLevel = 'LEGIT' | 'DYOR' | 'RED_FLAG' | 'UNVERIFIABLE';

export type XMetrics = {
  accountAgeDays: number | null;
  followers: number | null;
  following: number | null;
  usernameChanges: number | null;
  firstCryptoMentionDays: number | null;
};

export type DataSourceStatus = 'available' | 'not_found' | 'failed' | 'no_data';

export type XDataSources = {
  twitter: DataSourceStatus;
  memoryLol: DataSourceStatus;
};

export type DataCompleteness = 'full' | 'partial' | 'minimal';

export type XAccountVerdict = {
  handle: string;
  displayName: string | null;
  level: XAccountLevel;
  confidence: Confidence;
  summary: string;
  isVerified: boolean;
  metrics: XMetrics;
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
