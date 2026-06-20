// lib/openrouter.ts

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function callLLM(
  systemPrompt: string,
  userContent: string,
  timeoutMs = 30_000
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OPENROUTER_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CARLI',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${body}`);
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response from LLM');
    return text;
  } finally {
    clearTimeout(timer);
  }
}
