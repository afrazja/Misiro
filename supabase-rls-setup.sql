-- ============================================================
-- Mirifer: Row Level Security (RLS) Setup
-- Run this in Supabase Dashboard → SQL Editor
-- This ensures users can only access their OWN data
-- ============================================================

-- =====================
-- 1. user_profiles
-- =====================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for ensureProfile on first login)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- =====================
-- 2. user_progress
-- =====================
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can read own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- =====================
-- 3. spaced_repetition
-- =====================
ALTER TABLE spaced_repetition ENABLE ROW LEVEL SECURITY;

-- Users can read their own SR data
CREATE POLICY "Users can read own SR data"
  ON spaced_repetition FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own SR data
CREATE POLICY "Users can insert own SR data"
  ON spaced_repetition FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own SR data
CREATE POLICY "Users can update own SR data"
  ON spaced_repetition FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =====================
-- 4. exam_results
-- =====================
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own exam results
CREATE POLICY "Users can read own exam results"
  ON exam_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own exam results
CREATE POLICY "Users can insert own exam results"
  ON exam_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own exam results
CREATE POLICY "Users can update own exam results"
  ON exam_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =====================
-- 5. Storage: avatars bucket
-- =====================
-- Users can upload to their own folder only
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view avatars (they're public profile images)
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');


-- ============================================================
-- VERIFICATION: Run these to confirm RLS is active
-- ============================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('user_profiles', 'user_progress', 'spaced_repetition', 'exam_results');
--
-- Expected: rowsecurity = true for all 4 tables
-- ============================================================
