-- ============================================================================
--  Basics — the six missing grammar topics
-- ============================================================================
--
--  Run this whole file once in the Supabase SQL editor. Safe to re-run: each
--  category is upserted by key, and its sections are rebuilt from scratch.
--
--  Adds 6 categories (12 -> 18), each holding several sections, so Basics
--  finally covers the grammar the daily lessons teach:
--
--    wordOrder          verb position, subordinate clauses, relative clauses
--    verbTenses         Perfekt (haben/sein), Präteritum, Futur I
--    verbTypes          separable, reflexive, imperative, fixed prepositions
--    adjectives         declension, comparative, superlative
--    passiveKonjunktiv  passive present/past, würde, hätte/wäre
--    negationImpersonal nicht vs kein, man, es gibt, um...zu / damit / lassen
--
--  The explanation columns are created here too, so this file can run before
--  or after supabase-basics-explanations.sql.
-- ============================================================================

ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS explanation_en text;
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS explanation_fa text;
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS pitfall_en text;
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS pitfall_fa text;
ALTER TABLE basics_sections ADD COLUMN IF NOT EXISTS explanation_en text;
ALTER TABLE basics_sections ADD COLUMN IF NOT EXISTS explanation_fa text;


-- ════════════════════════════════════════════════════════════════════════
--  13. wordOrder — ترتیب کلمات
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO basics_categories
  (key, icon, title_en, title_fa, description_en, description_fa, type, sort_order,
   explanation_en, explanation_fa, pitfall_en, pitfall_fa)
VALUES ('wordOrder', '🔀', 'Word Order', 'ترتیب کلمات',
  'Where the verb goes in a German sentence',
  'جای فعل در جملهٔ آلمانی',
  'multi', 13,
'German word order is not free — it is governed by one dominant rule and one exception.

THE RULE: in a main clause the conjugated verb is the SECOND element. Not the second word — the second element. Anything can occupy the first slot (subject, time, place), and whatever you put there, the verb still follows it immediately.

THE EXCEPTION: in a subordinate clause the conjugated verb goes to the very END.

Almost every word-order mistake at A1 and A2 is one of these two rules being broken.',
'ترتیب کلمات در آلمانی آزاد نیست — یک قاعدهٔ اصلی دارد و یک استثنا.

قاعده: در جملهٔ اصلی، فعل صرف‌شده عنصر دوم است. نه کلمهٔ دوم — عنصر دوم. هر چیزی می‌تواند جایگاه اول را بگیرد (فاعل، زمان، مکان) و هر چه بگذاری، فعل بلافاصله بعد از آن می‌آید.

استثنا: در جملهٔ پیرو، فعل صرف‌شده به آخر جمله می‌رود.

تقریباً همهٔ خطاهای ترتیب کلمات در سطح A1 و A2، شکستن یکی از همین دو قاعده است.',
'Persian puts the verb at the end of almost every sentence — «من امروز آلمانی یاد می‌گیرم». German does the opposite in main clauses and only matches Persian in subordinate clauses.

That is why «Ich heute Deutsch lerne» feels natural to you and sounds badly wrong to a German. Train the main-clause reflex first: after the first element, the verb comes immediately.',
'فارسی تقریباً در همهٔ جمله‌ها فعل را آخر می‌گذارد — «من امروز آلمانی یاد می‌گیرم». آلمانی در جملهٔ اصلی برعکس عمل می‌کند و فقط در جملهٔ پیرو با فارسی هماهنگ می‌شود.

به همین دلیل «Ich heute Deutsch lerne» برای تو طبیعی حس می‌شود ولی برای آلمانی‌زبان کاملاً غلط است. اول واکنشِ جملهٔ اصلی را تمرین کن: بعد از عنصر اول، بلافاصله فعل.')
ON CONFLICT (key) DO UPDATE SET
  icon = EXCLUDED.icon, title_en = EXCLUDED.title_en, title_fa = EXCLUDED.title_fa,
  description_en = EXCLUDED.description_en, description_fa = EXCLUDED.description_fa,
  type = EXCLUDED.type, sort_order = EXCLUDED.sort_order,
  explanation_en = EXCLUDED.explanation_en, explanation_fa = EXCLUDED.explanation_fa,
  pitfall_en = EXCLUDED.pitfall_en, pitfall_fa = EXCLUDED.pitfall_fa;

DELETE FROM basics_sections WHERE category_id = (SELECT id FROM basics_categories WHERE key = 'wordOrder');

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'wordOrder'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Verb in Position 2', 'فعل در جایگاه دوم', 'table', 0,
    'Put anything you like first. The verb does not move — the subject slides behind it instead.',
    'هر چیزی می‌خواهی اول بگذار. فعل جابه‌جا نمی‌شود — به‌جایش فاعل پشت آن می‌رود.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich lerne heute Deutsch.', 'I am learning German today.', 'امروز آلمانی یاد می‌گیرم.', 0),
  ('Heute lerne ich Deutsch.', 'Today I am learning German. (verb still 2nd)', 'امروز آلمانی یاد می‌گیرم. (فعل باز هم دوم)', 1),
  ('In Berlin wohne ich seit 2020.', 'I have lived in Berlin since 2020.', 'از ۲۰۲۰ در برلین زندگی می‌کنم.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'wordOrder'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Subordinate Clauses: Verb to the End', 'جملهٔ پیرو: فعل به آخر', 'table', 1,
    'weil, dass, wenn, als, ob, obwohl, damit all send the conjugated verb to the end of their clause. A comma always separates the two clauses.',
    'weil، dass، wenn، als، ob، obwohl و damit همگی فعل صرف‌شده را به آخر جملهٔ خودشان می‌فرستند. همیشه یک ویرگول دو جمله را جدا می‌کند.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich bleibe zu Hause, weil ich krank bin.', 'I am staying home because I am ill.', 'خانه می‌مانم چون مریضم.', 0),
  ('Ich denke, dass er recht hat.', 'I think that he is right.', 'فکر می‌کنم حق با اوست.', 1),
  ('Wenn ich Zeit habe, lese ich.', 'When I have time, I read.', 'هر وقت وقت داشته باشم، مطالعه می‌کنم.', 2),
  ('Ich weiß nicht, ob er kommt.', 'I do not know whether he is coming.', 'نمی‌دانم آیا می‌آید یا نه.', 3)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'wordOrder'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Relative Clauses', 'جمله‌های موصولی', 'table', 2,
    'The relative pronoun copies the gender and number of the noun it describes, takes its case from its role inside the clause, and pushes that clause verb to the end.',
    'ضمیر موصولی جنسیت و شمار اسمی را می‌گیرد که توصیفش می‌کند، حالتش از نقشش داخل جملهٔ پیرو می‌آید، و فعل آن جمله را به آخر می‌برد.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Das ist die Frau, die hier arbeitet.', 'That is the woman who works here.', 'این خانمی است که اینجا کار می‌کند.', 0),
  ('Der Film, den ich gesehen habe, war gut.', 'The film that I saw was good.', 'فیلمی که دیدم خوب بود.', 1),
  ('Das Kind, dem ich helfe, ist sechs.', 'The child I am helping is six.', 'بچه‌ای که کمکش می‌کنم شش‌ساله است.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'wordOrder'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Connectors That Do NOT Move the Verb', 'حرف‌های ربطی که فعل را جابه‌جا نمی‌کنند', 'table', 3,
    'und, aber, oder, denn, sondern join two main clauses and do not count as an element — the verb stays second. Compare denn and weil: same meaning, different word order.',
    'und، aber، oder، denn و sondern دو جملهٔ اصلی را وصل می‌کنند و جزء جمله شمرده نمی‌شوند — فعل دوم می‌ماند. denn و weil را مقایسه کن: یک معنی، دو ترتیب متفاوت.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich bleibe hier, denn ich bin müde.', 'I am staying here, for I am tired. (verb 2nd)', 'اینجا می‌مانم، چون خسته‌ام. (فعل دوم)', 0),
  ('Ich bleibe hier, weil ich müde bin.', 'I am staying here because I am tired. (verb last)', 'اینجا می‌مانم چون خسته‌ام. (فعل آخر)', 1),
  ('Sie kocht und er deckt den Tisch.', 'She cooks and he sets the table.', 'او آشپزی می‌کند و او میز را می‌چیند.', 2)
) AS v(g, e, f, o);


