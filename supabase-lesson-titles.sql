-- ============================================================
-- MIRIFER: lesson titles name a SITUATION, not a grammar point
-- Run in the Supabase SQL Editor.
-- ============================================================
--
-- 35 of 100 lessons were named after their grammar ("Numbers 1-20",
-- "The Dative Case", "N-Declension") while the other 65 were named after a
-- situation ("At the Café", "At the Doctor"). A learner scrolling the day
-- list could not tell what any of the first group would let them DO.
--
-- The schema already separates the two: `title` and `grammar_focus` are
-- different columns, and grammar_focus was already correct on every one of
-- these rows. So the grammar-named titles were saying the same thing twice
-- and leaving the situation unnamed — Day 3 was literally
-- title "Numbers 1-20" / grammar_focus "Cardinal numbers: eins, zwei…".
--
-- Rule from here: title = what the learner can handle afterwards,
-- grammar_focus = the structure that gets them there. Nothing is lost;
-- the grammar is still recorded, and the lesson page still shows it.
--
-- Every title below was taken from what that lesson's OWN dialogue does,
-- not invented. D31 is "Wem gehört dieses Buch?" so it is Lost & Found;
-- D65 is "Warum bist du gestern nicht gekommen?" so it is Making Excuses.
--
-- Deliberate de-duplication, since three lessons were circling the same
-- ground: D9 is what you are doing today, D20 keeps Daily Routine, D28 is
-- specifically getting up and out. D31 (dative, gehören) and D54
-- (genitive, wessen) both asked "whose is this" and are now Lost & Found
-- and Family Belongings.
-- ============================================================

BEGIN;

-- ── A1 basics ──
UPDATE lessons SET title = 'Day 3: Prices & Phone Numbers',        title_fa = 'روز ۳: قیمت‌ها و شماره تلفن'        WHERE day = 3;
UPDATE lessons SET title = 'Day 4: Spelling Your Name',            title_fa = 'روز ۴: هجی کردن نام'                WHERE day = 4;
UPDATE lessons SET title = 'Day 9: What You''re Doing Today',      title_fa = 'روز ۹: امروز چه می‌کنی'             WHERE day = 9;
UPDATE lessons SET title = 'Day 10: Naming Things Around You',     title_fa = 'روز ۱۰: نام بردن چیزهای اطراف'      WHERE day = 10;

-- ── A1 survival ──
UPDATE lessons SET title = 'Day 21: Saying How You Feel',          title_fa = 'روز ۲۱: گفتن حال خود'               WHERE day = 21;
UPDATE lessons SET title = 'Day 22: Saying No & Preferences',      title_fa = 'روز ۲۲: نه گفتن و ترجیح‌ها'         WHERE day = 22;
UPDATE lessons SET title = 'Day 23: Small Talk with a Stranger',   title_fa = 'روز ۲۳: گپ با یک غریبه'             WHERE day = 23;
UPDATE lessons SET title = 'Day 24: Talking About Photos',         title_fa = 'روز ۲۴: صحبت دربارهٔ عکس‌ها'        WHERE day = 24;
UPDATE lessons SET title = 'Day 25: Pointing People Out',          title_fa = 'روز ۲۵: نشان دادن آدم‌ها'           WHERE day = 25;
UPDATE lessons SET title = 'Day 26: Talking About Yesterday',      title_fa = 'روز ۲۶: صحبت دربارهٔ دیروز'         WHERE day = 26;
UPDATE lessons SET title = 'Day 27: Talking About a Trip',         title_fa = 'روز ۲۷: صحبت دربارهٔ سفر'           WHERE day = 27;
UPDATE lessons SET title = 'Day 28: Getting Up & Going Out',       title_fa = 'روز ۲۸: بیدار شدن و بیرون رفتن'     WHERE day = 28;
UPDATE lessons SET title = 'Day 29: Talking About Skills',         title_fa = 'روز ۲۹: صحبت دربارهٔ مهارت‌ها'      WHERE day = 29;
UPDATE lessons SET title = 'Day 30: Rules & Permission',           title_fa = 'روز ۳۰: قوانین و اجازه'             WHERE day = 30;

