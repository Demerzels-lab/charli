// app/(app)/project/page.tsx
'use client';

import { useState } from 'react';
import type { ApiResponse, ProjectVerdict } from '@/lib/types';
import { ProjectVerdictCard } from '@/components/ProjectVerdictCard';
import { RateLimitBanner } from '@/components/RateLimitBanner';
import { InvestigationLoader } from '@/components/InvestigationLoader';

export default function ProjectPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<ProjectVerdict> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/investigate/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = await res.json() as ApiResponse<ProjectVerdict>;
      setResult(json);
    } catch {
      setResult({
        ok: false,
        error: { code: 'NETWORK_ERROR', message: 'Network request failed' },
        meta: { cached: false, tookMs: 0, ratelimit: { remaining: 5, resetAt: '' } },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-ink px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-balance">Project OSINT</h1>
          <p className="text-sm text-ink-soft text-pretty mt-1">
            Enter a token name, contract address, or domain to investigate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="moontoken.xyz / 0x... / MoonToken"
            className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full bg-ink text-bg text-sm font-semibold py-2 rounded-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Investigating…' : 'Run Investigation'}
          </button>
        </form>

        {loading && <InvestigationLoader type="project" />}
        {result && (
          <div className="space-y-3">
            {result.ok ? (
              <ProjectVerdictCard verdict={result.data} />
            ) : (
              <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-sm px-3 py-2">
                {result.error.message}
              </div>
            )}
            <RateLimitBanner
              remaining={result.meta.ratelimit.remaining}
              resetAt={result.meta.ratelimit.resetAt}
            />
            <p className="text-xs text-ink-soft tabular-nums">
              {result.meta.cached ? 'Cached · ' : ''}{result.meta.tookMs}ms
            </p>
          </div>
        )}

        <p className="text-xs text-ink-soft text-pretty border-t border-line pt-4">
          CARLI uses only public data for research purposes. Not financial advice. DYOR.
        </p>
      </div>
    </main>
  );
}
