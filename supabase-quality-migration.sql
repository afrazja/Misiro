-- ============================================================
-- MIRIFER: Lesson Quality Columns Migration
-- Run this in Supabase SQL Editor on an EXISTING database
-- (If you're setting up fresh, use supabase-content-schema.sql instead)
-- ============================================================

-- Add quality columns to lessons table
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS description_fa   TEXT,
  ADD COLUMN IF NOT EXISTS grammar_focus    TEXT,
  ADD COLUMN IF NOT EXISTS grammar_focus_fa TEXT,
  ADD COLUMN IF NOT EXISTS difficulty       TEXT
    CHECK (difficulty IN ('A1','A1+','A2','A2+','B1','B1+'));

-- Add hint columns to sentences table
ALTER TABLE public.sentences
  ADD COLUMN IF NOT EXISTS hint    TEXT,
  ADD COLUMN IF NOT EXISTS hint_fa TEXT;
