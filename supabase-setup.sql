-- ============================================
-- MISIRO: Supabase Database Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. TABLES
-- ---------

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Learner',
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fa')),
    voice_speed REAL NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_day INTEGER NOT NULL DEFAULT 1,
    current_sentence_index INTEGER NOT NULL DEFAULT 0,
    completed_lessons JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_saved BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE public.spaced_repetition (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    sentence_id INTEGER NOT NULL,
    ease REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 1,
    next_review BIGINT NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    successes INTEGER NOT NULL DEFAULT 0,
    last_review BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, day, sentence_id)
);

CREATE INDEX idx_sr_next_review ON public.spaced_repetition(user_id, next_review);

CREATE TABLE public.exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    wrong_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    taken_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_number)
);

-- 2. ROW LEVEL SECURITY
-- ---------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- user_progress
CREATE POLICY "Users can view own progress"
    ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
    ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress"
    ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

-- spaced_repetition
CREATE POLICY "Users can view own SR data"
    ON public.spaced_repetition FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own SR data"
    ON public.spaced_repetition FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SR data"
    ON public.spaced_repetition FOR UPDATE USING (auth.uid() = user_id);

-- exam_results
CREATE POLICY "Users can view own exam results"
    ON public.exam_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exam results"
    ON public.exam_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exam results"
    ON public.exam_results FOR UPDATE USING (auth.uid() = user_id);

-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- --------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Learner'));

    INSERT INTO public.user_progress (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
