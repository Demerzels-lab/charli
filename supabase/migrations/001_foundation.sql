-- supabase/migrations/001_foundation.sql

-- Cache table
CREATE TABLE IF NOT EXISTS cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cache_key_idx ON cache(key);
CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache(expires_at);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, date)
);

-- Agent sessions table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS agent_sessions_session_id_idx ON agent_sessions(session_id);
