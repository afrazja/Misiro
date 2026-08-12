-- ============================================================
-- MIRIFER: Day 1 warm-up — chunks only (supersedes the block in
-- supabase-lesson-chunks.sql)
-- Run in Supabase SQL Editor AFTER supabase-lesson-chunks.sql
-- ============================================================
--
-- Two rules, both learned the hard way on this lesson.
--
-- RULE 1 — a warm-up item is a COLLOCATION or a FRAME, never a closed
-- sentence.
--
--   collocation  2-3 words whose combination is not predictable from the
--                parts: "Guten Morgen", "Ein bisschen"
--   frame        a stem with an open slot the learner fills:
--                "Sprechen Sie …?", "Mir geht es …"
--
-- A closed sentence is not a building block, it is a line. The first draft
-- of this list had five of them, one of which ("Sprechen Sie Deutsch?")
-- reproduced sentence_order 11 verbatim and entire — the warm-up would have
-- shown the learner the exact sentence they were about to hear.
--
-- Frames are the productive half. "Sprechen Sie …?" teaches Sie-inversion
-- as a PATTERN, which carries straight to "Heißen Sie …?" and
-- "Kommen Sie …?" — both of which the learner then meets in this same
-- dialogue. Teaching those three as fixed questions taught one thing three
-- times and cost three slots.
--
-- RULE 2 — every item must occur in the dialogue that follows it.
--
-- supabase-lesson-chunks.sql broke this while trimming the dialogue to
-- twelve, deleting sentence_order 9 and 10:
--
--   9   Oh, interessant! Willkommen in Deutschland.
--   10  Vielen Dank! Deutschland ist sehr schön.
--
-- which is where "Vielen Dank" and "sehr" lived. That migration's comment
-- claimed "'Vielen Dank' survives in the collocation block" — backwards. It
-- survived in the block and not in the lesson, so the first lesson of the
-- course has been pre-teaching two items the learner never meets. ("schön"
-- matched too, but only inside "Danke schön", which is not the "nice,
-- beautiful" sense it was glossed as.)
--
-- The check at the bottom enforces both rules. Run it after editing
-- SENTENCES as well as warm-ups — a sentence deletion is what broke it.
--
-- Register split against Day 2, which also settles why the two lessons feel
-- different:
--
--   Day 1  the formal encounter — Sie/Ihnen, the questions a learner is
--          ASKED in their first week in Germany
--   Day 2  the informal one — du, and the answer frames they PRODUCE
--
-- Budget: 8 x 22 + 6 heard x 18 + 6 spoken x 50 + grammar 40 = 624s
--         ≈ 10.4 min, matching Day 2 exactly.
-- ============================================================

BEGIN;

UPDATE public.lessons
SET words = '[]'::jsonb,
    collocations = '[
  { "de": "Guten Morgen",     "en": "Good morning",         "fa": "صبح بخیر" },
  { "de": "Wie geht es …?",   "en": "How are you?",         "fa": "حالِ … چطور است؟" },
  { "de": "Mir geht es …",    "en": "I am doing …",         "fa": "حالِ من … است" },
  { "de": "Freut mich",       "en": "Pleased to meet you",  "fa": "خوشبختم" },
  { "de": "Sprechen Sie …?",  "en": "Do you speak …?",      "fa": "شما … صحبت می‌کنید؟" },
  { "de": "Ein bisschen",     "en": "A little bit",         "fa": "کمی" },
  { "de": "Danke schön",      "en": "Thank you",            "fa": "ممنونم" },
  { "de": "Auf Wiedersehen",  "en": "Goodbye",              "fa": "خداحافظ" }
]'::jsonb
WHERE day = 1;

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- 1. Shape: 0 words, 8 collocations, 12 sentences.
SELECT
  l.day,
  jsonb_array_length(l.words)        AS words,
  jsonb_array_length(l.collocations) AS collocations,
  count(s.id)                        AS sentences
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.day = 1
GROUP BY l.day, l.words, l.collocations;

-- 2. RULE 2 — every chunk occurs in its own lesson's dialogue.
--    Frames are stored with a placeholder, so match on the stem.
SELECT
  l.day,
  c.value ->> 'de' AS chunk,
  EXISTS (
    SELECT 1 FROM public.sentences s
    WHERE s.lesson_id = l.id
      AND coalesce(s.target_text, s.audio_text)
          ILIKE '%' || btrim(replace(replace(c.value ->> 'de', '…', ''), '?', '')) || '%'
  ) AS appears_in_dialogue
FROM public.lessons l
CROSS JOIN LATERAL jsonb_array_elements(l.collocations) AS c(value)
WHERE l.day IN (1, 2)
ORDER BY l.day, chunk;

-- 3. RULE 1 — no chunk may BE a whole dialogue line. Anything returned
--    here is a sentence masquerading as a chunk. Expect zero rows.
SELECT l.day, c.value ->> 'de' AS chunk, s.sentence_order
FROM public.lessons l
CROSS JOIN LATERAL jsonb_array_elements(l.collocations) AS c(value)
JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.day IN (1, 2)
  AND lower(btrim(coalesce(s.target_text, s.audio_text), ' .!?'))
      = lower(btrim(c.value ->> 'de', ' .!?'));
