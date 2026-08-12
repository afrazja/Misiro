-- ============================================================
-- MIRIFER: Day 3 — put the learner on the right side of the counter
-- Run in the Supabase SQL Editor AFTER supabase-lesson-titles.sql
-- ============================================================
--
-- Day 3's dialogue cast the learner as the café worker. Lines 2, 4 and 6
-- were `sent`, so the learner practised quoting prices and totalling a
-- bill — a job they will never have — while the OTHER speaker got
-- "Wie viel kostet der Kaffee?", which is the line a learner in Germany
-- actually needs.
--
-- Line 9 was the worst of it: "Können Sie das bitte wiederholen?" is
-- arguably the single most useful A1 survival phrase in the lesson, and it
-- belonged to the other speaker. The learner never said it.
--
-- So roles 1-6 are swapped and the repeat-request moves to the learner.
--
-- Three lines are new:
--   7/8   paying and getting change, which completes the counter scene and
--         is the most common transaction a learner will have all week
--   11    the other person's number, so there is something to ask about
--         when the learner requests a repeat
--
-- One line goes: the old 10 ("Natürlich! Null eins sieben zwei…") was the
-- learner repeating their OWN number back, which nobody does.
--
-- Numbers changed on purpose. The grammar note teaches how German builds
-- compound numbers and its examples are `siebzehn` and `einundzwanzig` —
-- neither appeared in the dialogue, and einundzwanzig is 21, outside this
-- lesson's own 1-20 range. Three coffees instead of two makes the total
-- 3x3.00 + 3x1.50 = 13.50, so `dreizehn` gives the note something real to
-- point at, and 15.00 - 13.50 = 1.50 change keeps the arithmetic honest.
--
-- Rows are UPDATEd in place rather than deleted and reinserted, because
-- sr_cards reference sentence ids — a delete/reinsert would silently
-- orphan every review card anyone has for this lesson.
--
-- 14 sentences = 7 heard x 18 + 7 spoken x 50 + grammar 40 = 516s
--   ≈ 8.6 min, matching Day 1.
-- ============================================================

BEGIN;

-- 1. Make room: old 7-12 become 9-14. Guarded so a re-run is a no-op.
UPDATE public.sentences
SET sentence_order = sentence_order + 2
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3)
  AND sentence_order >= 7
  AND NOT EXISTS (
    SELECT 1 FROM public.sentences x
    WHERE x.lesson_id = (SELECT id FROM public.lessons WHERE day = 3)
      AND x.sentence_order = 14
  );


-- 2. The counter scene, with the learner as the customer.
--    Swapping a role means moving the text between columns: `received`
--    lines live in audio_text, `sent` lines in target_text.
UPDATE public.sentences SET role = 'sent',
  audio_text = NULL, target_text = 'Guten Tag! Wie viel kostet der Kaffee?'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 1;

UPDATE public.sentences SET role = 'received',
  audio_text = 'Der Kaffee kostet drei Euro.', target_text = NULL
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 2;

UPDATE public.sentences SET role = 'sent',
  audio_text = NULL, target_text = 'Und das Brötchen? Wie viel kostet das?'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 3;

UPDATE public.sentences SET role = 'received',
  audio_text = 'Das Brötchen kostet eins fünfzig.', target_text = NULL
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 4;

UPDATE public.sentences SET role = 'sent',
  audio_text = NULL, target_text = 'Ich nehme drei Kaffees und drei Brötchen.',
  translation = 'I will take three coffees and three bread rolls.',
  translation_fa = 'من سه تا قهوه و سه تا نان می‌خواهم.'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 5;

UPDATE public.sentences SET role = 'received',
  audio_text = 'Das macht zusammen dreizehn Euro fünfzig.', target_text = NULL,
  translation = 'That comes to thirteen euros fifty altogether.',
  translation_fa = 'مجموعاً سیزده یورو و پنجاه سنت می‌شود.'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 6;


-- 3. Paying and change (new).
INSERT INTO public.sentences
  (lesson_id, sentence_order, role, audio_text, target_text, translation, translation_fa)
SELECT (SELECT id FROM public.lessons WHERE day = 3), 7, 'sent',
  NULL, 'Hier sind fünfzehn Euro.',
  'Here is fifteen euros.', 'بفرمایید پانزده یورو.'
WHERE NOT EXISTS (SELECT 1 FROM public.sentences
  WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 7);

INSERT INTO public.sentences
  (lesson_id, sentence_order, role, audio_text, target_text, translation, translation_fa)
SELECT (SELECT id FROM public.lessons WHERE day = 3), 8, 'received',
  'Danke! Und eins fünfzig zurück.', NULL,
  'Thank you! And one fifty back.', 'ممنون! و یک یورو و پنجاه سنت بقیه.'
WHERE NOT EXISTS (SELECT 1 FROM public.sentences
  WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 8);


-- 4. The phone-number scene. 9 and 10 keep their text; 11 and 12 are
--    rewritten so the learner is the one asking for a repeat.
UPDATE public.sentences SET role = 'received',
  audio_text = 'Danke. Meine ist null drei null, vier sechs acht eins.', target_text = NULL,
  translation = 'Thanks. Mine is zero three zero, four six eight one.',
  translation_fa = 'ممنون. شمارهٔ من صفر سه صفر، چهار شش هشت یک است.'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 11;

UPDATE public.sentences SET role = 'sent',
  audio_text = NULL, target_text = 'Können Sie das bitte wiederholen?',
  translation = 'Could you repeat that, please?',
  translation_fa = 'می‌توانید لطفاً تکرار کنید؟'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 12;

-- 13 does two jobs: it answers the repeat request and turns the
-- conversation to the last number context.
UPDATE public.sentences SET role = 'received',
  audio_text = 'Natürlich! Null drei null, vier sechs acht eins. Wie viele Personen sind Sie?',
  target_text = NULL,
  translation = 'Of course! Zero three zero, four six eight one. How many of you are there?',
  translation_fa = 'البته! صفر سه صفر، چهار شش هشت یک. چند نفر هستید؟'
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3) AND sentence_order = 13;

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- Expect 14 sentences, orders 1..14, 7 heard and 7 spoken.
SELECT count(*) AS sentences,
       min(sentence_order) AS first_order,
       max(sentence_order) AS last_order,
       count(*) FILTER (WHERE role = 'received') AS heard,
       count(*) FILTER (WHERE role = 'sent')     AS spoken
FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3);

-- Every row must carry text in the column its role uses, and nothing in
-- the other. A half-done role swap shows up here and nowhere else.
SELECT sentence_order, role, audio_text, target_text
FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3)
  AND ( (role = 'received' AND (audio_text IS NULL OR target_text IS NOT NULL))
     OR (role = 'sent'     AND (target_text IS NULL OR audio_text IS NOT NULL)) );

-- The learner should now be asking the price and requesting the repeat.
SELECT sentence_order, coalesce(target_text, audio_text) AS line, role
FROM public.sentences
WHERE lesson_id = (SELECT id FROM public.lessons WHERE day = 3)
ORDER BY sentence_order;