-- ════════════════════════════════════════════════════════════════════════
--  14. verbTenses — زمان‌های فعل
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO basics_categories
  (key, icon, title_en, title_fa, description_en, description_fa, type, sort_order,
   explanation_en, explanation_fa, pitfall_en, pitfall_fa)
VALUES ('verbTenses', '⏳', 'Verb Tenses', 'زمان‌های فعل',
  'Past, present and future',
  'گذشته، حال و آینده',
  'multi', 14,
'German gets by with far fewer tenses than you might expect.

PAST: spoken German uses the Perfekt almost exclusively — haben or sein plus a participle at the end. Written German and a handful of very common verbs (war, hatte, konnte) prefer the Präteritum.

PRESENT: covers now AND the future. With a time word, the present tense is the normal way to talk about tomorrow.

FUTURE: Futur I (werden plus infinitive) exists, but is used mainly for firm intentions, promises and predictions — not for ordinary plans.',
'آلمانی با زمان‌های خیلی کمتری از آنچه فکر می‌کنی سر می‌کند.

گذشته: آلمانی گفتاری تقریباً همیشه از Perfekt استفاده می‌کند — haben یا sein به‌همراه اسم مفعول در آخر. نوشتار و چند فعل خیلی پرکاربرد (war، hatte، konnte) Präteritum را ترجیح می‌دهند.

حال: هم «الان» را پوشش می‌دهد هم آینده را. با یک قید زمان، زمان حال روش عادی صحبت دربارهٔ فرداست.

آینده: Futur I (werden به‌همراه مصدر) وجود دارد، اما بیشتر برای قصد قاطع، قول و پیش‌بینی به‌کار می‌رود — نه برنامه‌های معمولی.',
'Persian has a clean present/past/future system and uses the future tense freely. In German, using werden for every future statement sounds heavy and unnatural — «Morgen gehe ich» is what a native says, not «Morgen werde ich gehen».

Also: Persian marks completed past with one form, while German splits it between haben and sein depending on the verb. Movement and change of state take sein.',
'فارسی نظام حال/گذشته/آینده‌ای تمیز دارد و آینده را آزادانه به‌کار می‌برد. در آلمانی استفاده از werden برای هر جملهٔ آینده سنگین و غیرطبیعی است — آلمانی‌زبان می‌گوید «Morgen gehe ich»، نه «Morgen werde ich gehen».

ضمناً فارسی گذشتهٔ کامل را با یک شکل نشان می‌دهد، ولی آلمانی بین haben و sein تقسیمش می‌کند. فعل‌های حرکت و تغییر حالت sein می‌گیرند.')
ON CONFLICT (key) DO UPDATE SET
  icon = EXCLUDED.icon, title_en = EXCLUDED.title_en, title_fa = EXCLUDED.title_fa,
  description_en = EXCLUDED.description_en, description_fa = EXCLUDED.description_fa,
  type = EXCLUDED.type, sort_order = EXCLUDED.sort_order,
  explanation_en = EXCLUDED.explanation_en, explanation_fa = EXCLUDED.explanation_fa,
  pitfall_en = EXCLUDED.pitfall_en, pitfall_fa = EXCLUDED.pitfall_fa;

DELETE FROM basics_sections WHERE category_id = (SELECT id FROM basics_categories WHERE key = 'verbTenses');

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTenses'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Perfekt with haben', 'ماضی نقلی با haben', 'table', 0,
    'The default past tense. haben is conjugated in position two, the participle waits at the end. Regular participles look like ge-...-t: machen becomes gemacht.',
    'زمان گذشتهٔ پیش‌فرض. haben در جایگاه دوم صرف می‌شود و اسم مفعول در آخر منتظر می‌ماند. اسم مفعول باقاعده شکل ge-...-t دارد: machen به gemacht.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich habe Deutsch gelernt.', 'I learned German.', 'آلمانی یاد گرفتم.', 0),
  ('Wir haben Pizza gegessen.', 'We ate pizza.', 'پیتزا خوردیم.', 1),
  ('Hast du das Buch gelesen?', 'Did you read the book?', 'کتاب را خواندی؟', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTenses'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Perfekt with sein', 'ماضی نقلی با sein', 'table', 1,
    'Verbs of movement (gehen, fahren, kommen, fliegen) and change of state (werden, aufstehen, einschlafen) take sein instead of haben. bleiben is the odd one out — no movement, but still sein.',
    'فعل‌های حرکت (gehen، fahren، kommen، fliegen) و تغییر حالت (werden، aufstehen، einschlafen) به‌جای haben از sein استفاده می‌کنند. bleiben استثناست — حرکتی ندارد ولی باز sein می‌گیرد.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich bin nach Berlin gefahren.', 'I travelled to Berlin.', 'به برلین رفتم.', 0),
  ('Sie ist zu Hause geblieben.', 'She stayed at home.', 'او خانه ماند.', 1),
  ('Wir sind früh aufgestanden.', 'We got up early.', 'زود بیدار شدیم.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTenses'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Präteritum', 'گذشتهٔ ساده', 'table', 2,
    'One word instead of two. Used in writing and storytelling, and in speech for sein, haben and the modals — nobody says "ich habe gekonnt" in conversation.',
    'یک کلمه به‌جای دو کلمه. در نوشتار و داستان‌گویی به‌کار می‌رود، و در گفتار برای sein، haben و فعل‌های کمکی — هیچ‌کس در مکالمه نمی‌گوید «ich habe gekonnt».'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich war gestern zu Hause.', 'I was at home yesterday.', 'دیروز خانه بودم.', 0),
  ('Wir hatten keine Zeit.', 'We had no time.', 'وقت نداشتیم.', 1),
  ('Als Kind wohnte ich in Isfahan.', 'As a child I lived in Isfahan.', 'بچه که بودم در اصفهان زندگی می‌کردم.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTenses'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Future: present tense or Futur I', 'آینده: زمان حال یا Futur I', 'table', 3,
    'For ordinary plans, use the present tense with a time word. Save werden plus infinitive for promises, firm intentions and predictions.',
    'برای برنامه‌های معمولی از زمان حال با قید زمان استفاده کن. werden به‌همراه مصدر را برای قول، قصد قاطع و پیش‌بینی نگه دار.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Morgen fahre ich nach Hamburg.', 'Tomorrow I am going to Hamburg. (present = future)', 'فردا به هامبورگ می‌روم. (حال به معنی آینده)', 0),
  ('Ich werde dir helfen.', 'I will help you. (a promise)', 'کمکت خواهم کرد. (قول)', 1),
  ('Es wird bestimmt regnen.', 'It is definitely going to rain.', 'حتماً باران خواهد بارید.', 2)
) AS v(g, e, f, o);


