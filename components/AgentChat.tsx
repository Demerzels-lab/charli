'use client';

import { useState, useRef, useEffect } from 'react';
import type { AgentMessage, WalletVerdict, ProjectVerdict, XAccountVerdict } from '@/lib/types';
import { AgentToolBadge } from './AgentToolBadge';
import { WalletVerdictCard } from './WalletVerdictCard';
import { ProjectVerdictCard } from './ProjectVerdictCard';
import { XVerdictCard } from './XVerdictCard';

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
    <div className="flex flex-col h-full">
      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-sm text-ink-soft">Paste a wallet, X handle, or project name.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', '@elonmusk', 'pump.fun'].map(hint => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs border border-line px-3 py-1.5 text-ink-soft hover:text-ink hover:border-ink transition-colors rounded-sm"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.type === 'user' ? 'flex justify-end' : 'space-y-2'}>
            {msg.type === 'user' ? (
              <div className="max-w-sm bg-ink text-bg text-sm px-3 py-2 rounded-sm leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-2 max-w-xl">
                {msg.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.tools.map((t, j) => (
                      <AgentToolBadge key={j} name={t.name} status={t.status} />
                    ))}
                  </div>
                )}
                {msg.verdict && (
                  <div>
                    {isWalletVerdict(msg.verdict) && <WalletVerdictCard verdict={msg.verdict} />}
                    {isProjectVerdict(msg.verdict) && <ProjectVerdictCard verdict={msg.verdict} />}
                    {!isWalletVerdict(msg.verdict) && !isProjectVerdict(msg.verdict) && (
                      <XVerdictCard verdict={msg.verdict as XAccountVerdict} />
                    )}
                  </div>
                )}
                {msg.content && (
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                    {cleanText(msg.content)}
                  </p>
                )}
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
