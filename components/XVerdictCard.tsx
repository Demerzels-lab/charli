// components/XVerdictCard.tsx
'use client';

import type { XAccountVerdict, DataSourceStatus, XDataSources, AccountType } from '@/lib/types';
import { VerdictSection, DataRow, VerdictBadge, ConfidencePill, SignalRow } from './verdict/VerdictPrimitives';

const SOURCE_LABEL: Record<DataSourceStatus, string> = {
  available: 'live',
  not_found: 'not found',
  failed: 'failed',
  no_data: 'no data',
};
const SOURCE_DOT: Record<DataSourceStatus, string> = {
  available: 'bg-green-500',
  not_found: 'bg-ink-soft/40',
  failed: 'bg-red-400',
  no_data: 'bg-ink-soft/40',
};

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  PROJECT_CRYPTO: 'Project / Token',
  KOL_INFLUENCER: 'KOL / Influencer',
  BRAND_OFFICIAL: 'Brand / Official',
  PUBLIC_FIGURE: 'Public Figure',
  PERSONAL_PRIVATE: 'Personal',
  ADULT_CONTENT: 'Adult Content',
  IMPERSONATOR: 'Impersonator',
  UNKNOWN: 'Unknown',
};

type Props = { verdict: XAccountVerdict };

export function XVerdictCard({ verdict }: Props) {
  const minimal = verdict.dataCompleteness === 'minimal';
  const sources: XDataSources = verdict.dataSources ?? { twitter: 'failed', memoryLol: 'no_data' };
  const tc = verdict.tokenCrossCheck;

  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-5 max-w-full">
      {/* [1] HEADER — handle + account type + verdict badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">@{verdict.handle}</p>
            {verdict.isVerified && (
              <span className="text-xs text-sky-600" title="Verified account">✔ verified</span>
            )}
          </div>
          {verdict.displayName && (
            <p className="text-xs text-ink">{verdict.displayName}</p>
          )}
          <p className="text-xs text-ink-soft uppercase tracking-widest">
            {ACCOUNT_TYPE_LABEL[verdict.accountType] ?? verdict.accountType}
          </p>
        </div>
        <VerdictBadge level={verdict.level} />
      </div>

      {/* [2] SUMMARY — di ATAS */}
      <p className="text-sm text-ink text-pretty leading-relaxed">{verdict.summary}</p>

      {/* [3] META */}
      <div className="flex items-center gap-2">
        <ConfidencePill level={verdict.confidence} />
      </div>

      {/* minimal-data notice */}
      {minimal && (
        <div className="text-xs text-ink-soft border border-line rounded-sm bg-bg px-3 py-2">
          Limited public data retrieved. Verdict is <strong>UNVERIFIABLE</strong> — absence of data
          is not evidence of wrongdoing.
        </div>
      )}

      {/* ============================================ */}
      {/* BAGIAN 1 — ACCOUNT INTELLIGENCE              */}
      {/* ============================================ */}

      {!minimal && (
        <VerdictSection label="Account Data">
          {verdict.metrics.accountAgeDays !== null && (
            <DataRow label="Age" icon="neutral">
              {verdict.metrics.accountAgeDays.toLocaleString()} days
            </DataRow>
          )}
          {verdict.metrics.followers !== null && (
            <DataRow label="Followers" icon="neutral">
              {verdict.metrics.followers.toLocaleString()}
              {verdict.metrics.followerGrowthRate !== null && (
                <span className="text-ink-soft font-normal ml-1">(~{verdict.metrics.followerGrowthRate}/day)</span>
              )}
            </DataRow>
          )}
          {verdict.metrics.following !== null && (
            <DataRow label="Following" icon="neutral">{verdict.metrics.following.toLocaleString()}</DataRow>
          )}
          {verdict.metrics.verification && (
            <DataRow label="Verification" icon="neutral">{verdict.metrics.verification}</DataRow>
          )}
          {verdict.metrics.usernameChanges !== null && (
            <DataRow
              label="Handle changes"
              icon={verdict.metrics.usernameChanges > 3 ? 'bad' : verdict.metrics.usernameChanges > 0 ? 'warn' : 'ok'}
            >
              {verdict.metrics.usernameChanges}
            </DataRow>
          )}
        </VerdictSection>
      )}

      {/* IMPERSONATION CHECKS */}
      {verdict.impersonationSignals && (
        <VerdictSection label="Impersonation Checks">
          <DataRow
            label="Name match"
            icon={verdict.impersonationSignals.nameMatchesKnownEntity ? 'bad' : 'ok'}
          >
            {verdict.impersonationSignals.nameMatchesKnownEntity
              ? 'Matches known entity — needs verification'
              : 'No known entity match'}
          </DataRow>
          {verdict.impersonationSignals.caMismatch !== null && (
            <DataRow label="CA cross-check" icon={verdict.impersonationSignals.caMismatch ? 'bad' : 'ok'}>
              {verdict.impersonationSignals.caMismatch ? 'MISMATCH — CA does not acknowledge this account' : 'Matches'}
            </DataRow>
          )}
          <DataRow
            label="Visual mimicry"
            icon={verdict.impersonationSignals.visualMimicry ? 'bad' : 'neutral'}
          >
            {verdict.impersonationSignals.visualMimicry ? 'Detected — similar to known account' : 'None detected'}
          </DataRow>
        </VerdictSection>
      )}

      {/* RED FLAGS */}
      {verdict.redFlags.length > 0 && (
        <VerdictSection label="Red Flags">
          <div className="flex flex-wrap gap-1.5">
            {verdict.redFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-[#8B2C2C]/5 text-[#8B2C2C] border border-[#8B2C2C]/20 rounded-sm font-medium">
                {flag}
              </span>
            ))}
          </div>
        </VerdictSection>
      )}

      {/* SIGNALS */}
      {verdict.signals.length > 0 && (
        <VerdictSection label="Signals">
          {verdict.signals.map((s, i) => (
            <SignalRow key={i} label={s.label} value={s.value} direction={s.direction} />
          ))}
        </VerdictSection>
      )}

      {/* ============================================ */}
      {/* BAGIAN 2 — TOKEN CROSS-CHECK (jika ada CA)  */}
      {/* ============================================ */}

      {tc && (
        <div className="border-t-2 border-line pt-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
            Token Cross-Check — {tc.ticker ?? tc.tokenName ?? tc.ca}
          </p>

          <VerdictSection label="Token Identity">
            <DataRow label="Contract" icon="neutral">
              <span className="font-mono text-xs break-all">{tc.ca}</span>
            </DataRow>
            {tc.tokenName && <DataRow label="Token" icon="neutral">{tc.tokenName}</DataRow>}
            {tc.ticker && <DataRow label="Ticker" icon="neutral">${tc.ticker}</DataRow>}
            {tc.chain && <DataRow label="Chain" icon="neutral">{tc.chain}</DataRow>}
          </VerdictSection>

          <VerdictSection label="Cross-Check Results">
            <DataRow
              label="DexScreener"
              icon={tc.dexscreenerMatch === 'MATCH' ? 'ok' : tc.dexscreenerMatch === 'MISMATCH' ? 'bad' : 'neutral'}
            >
              {tc.dexscreenerMatch}
            </DataRow>
            {tc.accountAgeConsistent !== null && (
              <DataRow label="Age consistent" icon={tc.accountAgeConsistent ? 'ok' : 'warn'}>
                {tc.accountAgeConsistent ? 'Account age is consistent with token launch' : 'Account age inconsistent with token'}
              </DataRow>
            )}
          </VerdictSection>

          {tc.riskScore !== null && (
            <VerdictSection label="Token Risk">
              <DataRow label="Risk score" icon={tc.riskScore > 65 ? 'bad' : tc.riskScore > 35 ? 'warn' : 'ok'}>
                {tc.riskScore}/100
              </DataRow>
              {tc.tokenVerdict && (
                <DataRow label="Token verdict" icon={tc.tokenVerdict === 'LIKELY_RUG' || tc.tokenVerdict === 'HIGH_RISK' ? 'bad' : tc.tokenVerdict === 'DYOR' ? 'warn' : 'ok'}>
                  {tc.tokenVerdict.replace(/_/g, ' ')}
                </DataRow>
              )}
            </VerdictSection>
          )}
        </div>
      )}

      {/* CROSS-LINKS */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
        {tc?.ca && (
          <a
            href={`/project?query=${encodeURIComponent(tc.ca)}`}
            className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
          >
            Investigate token →
          </a>
        )}
        <a
          href={`/wallet?address=${encodeURIComponent(verdict.handle)}`}
          className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
        >
          Check linked wallet →
        </a>
      </div>

      {/* DATA SOURCES */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
        <span className="text-[11px] text-ink-soft uppercase tracking-[0.16em] font-bold text-gold">Sources</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`size-1.5 rounded-full ${SOURCE_DOT[sources.twitter]}`} />
          Twitter: {SOURCE_LABEL[sources.twitter]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`size-1.5 rounded-full ${SOURCE_DOT[sources.memoryLol]}`} />
          memory.lol: {SOURCE_LABEL[sources.memoryLol]}
        </span>
      </div>
    </div>
  );
}
