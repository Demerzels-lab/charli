// app/api/agent/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import type { AgentMessage } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';
import { makeSSEStream } from '@/lib/agent/stream';
import { getSession, saveSession } from '@/lib/agent/session';
import { detectIntent, dispatchInvestigation } from '@/lib/agent/dispatcher';
import { callLLM } from '@/lib/openrouter';
import { buildAgentSystemPrompt, buildAgentUserContent } from '@/lib/prompts/agent';

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  let incomingMessages: AgentMessage[];
  let sessionId: string;
  try {
    const body = await req.json() as { messages?: unknown; sessionId?: unknown };
    if (!Array.isArray(body.messages)) throw new Error();
    incomingMessages = body.messages as AgentMessage[];
    sessionId = typeof body.sessionId === 'string' ? body.sessionId : crypto.randomUUID();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const ip = getIp(req);
  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { readable, send, close } = makeSSEStream();

  (async () => {
    try {
      const sessionHistory = await getSession(sessionId);
      const allMessages: AgentMessage[] = [...sessionHistory, ...incomingMessages];

      send({ event: 'tool', data: { name: 'intent_classifier', status: 'running' } });
      const intent = await detectIntent(allMessages);
      send({ event: 'tool', data: { name: 'intent_classifier', status: 'done' } });

      let verdictSummary: string | null = null;
      if (intent.type !== 'chat') {
        const toolName = `lookup_${intent.type}`;
        send({ event: 'tool', data: { name: toolName, status: 'running' } });
        try {
          const verdict = await dispatchInvestigation(intent);
          if (verdict) {
            send({ event: 'verdict', data: verdict });
            verdictSummary = JSON.stringify(verdict, null, 2);
          }
          send({ event: 'tool', data: { name: toolName, status: 'done' } });
        } catch (err) {
          console.error('[agent] dispatch error:', (err as Error).message);
          send({ event: 'tool', data: { name: toolName, status: 'failed' } });
        }
      }

      const systemPrompt = buildAgentSystemPrompt();
      const userContent = buildAgentUserContent(allMessages, verdictSummary);
      const response = await callLLM(systemPrompt, userContent);

      const words = response.split(' ');
      for (const word of words) {
        send({ event: 'token', data: { text: word + ' ' } });
        await new Promise(r => setTimeout(r, 10));
      }

      const assistantMessage: AgentMessage = { role: 'assistant', content: response };
      await saveSession(sessionId, [...allMessages, assistantMessage]);

      send({ event: 'done', data: {} });
    } catch (err) {
      console.error('[agent chat] error:', (err as Error).message);
      send({ event: 'error', data: { message: 'Internal error' } });
    } finally {
      close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
