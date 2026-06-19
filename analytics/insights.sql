-- ============================================================================
--  MIRIFER — Product Analytics Dashboard
--  Run any block on its own in the Supabase SQL Editor (Dashboard → SQL Editor).
--  The SQL Editor runs as a service role, so it bypasses RLS and sees ALL users.
--
--  Notes on the data model:
--   • Signup time          → auth.users.created_at
--   • Last login           → auth.users.last_sign_in_at
--   • Last progress save    → user_progress.updated_at
--   • Per-sentence activity → spaced_repetition (one row per practiced sentence;
--                             last_review / next_review are epoch MILLISECONDS)
--   • Lessons completed     → user_progress.completed_lessons (JSONB object keyed by day)
--   • Language (en/fa)      → user_profiles.language
--
--  "Active" / "last_active" below = the most recent of (progress save, SR review).
--  This is a lightweight proxy for activity since there is no raw event log yet.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) TOP-LINE KPIs  — the single-row health snapshot
-- ─────────────────────────────────────────────────────────────────────────────
WITH activity AS (
  SELECT
    u.id,
    u.created_at AS signup_at,
    COALESCE(pr.lessons_completed, 0) AS lessons_completed,
    GREATEST(
      COALESCE(pr.updated_at, u.created_at),
      COALESCE(sr.last_review, u.created_at)
    ) AS last_active,
    COALESCE(p.language, 'en') AS language
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT up.updated_at,
           CASE WHEN jsonb_typeof(up.completed_lessons) = 'object'
                THEN (SELECT count(*) FROM jsonb_object_keys(up.completed_lessons))
                ELSE 0 END AS lessons_completed
    FROM public.user_progress up WHERE up.user_id = u.id
  ) pr ON TRUE
  LEFT JOIN LATERAL (
    SELECT to_timestamp(MAX(NULLIF(s.last_review, 0)) / 1000.0) AS last_review
    FROM public.spaced_repetition s WHERE s.user_id = u.id
  ) sr ON TRUE
)
SELECT
  count(*)                                                          AS total_users,
  count(*) FILTER (WHERE signup_at >= now() - interval '7 days')    AS new_7d,
  count(*) FILTER (WHERE signup_at >= now() - interval '30 days')   AS new_30d,
  count(*) FILTER (WHERE last_active >= now() - interval '7 days')  AS active_7d,
  count(*) FILTER (WHERE last_active >= now() - interval '30 days') AS active_30d,
  count(*) FILTER (WHERE lessons_completed >= 1)                    AS activated_users,
  round(100.0 * count(*) FILTER (WHERE lessons_completed >= 1)
        / NULLIF(count(*), 0), 1)                                   AS activation_rate_pct,
  count(*) FILTER (WHERE language = 'fa')                           AS persian_users,
  count(*) FILTER (WHERE language = 'en')                           AS english_users
FROM activity;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) SIGNUPS PER DAY (last 30 days) — growth trend
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*)                            AS signups,
  sum(count(*)) OVER (ORDER BY date_trunc('day', created_at)) AS cumulative_users
FROM auth.users
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) ACTIVATION FUNNEL — where new users fall out of the top of the funnel
--    (Every signup auto-gets a user_progress row, so "started" is measured by
--     actually practicing a sentence = having any spaced_repetition row.)
-- ─────────────────────────────────────────────────────────────────────────────
WITH u AS (
  SELECT
    usr.id,
    COALESCE(pr.current_day, 1) AS current_day,
    COALESCE(pr.lessons_completed, 0) AS lessons_completed,
    EXISTS (SELECT 1 FROM public.spaced_repetition s WHERE s.user_id = usr.id) AS started
  FROM auth.users usr
  LEFT JOIN LATERAL (
    SELECT up.current_day,
           CASE WHEN jsonb_typeof(up.completed_lessons) = 'object'
                THEN (SELECT count(*) FROM jsonb_object_keys(up.completed_lessons))
                ELSE 0 END AS lessons_completed
    FROM public.user_progress up WHERE up.user_id = usr.id
  ) pr ON TRUE
)
SELECT step, users,
       round(100.0 * users / NULLIF((SELECT count(*) FROM u), 0), 1) AS pct_of_signups