-- ════════════════════════════════════════════════════════════════════════
--  15. verbTypes — انواع فعل
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO basics_categories
  (key, icon, title_en, title_fa, description_en, description_fa, type, sort_order,
   explanation_en, explanation_fa, pitfall_en, pitfall_fa)
VALUES ('verbTypes', '🔧', 'Verb Types', 'انواع فعل',
  'Separable, reflexive, imperative and fixed prepositions',
  'جداشدنی، انعکاسی، امری و حروف اضافهٔ ثابت',
  'multi', 15,
'Beyond conjugation, German verbs come in a few shapes that change the SENTENCE around them.

Separable verbs break in half and throw their prefix to the end. Reflexive verbs drag a pronoun along. The imperative moves the verb to the front. And a large group of verbs is welded to one specific preposition that you must learn with the verb.

None of these are hard individually. What makes them feel hard is that each one rearranges the sentence in its own way.',
'فراتر از صرف، فعل‌های آلمانی چند شکل دارند که «جمله» را دور خودشان تغییر می‌دهند.

فعل‌های جداشدنی نصف می‌شوند و پیشوندشان را به آخر پرت می‌کنند. فعل‌های انعکاسی یک ضمیر با خود می‌کشند. امری فعل را به اول می‌برد. و گروه بزرگی از فعل‌ها به یک حرف اضافهٔ مشخص جوش خورده‌اند که باید همراه فعل حفظ شود.

هیچ‌کدام به‌تنهایی سخت نیستند. چیزی که سختشان می‌کند این است که هرکدام جمله را به شیوهٔ خودش بازچینی می‌کند.',
'Persian has separable-feeling compound verbs too — «بر می‌دارم», «کمک می‌کنم» — so the idea of a split verb is not foreign. The difference is distance: German throws the prefix to the very END of the sentence, however long it is.

Ich stehe jeden Morgen um halb sieben AUF. Getting comfortable with that long gap is the whole skill.',
'فارسی هم فعل مرکب دارد که حس جداشدنی می‌دهد — «بر می‌دارم»، «کمک می‌کنم» — پس ایدهٔ فعل شکسته برایت غریبه نیست. تفاوت در فاصله است: آلمانی پیشوند را تا «آخر» جمله پرت می‌کند، هرقدر هم جمله طولانی باشد.

Ich stehe jeden Morgen um halb sieben AUF. راحت شدن با این فاصلهٔ طولانی، تمام مهارت است.')
ON CONFLICT (key) DO UPDATE SET
  icon = EXCLUDED.icon, title_en = EXCLUDED.title_en, title_fa = EXCLUDED.title_fa,
  description_en = EXCLUDED.description_en, description_fa = EXCLUDED.description_fa,
  type = EXCLUDED.type, sort_order = EXCLUDED.sort_order,
  explanation_en = EXCLUDED.explanation_en, explanation_fa = EXCLUDED.explanation_fa,
  pitfall_en = EXCLUDED.pitfall_en, pitfall_fa = EXCLUDED.pitfall_fa;

DELETE FROM basics_sections WHERE category_id = (SELECT id FROM basics_categories WHERE key = 'verbTypes');

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTypes'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Separable Verbs', 'فعل‌های جداشدنی', 'table', 0,
    'aufstehen, einkaufen, anrufen, mitkommen: the prefix detaches and lands at the end. In the Perfekt the ge- slots INTO the middle: aufgestanden.',
    'aufstehen، einkaufen، anrufen، mitkommen: پیشوند جدا می‌شود و آخر جمله می‌نشیند. در ماضی نقلی، ge- وسط کلمه می‌نشیند: aufgestanden.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich stehe um sieben Uhr auf.', 'I get up at seven.', 'ساعت هفت بیدار می‌شوم.', 0),
  ('Rufst du mich heute Abend an?', 'Will you call me tonight?', 'امشب بهم زنگ می‌زنی؟', 1),
  ('Der Zug kommt um acht an.', 'The train arrives at eight.', 'قطار ساعت هشت می‌رسد.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTypes'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Reflexive Verbs', 'فعل‌های انعکاسی', 'table', 1,
    'Some verbs always carry a reflexive pronoun that changes with the subject: mich, dich, sich, uns, euch, sich. Often there is no reflexive at all in the Persian equivalent.',
    'بعضی فعل‌ها همیشه ضمیر انعکاسی دارند که با فاعل تغییر می‌کند: mich، dich، sich، uns، euch، sich. اغلب معادل فارسی‌شان اصلاً انعکاسی نیست.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich freue mich auf das Wochenende.', 'I am looking forward to the weekend.', 'منتظر آخر هفته‌ام.', 0),
  ('Wie fühlst du dich?', 'How do you feel?', 'چه حسی داری؟', 1),
  ('Wir treffen uns um acht.', 'We are meeting at eight.', 'ساعت هشت همدیگر را می‌بینیم.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTypes'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Imperative', 'امری', 'table', 2,
    'Formal keeps Sie after the verb: Gehen Sie! Informal du drops the pronoun and usually the ending: Geh! For a group: Geht!',
    'شکل رسمی Sie را بعد از فعل نگه می‌دارد: Gehen Sie! شکل خودمانی du ضمیر و معمولاً پسوند را حذف می‌کند: Geh! برای جمع: Geht!'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Gehen Sie hier links.', 'Turn left here. (formal)', 'اینجا به چپ بروید. (رسمی)', 0),
  ('Komm bitte her!', 'Come here please. (informal)', 'لطفاً بیا اینجا! (خودمانی)', 1),
  ('Nehmen Sie Platz.', 'Please take a seat.', 'بفرمایید بنشینید.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'verbTypes'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Verbs with a Fixed Preposition', 'فعل‌های با حرف اضافهٔ ثابت', 'table', 3,
    'The preposition is part of the verb and cannot be guessed from meaning. warten AUF, sich freuen AUF, sich bewerben UM, denken AN. Learn the pair as one unit.',
    'حرف اضافه بخشی از فعل است و از روی معنی قابل حدس نیست. warten AUF، sich freuen AUF، sich bewerben UM، denken AN. جفت را یکجا حفظ کن.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich warte auf den Bus.', 'I am waiting for the bus.', 'منتظر اتوبوسم.', 0),
  ('Sie bewirbt sich um die Stelle.', 'She is applying for the position.', 'برای آن شغل درخواست می‌دهد.', 1),
  ('Ich denke oft an meine Familie.', 'I often think about my family.', 'اغلب به خانواده‌ام فکر می‌کنم.', 2)
) AS v(g, e, f, o);