-- ── A2 scenarios ──
UPDATE lessons SET title = 'Day 31: Lost & Found',                 title_fa = 'روز ۳۱: گمشده و پیدا شده'           WHERE day = 31;
UPDATE lessons SET title = 'Day 32: Making Plans with Friends',    title_fa = 'روز ۳۲: برنامه‌ریزی با دوستان'      WHERE day = 32;
UPDATE lessons SET title = 'Day 33: Saying Where Things Are',      title_fa = 'روز ۳۳: گفتن جای چیزها'             WHERE day = 33;
UPDATE lessons SET title = 'Day 34: Comparing Cities & Things',    title_fa = 'روز ۳۴: مقایسه کردن'                WHERE day = 34;
UPDATE lessons SET title = 'Day 41: Your Interests',               title_fa = 'روز ۴۱: علاقه‌مندی‌ها'              WHERE day = 41;
UPDATE lessons SET title = 'Day 42: Giving Reasons',               title_fa = 'روز ۴۲: دلیل آوردن'                 WHERE day = 42;
UPDATE lessons SET title = 'Day 43: Giving Your Opinion',          title_fa = 'روز ۴۳: نظر دادن'                   WHERE day = 43;
UPDATE lessons SET title = 'Day 44: Talking About Habits',         title_fa = 'روز ۴۴: صحبت دربارهٔ عادت‌ها'       WHERE day = 44;
UPDATE lessons SET title = 'Day 45: Describing People',            title_fa = 'روز ۴۵: توصیف آدم‌ها'               WHERE day = 45;
UPDATE lessons SET title = 'Day 46: Shopping for Clothes',         title_fa = 'روز ۴۶: خرید لباس'                  WHERE day = 46;
UPDATE lessons SET title = 'Day 50: Offering & Choosing',          title_fa = 'روز ۵۰: تعارف و انتخاب'             WHERE day = 50;
UPDATE lessons SET title = 'Day 52: How Things Are Made',          title_fa = 'روز ۵۲: چگونه چیزها ساخته می‌شوند'  WHERE day = 52;
UPDATE lessons SET title = 'Day 53: Describing Who''s Who',        title_fa = 'روز ۵۳: معرفی آدم‌ها'               WHERE day = 53;
UPDATE lessons SET title = 'Day 54: Family Belongings',            title_fa = 'روز ۵۴: دارایی‌های خانواده'         WHERE day = 54;
UPDATE lessons SET title = 'Day 55: Asking Strangers for Help',    title_fa = 'روز ۵۵: کمک خواستن از غریبه‌ها'     WHERE day = 55;

-- ── B1 advanced ──
UPDATE lessons SET title = 'Day 61: If You Had the Chance',        title_fa = 'روز ۶۱: اگر فرصتش را داشتی'         WHERE day = 61;
UPDATE lessons SET title = 'Day 62: Wishes & Regrets',             title_fa = 'روز ۶۲: آرزوها و افسوس‌ها'          WHERE day = 62;
UPDATE lessons SET title = 'Day 63: Visiting a Historic Place',    title_fa = 'روز ۶۳: بازدید از مکان تاریخی'      WHERE day = 63;
UPDATE lessons SET title = 'Day 64: At the Language Course',       title_fa = 'روز ۶۴: در کلاس زبان'               WHERE day = 64;
UPDATE lessons SET title = 'Day 65: Making Excuses',               title_fa = 'روز ۶۵: عذر آوردن'                  WHERE day = 65;
UPDATE lessons SET title = 'Day 66: Hosting a Guest',              title_fa = 'روز ۶۶: پذیرایی از مهمان'           WHERE day = 66;

COMMIT;


-- ============================================================
-- Check
-- ============================================================
-- 35 rows, and none of the new titles should contain a grammar term.
-- grammar_focus is untouched throughout — verify it still carries the
-- structure that the title no longer names.
SELECT day, title, grammar_focus
FROM lessons
WHERE day IN (3,4,9,10,21,22,23,24,25,26,27,28,29,30,31,32,33,34,41,42,43,
              44,45,46,50,52,53,54,55,61,62,63,64,65,66)
ORDER BY day;

-- Nothing should come back: no two lessons sharing a title.
SELECT title, count(*) FROM lessons GROUP BY title HAVING count(*) > 1;
