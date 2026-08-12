-- ============================================================
-- MIRIFER: back to sentences only
-- Reverts the Day 1 / Day 2 warm-up. Run in the Supabase SQL Editor.
-- ============================================================
--
-- A lesson is its dialogue again. The words/collocations/paragraphs
-- columns stay on the table and stay empty: the app already treats absent
-- or empty as "this lesson does not use them", so the warm-up card simply
-- does not render and no code change is needed. Nothing here is hard to
-- undo if we want the warm-up back.
--
-- Supersedes supabase-day1-chunks.sql and supabase-day2-chunks.sql, and
-- the DAY 1 block of supabase-lesson-chunks.sql.
-- ============================================================

BEGIN;

-- 1. Clear the warm-up everywhere it was set.
UPDATE public.lessons
SET words = '[]'::jsonb,
    collocations = '[]'::jsonb
WHERE day IN (1, 2);


-- 2. Put Day 1's two deleted sentences back.
--
-- supabase-lesson-chunks.sql cut sentence_order 9 and 10 purely to make
-- room for the warm-up in the time budget. With the warm-up gone the cut
-- has no reason, and it is also what orphaned "Vielen Dank" and "sehr"
-- from the old word list. Restoring them takes Day 1 from 12 sentences
-- back to 14:
--
--   before  6 heard x 18 + 6 spoken x 50 + grammar 40 = 448s = 7.5 min
--   after   7 heard x 18 + 7 spoken x 50 + grammar 40 = 516s = 8.6 min
--
-- against an A1 target of 10-15, so this moves toward it rather than away.
--
-- Idempotent: re-running will not duplicate the rows.

-- Reopen the gap (orders 9,10 were closed up by shifting 11-14 down to 9-12).
UPDATE public.sentences
SET sentence_order = sentence_order + 2
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND sentence_order >= 9
  AND NOT EXISTS (
    SELECT 1 FROM public.sentences x
    WHERE x.lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
      AND x.sentence_order = 13
  );

INSERT INTO public.sentences
  (lesson_id, sentence_order, role, audio_text, target_text, translation, translation_fa)
SELECT
  (SELECT id FROM public.lessons WHERE day = 1), 9, 'received',
  'Oh, interessant! Willkommen in Deutschland.', NULL,
  'Oh, interesting! Welcome to Germany.', 'اوه، جالب! به آلمان خوش آمدید.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sentences
  WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
    AND sentence_order = 9
);

INSERT INTO public.sentences
  (lesson_id, sentence_order, role, audio_text, target_text, translation, translation_fa)
SELECT
  (SELECT id FROM public.lessons WHERE day = 1), 10, 'sent',
  NULL, 'Vielen Dank! Deutschland ist sehr schön.',
  'Thank you very much! Germany is very beautiful.', 'خیلی ممنون! آلمان خیلی زیباست.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sentences
  WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
    AND sentence_order = 10
);

COMMIT;


-- ============================================================
-- Check
-- ============================================================
-- Expect: day 1 -> 0 words, 0 collocations, 14 sentences, orders 1..14
--         day 2 -> 0 words, 0 collocations, 12 sentences, orders 1..12
SELECT
  l.day,
  jsonb_array_length(l.words)        AS words,
  jsonb_array_length(l.collocations) AS collocations,
  count(s.id)                        AS sentences,
  min(s.sentence_order)              AS first_order,
  max(s.sentence_order)              AS last_order
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.day IN (1, 2)
GROUP BY l.day, l.words, l.collocations
ORDER BY l.day;

-- No duplicate or missing positions.
SELECT day, sentence_order, count(*)
FROM public.sentences s
JOIN public.lessons l ON l.id = s.lesson_id
WHERE l.day IN (1, 2)
GROUP BY day, sentence_order
HAVING count(*) > 1;
