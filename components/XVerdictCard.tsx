// components/XVerdictCard.tsx
'use client';

import type { XAccountVerdict, DataSourceStatus } from '@/lib/types';

const LEVEL_STYLES: Record<XAccountVerdict['level'], string> = {
  LEGIT: 'text-green-700 bg-green-50 border-green-200',
  DYOR: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  RED_FLAG: 'text-red-700 bg-red-50 border-red-200',
  UNVERIFIABLE: 'text-ink-soft bg-surface border-line',
};

const LEVEL_LABEL: Record<XAccountVerdict['level'], string> = {
  LEGIT: 'LEGIT',
  DYOR: 'DYOR',
  RED_FLAG: 'RED FLAG',
  UNVERIFIABLE: 'UNVERIFIABLE',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};
const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

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

type Props = { verdict: XAccountVerdict };

export function XVerdictCard({ verdict }: Props) {
  const minimal = verdict.dataCompleteness === 'minimal';

  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">@{verdict.handle}</p>
            {verdict.isVerified && (
              <span className="text-xs text-sky-600" title="Verified account">✔ verified</span>
            )}
          </div>
          {verdict.displayName && (
            <p className="text-xs text-ink mt-0.5">{verdict.displayName}</p>
          )}
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            X Account · {verdict.confidence}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
          {LEVEL_LABEL[verdict.level]}
        </span>
      </div>

      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      {/* minimal-data notice */}
      {minimal && (
        <div className="text-xs text-ink-soft border border-line rounded-sm bg-bg px-3 py-2">
          Limited public data retrieved. Verdict is <strong>UNVERIFIABLE</strong> — absence of data
          is not evidence of wrongdoing.
        </div>
      )}

      {/* metrics */}
      {!minimal && (
        <div className="grid grid-cols-2 gap-2 text-xs tabular-nums text-ink-soft border-t border-line pt-3">
          {verdict.metrics.accountAgeDays !== null && (
            <span>Age: {verdict.metrics.accountAgeDays.toLocaleString()} days</span>
          )}
          {verdict.metrics.followers !== null && (
            <span>Followers: {verdict.metrics.followers.toLocaleString()}</span>
          )}
          {verdict.metrics.following !== null && (
            <span>Following: {verdict.metrics.following.toLocaleString()}</span>
          )}
          {verdict.metrics.usernameChanges !== null && (
            <span className={verdict.metrics.usernameChanges > 3 ? 'text-red-600 font-medium' : ''}>
              Username changes: {verdict.metrics.usernameChanges}
            </span>
          )}
        </div>
      )}

      {/* red flags */}
      {verdict.redFlags.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-ink-soft uppercase tracking-widest mb-2">Red flags</p>
          <div className="flex flex-wrap gap-1">
            {verdict.redFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-sm">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* signals */}
      {verdict.signals.length > 0 && (
        <div className="space-y-1 border-t border-line pt-3">
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
      )}

      {/* data sources */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <span className="text-xs text-ink-soft uppercase tracking-widest">Sources</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`size-1.5 rounded-full ${SOURCE_DOT[verdict.dataSources.twitter]}`} />
          Twitter: {SOURCE_LABEL[verdict.dataSources.twitter]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`size-1.5 rounded-full ${SOURCE_DOT[verdict.dataSources.memoryLol]}`} />
          memory.lol: {SOURCE_LABEL[verdict.dataSources.memoryLol]}
        </span>
      </div>
    </div>
  );
}
