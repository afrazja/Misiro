-- ============================================================
-- MISIRO: Content Tables Schema
-- Run this in Supabase SQL Editor (after the original setup SQL)
-- ============================================================

-- ============================================================
-- 1. ADD is_admin FLAG TO user_profiles
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. LESSONS TABLE (replaces lessons/index.json)
-- ============================================================
CREATE TABLE public.lessons (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day        INTEGER NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  title_fa   TEXT,
  "group"    TEXT NOT NULL CHECK ("group" IN ('basics','survival','scenarios','advanced')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_day ON public.lessons(day);
CREATE INDEX idx_lessons_sort ON public.lessons(sort_order);

-- ============================================================
-- 3. SENTENCES TABLE (replaces day-N.json content)
-- ============================================================
CREATE TABLE public.sentences (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id      UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  sentence_order INTEGER NOT NULL DEFAULT 0,
  role           TEXT NOT NULL CHECK (role IN ('received','sent')),
  audio_text     TEXT,
  target_text    TEXT,
  translation    TEXT NOT NULL,
  translation_fa TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sentences_lesson ON public.sentences(lesson_id, sentence_order);

-- ============================================================
-- 4. BASICS CATEGORIES TABLE (replaces basics.ts categories)
-- ============================================================
CREATE TABLE public.basics_categories (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key            TEXT NOT NULL UNIQUE,
  icon           TEXT NOT NULL,
  title_en       TEXT NOT NULL,
  title_fa       TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('grid','multi','table','conjugation')),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_basics_categories_sort ON public.basics_categories(sort_order);

-- ============================================================
-- 5. BASICS SECTIONS TABLE (for 'multi' type categories)
-- ============================================================
CREATE TABLE public.basics_sections (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.basics_categories(id) ON DELETE CASCADE,
  heading_en  TEXT NOT NULL,
  heading_fa  TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('table','grid','conjugation')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  -- For conjugation sections: store as JSONB (always fetched as unit)
  infinitive  JSONB,
  tenses      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_basics_sections_cat ON public.basics_sections(category_id, sort_order);

-- ============================================================
-- 6. BASICS WORDS TABLE
-- A word belongs to EITHER a category OR a section (never both)
-- ============================================================
CREATE TABLE public.basics_words (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.basics_categories(id) ON DELETE CASCADE,
  section_id  UUID REFERENCES public.basics_sections(id) ON DELETE CASCADE,
  german      TEXT NOT NULL,
  en          TEXT NOT NULL,
  fa          TEXT NOT NULL,
  example     TEXT,
  example_en  TEXT,
  example_fa  TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT word_parent_check CHECK (
    (category_id IS NOT NULL AND section_id IS NULL) OR
    (category_id IS NULL AND section_id IS NOT NULL)
  )
);

CREATE INDEX idx_basics_words_cat     ON public.basics_words(category_id, sort_order);
CREATE INDEX idx_basics_words_section ON public.basics_words(section_id, sort_order);

-- ============================================================
-- 7. GLOSSARY TABLE (replaces lessons/glossary.json)
-- ============================================================
CREATE TABLE public.glossary (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word       TEXT NOT NULL UNIQUE,
  en         TEXT NOT NULL,
  fa         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_glossary_word ON public.glossary(word);

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basics_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basics_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basics_words      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary          ENABLE ROW LEVEL SECURITY;

-- Public READ (no login needed — lessons are public content)
CREATE POLICY "Public read lessons"           ON public.lessons           FOR SELECT USING (true);
CREATE POLICY "Public read sentences"         ON public.sentences         FOR SELECT USING (true);
CREATE POLICY "Public read basics categories" ON public.basics_categories FOR SELECT USING (true);
CREATE POLICY "Public read basics sections"   ON public.basics_sections   FOR SELECT USING (true);
CREATE POLICY "Public read basics words"      ON public.basics_words      FOR SELECT USING (true);
CREATE POLICY "Public read glossary"          ON public.glossary          FOR SELECT USING (true);

-- Admin WRITE (only users with is_admin = true)
-- lessons
CREATE POLICY "Admin insert lessons" ON public.lessons FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update lessons" ON public.lessons FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin delete lessons" ON public.lessons FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- sentences
CREATE POLICY "Admin insert sentences" ON public.sentences FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update sentences" ON public.sentences FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin delete sentences" ON public.sentences FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- basics_categories
CREATE POLICY "Admin insert basics_categories" ON public.basics_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update basics_categories" ON public.basics_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin delete basics_categories" ON public.basics_categories FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- basics_sections
CREATE POLICY "Admin insert basics_sections" ON public.basics_sections FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update basics_sections" ON public.basics_sections FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin delete basics_sections" ON public.basics_sections FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- basics_words
CREATE POLICY "Admin insert basics_words" ON public.basics_words FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update basics_words" ON public.basics_words FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin delete basics_words" ON public.basics_words FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- glossary
CREATE POLICY "Admin insert glossary" ON public.glossary FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update glossary" ON public.glossary FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin delete glossary" ON public.glossary FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lessons_updated_at           BEFORE UPDATE ON public.lessons           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sentences_updated_at         BEFORE UPDATE ON public.sentences         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_basics_categories_updated_at BEFORE UPDATE ON public.basics_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_basics_sections_updated_at   BEFORE UPDATE ON public.basics_sections   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_basics_words_updated_at      BEFORE UPDATE ON public.basics_words      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_glossary_updated_at          BEFORE UPDATE ON public.glossary          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. SET YOURSELF AS ADMIN
-- Replace <your-user-uuid> with your UUID from Supabase Auth dashboard
-- ============================================================
-- UPDATE public.user_profiles SET is_admin = true WHERE id = '<your-user-uuid>';