-- ════════════════════════════════════════════════════════════════════════
--  16. adjectives — صفت‌ها
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO basics_categories
  (key, icon, title_en, title_fa, description_en, description_fa, type, sort_order,
   explanation_en, explanation_fa, pitfall_en, pitfall_fa)
VALUES ('adjectives', '🎨', 'Adjectives', 'صفت‌ها',
  'Endings, comparative and superlative',
  'پسوندها، تفضیلی و عالی',
  'multi', 16,
'An adjective takes an ending only when it stands BEFORE a noun. After sein, werden or bleiben it stays bare.

  Das Auto ist neu.        no ending
  ein neues Auto           ending

Which ending depends on three things at once: the gender of the noun, the case, and whether there is an article in front. That sounds heavy, but two shortcuts carry most of the work:

  after der/die/das  -> mostly -e, and -en everywhere in dative and plural
  after ein/kein/mein -> the adjective supplies the gender signal itself',
'صفت فقط وقتی پسوند می‌گیرد که «قبل» از اسم بیاید. بعد از sein، werden یا bleiben بدون پسوند می‌ماند.

  Das Auto ist neu.        بدون پسوند
  ein neues Auto           با پسوند

اینکه کدام پسوند بیاید به سه چیز هم‌زمان بستگی دارد: جنسیت اسم، حالت، و اینکه حرف تعریفی جلویش هست یا نه. سنگین به‌نظر می‌رسد، اما دو میان‌بُر بیشترِ کار را انجام می‌دهد:

  بعد از der/die/das ← بیشتر -e، و در Dativ و جمع همه‌جا -en
  بعد از ein/kein/mein ← خود صفت نشانهٔ جنسیت را می‌دهد',
'Persian adjectives never change — «ماشین نو», «خانهٔ نو», «کتاب‌های نو» all use the same word, joined by an ezafe. German changes the adjective itself, and the change depends on grammar you cannot hear in Persian at all.

Good news: the ending is almost always -e or -en. Learn to reach for -en whenever you are in the dative or the plural, and you will be right most of the time.',
'صفت در فارسی هرگز تغییر نمی‌کند — «ماشین نو»، «خانهٔ نو»، «کتاب‌های نو» همگی یک کلمه‌اند که با کسرهٔ اضافه وصل می‌شود. آلمانی خود صفت را تغییر می‌دهد و این تغییر به دستوری بستگی دارد که در فارسی اصلاً وجود ندارد.

خبر خوب: پسوند تقریباً همیشه -e یا -en است. عادت کن در Dativ و جمع سراغ -en بروی؛ بیشتر مواقع درست خواهی بود.')
ON CONFLICT (key) DO UPDATE SET
  icon = EXCLUDED.icon, title_en = EXCLUDED.title_en, title_fa = EXCLUDED.title_fa,
  description_en = EXCLUDED.description_en, description_fa = EXCLUDED.description_fa,
  type = EXCLUDED.type, sort_order = EXCLUDED.sort_order,
  explanation_en = EXCLUDED.explanation_en, explanation_fa = EXCLUDED.explanation_fa,
  pitfall_en = EXCLUDED.pitfall_en, pitfall_fa = EXCLUDED.pitfall_fa;

DELETE FROM basics_sections WHERE category_id = (SELECT id FROM basics_categories WHERE key = 'adjectives');

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'adjectives'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'After sein: No Ending', 'بعد از sein: بدون پسوند', 'table', 0,
    'The easiest position. Start every new adjective here before worrying about endings.',
    'ساده‌ترین جایگاه. هر صفت جدید را اول اینجا تمرین کن، قبل از اینکه نگران پسوند شوی.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Das Zimmer ist groß.', 'The room is big.', 'اتاق بزرگ است.', 0),
  ('Die Suppe ist heiß.', 'The soup is hot.', 'سوپ داغ است.', 1),
  ('Meine Nachbarn sind nett.', 'My neighbours are nice.', 'همسایه‌هایم مهربان‌اند.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'adjectives'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Before a Noun: Endings', 'قبل از اسم: پسوندها', 'table', 1,
    'After der/die/das the ending is -e in the nominative and -en almost everywhere else. After ein the adjective carries the gender: ein guter Mann, eine gute Frau, ein gutes Kind.',
    'بعد از der/die/das پسوند در حالت فاعلی -e است و تقریباً در بقیهٔ جاها -en. بعد از ein، خود صفت جنسیت را نشان می‌دهد: ein guter Mann، eine gute Frau، ein gutes Kind.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Der neue Lehrer ist nett.', 'The new teacher is nice.', 'معلم جدید مهربان است.', 0),
  ('Das ist ein schönes Haus.', 'That is a beautiful house.', 'آن یک خانهٔ زیباست.', 1),
  ('Ich helfe dem alten Mann.', 'I help the old man. (dative: -en)', 'به مرد مسن کمک می‌کنم. (Dativ: -en)', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'adjectives'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Comparative: -er ... als', 'تفضیلی: -er ... als', 'table', 2,
    'Add -er and use als for than. A few one-syllable adjectives also add an umlaut: alt becomes älter, groß becomes größer. Irregulars: gut/besser, viel/mehr.',
    'به صفت -er اضافه کن و برای «از» از als استفاده کن. چند صفت یک‌هجایی اوملاوت هم می‌گیرند: alt به älter، groß به größer. بی‌قاعده‌ها: gut/besser، viel/mehr.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Der Zug ist schneller als das Auto.', 'The train is faster than the car.', 'قطار از ماشین سریع‌تر است.', 0),
  ('Mein Bruder ist älter als ich.', 'My brother is older than me.', 'برادرم از من بزرگ‌تر است.', 1),
  ('Heute ist es besser als gestern.', 'Today is better than yesterday.', 'امروز از دیروز بهتر است.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'adjectives'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Superlative: am ...-sten', 'عالی: am ...-sten', 'table', 3,
    'After a verb: am schnellsten. Before a noun: der/die/das schnellste. Irregulars to memorise: gut/am besten, viel/am meisten, gern/am liebsten.',
    'بعد از فعل: am schnellsten. قبل از اسم: der/die/das schnellste. بی‌قاعده‌های حفظی: gut/am besten، viel/am meisten، gern/am liebsten.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Dieser Weg ist am kürzesten.', 'This way is the shortest.', 'این راه کوتاه‌ترین است.', 0),
  ('Das ist die beste Lösung.', 'That is the best solution.', 'این بهترین راه‌حل است.', 1),
  ('Ich trinke am liebsten Tee.', 'I like drinking tea most of all.', 'بیشتر از همه چای دوست دارم.', 2)
) AS v(g, e, f, o);


