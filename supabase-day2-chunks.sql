-- ============================================================
-- MIRIFER: Day 2 warm-up — chunks only
-- Run in Supabase SQL Editor AFTER supabase-lesson-chunks.sql
-- ============================================================
--
-- Day 2 is the first lesson authored under the chunk-first principle:
-- teach the biggest unit the learner cannot assemble themselves, not the
-- smallest unit that has a dictionary entry.
--
-- So `words` stays EMPTY here. Six single words on Day 1 (Hallo, danke,
-- gut, auch, sehr, schön) each cost a slot to teach something the learner
-- meets anyway, whereas "Wo wohnst du?" needs verb-second inversion AND
-- the -st du-stem, neither of which is taught until much later. A learner
-- who has the chunk can ask the question on day 2; a learner who has
-- `wohnen` and `du` cannot.
--
-- The Persian angle is the whole reason this matters. "… Jahre alt" has
-- no Persian counterpart — Persian says «۲۵ ساله» as a single unit — so a
-- word-by-word route produces nothing usable. Same for
-- "Was machst du beruflich?", which is idiomatic in a way no Persian
-- speaker would reconstruct.
--
-- Rejected on purpose: "Und du?", which appears twice in the dialogue but
-- is assemblable from und + du. Anything that recombines for free is not
-- worth a slot; that is precisely what the Day 1 word list was doing.
--
-- Shape: four answer-frames with a slot the learner fills, plus three
-- questions and one age unit. The frames are the productive part —
-- "Ich komme aus …" works for every country they will ever name.
--
-- Budget: 8 x 22 + 6 heard x 18 + 6 spoken x 50 + grammar 40 = 624s
--         ≈ 10.4 min, against Day 1's 10.3 and the A1 band of 10-15.
-- ============================================================

BEGIN;

UPDATE public.lessons
SET words = '[]'::jsonb,
    collocations = '[
  { "de": "Ich heiße …",             "en": "My name is …",              "fa": "اسم من … است" },
  { "de": "Ich komme aus …",         "en": "I come from …",             "fa": "من اهلِ … هستم" },
  { "de": "Ich wohne in …",          "en": "I live in …",               "fa": "من در … زندگی می‌کنم" },
  { "de": "Ich spreche …",           "en": "I speak …",                 "fa": "من … صحبت می‌کنم" },
  { "de": "… Jahre alt",             "en": "… years old",               "fa": "… ساله" },
  { "de": "Wie alt bist du?",        "en": "How old are you?",          "fa": "چند سالت است؟" },
  { "de": "Wo wohnst du?",           "en": "Where do you live?",        "fa": "کجا زندگی می‌کنی؟" },
  { "de": "Was machst du beruflich?","en": "What do you do for a living?","fa": "شغلت چیست؟" }
]'::jsonb
WHERE day = 2;


-- ============================================================
-- Make the dialogue contain the frame we pre-teach
-- ============================================================
-- Day 2's grammar note is titled "Verb conjugation: heißen and sein" and
-- its grammar_focus promises "Ich heiße…", but heißen appeared NOWHERE in
-- the dialogue. The learner was taught a verb, shown an example, and then
-- never heard or said it.
--
-- That was already wrong. It becomes load-bearing once "Ich heiße …" is
-- the first chunk of the warm-up: pre-teaching a frame the lesson never
-- uses is the exact failure the warm-up exists to avoid.
--
-- Maria keeps "Ich bin Maria" in line 1, Reza switches to "Ich heiße
-- Reza" here, so both forms appear and the learner sees they are
-- interchangeable — a better lesson than either one alone.

UPDATE public.sentences
SET target_text = 'Hallo Maria! Ich heiße Reza. Ich komme aus Teheran.'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 2)
  AND sentence_order = 2;

COMMIT;


-- ============================================================
-- Check
-- ============================================================
-- Expect: 0 words, 8 collocations, 12 sentences, and line 2 carrying
-- "Ich heiße".
SELECT
  l.day,
  jsonb_array_length(l.words)        AS words,
  jsonb_array_length(l.collocations) AS collocations,
  count(s.id)                        AS sentences,
  bool_or(s.target_text LIKE '%Ich heiße%') AS teaches_heissen
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.day = 2
GROUP BY l.day, l.words, l.collocations;

-- Every chunk should be findable in the dialogue it pre-teaches.
-- Frames are stored with a placeholder, so match on the stem.
SELECT chunk, EXISTS (
  SELECT 1 FROM public.sentences s
  WHERE s.lesson_id = (SELECT id FROM public.lessons WHERE day = 2)
    AND coalesce(s.target_text, s.audio_text) ILIKE '%' || chunk || '%'
) AS appears_in_dialogue
FROM (VALUES
  ('Ich heiße'), ('Ich komme aus'), ('Ich wohne in'), ('Ich spreche'),
  ('Jahre alt'), ('Wie alt bist du'), ('Wo wohnst du'), ('Was machst du beruflich')
) AS t(chunk);
