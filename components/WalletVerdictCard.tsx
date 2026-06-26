// components/WalletVerdictCard.tsx
'use client';

import type { WalletVerdict } from '@/lib/types';
import { VerdictSection, DataRow, VerdictBadge, ConfidencePill, SignalRow } from './verdict/VerdictPrimitives';

type Props = { verdict: WalletVerdict };

export function WalletVerdictCard({ verdict }: Props) {
  const ageDays = verdict.firstSeen
    ? Math.floor((Date.now() - new Date(verdict.firstSeen).getTime()) / 86_400_000)
    : null;

  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-5 max-w-full">
      {/* [1] HEADER — target identity + verdict badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-ink-soft font-mono break-all">{verdict.address}</p>
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <span className="uppercase tracking-widest">{verdict.chain}</span>
            <span className="text-line">·</span>
            <span className="capitalize">{verdict.classification}</span>
          </div>
        </div>
        <VerdictBadge level={verdict.level} />
      </div>

      {/* [2] SUMMARY — 1-2 sentences, di ATAS */}
      <p className="text-sm text-ink text-pretty leading-relaxed">{verdict.summary}</p>

      {/* [3] META ROW — confidence */}
      <div className="flex items-center gap-2">
        <ConfidencePill level={verdict.confidence} />
        {ageDays !== null && (
          <span className="text-[11px] text-ink-soft tabular-nums">{ageDays} days old</span>
        )}
      </div>

      {verdict.level === 'UNVERIFIABLE' && (
        <div className="text-xs text-ink-soft border border-line rounded-sm bg-bg px-3 py-2">
          No on-chain data retrieved. Configure Helius (Solana) or Etherscan (EVM) API keys to enable full analysis.
        </div>
      )}

      {/* [4] DATA SECTIONS — grouped, not a flat list */}

      {/* IDENTITY */}
      <VerdictSection label="Identity">
        {verdict.balanceUsd !== null && (
          <DataRow label="Balance" icon="neutral">${verdict.balanceUsd.toLocaleString()}</DataRow>
        )}
        {verdict.firstSeen && (
          <DataRow label="Created" icon="neutral">
            {new Date(verdict.firstSeen).toLocaleDateString()} {ageDays !== null && `(${ageDays}d ago)`}
          </DataRow>
        )}
        {verdict.lastActive && (
          <DataRow label="Last active" icon="neutral">
            {new Date(verdict.lastActive).toLocaleDateString()}
          </DataRow>
        )}
      </VerdictSection>

      {/* LINKED PROJECTS */}
      {verdict.linkedProjects.length > 0 && (
        <VerdictSection label="Linked Projects">
          {verdict.linkedProjects.map((p, i) => (
            <DataRow key={i} label={p.role} icon="neutral">
              {p.name} {p.note && `— ${p.note}`}
            </DataRow>
          ))}
        </VerdictSection>
      )}

      {/* [5] SIGNALS */}
      {verdict.signals.length > 0 && (
        <VerdictSection label="Signals">
          {verdict.signals.map((s, i) => (
            <SignalRow key={i} label={s.label} value={s.value} direction={s.direction} />
          ))}
        </VerdictSection>
      )}

      {/* [6] CROSS-LINKS */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
        {verdict.linkedProjects.length > 0 && (
          <a
            href={`/project?query=${encodeURIComponent(verdict.linkedProjects[0].name)}`}
            className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
          >
            Investigate linked project →
          </a>
        )}
        {verdict.address && (
          <a
            href={`/wallet?address=${encodeURIComponent(verdict.address)}`}
            className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
          >
            Who funded this wallet →
          </a>
        )}
      </div>
    </div>
  );
}
