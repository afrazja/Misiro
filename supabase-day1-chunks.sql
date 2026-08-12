-- ============================================================
-- MIRIFER: Day 1 warm-up — chunks only (supersedes the block in
-- supabase-lesson-chunks.sql)
-- Run in Supabase SQL Editor AFTER supabase-lesson-chunks.sql
-- ============================================================
--
-- Day 1 was authored before the chunk-first principle and shows it. All
-- six of its words fail the test we now apply — can a day-one learner
-- assemble this from parts they already hold? Hallo, danke, gut, auch,
-- sehr and schön each cost a slot to teach something the dialogue hands
-- over anyway.
--
-- Worse, two of the ten items point at nothing. supabase-lesson-chunks.sql
-- deleted sentence_order 9 and 10 to trim the dialogue to twelve:
--
--   9   Oh, interessant! Willkommen in Deutschland.
--   10  Vielen Dank! Deutschland ist sehr schön.
--
-- which is where "Vielen Dank" and "sehr" lived. That migration's own
-- comment claimed "'Vielen Dank' survives in the collocation block" —
-- backwards: it survives in the block and no longer in the lesson. So the
-- warm-up has been pre-teaching two items the learner never meets, on the
-- very first lesson of the course. ("schön" matches too, but only inside
-- "Danke schön", which is not the "nice, beautiful" sense it is glossed
-- as — misleading rather than absent.) Replacing the list fixes all three.
--
-- The eight below split cleanly against Day 2, which also settles the
-- register question:
--
--   Day 1  the formal encounter — Sie/Ihnen, and the QUESTIONS a learner
--          will be asked in their first week in Germany
--   Day 2  the informal one — du, and the ANSWER frames they produce
--
-- Both sets appear in both dialogues, so each is pre-taught once and
-- re-met the next day. The du/Sie switch between the lessons stops being
-- an inconsistency and becomes the point.
--
-- Every chunk here is genuinely unassemblable at day one:
--   Wie geht es Ihnen? / Mir geht es gut  dative idiom with a dummy es;
--                                         there is no route to this from
--                                         Persian or from parts
--   Guten Morgen                          "Guten" is an accusative ending
--                                         on a greeting, unexplainable
--                                         until week five
--   Freut mich                            elliptical — literally
--                                         "pleases me", subject dropped
--   Wie heißen Sie? / Woher kommen Sie? / Sprechen Sie Deutsch?
--                                         Sie-inversion, verb first
--
-- Budget: 8 x 22 + 6 heard x 18 + 6 spoken x 50 + grammar 40 = 624s
--         ≈ 10.4 min, matching Day 2 exactly.
-- ============================================================

BEGIN;

UPDATE public.lessons
SET words = '[]'::jsonb,
    collocations = '[
  { "de": "Guten Morgen",        "en": "Good morning",              "fa": "صبح بخیر" },
  { "de": "Wie geht es Ihnen?",  "en": "How are you? (formal)",     "fa": "حال شما چطور است؟" },
  { "de": "Mir geht es gut",     "en": "I am fine",                 "fa": "من خوبم" },
  { "de": "Wie heißen Sie?",     "en": "What is your name? (formal)","fa": "اسم شما چیست؟" },
  { "de": "Woher kommen Sie?",   "en": "Where are you from? (formal)","fa": "شما اهل کجا هستید؟" },
  { "de": "Freut mich",          "en": "Pleased to meet you",       "fa": "خوشبختم" },
  { "de": "Sprechen Sie Deutsch?","en": "Do you speak German? (formal)","fa": "آلمانی صحبت می‌کنید؟" },
  { "de": "Auf Wiedersehen",     "en": "Goodbye",                   "fa": "خداحافظ" }
]'::jsonb
WHERE day = 1;

COMMIT;


-- ============================================================
-- Check
-- ============================================================
-- Expect: 0 words, 8 collocations, 12 sentences.
SELECT
  l.day,
  jsonb_array_length(l.words)        AS words,
  jsonb_array_length(l.collocations) AS collocations,
  count(s.id)                        AS sentences
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.day = 1
GROUP BY l.day, l.words, l.collocations;

-- The check that would have caught the "Vielen Dank" bug: every chunk we
-- pre-teach must occur in the dialogue that follows it. Run this after any
-- edit to a lesson's sentences, not just after editing its warm-up — it
-- was a SENTENCE deletion that broke the warm-up last time.
SELECT
  l.day,
  c.value ->> 'de' AS chunk,
  EXISTS (
    SELECT 1 FROM public.sentences s
    WHERE s.lesson_id = l.id
      AND coalesce(s.target_text, s.audio_text)
          ILIKE '%' || replace(rtrim(c.value ->> 'de', '?'), '…', '') || '%'
  ) AS appears_in_dialogue
FROM public.lessons l
CROSS JOIN LATERAL jsonb_array_elements(l.collocations) AS c(value)
WHERE l.day IN (1, 2)
ORDER BY l.day, chunk;
