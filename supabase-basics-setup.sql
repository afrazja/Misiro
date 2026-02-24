-- ============================================================
-- Mirifer: Basics Tables Setup
-- Run this in Supabase Dashboard → SQL Editor
-- Creates basics_categories, basics_sections, basics_words
-- ============================================================

-- 1. BASICS CATEGORIES
-- Stores the top-level categories (pronouns, articles, numbers, cases, etc.)
CREATE TABLE IF NOT EXISTS public.basics_categories (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,
    icon        TEXT NOT NULL DEFAULT '',
    title_en    TEXT NOT NULL DEFAULT '',
    title_fa    TEXT NOT NULL DEFAULT '',
    description_en TEXT NOT NULL DEFAULT '',
    description_fa TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'grid' CHECK (type IN ('grid', 'multi', 'table', 'conjugation')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BASICS SECTIONS
-- Sub-sections within a "multi" category (e.g., Personal Pronouns, Verb: Sein, Declension Tables)
CREATE TABLE IF NOT EXISTS public.basics_sections (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES public.basics_categories(id) ON DELETE CASCADE,
    heading_en  TEXT NOT NULL DEFAULT '',
    heading_fa  TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'table' CHECK (type IN ('table', 'grid', 'conjugation', 'declension')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    infinitive  JSONB,   -- { german, en, fa } — conjugation sections only
    tenses      JSONB,   -- [ { name: {en,fa}, forms: [...] } ] — conjugation sections only
    declension  JSONB    -- { columns: [...], rows: [...] } — declension sections only
);

-- 3. BASICS WORDS
-- Individual vocabulary items, linked to either a category (grid) or a section (multi)
CREATE TABLE IF NOT EXISTS public.basics_words (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.basics_categories(id) ON DELETE CASCADE,
    section_id  UUID REFERENCES public.basics_sections(id) ON DELETE CASCADE,
    german      TEXT NOT NULL,
    en          TEXT NOT NULL DEFAULT '',
    fa          TEXT NOT NULL DEFAULT '',
    example     TEXT,
    example_en  TEXT,
    example_fa  TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT word_belongs_to_one CHECK (
        (category_id IS NOT NULL AND section_id IS NULL) OR
        (category_id IS NULL AND section_id IS NOT NULL)
    )
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_basics_sections_category ON public.basics_sections(category_id);
CREATE INDEX IF NOT EXISTS idx_basics_words_category    ON public.basics_words(category_id);
CREATE INDEX IF NOT EXISTS idx_basics_words_section     ON public.basics_words(section_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- These are read-only reference tables — anyone can read them.
-- Only the service role (used by seed script) can write.
-- ============================================================

ALTER TABLE public.basics_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basics_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basics_words      ENABLE ROW LEVEL SECURITY;

-- Allow all users (including unauthenticated) to read
CREATE POLICY "Basics categories are publicly readable"
    ON public.basics_categories FOR SELECT
    USING (true);

CREATE POLICY "Basics sections are publicly readable"
    ON public.basics_sections FOR SELECT
    USING (true);

CREATE POLICY "Basics words are publicly readable"
    ON public.basics_words FOR SELECT
    USING (true);
