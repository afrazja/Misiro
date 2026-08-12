-- ============================================================
-- MIRIFER: lesson length — the guard, and the measurement
-- Read-only. Run in the Supabase SQL Editor whenever content changes.
-- ============================================================
--
-- A lesson is 8 to 15 sentences. Below 8 there is not enough conversation
-- to be worth opening; above 15 it stops being a daily habit and becomes
-- homework. Both bounds are in curriculum.ts as MIN_SENTENCES /
-- MAX_SENTENCES and enforced by its tests.
--
-- Nothing here changes data. Query 1 is the guard; queries 2 and 3 settle
-- the open question about how long a lesson really takes.
-- ============================================================


-- ── 1. GUARD: any lesson outside 8-15 ──
-- Expect zero rows. Every lesson is currently 10, 12 or 14, so this binds
-- new authoring rather than reporting an existing problem.
SELECT l.day, l.title, count(s.id) AS sentences
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
GROUP BY l.day, l.title
HAVING count(s.id) < 8 OR count(s.id) > 15
ORDER BY l.day;


-- ── 2. THE REAL NUMBER ──
-- lesson-duration.ts estimates 18s for a heard line, 50s for a spoken one
-- and 40s for the grammar moment, which puts a 15-sentence lesson at about
-- 9 minutes. That estimate counts no retries, no audio replays and no
-- practice mode, so it is probably low — and a lesson of 8-15 sentences
-- may well be the 10-20 minutes it feels like.
--
-- lesson_completed has been logging actualSeconds next to the estimate
-- since the duration work landed. This compares them.
--
-- Read `ratio` as: how many times longer the lesson really took. A ratio
-- near 1 means the estimate is right and 8-15 sentences is 5-9 minutes.
-- Near 2 means the estimate is half the truth and 8-15 sentences is the
-- 10-20 minutes you expected.
SELECT
  count(*)                                                    AS completions,
  round(avg((metadata ->> 'sentenceCount')::numeric), 1)      AS avg_sentences,
  round(avg((metadata ->> 'actualSeconds')::numeric) / 60, 1) AS avg_real_min,
  round(avg((metadata ->> 'estimateMinutes')::numeric), 1)    AS avg_estimated_min,
  round( avg((metadata ->> 'actualSeconds')::numeric / 60)
       / nullif(avg((metadata ->> 'estimateMinutes')::numeric), 0), 2) AS ratio,
  round(avg( (metadata ->> 'actualSeconds')::numeric
           / nullif((metadata ->> 'sentenceCount')::numeric, 0) ), 1)  AS real_seconds_per_sentence
FROM public.events
WHERE event_name = 'lesson_completed'
  AND metadata ? 'actualSeconds'
  AND (metadata ->> 'actualSeconds')::numeric BETWEEN 60 AND 5400;
  -- Bounds discard the two ways this metric lies: a lesson abandoned and
  -- reopened, and one left running in a background tab overnight.


-- ── 3. PER-SENTENCE COST, split by role ──
-- If the model needs recalibrating, this is the number to change:
-- ITEM_SECONDS.sent is the dominant term and the one most likely wrong,
-- since it is where retries and practice actually happen.
SELECT
  (metadata -> 'content' ->> 'sent')::int     AS spoken_lines,
  (metadata -> 'content' ->> 'received')::int AS heard_lines,
  count(*)                                    AS completions,
  round(avg((metadata ->> 'actualSeconds')::numeric)) AS avg_real_seconds
FROM public.events
WHERE event_name = 'lesson_completed'
  AND metadata ? 'content'
  AND (metadata ->> 'actualSeconds')::numeric BETWEEN 60 AND 5400
GROUP BY 1, 2
HAVING count(*) >= 3
ORDER BY 1, 2;