-- ════════════════════════════════════════════════════════════════════════
--  17. passiveKonjunktiv — مجهول و وجه شرطی
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO basics_categories
  (key, icon, title_en, title_fa, description_en, description_fa, type, sort_order,
   explanation_en, explanation_fa, pitfall_en, pitfall_fa)
VALUES ('passiveKonjunktiv', '🎭', 'Passive & Konjunktiv II', 'مجهول و وجه شرطی',
  'When the doer does not matter, and how to be polite',
  'وقتی انجام‌دهنده مهم نیست، و راه مؤدب بودن',
  'multi', 17,
'Two structures that make you sound like an adult speaker rather than a beginner.

PASSIVE: werden plus a participle. Use it when the action matters and the doer does not — official notices, instructions, processes. Das Formular wird ausgefüllt.

KONJUNKTIV II: the polite and hypothetical mood. würde plus infinitive for most verbs; haben and sein have their own forms, hätte and wäre. This is how you request, suggest and complain without sounding blunt.

At A1 you mostly need Konjunktiv II. Passive becomes important from A2 onwards.',
'دو ساختار که باعث می‌شوند مثل یک گویندهٔ بزرگسال حرف بزنی، نه یک مبتدی.

مجهول: werden به‌همراه اسم مفعول. وقتی به‌کار می‌رود که خودِ عمل مهم است و انجام‌دهنده مهم نیست — اطلاعیه‌های رسمی، دستورالعمل‌ها، فرایندها. Das Formular wird ausgefüllt.

Konjunktiv II: وجه مؤدبانه و فرضی. برای بیشتر فعل‌ها würde به‌همراه مصدر؛ haben و sein شکل خودشان را دارند: hätte و wäre. با همین ساختار درخواست می‌کنی، پیشنهاد می‌دهی و شکایت می‌کنی، بدون اینکه تند به‌نظر برسی.

در سطح A1 بیشتر به Konjunktiv II نیاز داری. مجهول از A2 به بعد مهم می‌شود.',
'Persian has a passive («ساخته شد») but uses it far less than German does — Persian prefers an impersonal active: «فرم را پر می‌کنند». German officialdom reaches for the passive constantly, so you will READ it much more often than you SAY it.

For politeness, Persian softens with tone and words like «لطفاً» and «می‌شود». German softens by changing the verb form itself: kann becomes könnte, will becomes würde. Adding bitte alone is not enough.',
'فارسی مجهول دارد («ساخته شد») اما خیلی کمتر از آلمانی از آن استفاده می‌کند — فارسی معلومِ بی‌شخص را ترجیح می‌دهد: «فرم را پر می‌کنند». زبان اداری آلمان مدام سراغ مجهول می‌رود، پس آن را خیلی بیشتر از آنکه «بگویی»، «می‌خوانی».

برای ادب، فارسی با لحن و کلماتی مثل «لطفاً» و «می‌شود» نرم می‌کند. آلمانی خودِ شکل فعل را عوض می‌کند: kann به könnte، will به würde. فقط اضافه کردن bitte کافی نیست.')
ON CONFLICT (key) DO UPDATE SET
  icon = EXCLUDED.icon, title_en = EXCLUDED.title_en, title_fa = EXCLUDED.title_fa,
  description_en = EXCLUDED.description_en, description_fa = EXCLUDED.description_fa,
  type = EXCLUDED.type, sort_order = EXCLUDED.sort_order,
  explanation_en = EXCLUDED.explanation_en, explanation_fa = EXCLUDED.explanation_fa,
  pitfall_en = EXCLUDED.pitfall_en, pitfall_fa = EXCLUDED.pitfall_fa;

DELETE FROM basics_sections WHERE category_id = (SELECT id FROM basics_categories WHERE key = 'passiveKonjunktiv');

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'passiveKonjunktiv'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Present Passive', 'مجهول حال', 'table', 0,
    'werden is conjugated in position two, the participle goes to the end. If you must name the doer, use von plus dative.',
    'فعل werden در جایگاه دوم صرف می‌شود و اسم مفعول به آخر می‌رود. اگر لازم شد انجام‌دهنده را نام ببری، از von با Dativ استفاده کن.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Hier wird Deutsch gesprochen.', 'German is spoken here.', 'اینجا آلمانی صحبت می‌شود.', 0),
  ('Das Geschäft wird um neun geöffnet.', 'The shop is opened at nine.', 'مغازه ساعت نُه باز می‌شود.', 1),
  ('Ihre Bestellung wird bearbeitet.', 'Your order is being processed.', 'سفارش شما در حال پردازش است.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'passiveKonjunktiv'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Past Passive', 'مجهول گذشته', 'table', 1,
    'Same structure with wurde instead of wird. Very common in notices, histories and reports.',
    'همان ساختار با wurde به‌جای wird. در اطلاعیه‌ها، تاریخچه‌ها و گزارش‌ها بسیار رایج است.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Das Haus wurde 1990 gebaut.', 'The house was built in 1990.', 'این خانه در سال ۱۹۹۰ ساخته شد.', 0),
  ('Der Brief wurde gestern geschickt.', 'The letter was sent yesterday.', 'نامه دیروز فرستاده شد.', 1),
  ('Die Schule wurde renoviert.', 'The school was renovated.', 'مدرسه بازسازی شد.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'passiveKonjunktiv'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'würde + Infinitive', 'würde به‌همراه مصدر', 'table', 2,
    'The all-purpose polite and hypothetical form. würde is conjugated, the main verb waits at the end as an infinitive.',
    'شکل همه‌کارهٔ مؤدبانه و فرضی. würde صرف می‌شود و فعل اصلی به‌شکل مصدر در آخر منتظر می‌ماند.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich würde gern mitkommen.', 'I would like to come along.', 'دوست دارم همراه بیایم.', 0),
  ('Würden Sie mir bitte helfen?', 'Would you please help me?', 'لطفاً کمکم می‌کنید؟', 1),
  ('An deiner Stelle würde ich warten.', 'In your place I would wait.', 'جای تو بودم صبر می‌کردم.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'passiveKonjunktiv'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'hätte, wäre, könnte', 'hätte، wäre، könnte', 'table', 3,
    'haben, sein and the modals do not use würde — they have their own conditional forms, and these are the ones you need most in shops, offices and restaurants.',
    'فعل‌های haben و sein و فعل‌های کمکی از würde استفاده نمی‌کنند — شکل شرطی خودشان را دارند، و همین‌ها هستند که در مغازه و اداره و رستوران بیشترین کاربرد را دارند.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich hätte gern einen Tee.', 'I would like a tea.', 'یک چای می‌خواهم.', 0),
  ('Das wäre sehr nett.', 'That would be very kind.', 'خیلی لطف می‌کنید.', 1),
  ('Könnten Sie das wiederholen?', 'Could you repeat that?', 'می‌شود دوباره بگویید؟', 2)
) AS v(g, e, f, o);