FROM (
  SELECT 1 AS ord, '1. Signed up'            AS step, count(*) AS users FROM u
  UNION ALL SELECT 2, '2. Started a lesson',        count(*) FROM u WHERE started
  UNION ALL SELECT 3, '3. Completed ≥1 lesson',     count(*) FROM u WHERE lessons_completed >= 1
  UNION ALL SELECT 4, '4. Reached day 3+',          count(*) FROM u WHERE current_day >= 3
  UNION ALL SELECT 5, '5. Reached day 7+',          count(*) FROM u WHERE current_day >= 7
  UNION ALL SELECT 6, '6. Completed ≥5 lessons',    count(*) FROM u WHERE lessons_completed >= 5
) f
ORDER BY ord;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RETENTION by weekly signup cohort (D1 / D7 / D30)
--    "Retained on day N" = had activity at least N days after signing up.
--    Proxy based on last_active (no raw daily event log yet), so it answers
--    "did they ever come back after N days?" — directionally what you want.
-- ─────────────────────────────────────────────────────────────────────────────
WITH activity AS (
  SELECT
    u.id,
    u.created_at AS signup_at,
    GREATEST(
      COALESCE(pr.updated_at, u.created_at),
      COALESCE(sr.last_review, u.created_at)
    ) AS last_active
  FROM auth.users u
  LEFT JOIN public.user_progress pr ON pr.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT to_timestamp(MAX(NULLIF(s.last_review, 0)) / 1000.0) AS last_review
    FROM public.spaced_repetition s WHERE s.user_id = u.id
  ) sr ON TRUE
)
SELECT
  date_trunc('week', signup_at)::date AS cohort_week,
  count(*)                            AS cohort_size,
  round(100.0 * count(*) FILTER (WHERE last_active >= signup_at + interval '1 day')
        / NULLIF(count(*), 0), 0)     AS d1_retained_pct,
  round(100.0 * count(*) FILTER (WHERE last_active >= signup_at + interval '7 days')
        / NULLIF(count(*), 0), 0)     AS d7_retained_pct,
  round(100.0 * count(*) FILTER (WHERE last_active >= signup_at + interval '30 days')
        / NULLIF(count(*), 0), 0)     AS d30_retained_pct
FROM activity
GROUP BY 1
ORDER BY 1 DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) DROP-OFF CURVE — how many users are currently sitting on each lesson day,
--    plus the cumulative "reached at least day N" (the cliff shows where they quit)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  current_day,
  count(*) AS users_on_this_day,
  (SELECT count(*) FROM public.user_progress up2
   WHERE up2.current_day >= up.current_day) AS reached_at_least_this_day
FROM public.user_progress up
GROUP BY current_day
ORDER BY current_day;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) ENGAGEMENT — distribution of lessons completed per user
-- ─────────────────────────────────────────────────────────────────────────────
WITH c AS (
  SELECT CASE WHEN jsonb_typeof(completed_lessons) = 'object'
              THEN (SELECT count(*) FROM jsonb_object_keys(completed_lessons))
              ELSE 0 END AS n
  FROM public.user_progress
)
SELECT
  CASE
    WHEN n = 0 THEN '0 (never finished one)'
    WHEN n BETWEEN 1 AND 2  THEN '1–2'
    WHEN n BETWEEN 3 AND 5  THEN '3–5'
    WHEN n BETWEEN 6 AND 10 THEN '6–10'
    ELSE '11+'
  END AS lessons_completed_bucket,
  count(*) AS users
