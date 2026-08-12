-- ============================================================
-- MIRIFER: real descriptions for days 1-10
-- Run in the Supabase SQL Editor AFTER supabase-clear-stale-descriptions.sql
-- ============================================================
--
-- Clearing the 60-day course's descriptions left every lesson falling back
-- to its title. True, but thin — and thinner than it looks, because
-- /proxy/converse now takes its scenario from this field. On Day 44 the AI
-- partner's entire sense of the situation is the string "Talking About
-- Habits".
--
-- So these are written to do two jobs at once: read as an invitation on the
-- start overlay, and set a scene a model can actually play. Second person,
-- one sentence, naming who the learner is talking to and what they are
-- there to do.
--
-- Days 1-10 only, deliberately. The funnel says 26 learners reached Day 1,
-- 6 finished it, and one person has ever passed Day 13 — so this is the
-- entire stretch anyone currently walks through. It also matches the
-- hand-written openers in conversation-openers.ts, so the two halves of the
-- conversation card agree with each other.
--
-- Every line was written from that day's actual dialogue, after the Day 1
-- trim and the Day 3 rebuild. Days 1, 4 and 5 are formal (Sie); 2, 6, 7, 8,
-- 9 and 10 are informal (du) — the description reflects which, because a
-- partner that switches register mid-scene is exactly the tell that nobody
-- checked.
-- ============================================================

BEGIN;

UPDATE public.lessons SET
  description = 'You meet someone for the first time. Greet them politely, exchange names, say where you are from, and say goodbye.',
  description_fa = 'برای اولین بار با کسی آشنا می‌شوید. مؤدبانه سلام کنید، نام‌ها را رد و بدل کنید، بگویید اهل کجایید و خداحافظی کنید.'
WHERE day = 1;

UPDATE public.lessons SET
  description = 'You are chatting with someone your own age. Swap names, ages, what you do, where you live, and which languages you speak.',
  description_fa = 'با کسی هم‌سن خودتان گپ می‌زنید. نام، سن، شغل، محل زندگی و زبان‌هایی که بلدید را رد و بدل کنید.'
WHERE day = 2;

UPDATE public.lessons SET
  description = 'You are buying coffee and rolls at a counter. Ask what things cost, pay, swap phone numbers, and say how many of you there are.',
  description_fa = 'سر پیشخوان قهوه و نان می‌خرید. قیمت‌ها را بپرسید، پول بدهید، شماره تلفن رد و بدل کنید و بگویید چند نفرید.'
WHERE day = 3;

UPDATE public.lessons SET
  description = 'Someone needs your name in writing. Say it, spell it out letter by letter, and give your first name too.',
  description_fa = 'کسی نام شما را به‌صورت نوشتاری می‌خواهد. آن را بگویید، حرف‌به‌حرف هجی کنید و نام کوچکتان را هم بگویید.'
WHERE day = 4;

UPDATE public.lessons SET
  description = 'You are ordering in a café. Ask for a coffee, say how you take it, and add something to eat.',
  description_fa = 'در کافه سفارش می‌دهید. یک قهوه بخواهید، بگویید چطور دوستش دارید و چیزی برای خوردن اضافه کنید.'
WHERE day = 5;

UPDATE public.lessons SET
  description = 'A friend asks about your family. Talk about your brother and sister — their names and how old they are.',
  description_fa = 'دوستی دربارهٔ خانواده‌تان می‌پرسد. از برادر و خواهرتان بگویید — نامشان و اینکه چند سالشان است.'
WHERE day = 6;

UPDATE public.lessons SET
  description = 'You are working out dates with someone. Say what day it is, what tomorrow is, and when your birthday falls.',
  description_fa = 'با کسی دربارهٔ تاریخ‌ها حرف می‌زنید. بگویید امروز چه روزی است، فردا چه روزی است و تولدتان کی است.'
WHERE day = 7;

UPDATE public.lessons SET
  description = 'You are describing the things around you. Say what colour your car and your house are, and which colour you like best.',
  description_fa = 'چیزهای اطرافتان را توصیف می‌کنید. بگویید ماشین و خانه‌تان چه رنگی است و چه رنگی را بیشتر دوست دارید.'
WHERE day = 8;

UPDATE public.lessons SET
  description = 'A friend asks what you are up to. Say what you are doing today, what you enjoy, and how much you study.',
  description_fa = 'دوستی می‌پرسد چه می‌کنید. بگویید امروز چه کار می‌کنید، از چه چیزی لذت می‌برید و چقدر درس می‌خوانید.'
WHERE day = 9;

UPDATE public.lessons SET
  description = 'You are pointing things out to someone. Name what you can see and say where each thing is.',
  description_fa = 'چیزها را به کسی نشان می‌دهید. بگویید چه می‌بینید و هر چیز کجاست.'
WHERE day = 10;

COMMIT;


-- ============================================================
-- Checks
-- ============================================================
-- Ten rows, each description sitting under a title that agrees with it.
SELECT day, title, description
FROM public.lessons
WHERE day BETWEEN 1 AND 10
ORDER BY day;

-- Nothing outside 1-10 should have picked up a description.
SELECT count(*) AS unexpected
FROM public.lessons
WHERE day > 10 AND description IS NOT NULL AND description <> '';

-- Persian filled in wherever English is. A half-translated description
-- shows a Persian learner an English sentence with no warning.
SELECT day FROM public.lessons
WHERE description IS NOT NULL AND description <> ''
  AND (description_fa IS NULL OR description_fa = '');
