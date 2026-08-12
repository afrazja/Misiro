-- ============================================================
-- MIRIFER: Day 2 warm-up — chunks only
-- Run in Supabase SQL Editor AFTER supabase-day1-chunks.sql
-- ============================================================
--
-- Same two rules as Day 1 — see supabase-day1-chunks.sql for the full
-- reasoning:
--
--   RULE 1  a warm-up item is a COLLOCATION or a FRAME, never a closed
--           sentence. A closed sentence is a line, not a building block.
--   RULE 2  every item must occur in the dialogue that follows it.
--
-- Day 2 is almost entirely frames, which is right for this lesson: it is
-- where the learner starts PRODUCING. Day 1 carries the questions they are
-- asked, Day 2 the answers they give.
--
--   Ich heiße …      Ich spreche …
--   Ich bin …        … Jahre alt
--   Ich komme aus …  Ich studiere …
--   Ich wohne in …   Sprichst du …?
--
-- "Ich bin …" earns its slot on frequency alone — five occurrences, and it
-- carries name, age and profession with one pattern.
--
-- "Sprichst du …?" is deliberate: same verb as Day 1's "Sprechen Sie …?",
-- informal against formal. The du/Sie contrast gets taught by structure
-- rather than by a footnote, which is also why the two lessons use
-- different registers at all.
--
-- Rejected on purpose:
--   "Und du?"                   occurs twice but assembles free from
--                               und + du. Anything that recombines at no
--                               cost is not worth a slot.
--   "Wie alt bist du?"          closed sentences, all three. Replaced by
--   "Wo wohnst du?"             "Ich bin …", "Ich studiere …" and
--   "Was machst du beruflich?"  "Sprichst du …?".
--
-- The Persian angle is why chunking beats words here rather than being a
-- style preference. "… Jahre alt" has no counterpart — Persian says
-- «۲۵ ساله» as a single unit — so a word-by-word route yields nothing
-- usable.
--
-- Budget: 8 x 22 + 6 heard x 18 + 6 spoken x 50 + grammar 40 = 624s
--         ≈ 10.4 min, matching Day 1 exactly.
-- ============================================================

BEGIN;

UPDATE public.lessons
SET words = '[]'::jsonb,
    collocations = '[
  { "de": "Ich heiße …",     "en": "My name is …",   "fa": "اسم من … است" },
  { "de": "Ich bin …",       "en": "I am …",         "fa": "من … هستم" },
  { "de": "Ich komme aus …", "en": "I come from …",  "fa": "من اهلِ … هستم" },
  { "de": "Ich wohne in …",  "en": "I live in …",    "fa": "من در … زندگی می‌کنم" },
  { "de": "Ich spreche …",   "en": "I speak …",      "fa": "من … صحبت می‌کنم" },
  { "de": "… Jahre alt",     "en": "… years old",    "fa": "… ساله" },
  { "de": "Ich studiere …",  "en": "I study …",      "fa": "من … می‌خوانم" },
  { "de": "Sprichst du …?",  "en": "Do you speak …?","fa": "تو … صحبت می‌کنی؟" }
]'::jsonb
WHERE day = 2;


-- ============================================================
-- Make the dialogue contain the frame we pre-teach
-- ============================================================
-- Day 2's grammar note is titled "Verb conjugation: heißen and sein" and
-- its grammar_focus promises "Ich heiße…", but heißen appeared NOWHERE in
-- the dialogue — taught, given an example, then never heard or said.
--
-- Tolerable before. Not once "Ich heiße …" is the first chunk we
-- pre-teach: that is RULE 2, and pre-teaching a frame the lesson never
-- uses is precisely the failure the warm-up exists to prevent.
--
-- Maria keeps "Ich bin Maria" in line 1, Reza switches to "Ich heiße
-- Reza" here, so both forms appear and the learner sees they are
-- interchangeable — a better lesson than either alone. It also leaves
-- "Ich bin …" with five occurrences across the dialogue.

UPDATE public.sentences
SET target_text = 'Hallo Maria! Ich heiße Reza. Ich komme aus Teheran.'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 2)
  AND sentence_order = 2;

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- Shape: 0 words, 8 collocations, 12 sentences, line 2 carrying "Ich heiße".
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

-- RULE 1 and RULE 2 for both days are checked at the bottom of
-- supabase-day1-chunks.sql — run that file's last two queries after this.
