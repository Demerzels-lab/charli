// components/ProjectVerdictCard.tsx
'use client';

import type { ProjectVerdict } from '@/lib/types';
import { VerdictSection, DataRow, VerdictBadge, ConfidencePill, SignalRow } from './verdict/VerdictPrimitives';

type Props = { verdict: ProjectVerdict };

export function ProjectVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-5 max-w-full">
      {/* [1] HEADER — target identity + verdict badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          {verdict.tokenName ? (
            <>
              <p className="text-sm font-semibold text-ink">
                {verdict.tokenName} {verdict.tokenSymbol ? `(${verdict.tokenSymbol})` : ''}
              </p>
              <p className="text-xs text-ink-soft font-mono break-all">{verdict.query}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-ink break-all">{verdict.query}</p>
          )}
          <p className="text-xs text-ink-soft uppercase tracking-widest">{verdict.resolvedAs}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <VerdictBadge level={verdict.level} />
          <span className="text-xs tabular-nums text-ink-soft font-semibold">
            Risk: {verdict.riskScore}/100
          </span>
        </div>
      </div>

      {/* [2] SUMMARY — di ATAS */}
      <p className="text-sm text-ink text-pretty leading-relaxed">{verdict.summary}</p>

      {/* [3] META */}
      <div className="flex items-center gap-2">
        <ConfidencePill level={verdict.confidence} />
      </div>

      {/* [4] DATA SECTIONS */}

      {/* TOKEN IDENTITY */}
      <VerdictSection label="Token Identity">
        {verdict.marketCap != null && (
          <DataRow label="Market cap" icon="neutral">${verdict.marketCap.toLocaleString()}</DataRow>
        )}
        {verdict.liquidityUsd != null && (
          <DataRow label="Liquidity" icon="neutral">${verdict.liquidityUsd.toFixed(0)}</DataRow>
        )}
        {verdict.deployer && (
          <DataRow label="Deployer" icon="neutral">
            <span className="font-mono text-xs break-all">{verdict.deployer}</span>
          </DataRow>
        )}
      </VerdictSection>

      {/* SOCIALS */}
      {verdict.socials && (verdict.socials.site || verdict.socials.telegram || verdict.socials.x) && (
        <VerdictSection label="Social Presence">
          {verdict.socials.x && <DataRow label="X / Twitter" icon="neutral">{verdict.socials.x}</DataRow>}
          {verdict.socials.telegram && <DataRow label="Telegram" icon="neutral">@{verdict.socials.telegram}</DataRow>}
          {verdict.socials.site && <DataRow label="Website" icon="neutral">{verdict.socials.site}</DataRow>}
        </VerdictSection>
      )}

      {/* DOMAIN INTEL */}
      {verdict.domain && (
        <VerdictSection label="Domain Intel">
          {verdict.domain.ageDays !== null && (
            <DataRow label="Domain age" icon={verdict.domain.ageDays < 7 ? 'bad' : verdict.domain.ageDays < 30 ? 'warn' : 'ok'}>
              {verdict.domain.ageDays} days
            </DataRow>
          )}
          {verdict.domain.registrar && (
            <DataRow label="Registrar" icon="neutral">{verdict.domain.registrar}</DataRow>
          )}
          {verdict.domain.createdAt && (
            <DataRow label="Registered" icon="neutral">{new Date(verdict.domain.createdAt).toLocaleDateString()}</DataRow>
          )}
        </VerdictSection>
      )}

      {/* NARRATIVE FLAGS */}
      {verdict.narrativeFlags.length > 0 && (
        <VerdictSection label="Manipulation Signals">
          <div className="flex flex-wrap gap-1.5">
            {verdict.narrativeFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-[#8B2C2C]/5 text-[#8B2C2C] border border-[#8B2C2C]/20 rounded-sm font-medium">
                {flag}
              </span>
            ))}
          </div>
        </VerdictSection>
      )}

      {/* [5] SIGNALS / FINDINGS */}
      {verdict.findings.length > 0 && (
        <VerdictSection label="Findings">
          {verdict.findings.map((f, i) => (
            <SignalRow key={i} label={f.label} value={f.detail} direction={f.direction} />
          ))}
        </VerdictSection>
      )}

      {/* [6] CROSS-LINKS */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
        {verdict.deployer && (
          <a
            href={`/wallet?address=${encodeURIComponent(verdict.deployer)}`}
            className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
          >
            Investigate deployer wallet →
          </a>
        )}
        {verdict.socials?.x && (
          <a
            href={`/x-account?handle=${encodeURIComponent(verdict.socials.x.replace(/^@/, ''))}`}
            className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
          >
            Investigate X account →
          </a>
        )}
      </div>
    </div>
  );
}
