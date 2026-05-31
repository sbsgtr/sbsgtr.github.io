-- NEXi Chat Memory: Persistent conversation history
-- Run this in your Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up sessions by visitor
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor ON chat_sessions(visitor_id);

-- Index for sorting by most recent
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anon access (the Edge Function uses service_role, but this is for safety)
CREATE POLICY "Allow anon insert" ON chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select" ON chat_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update" ON chat_sessions FOR UPDATE TO anon USING (true);