-- ════════════════════════════════════════════════════════════════════════
--  18. negationImpersonal — نفی و ساختارهای غیرشخصی
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO basics_categories
  (key, icon, title_en, title_fa, description_en, description_fa, type, sort_order,
   explanation_en, explanation_fa, pitfall_en, pitfall_fa)
VALUES ('negationImpersonal', '🚫', 'Negation & Impersonal Forms', 'نفی و ساختارهای غیرشخصی',
  'nicht, kein, man, es gibt and purpose clauses',
  'nicht، kein، man، es gibt و بیان هدف',
  'multi', 18,
'Saying no in German means choosing between two words, and the choice is mechanical.

  kein  negates a noun that has ein or no article at all
  nicht negates everything else — verbs, adjectives, and nouns with der/die/das

This category also collects the impersonal structures German leans on constantly: man for people in general, es gibt for existence, and the little constructions that express purpose — um ... zu and damit.',
'«نه» گفتن در آلمانی یعنی انتخاب بین دو کلمه، و این انتخاب کاملاً مکانیکی است.

  kein  اسمی را نفی می‌کند که ein دارد یا اصلاً حرف تعریف ندارد
  nicht بقیهٔ چیزها را نفی می‌کند — فعل، صفت، و اسم‌هایی که der/die/das دارند

این دسته ساختارهای غیرشخصی پرکاربرد آلمانی را هم جمع کرده است: man برای «مردم به‌طور کلی»، es gibt برای بیان وجود، و ساختارهای کوچکی که هدف را بیان می‌کنند — um ... zu و damit.',
'Persian negates by attaching «ن» to the verb — «نمی‌روم», «ندارم» — one mechanism for everything. German splits it in two, and picking kein where nicht belongs (or the reverse) is one of the most audible beginner errors.

Quick test: is the thing you are negating a noun with ein or no article? Then kein. Otherwise nicht.',
'فارسی با چسباندن «ن» به فعل نفی می‌کند — «نمی‌روم»، «ندارم» — یک سازوکار برای همه‌چیز. آلمانی آن را به دو بخش تقسیم می‌کند، و انتخاب kein به‌جای nicht (یا برعکس) یکی از شنیدنی‌ترین خطاهای مبتدی‌هاست.

آزمون سریع: چیزی که نفی می‌کنی اسمی با ein یا بدون حرف تعریف است؟ پس kein. در غیر این صورت nicht.')
ON CONFLICT (key) DO UPDATE SET
  icon = EXCLUDED.icon, title_en = EXCLUDED.title_en, title_fa = EXCLUDED.title_fa,
  description_en = EXCLUDED.description_en, description_fa = EXCLUDED.description_fa,
  type = EXCLUDED.type, sort_order = EXCLUDED.sort_order,
  explanation_en = EXCLUDED.explanation_en, explanation_fa = EXCLUDED.explanation_fa,
  pitfall_en = EXCLUDED.pitfall_en, pitfall_fa = EXCLUDED.pitfall_fa;

DELETE FROM basics_sections WHERE category_id = (SELECT id FROM basics_categories WHERE key = 'negationImpersonal');

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'negationImpersonal'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'nicht or kein', 'nicht یا kein', 'table', 0,
    'kein takes the same endings as ein. nicht usually stands right before the word it negates, or at the end of the clause when it negates the whole sentence.',
    'kein همان پسوندهای ein را می‌گیرد. nicht معمولاً درست قبل از کلمه‌ای می‌آید که نفی می‌کند، یا وقتی کل جمله را نفی می‌کند، آخر جمله.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich habe keine Zeit.', 'I have no time. (noun with ein)', 'وقت ندارم. (اسم با ein)', 0),
  ('Ich komme heute nicht.', 'I am not coming today. (verb)', 'امروز نمی‌آیم. (فعل)', 1),
  ('Das ist nicht mein Buch.', 'That is not my book. (has mein)', 'این کتاب من نیست. (mein دارد)', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'negationImpersonal'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'man — people in general', 'man — مردم به‌طور کلی', 'table', 1,
    'man always takes the er/sie/es verb form. It is the normal way to state rules, customs and general truths, and it is everywhere in signs and instructions.',
    'man همیشه فعل را مثل er/sie/es صرف می‌کند. روش عادی بیان قانون، رسم و حقیقت کلی است و در تابلوها و دستورالعمل‌ها همه‌جا دیده می‌شود.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Hier darf man nicht rauchen.', 'Smoking is not allowed here.', 'اینجا سیگار کشیدن ممنوع است.', 0),
  ('Man muss den Müll trennen.', 'You have to separate the rubbish.', 'باید زباله را تفکیک کرد.', 1),
  ('Wie sagt man das auf Deutsch?', 'How do you say that in German?', 'این را به آلمانی چه می‌گویند؟', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'negationImpersonal'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'es gibt and the empty es', 'es gibt و esِ بی‌معنا', 'table', 2,
    'es gibt never changes and is always followed by the accusative. German also needs a placeholder es for weather and time, where Persian needs no subject at all.',
    'عبارت es gibt هرگز تغییر نمی‌کند و همیشه بعدش Akkusativ می‌آید. آلمانی برای هوا و زمان هم به esِ جانشین نیاز دارد، جایی که فارسی اصلاً فاعل نمی‌خواهد.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Es gibt einen Garten.', 'There is a garden.', 'یک باغ وجود دارد.', 0),
  ('Es regnet seit heute Morgen.', 'It has been raining since this morning.', 'از صبح باران می‌بارد.', 1),
  ('Es ist schon spät.', 'It is already late.', 'دیر شده است.', 2)
) AS v(g, e, f, o);