FROM c
GROUP BY 1
ORDER BY min(n);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7) LANGUAGE SPLIT — your Persian-speaker thesis, with activation by language
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  COALESCE(p.language, 'en') AS language,
  count(*)                   AS users,
  count(*) FILTER (WHERE pr.lessons_completed >= 1) AS activated,
  round(100.0 * count(*) FILTER (WHERE pr.lessons_completed >= 1)
        / NULLIF(count(*), 0), 1) AS activation_rate_pct,
  round(avg(pr.current_day), 1) AS avg_current_day
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN LATERAL (
  SELECT up.current_day,
         CASE WHEN jsonb_typeof(up.completed_lessons) = 'object'
              THEN (SELECT count(*) FROM jsonb_object_keys(up.completed_lessons))
              ELSE 0 END AS lessons_completed
  FROM public.user_progress up WHERE up.user_id = u.id
) pr ON TRUE
GROUP BY 1
ORDER BY users DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8) LIVE PULSE — most recently active users (sanity-check real usage)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  u.email,
  COALESCE(p.language, 'en') AS lang,
  pr.current_day,
  CASE WHEN jsonb_typeof(pr.completed_lessons) = 'object'
       THEN (SELECT count(*) FROM jsonb_object_keys(pr.completed_lessons))
       ELSE 0 END AS lessons_done,
  u.created_at AS signed_up,
  GREATEST(
    COALESCE(pr.updated_at, u.created_at),
    COALESCE(to_timestamp(NULLIF(sr.last_review, 0) / 1000.0), u.created_at)
  ) AS last_active
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN public.user_progress pr ON pr.user_id = u.id
LEFT JOIN LATERAL (
  SELECT MAX(s.last_review) AS last_review
  FROM public.spaced_repetition s WHERE s.user_id = u.id
) sr ON TRUE
ORDER BY last_active DESC
LIMIT 50;


-- ════════════════════════════════════════════════════════════════════════════
--  PART B — EVENTS-BASED (precise)   ⚠ requires supabase-events-setup.sql + a
--  deploy that writes events. These are accurate (true timestamps), not proxies.
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 9) DAILY ACTIVE USERS (last 30 days) — real DAU from the event log
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  date_trunc('day', created_at)::date AS day,
  count(DISTINCT user_id)             AS active_users,
  count(*)                            AS total_events
FROM public.events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10) TRUE RETENTION by weekly cohort — "came back at least N days after signup"
--     Uses real events, so unlike query #4 this isn't an approximation.
-- ─────────────────────────────────────────────────────────────────────────────
WITH u AS (
  SELECT id, created_at AS signup_at, date_trunc('week', created_at)::date AS cohort_week
  FROM auth.users
),
last_ev AS (
  SELECT user_id, max(created_at) AS last_event_at
  FROM public.events GROUP BY user_id
)
SELECT
  u.cohort_week,
  count(*) AS cohort_size,
  round(100.0 * count(*) FILTER (WHERE le.last_event_at >= u.signup_at + interval '1 day')
        / NULLIF(count(*), 0), 0) AS d1_pct,
  round(100.0 * count(*) FILTER (WHERE le.last_event_at >= u.signup_at + interval '7 days')
        / NULLIF(count(*), 0), 0) AS d7_pct,
  round(100.0 * count(*) FILTER (WHERE le.last_event_at >= u.signup_at + interval '30 days')
        / NULLIF(count(*), 0), 0) AS d30_pct
FROM u
LEFT JOIN last_ev le ON le.user_id = u.id
GROUP BY u.cohort_week
ORDER BY u.cohort_week DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11) PER-LESSON COMPLETION RATE — of users who START each day, how many FINISH
--     it. The lowest completion rates flag your hardest / most boring lessons.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  day AS lesson_day,
  count(DISTINCT user_id) FILTER (WHERE event_name = 'lesson_started')   AS users_started,
  count(DISTINCT user_id) FILTER (WHERE event_name = 'lesson_completed') AS users_completed,
  round(100.0 * count(DISTINCT user_id) FILTER (WHERE event_name = 'lesson_completed')
        / NULLIF(count(DISTINCT user_id) FILTER (WHERE event_name = 'lesson_started'), 0), 1)
        AS completion_rate_pct
FROM public.events
WHERE day IS NOT NULL
GROUP BY day
ORDER BY day;
