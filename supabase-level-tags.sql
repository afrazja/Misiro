-- ============================================================
-- MIRIFER: one source of truth for which level a day belongs to
-- Run in the Supabase SQL Editor.
-- ============================================================
--
-- 40 of 100 lessons carry a `difficulty` that contradicts the roadmap in
-- curriculum.ts:
--
--   days 25-30   tagged A2   roadmap says A1
--   days 46-65   tagged B1   roadmap says A2      <- twenty consecutive days
--   days 71-97   tagged A2 on 11 scattered days, roadmap says B1
--
-- This is visible, not just untidy. lessons.difficulty feeds
-- getLearnedSentenceBreakdown(), which prints the learner's sentence count
-- per CEFR level on the dashboard — the same page that draws the roadmap
-- from curriculum.ts. So a learner on day 50 is told they are working
-- through A2 by one card and credited with B1 sentences by another.
--
-- The roadmap wins. It is the thing the learner navigates by, it is code
-- rather than data so it cannot drift per-row, and the checkpoints are
-- already keyed to it.
--
--   A1  days 1-30      A2  days 31-65      B1  days 66-120
--
-- The 71-97 alternation is worth naming as the likely cause: it reads as
-- generator output rather than a decision, which is why nobody noticed the
-- other 29 rows were wrong too.
--
-- Deliberately NOT touching the +grades (A1+, A2+, B1+) the schema allows;
-- no row currently uses them and inventing a sub-grade here would just be
-- a second thing to keep in sync.
-- ============================================================

BEGIN;

UPDATE public.lessons
SET difficulty = CASE
      WHEN day BETWEEN 1  AND 30  THEN 'A1'
      WHEN day BETWEEN 31 AND 65  THEN 'A2'
      ELSE                             'B1'
    END
WHERE day BETWEEN 1 AND 120
  AND difficulty IS DISTINCT FROM CASE
      WHEN day BETWEEN 1  AND 30  THEN 'A1'
      WHEN day BETWEEN 31 AND 65  THEN 'A2'
      ELSE                             'B1'
    END;

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- Expect exactly three rows: A1 x30, A2 x35, B1 x35 (B1 will reach 55 once
-- days 101-120 exist).
SELECT difficulty, count(*) AS lessons, min(day) AS first_day, max(day) AS last_day
FROM public.lessons
WHERE day BETWEEN 1 AND 120
GROUP BY difficulty
ORDER BY min(day);

-- Nothing should come back: no lesson disagreeing with the roadmap.
SELECT day, difficulty
FROM public.lessons
WHERE day BETWEEN 1 AND 120
  AND difficulty <> CASE
      WHEN day BETWEEN 1  AND 30  THEN 'A1'
      WHEN day BETWEEN 31 AND 65  THEN 'A2'
      ELSE                             'B1'
    END
ORDER BY day;
