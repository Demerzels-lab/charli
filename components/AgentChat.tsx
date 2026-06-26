'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { AgentMessage, WalletVerdict, ProjectVerdict, XAccountVerdict } from '@/lib/types';
import { AgentToolBadge } from './AgentToolBadge';
import { WalletVerdictCard } from './WalletVerdictCard';
import { ProjectVerdictCard } from './ProjectVerdictCard';
import { XVerdictCard } from './XVerdictCard';

const Carli3DAvatar = dynamic(() => import('./Carli3DAvatar').then(m => m.Carli3DAvatar), { ssr: false });

type ToolEvent = { name: string; status: 'running' | 'done' | 'failed' };
type VerdictData = WalletVerdict | ProjectVerdict | XAccountVerdict;

type MessageEntry =
  | { type: 'user'; content: string }
  | { type: 'assistant'; content: string; tools: ToolEvent[]; verdict: VerdictData | null };

function isWalletVerdict(v: VerdictData): v is WalletVerdict {
  return 'chain' in v && 'classification' in v;
}
function isProjectVerdict(v: VerdictData): v is ProjectVerdict {
  return 'resolvedAs' in v && 'riskScore' in v;
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/`(.+?)`/g, '$1')          // `code` → code
    .replace(/#{1,6}\s/g, '')           // ## heading → heading
    .trim();
}

export function AgentChat() {
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const sessionId = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setStreaming(true);

    const apiMessages: AgentMessage[] = [
      ...messages.map(m => ({
        role: m.type as 'user' | 'assistant',
        content: m.type === 'assistant'
          ? (m as Extract<MessageEntry, { type: 'assistant' }>).content
          : (m as Extract<MessageEntry, { type: 'user' }>).content,
      })),
      { role: 'user', content: userMessage },
    ];

    setMessages(prev => [
      ...prev,
      { type: 'user', content: userMessage },
      { type: 'assistant', content: '', tools: [], verdict: null },
    ]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, sessionId: sessionId.current }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const eventLine = part.split('\n').find(l => l.startsWith('event: '));
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace('event: ', '').trim();
          const data = JSON.parse(dataLine.replace('data: ', '').trim());

          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.type !== 'assistant') return prev;

            if (eventType === 'token') {
              return [...updated.slice(0, -1), { ...last, content: last.content + (data as { text: string }).text }];
            }
            if (eventType === 'tool') {
              const toolEvent = data as ToolEvent;
              const existingIdx = last.tools.findIndex(t => t.name === toolEvent.name);
              const newTools = existingIdx >= 0
                ? last.tools.map((t, i) => i === existingIdx ? toolEvent : t)
                : [...last.tools, toolEvent];
              return [...updated.slice(0, -1), { ...last, tools: newTools }];
            }
            if (eventType === 'verdict') {
              return [...updated.slice(0, -1), { ...last, verdict: data as VerdictData }];
            }
            return prev;
          });
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.type === 'assistant') {
          return [...updated.slice(0, -1), { ...last, content: 'Connection failed. Try again.' }];
        }
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-full">
      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden space-y-5 py-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Carli3DAvatar size={64} />
            <div>
              <p className="text-sm font-semibold text-ink">CARLI is ready.</p>
              <p className="text-xs text-ink-soft mt-1 max-w-xs mx-auto">
                Paste anything — a wallet, an X handle, a contract address, or just describe what you want to check.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Check a wallet', hint: '3oiTazAuUTfoVP3fvPoTjRKAYLf1YkiTjR6WfTDZUiVw' },
                { label: 'Investigate X account', hint: '@elonmusk' },
                { label: 'Check a project', hint: 'pump.fun' },
              ].map(({ label, hint }) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-soft/60 mt-2">No logins. No subscriptions. Public data only.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.type === 'user' ? 'flex justify-end' : ''}>
            {msg.type === 'user' ? (
              <div className="max-w-[85%] bg-ink text-bg text-sm px-3 py-2 rounded-sm leading-relaxed break-all">
                {msg.content}
              </div>
            ) : (
              <div className="flex gap-2.5 max-w-full">
                <Carli3DAvatar size={32} />
                <div className="space-y-2 flex-1 min-w-0 max-w-full">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">CARLI</p>
                  {msg.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {msg.tools.map((t, j) => (
                        <AgentToolBadge key={j} name={t.name} status={t.status} />
                      ))}
                    </div>
                  )}
                  {msg.verdict && (() => {
                    const v = msg.verdict;
                    return (
                    <div className="space-y-3">
                      {isWalletVerdict(v) && <WalletVerdictCard verdict={v} />}
                      {isProjectVerdict(v) && <ProjectVerdictCard verdict={v} />}
                      {!isWalletVerdict(v) && !isProjectVerdict(v) && (
                        <XVerdictCard verdict={v as XAccountVerdict} />
                      )}
                      {/* Follow-up suggestion chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {isWalletVerdict(v) && v.linkedProjects.length > 0 && (
                          <button
                            onClick={() => setInput(`Investigate ${v.linkedProjects[0].name}`)}
                            className="text-xs border border-line px-2.5 py-1 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
                          >
                            Investigate linked project →
                          </button>
                        )}
                        {isProjectVerdict(v) && v.deployer && (
                          <button
                            onClick={() => setInput(v.deployer!)}
                            className="text-xs border border-line px-2.5 py-1 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
                          >
                            Check deployer wallet →
                          </button>
                        )}
                        <button
                          onClick={() => setInput(`Why ${isWalletVerdict(v) ? v.level : isProjectVerdict(v) ? v.level : (v as XAccountVerdict).level}?`)}
                          className="text-xs border border-line px-2.5 py-1 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
                        >
                          Why this verdict?
                        </button>
                      </div>
                    </div>
                    );
                  })()}
                  {msg.content ? (
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
                    </p>
                  ) : msg.tools.length === 0 && !msg.verdict ? (
                    <div className="flex items-center gap-1.5 text-sm text-ink-soft">
                      <span className="size-1.5 rounded-full bg-gold animate-pulse" />
                      CARLI is reading the signals…
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line pt-4 pb-1">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={streaming}
          placeholder="Wallet, project, X handle, or question…"
          className="flex-1 bg-surface border border-line rounded-sm px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="bg-ink text-bg text-sm font-semibold px-5 py-2.5 rounded-sm disabled:opacity-40 transition-opacity"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