WITH cat AS (SELECT id FROM basics_categories WHERE key = 'negationImpersonal'),
s AS (
  INSERT INTO basics_sections (category_id, heading_en, heading_fa, type, sort_order, explanation_en, explanation_fa)
  SELECT id, 'Purpose: um ... zu, damit, lassen', 'هدف: um ... zu، damit، lassen', 'table', 3,
    'um ... zu when both halves share a subject; damit when the subject changes. lassen means having someone else do something for you.',
    'وقتی فاعل هر دو بخش یکی است um ... zu؛ وقتی فاعل عوض می‌شود damit. فعل lassen یعنی کاری را دیگری برایت انجام دهد.'
  FROM cat RETURNING id)
INSERT INTO basics_words (section_id, german, en, fa, sort_order)
SELECT s.id, v.g, v.e, v.f, v.o FROM s, (VALUES
  ('Ich lerne Deutsch, um in Berlin zu arbeiten.', 'I learn German in order to work in Berlin.', 'آلمانی یاد می‌گیرم تا در برلین کار کنم.', 0),
  ('Ich erkläre es, damit du es verstehst.', 'I explain it so that you understand.', 'توضیح می‌دهم تا بفهمی.', 1),
  ('Ich lasse mir die Haare schneiden.', 'I am having my hair cut.', 'موهایم را کوتاه می‌کنم (توسط آرایشگر).', 2)
) AS v(g, e, f, o);


-- ── Verify ──────────────────────────────────────────────────────────────────
--   SELECT key, title_en, sort_order FROM basics_categories ORDER BY sort_order;
--     -> expect 18 rows
--   SELECT c.key, count(s.id) AS sections
--   FROM basics_categories c LEFT JOIN basics_sections s ON s.category_id = c.id
--   WHERE c.sort_order >= 13 GROUP BY c.key ORDER BY c.key;
--     -> expect 4 sections for each of the 6 new categories
