-- ============================================================
-- MIRIFER: Day 1 becomes the shortest lesson, not the longest
-- Run in the Supabase SQL Editor AFTER supabase-revert-warmup.sql
-- ============================================================
--
-- The funnel: 26 learners reached Day 1's page, 6 finished it. 23%. The
-- finish rate then CLIMBS — Day 2 is 43%, Day 5 is 67%, Day 8 is 100% —
-- so whoever survives Day 1 is fine. Day 1 is the filter.
--
-- And Day 1 is the longest lesson in the course at 14 sentences, which is
-- my doing: supabase-revert-warmup.sql put back sentence_order 9 and 10
-- when we dropped the warm-up, on the reasoning that the cut had lost its
-- justification. Against a 23% completion rate that was the wrong call.
-- The first lesson should be the easiest thing in the app.
--
-- Down to 10, which is exactly what curriculum.ts now targets for day 1.
-- 5 heard x 18 + 5 spoken x 50 + grammar 40 = 380s ≈ 6.3 min, from 8.6.
--
-- The arc survives intact — greet, ask how they are, exchange names, say
-- where you are from, say goodbye. Every essential A1 move is still here.
-- What goes is the second half's two side-exchanges:
--
--   9/10   Willkommen in Deutschland / Vielen Dank … sehr schön
--   11/12  Sprechen Sie Deutsch? / Ein bisschen. Ich lerne Deutsch.
--
-- "Ein bisschen. Ich lerne Deutsch." is a real loss and worth putting in
-- an early lesson that is not the first one.
--
-- Line 9 is rewritten so the farewell still follows from something: the
-- old 13 ("Das ist toll! Viel Erfolg!") answered "Ich lerne Deutsch",
-- which is now gone, so it would have dangled.
--
-- UPDATE-then-DELETE rather than rebuild: sr_cards reference sentence ids.
-- ============================================================

BEGIN;

-- 9 absorbs the old farewell cue so nothing dangles.
UPDATE public.sentences SET
  role = 'received',
  audio_text = 'Interessant! Viel Erfolg beim Deutschlernen!',
  target_text = NULL,
  translation = 'Interesting! Good luck with your German!',
  translation_fa = 'جالب است! در یادگیری آلمانی موفق باشید!'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND sentence_order = 9;

-- 10 becomes the goodbye that used to be 14.
UPDATE public.sentences SET
  role = 'sent',
  audio_text = NULL,
  target_text = 'Danke schön! Auf Wiedersehen.',
  translation = 'Thank you! Goodbye.',
  translation_fa = 'ممنونم! خداحافظ.'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND sentence_order = 10;

-- Everything past 10 goes.
DELETE FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND sentence_order > 10;

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- Expect 10 sentences, orders 1..10, 5 heard and 5 spoken.
SELECT count(*) AS sentences,
       min(sentence_order) AS first_order,
       max(sentence_order) AS last_order,
       count(*) FILTER (WHERE role = 'received') AS heard,
       count(*) FILTER (WHERE role = 'sent')     AS spoken
FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1);

-- Every row carries text in the column its role uses, and nothing in the
-- other one. Expect zero rows.
SELECT sentence_order, role, audio_text, target_text
FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND ( (role = 'received' AND (audio_text IS NULL OR target_text IS NOT NULL))
     OR (role = 'sent'     AND (target_text IS NULL OR audio_text IS NOT NULL)) );

-- The lesson, to read end to end.
SELECT sentence_order, role, coalesce(target_text, audio_text) AS line
FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
ORDER BY sentence_order;
