-- ============================================================
-- MIRIFER: where learners actually stop
-- Read-only. Run in the Supabase SQL Editor.
-- ============================================================
--
-- The completions-by-day query said 6 learners finished Day 1, 4 reached
-- Day 5, 2 reached Day 6, and 1 got past Day 11. Against 24 registered
-- accounts. So content quantity is not the constraint — 475 more sentences
-- would be written for nobody.
--
-- But "the app is not appealing" is three different problems with three
-- different fixes, and the events table can tell them apart:
--
--   signed up, never started a lesson   -> the front door
--   started, did not finish             -> the lesson itself
--   finished, never came back           -> no reason to return
--
-- Nothing here writes. Sample sizes are small enough that these are
-- directional, not conclusive — but the SHAPE of the drop is still real.
-- ============================================================


-- ── 1. THE FUNNEL ──
-- The single most important row is `started_none`: people who registered
-- and never opened a lesson at all. If that is most of them, no amount of
-- lesson quality matters, because nobody is reaching a lesson.
WITH u AS (SELECT id FROM auth.users),
starts AS (
  SELECT user_id, count(*) n FROM public.events
  WHERE event_name = 'lesson_started' GROUP BY user_id),
done AS (
  SELECT user_id, count(DISTINCT day) n FROM public.events
  WHERE event_name = 'lesson_completed' GROUP BY user_id)
SELECT
  (SELECT count(*) FROM u)                                              AS registered,
  (SELECT count(*) FROM u WHERE id NOT IN (SELECT user_id FROM starts)) AS started_none,
  (SELECT count(*) FROM starts)                                         AS started_at_least_one,
  (SELECT count(*) FROM done)                                           AS finished_at_least_one,
  (SELECT count(*) FROM done WHERE n >= 2)                              AS finished_2_plus,
  (SELECT count(*) FROM done WHERE n >= 5)                              AS finished_5_plus,
  (SELECT count(*) FROM done WHERE n >= 10)                             AS finished_10_plus;


-- ── 2. DO THEY ABANDON INSIDE THE LESSON? ──
-- started minus completed, per day. A big gap on Day 1 means the lesson is
-- the problem — too long, too hard, or something breaks. A small gap with
-- few starts means people are not coming back to begin one.
--
-- This is the query that decides whether to fix lessons or fix the loop.
SELECT
  COALESCE(s.day, c.day)                    AS day,
  COALESCE(s.starts, 0)                     AS started,
  COALESCE(c.completions, 0)                AS completed,
  COALESCE(s.starts, 0) - COALESCE(c.completions, 0) AS abandoned,
  CASE WHEN COALESCE(s.starts,0) > 0
       THEN round(100.0 * COALESCE(c.completions,0) / s.starts)
  END                                       AS finish_pct
FROM      (SELECT day, count(*) starts      FROM public.events
           WHERE event_name = 'lesson_started'   GROUP BY day) s
FULL JOIN (SELECT day, count(*) completions FROM public.events
           WHERE event_name = 'lesson_completed' GROUP BY day) c USING (day)
ORDER BY 1;


-- ── 3. DO THEY COME BACK? ──
-- Gap in days between one completion and that learner's next. A cluster at
-- 0 means they binge in one sitting and never return — which looks like
-- progress in the day-by-day numbers and is actually a single session.
WITH ordered AS (
  SELECT user_id, created_at,
         lag(created_at) OVER (PARTITION BY user_id ORDER BY created_at) AS prev
  FROM public.events WHERE event_name = 'lesson_completed')
SELECT
  floor(EXTRACT(EPOCH FROM (created_at - prev)) / 86400) AS days_since_last,
  count(*)                                               AS times
FROM ordered WHERE prev IS NOT NULL
GROUP BY 1 ORDER BY 1;


-- ── 4. HOW LONG DID THE FIRST LESSON TAKE? ──
-- If first lessons run long, that is a reason to stop that no amount of
-- new content fixes — and it doubles as the calibration check for
-- ITEM_SECONDS in lesson-duration.ts.
WITH firsts AS (
  SELECT DISTINCT ON (user_id) user_id, day, metadata
  FROM public.events WHERE event_name = 'lesson_completed'
  ORDER BY user_id, created_at)
SELECT day,
       count(*)                                                  AS learners,
       round(avg((metadata ->> 'actualSeconds')::numeric) / 60, 1) AS avg_minutes,
       round(max((metadata ->> 'actualSeconds')::numeric) / 60, 1) AS slowest_minutes
FROM firsts
WHERE metadata ? 'actualSeconds'
  AND (metadata ->> 'actualSeconds')::numeric BETWEEN 30 AND 5400
GROUP BY day ORDER BY day;
