// lib/agent/session.ts
import { supabaseAdmin } from '../supabase';
import type { AgentMessage } from '../types';

const SESSION_TTL_MINUTES = 60;

export async function getSession(sessionId: string): Promise<AgentMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('agent_sessions')
    .select('messages, updated_at')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) return [];

  const updatedAt = new Date(data.updated_at as string);
  const ageMinutes = (Date.now() - updatedAt.getTime()) / (1000 * 60);
  if (ageMinutes > SESSION_TTL_MINUTES) {
    supabaseAdmin.from('agent_sessions').delete().eq('session_id', sessionId);
    return [];
  }

  return (data.messages as AgentMessage[]) ?? [];
}

export async function saveSession(sessionId: string, messages: AgentMessage[]): Promise<void> {
  await supabaseAdmin.from('agent_sessions').upsert(
    { session_id: sessionId, messages, updated_at: new Date().toISOString() },
    { onConflict: 'session_id' }
  );
}
