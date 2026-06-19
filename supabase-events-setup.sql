-- ============================================================================
--  MIRIFER — Events table (precise product analytics)
--  Run this ENTIRE script once in the Supabase SQL Editor.
--
--  A lightweight append-only event log. The app writes one timestamped row per
--  meaningful action (lesson_started, lesson_completed, …). Unlike the proxy
--  "last_active" approximation, this gives true daily-active and retention
--  curves because every action keeps its own timestamp.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_name  TEXT NOT NULL,
    day         INTEGER,                       -- optional lesson-day context
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_created ON public.events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events(event_name, created_at);

-- Row Level Security: each user can only write/read their own events.
-- (The SQL Editor runs as service role and bypasses this for your analytics.)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
    ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own events"
    ON public.events FOR SELECT USING (auth.uid() = user_id);
