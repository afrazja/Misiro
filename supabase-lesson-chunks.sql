-- ============================================================
-- MIRIFER: lesson warm-up chunks — words, collocations, paragraphs
-- Run in Supabase SQL Editor AFTER supabase-content-schema.sql
-- ============================================================
--
-- The lesson is currently a dialogue and nothing else. The content plan adds
-- a graded progression around it:
--
--   words         A1 only, fading out by A2 — vocabulary should arrive inside
--                 sentences once the learner can hold one
--   collocations  every level, 4 at A1 beginner rising to 10 at B1 top. The
--                 point of the whole scheme: a learner who knows `stark` and
--                 `Kaffee` separately still says the wrong thing, and Persian
--                 gives no help with which words pair in German
--   paragraphs    from A2 middle, where Goethe Lesen tasks start looking like
--                 short texts rather than single sentences
--
-- All three are JSONB on the lesson rather than new tables: they are read
-- with the lesson, never queried independently, and never shared between
-- lessons. Absent or empty is valid everywhere and means "this tier does not
-- use them" — the app already treats a missing field as zero.
--
-- Shapes
--   words         [{ "de": "...", "en": "...", "fa": "..." }]
--   collocations  [{ "de": "...", "en": "...", "fa": "..." }]
--   paragraphs    [{ "de": "...", "en": "...", "fa": "...",
--                    "questions": [{ "q": "...", "options": ["..."],
--                                    "correct": 0 }] }]
-- ============================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS words        JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS collocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS paragraphs   JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lessons.words IS
  'A1 warm-up vocabulary, pre-taught before the dialogue. Fades out by A2.';
COMMENT ON COLUMN public.lessons.collocations IS
  'Word pairs taught as single units — never decomposed for the learner.';
COMMENT ON COLUMN public.lessons.paragraphs IS
  'Short reading texts with comprehension questions. From A2 middle upward.';


-- ============================================================
-- DAY 1 — A1 beginner
-- ============================================================
-- Target 10 min. With the warm-up added and the dialogue trimmed to 12
-- sentences this comes to 10.3 min:
--   6 words x 14s + 4 collocations x 22s + 6 heard x 18s + 6 spoken x 50s
--   + grammar moment 40s = 620s
--
-- Every warm-up item appears in the dialogue that follows, so this
-- pre-teaches rather than adds load.

UPDATE public.lessons
SET words = '[
  { "de": "Hallo",  "en": "hello",           "fa": "سلام" },
  { "de": "danke",  "en": "thank you",       "fa": "ممنون" },
  { "de": "gut",    "en": "good",            "fa": "خوب" },
  { "de": "auch",   "en": "also, too",       "fa": "هم" },
  { "de": "sehr",   "en": "very",            "fa": "خیلی" },
  { "de": "schön",  "en": "nice, beautiful", "fa": "زیبا" }
]'::jsonb,
    collocations = '[
  { "de": "Guten Morgen",     "en": "good morning",           "fa": "صبح بخیر" },
  { "de": "Vielen Dank",      "en": "thank you very much",    "fa": "خیلی ممنون" },
  { "de": "Freut mich",       "en": "pleased to meet you",    "fa": "خوشبختم" },
  { "de": "Auf Wiedersehen",  "en": "goodbye",                "fa": "خداحافظ" }
]'::jsonb
WHERE day = 1;

-- Trim to 6 heard / 6 spoken. Lines 9 and 10 go: the dialogue still runs
-- greeting -> name -> origin -> language -> farewell without them, and
-- "Vielen Dank" survives in the collocation block.
DELETE FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND sentence_order IN (9, 10);

-- Close the gap so ordering stays contiguous.
UPDATE public.sentences
SET sentence_order = sentence_order - 2
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 1)
  AND sentence_order > 10;


-- ============================================================
-- Check
-- ============================================================
-- Expect: 6 words, 4 collocations, 12 sentences, orders 1..12
SELECT
  l.day,
  jsonb_array_length(l.words)        AS words,
  jsonb_array_length(l.collocations) AS collocations,
  count(s.id)                        AS sentences,
  min(s.sentence_order)              AS first_order,
  max(s.sentence_order)              AS last_order
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.day = 1
GROUP BY l.day, l.words, l.collocations;
