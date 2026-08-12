-- ============================================================
-- MIRIFER: which content migrations have actually been applied
-- Read-only. Run in the Supabase SQL Editor any time.
-- ============================================================
--
-- Several migrations were written in one sitting and applied in no
-- particular order. This checks each one's fingerprint in the data rather
-- than trusting anyone's memory of what got run.
--
-- Run them in the order listed: day1-trim assumes revert-warmup, and
-- descriptions-1-10 assumes clear-stale-descriptions.
-- ============================================================

SELECT * FROM (

  SELECT 1 AS step, 'supabase-revert-warmup.sql' AS migration,
         'warm-up cleared on days 1-2' AS checks,
         CASE WHEN NOT EXISTS (
           SELECT 1 FROM public.lessons
           WHERE day IN (1,2)
             AND (jsonb_array_length(words) > 0 OR jsonb_array_length(collocations) > 0)
         ) THEN 'APPLIED' ELSE 'not applied' END AS state

  UNION ALL SELECT 2, 'supabase-lesson-titles.sql',
         '35 titles name a situation',
         CASE WHEN EXISTS (SELECT 1 FROM public.lessons
                           WHERE day = 3 AND title = 'Day 3: Prices & Phone Numbers')
              THEN 'APPLIED' ELSE 'not applied' END

  UNION ALL SELECT 3, 'supabase-day3-rebuild.sql',
         'Day 3 = 14 lines, learner asks the price',
         CASE WHEN (SELECT count(*) FROM public.sentences
                    WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3)) = 14
               AND EXISTS (SELECT 1 FROM public.sentences
                    WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3)
                      AND sentence_order = 1 AND role = 'sent')
              THEN 'APPLIED' ELSE 'not applied' END

  UNION ALL SELECT 4, 'supabase-level-tags.sql',
         'difficulty agrees with curriculum.ts',
         CASE WHEN NOT EXISTS (
           SELECT 1 FROM public.lessons WHERE day BETWEEN 1 AND 120
             AND difficulty <> CASE WHEN day <= 30 THEN 'A1'
                                    WHEN day <= 65 THEN 'A2' ELSE 'B1' END
         ) THEN 'APPLIED' ELSE 'not applied' END

  UNION ALL SELECT 5, 'supabase-day1-trim.sql',
         'Day 1 = 10 lines, the shortest lesson',
         CASE WHEN (SELECT count(*) FROM public.sentences
                    WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)) = 10
              THEN 'APPLIED' ELSE 'not applied' END

  UNION ALL SELECT 6, 'supabase-clear-stale-descriptions.sql',
         'no 60-day-course descriptions left',
         CASE WHEN NOT EXISTS (
           SELECT 1 FROM public.lessons
           WHERE description LIKE '%booked a table at a nice restaurant%'
         ) THEN 'APPLIED' ELSE 'not applied' END

  UNION ALL SELECT 7, 'supabase-descriptions-1-10.sql',
         'days 1-10 describe their own lesson',
         CASE WHEN (SELECT count(*) FROM public.lessons
                    WHERE day BETWEEN 1 AND 10
                      AND description IS NOT NULL AND description <> '') = 10
              THEN 'APPLIED' ELSE 'not applied' END

) t ORDER BY step;


-- ============================================================
-- Shape of the course as it now stands
-- ============================================================
SELECT
  count(*)                                              AS lessons,
  min(day) || '-' || max(day)                           AS day_range,
  count(*) FILTER (WHERE description IS NOT NULL
                     AND description <> '')             AS with_description
FROM public.lessons;

-- Any lesson outside the 8-15 sentence bounds. Expect zero rows.
SELECT l.day, l.title, count(s.id) AS sentences
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
GROUP BY l.day, l.title
HAVING count(s.id) < 8 OR count(s.id) > 15
ORDER BY l.day;
