-- ============================================================
-- MIRIFER: Goethe A1 Mock-Exam Schema
-- Run in Supabase SQL Editor AFTER supabase-content-schema.sql
-- (depends on public.user_profiles.is_admin and public.set_updated_at()).
-- ============================================================

-- ============================================================
-- 1. MOCK_EXAMS — one row per full exam paper
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,          -- e.g. 'a1-mock-1'
  level          TEXT NOT NULL DEFAULT 'A1' CHECK (level IN ('A1','A2','B1')),
  title          TEXT NOT NULL,
  title_fa       TEXT,
  description    TEXT,
  description_fa TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_published   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_sort ON public.mock_exams(sort_order);

-- ============================================================
-- 2. MOCK_EXAM_TASKS — one row per task
-- `payload` holds the task union (mock-exam.schema.ts); the scalar columns
-- are denormalized copies for querying + ordering (cf. basics_sections JSONB).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mock_exam_tasks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mock_exam_id  UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  module        TEXT NOT NULL CHECK (module IN ('hoeren','lesen','schreiben','sprechen')),
  teil          INTEGER NOT NULL CHECK (teil BETWEEN 1 AND 3),
  kind          TEXT NOT NULL CHECK (kind IN (
                  'choice','true_false','form_fill','free_write',
                  'speak_intro','speak_spell','speak_number','speak_qa','speak_request')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_tasks_exam
  ON public.mock_exam_tasks(mock_exam_id, module, teil, sort_order);

-- ============================================================
-- 3. MOCK_EXAM_RESULTS — one row per attempt (per user)
-- Kept separate from exam_results (weekly exams): mocks are slug-keyed,
-- carry per-module scores, and have no week_number.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mock_exam_results (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_exam_slug TEXT NOT NULL,
  level          TEXT NOT NULL DEFAULT 'A1',
  total          INTEGER NOT NULL CHECK (total BETWEEN 0 AND 100),
  passed         BOOLEAN NOT NULL,
  module_scores  JSONB NOT NULL,        -- { hoeren:{raw,possible,scaled}, ... }
  wrong_answers  JSONB,
  taken_at       BIGINT NOT NULL,       -- epoch ms (matches exam_results.taken_at)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_results_user
  ON public.mock_exam_results(user_id, taken_at DESC);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.mock_exams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;

-- Public READ — published papers only (drafts stay admin-only).
CREATE POLICY "Public read published mock_exams" ON public.mock_exams
  FOR SELECT USING (is_published = true);
CREATE POLICY "Public read tasks of published mock_exams" ON public.mock_exam_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.mock_exams e
    WHERE e.id = mock_exam_id AND e.is_published = true));

-- Admin READ — see drafts too.
CREATE POLICY "Admin read mock_exams" ON public.mock_exams
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin read mock_exam_tasks" ON public.mock_exam_tasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin WRITE — content management.
CREATE POLICY "Admin write mock_exams" ON public.mock_exams
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin write mock_exam_tasks" ON public.mock_exam_tasks
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- Results — each user owns their attempts.
CREATE POLICY "Users read own mock results" ON public.mock_exam_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mock results" ON public.mock_exam_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mock results" ON public.mock_exam_results
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 5. UPDATED_AT TRIGGERS (reuse public.set_updated_at from content schema)
-- ============================================================
CREATE TRIGGER trg_mock_exams_updated_at
  BEFORE UPDATE ON public.mock_exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mock_exam_tasks_updated_at
  BEFORE UPDATE ON public.mock_exam_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. EXAMPLE TASK PAYLOAD (for reference — real seed lands with mock #1)
-- ============================================================
-- INSERT INTO public.mock_exams (slug, title, title_fa, is_published)
--   VALUES ('a1-mock-1', 'A1 Mock Exam 1', 'آزمون آزمایشی A1 شماره ۱', false);
-- payload example (kind='choice'):
--   {"kind":"choice","id":"h1-1","module":"hoeren","teil":1,"points":1,
--    "audioText":"Entschuldigung, wo ist der Bahnhof?","playLimit":2,
--    "question":"Was sucht der Mann?","options":["den Bahnhof","die Bank","die Post"],
--    "correctIndex":0}
