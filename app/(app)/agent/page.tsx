import { AgentChat } from '@/components/AgentChat';

export default function AgentPage() {
  return (
    <main className="px-4 py-8" style={{ height: 'calc(100vh - 3.5rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="mx-auto w-full max-w-xl flex flex-col flex-1 min-h-0 space-y-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-balance">Agent Mode</h1>
          <p className="text-sm text-ink-soft text-pretty mt-1">
            Paste a wallet, project, or X handle. CARLI investigates and synthesizes.
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <AgentChat />
        </div>
        <p className="shrink-0 border-t border-line pt-4 text-xs text-ink-soft">
          CARLI uses only public data. Not financial advice. DYOR.
        </p>
      </div>
    </main>
  );
}
