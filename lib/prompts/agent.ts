// lib/prompts/agent.ts
import type { AgentMessage } from '../types';

export function buildAgentSystemPrompt(): string {
  return `You are CARLI — a crypto intelligence assistant. You help users investigate wallets, crypto projects, and X (Twitter) accounts for scam and rug pull signals.

When responding:
- Be direct and intelligence-style — no fluff, no disclaimers in body text
- If an investigation result is provided, synthesize it into a clear assessment
- Reference specific signals and data points
- If asked a general question, answer concisely with actionable advice
- Keep responses under 200 words
- End with one concrete recommendation (what the user should do next)`;
}

export function buildAgentUserContent(
  messages: AgentMessage[],
  verdictSummary: string | null
): string {
  const history = messages
    .map(m => `${m.role === 'user' ? 'User' : 'CARLI'}: ${m.content}`)
    .join('\n');

  if (verdictSummary) {
    return `${history}\n\n[Investigation result]\n${verdictSummary}\n\nCARLI:`;
  }
  return `${history}\n\nCARLI:`;
}
