// components/WalletVerdictCard.tsx
'use client';

import type { WalletVerdict } from '@/lib/types';

const LEVEL_STYLES: Record<WalletVerdict['level'], string> = {
  CLEAN: 'text-green-700 bg-green-50 border-green-200',
  WATCH: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  FLAGGED: 'text-red-700 bg-red-50 border-red-200',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};

const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

type Props = { verdict: WalletVerdict };

export function WalletVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-soft font-mono break-all">{verdict.address}</p>
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            {verdict.chain} · {verdict.classification}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
          {verdict.level}
        </span>
      </div>

      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      <div className="grid grid-cols-2 gap-2 text-xs tabular-nums text-ink-soft">
        {verdict.balanceUsd !== null && (
          <span>Balance: ${verdict.balanceUsd.toLocaleString()}</span>
        )}
        {verdict.firstSeen && (
          <span>First seen: {new Date(verdict.firstSeen).toLocaleDateString()}</span>
        )}
        {verdict.lastActive && (
          <span>Last active: {new Date(verdict.lastActive).toLocaleDateString()}</span>
        )}
        <span>Confidence: {verdict.confidence}</span>
      </div>

      <div className="space-y-1 border-t border-line pt-4">
        {verdict.signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={`w-4 shrink-0 font-mono ${DIRECTION_STYLES[signal.direction]}`}>
              {DIRECTION_ICON[signal.direction]}
            </span>
            <span className="text-ink-soft">{signal.label}:</span>
            <span className="text-ink">{signal.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
