-- Mirifer insights, phase three. Additive and safe to run more than once.
-- Run in the same Supabase project as supabase-learner-insights.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.analytics_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL CHECK (protocol = 'de-check-v1'),
  checkpoint INTEGER NOT NULL CHECK (checkpoint IN (0,14,30,90,180)),
  form TEXT NOT NULL CHECK (form IN ('a','b')),
  baseline_id UUID REFERENCES public.analytics_assessments(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  listening_correct INTEGER CHECK (listening_correct BETWEEN 0 AND 6),
  reading_correct INTEGER CHECK (reading_correct BETWEEN 0 AND 6),
  skipped INTEGER CHECK (skipped BETWEEN 0 AND 12),
  UNIQUE (user_id, protocol, checkpoint),
  CHECK ((checkpoint = 0 AND baseline_id IS NULL) OR (checkpoint > 0 AND baseline_id IS NOT NULL)),
  CHECK (completed_at IS NULL OR (completed_at >= started_at AND listening_correct IS NOT NULL AND reading_correct IS NOT NULL AND skipped IS NOT NULL)),
  CHECK (listening_correct + reading_correct + skipped <= 12)
);
CREATE INDEX IF NOT EXISTS analytics_assessments_user_time ON public.analytics_assessments(user_id, started_at);

CREATE TABLE IF NOT EXISTS public.analytics_acquisition (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('direct','google','bing','instagram','telegram','reddit','youtube','facebook','linkedin','x','friend','email','other_referral','unknown')),
  method TEXT NOT NULL CHECK (method IN ('tag','referrer','direct','unavailable')),
  captured_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  new_account BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS public.analytics_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  hypothesis TEXT NOT NULL CHECK (char_length(hypothesis) BETWEEN 1 AND 600),
  shipped_at TIMESTAMPTZ NOT NULL,
  window_days INTEGER NOT NULL CHECK (window_days IN (7,14,30)),
  metric TEXT NOT NULL CHECK (metric IN ('activation','completion','return','obstacle')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.analytics_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_acquisition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_assessments, public.analytics_acquisition, public.analytics_changes FROM anon, authenticated;
GRANT SELECT ON public.analytics_assessments, public.analytics_acquisition TO authenticated;
DROP POLICY IF EXISTS "Read own assessment summaries" ON public.analytics_assessments;
CREATE POLICY "Read own assessment summaries" ON public.analytics_assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Read own acquisition" ON public.analytics_acquisition;
CREATE POLICY "Read own acquisition" ON public.analytics_acquisition FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Scores and attribution are written by verified server endpoints only.
-- The change log requires administrator authorization before any service-role call.
GRANT ALL ON public.analytics_assessments, public.analytics_acquisition, public.analytics_changes TO service_role;
COMMIT;

SELECT 'Phase three tables ready' AS status;
