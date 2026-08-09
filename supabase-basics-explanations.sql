-- ============================================================================
--  Basics explanations — turn reference tables into teaching
-- ============================================================================
--
--  Run this whole file once in the Supabase SQL editor.
--
--  Part 1 adds the explanation columns (safe to re-run).
--  Part 2 writes the rule + the Persian-speaker pitfall for the eight GRAMMAR
--  categories, and per-section notes where a section needs its own rule.
--
--  Vocabulary categories (numbers, colors, days, months) are deliberately left
--  without an explanation: the word list is the content. They get a single
--  short usage line only where the usage is genuinely non-obvious.
--
--  Rendering: explanation appears in a bordered block above the tables,
--  pitfall appears as a ⚠️ callout beneath it. Empty columns render nothing.
-- ============================================================================

-- ── Part 1: schema ──────────────────────────────────────────────────────────
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS explanation_en text;
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS explanation_fa text;
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS pitfall_en text;
ALTER TABLE basics_categories ADD COLUMN IF NOT EXISTS pitfall_fa text;

ALTER TABLE basics_sections ADD COLUMN IF NOT EXISTS explanation_en text;
ALTER TABLE basics_sections ADD COLUMN IF NOT EXISTS explanation_fa text;

COMMENT ON COLUMN basics_categories.explanation_en IS 'The rule, shown above the tables. Blank for vocabulary-only categories.';
COMMENT ON COLUMN basics_categories.pitfall_en IS 'Contrastive note for Persian speakers, shown as a warning callout.';

-- ── Part 2: grammar categories ──────────────────────────────────────────────

-- ═══ cases ═══
UPDATE basics_categories SET
explanation_en = 'German marks the ROLE a noun plays in the sentence by changing the article in front of it. Four roles, called cases:

Nominativ — who does the action (the subject).
Akkusativ — what the action affects directly (the direct object).
Dativ — who receives something (the indirect object), and after certain prepositions.
Genitiv — who owns something. Mostly written German.

The noun itself usually stays the same; the article does the work. Notice that only masculine changes in the accusative — der becomes den. That single change is the most common case error learners make.',
explanation_fa = 'آلمانی «نقش» یک اسم در جمله را با تغییر حرف تعریفِ جلوی آن نشان می‌دهد. چهار نقش که به آن‌ها «حالت» می‌گویند:

Nominativ — چه کسی کار را انجام می‌دهد (فاعل).
Akkusativ — کار مستقیماً روی چه چیزی اثر می‌گذارد (مفعول مستقیم).
Dativ — چه کسی چیزی را دریافت می‌کند (مفعول غیرمستقیم) و بعد از بعضی حروف اضافه.
Genitiv — مالکیت. بیشتر در نوشتار.

خودِ اسم معمولاً تغییر نمی‌کند؛ کار را حرف تعریف انجام می‌دهد. دقت کن که در Akkusativ فقط مذکر تغییر می‌کند: der به den. همین یک تغییر، رایج‌ترین خطای زبان‌آموزهاست.',
pitfall_en = 'Persian marks the definite direct object with «را»: «مرد را می‌بینم». German has no را at all — it changes the article instead: der Mann → Ich sehe DEN Mann. Same job, different machinery.

And Persian has no grammatical gender, so there is nothing in your first language to attach der/die/das to. Learn every noun together with its article from day one — der Tisch, not Tisch.',
pitfall_fa = 'فارسی مفعول مستقیمِ معرفه را با «را» نشان می‌دهد: «مرد را می‌بینم». آلمانی اصلاً «را» ندارد و به‌جایش حرف تعریف را عوض می‌کند: der Mann ← Ich sehe DEN Mann. همان کار، با ابزار متفاوت.

ضمناً فارسی جنسیت دستوری ندارد، پس در زبان مادری‌ات چیزی نیست که der/die/das را به آن وصل کنی. هر اسم را از همان روز اول همراه حرف تعریفش یاد بگیر — der Tisch، نه فقط Tisch.'
WHERE key = 'cases';

-- ═══ articles ═══
UPDATE basics_categories SET
explanation_en = 'Every German noun carries one of three genders, shown by its article: der (masculine), die (feminine), das (neuter). In the plural all three become die.

The gender is a property of the WORD, not of the thing it describes — das Mädchen (girl) is neuter, der Löffel (spoon) is masculine. There is no reliable way to guess it, so the article has to be memorised with the noun.

A few endings are dependable: words ending in -ung, -heit, -keit, -schaft, -tion are die. Words ending in -chen or -lein are das. Most others you simply learn.

ein/eine is the indefinite article (a/an). It has no plural — for plurals you use no article at all.',
explanation_fa = 'هر اسم آلمانی یکی از سه جنسیت را دارد که با حرف تعریفش مشخص می‌شود: der (مذکر)، die (مؤنث)، das (خنثی). در جمع، هر سه به die تبدیل می‌شوند.

جنسیت ویژگیِ خودِ کلمه است، نه چیزی که توصیف می‌کند — das Mädchen (دختر) خنثی است و der Löffel (قاشق) مذکر. راه مطمئنی برای حدس زدنش نیست، پس باید حرف تعریف را همراه اسم حفظ کنی.

چند پسوند قابل‌اعتمادند: کلمه‌های مختوم به -ung، -heit، -keit، -schaft و -tion مؤنث (die) هستند. مختوم به -chen یا -lein خنثی (das). بقیه را باید یاد بگیری.

ein/eine حرف تعریف نامعین است (یک). جمع ندارد؛ برای جمع اصلاً حرف تعریف نمی‌آید.',
pitfall_en = 'Persian has no grammatical gender and no definite article — «کتاب» is just book, and definiteness comes from context or را. So there is no habit to fall back on here: der/die/das is genuinely new machinery, and guessing from meaning will mislead you.

Practical rule: never write a new word in your notebook alone. Write «die Wohnung», never «Wohnung».',
pitfall_fa = 'فارسی نه جنسیت دستوری دارد و نه حرف تعریف معین — «کتاب» فقط کتاب است و معرفه بودن از بافت جمله یا «را» فهمیده می‌شود. پس عادتی از زبان مادری نداری که به آن تکیه کنی: der/die/das واقعاً ساختار تازه‌ای است و حدس زدن از روی معنی گمراهت می‌کند.

قانون عملی: هیچ‌وقت کلمهٔ جدید را تنها در دفترت ننویس. بنویس «die Wohnung»، نه «Wohnung».'
WHERE key = 'articles';

-- ═══ prepositions ═══
UPDATE basics_categories SET
explanation_en = 'A German preposition does not just add meaning — it also decides which case the noun after it takes. There are three groups, and knowing which group a preposition belongs to is most of the work.

ALWAYS DATIVE: mit, nach, bei, seit, von, zu, aus (plus außer, gegenüber).
ALWAYS ACCUSATIVE: für, um, durch, gegen, ohne, bis.
TWO-WAY: in, an, auf, über, unter, vor, hinter, neben, zwischen. These take dative for a LOCATION (wo? — where something is) and accusative for a DIRECTION (wohin? — where something is going).

The two-way test is simple: is anything moving from one place to another? If yes, accusative. If it is just sitting somewhere, dative.',
explanation_fa = 'حرف اضافه در آلمانی فقط معنی اضافه نمی‌کند؛ تعیین می‌کند اسم بعد از آن در چه حالتی بیاید. سه گروه وجود دارد و دانستن اینکه هر حرف اضافه در کدام گروه است، بیشترِ کار را انجام می‌دهد.

همیشه Dativ: mit، nach، bei، seit، von، zu، aus (و همچنین außer، gegenüber).
همیشه Akkusativ: für، um، durch، gegen، ohne، bis.
دوحالته: in، an، auf، über، unter، vor، hinter، neben، zwischen. این‌ها برای مکان (wo? — کجا بودن) Dativ می‌گیرند و برای جهت (wohin? — به کجا رفتن) Akkusativ.

آزمون ساده برای دوحالته‌ها: آیا چیزی از جایی به جای دیگر حرکت می‌کند؟ اگر بله، Akkusativ. اگر فقط جایی قرار دارد، Dativ.',
pitfall_en = 'In Persian a preposition never changes the word after it — «با ماشین», «در خانه», «به مدرسه» all leave the noun untouched. In German the preposition reaches into the noun phrase and rewrites the article: mit DEM Auto, in DER Stadt.

So do not memorise prepositions as single words. Memorise them as a pair — «mit + Dativ» — the way you would learn a phrasal verb.',
pitfall_fa = 'در فارسی حرف اضافه هرگز کلمهٔ بعدش را تغییر نمی‌دهد — «با ماشین»، «در خانه»، «به مدرسه» همگی اسم را دست‌نخورده می‌گذارند. در آلمانی حرف اضافه وارد عبارت اسمی می‌شود و حرف تعریف را بازنویسی می‌کند: mit DEM Auto، in DER Stadt.

پس حرف‌های اضافه را تک‌کلمه‌ای حفظ نکن. آن‌ها را جفتی یاد بگیر — «mit + Dativ» — همان‌طور که یک فعل مرکب را یاد می‌گیری.'
WHERE key = 'prepositions';

-- ═══ conjunctions ═══
UPDATE basics_categories SET
explanation_en = 'German conjunctions split into two families, and the difference is not meaning — it is WORD ORDER.

COORDINATING (und, aber, oder, denn, sondern): they simply join two main clauses and do not count as a sentence element. The verb stays in second position, exactly as it was.
  Ich bleibe hier, denn ich BIN müde.

SUBORDINATING (weil, dass, wenn, als, ob, obwohl, damit): they open a subordinate clause and push the conjugated verb all the way to the END.
  Ich bleibe hier, weil ich müde BIN.

Same meaning in both examples. Completely different verb position. This is the single most visible marker of whether someone has internalised German sentence structure.',
explanation_fa = 'حروف ربط آلمانی به دو خانواده تقسیم می‌شوند و تفاوتشان در معنی نیست — در «ترتیب کلمات» است.

هم‌پایه‌ساز (und، aber، oder، denn، sondern): فقط دو جملهٔ اصلی را وصل می‌کنند و خودشان جزء جمله شمرده نمی‌شوند. فعل دقیقاً همان‌جا که بود، در جایگاه دوم می‌ماند.
  Ich bleibe hier, denn ich BIN müde.

وابسته‌ساز (weil، dass، wenn، als، ob، obwohl، damit): جملهٔ پیرو باز می‌کنند و فعل صرف‌شده را تا آخر جمله هل می‌دهند.
  Ich bleibe hier, weil ich müde BIN.

معنی هر دو مثال یکی است، اما جای فعل کاملاً فرق دارد. این آشکارترین نشانهٔ آن است که کسی ساختار جملهٔ آلمانی را درونی کرده یا نه.',
pitfall_en = 'Persian word order does not move the verb when you add «چون» or «که» — «می‌مانم چون خسته‌ام» keeps everything in place. German does move it, and the temptation to say «weil ich bin müde» is very strong precisely because it matches Persian.

Train the reflex: the moment you say weil, dass or wenn, the verb is already booked for the end of the clause.',
pitfall_fa = 'ترتیب کلمات فارسی با افزودن «چون» یا «که» جای فعل را عوض نمی‌کند — «می‌مانم چون خسته‌ام» همه‌چیز را سر جایش نگه می‌دارد. آلمانی جای فعل را عوض می‌کند، و وسوسهٔ گفتن «weil ich bin müde» دقیقاً به این دلیل قوی است که با فارسی جور درمی‌آید.

این واکنش را تمرین کن: همین که weil یا dass یا wenn را گفتی، جای فعل از قبل رزرو شده — آخر جمله.'
WHERE key = 'conjunctions';

-- ═══ pronounsAndSein ═══
UPDATE basics_categories SET
explanation_en = 'Pronouns replace a noun, and like nouns they change with the case: ich (subject) → mich (direct object) → mir (receiver).

Two things decide which form you need: the verb, and any preposition in front. Some verbs simply demand the dative — helfen, danken, gefallen, gehören — even though English and Persian treat them as ordinary objects.

sein (to be) is the most irregular and most used verb in the language: ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind. It is worth over-learning, because it also builds the perfect tense of movement verbs later.',
explanation_fa = 'ضمیر جای اسم می‌نشیند و مثل اسم با حالت تغییر می‌کند: ich (فاعل) ← mich (مفعول مستقیم) ← mir (دریافت‌کننده).

دو چیز تعیین می‌کند کدام شکل لازم است: فعل، و حرف اضافه‌ای که جلوی آن است. بعضی فعل‌ها ساده‌تر بگوییم Dativ می‌خواهند — helfen، danken، gefallen، gehören — حتی وقتی در انگلیسی و فارسی مفعول معمولی به‌نظر می‌رسند.

فعل sein (بودن) بی‌قاعده‌ترین و پرکاربردترین فعل زبان است: ich bin، du bist، er/sie/es ist، wir sind، ihr seid، sie/Sie sind. ارزش دارد بیش از حد لازم تمرینش کنی، چون بعداً ماضی نقلی فعل‌های حرکتی هم با آن ساخته می‌شود.',
pitfall_en = 'Persian verbs carry the subject in their ending — «می‌روم» already means I go, so the pronoun is optional. German never drops the pronoun: you must say ich gehe, never just gehe.

Also watch helfen: Persian «کمکش می‌کنم» feels like a direct object, but German requires dative — Ich helfe IHM, not ihn.',
pitfall_fa = 'فعل فارسی فاعل را در شناسه‌اش دارد — «می‌روم» یعنی «من می‌روم»، پس ضمیر اختیاری است. آلمانی هرگز ضمیر را حذف نمی‌کند: باید بگویی ich gehe، نه فقط gehe.

به helfen هم دقت کن: «کمکش می‌کنم» در فارسی حس مفعول مستقیم دارد، اما آلمانی Dativ می‌خواهد — Ich helfe IHM، نه ihn.'
WHERE key = 'pronounsAndSein';

-- ═══ verbConjugation ═══
UPDATE basics_categories SET
explanation_en = 'A German verb changes its ending to match the subject. Take the infinitive, remove -en, and add the ending:

ich -e · du -st · er/sie/es -t · wir -en · ihr -t · sie/Sie -en

lernen → ich lerne, du lernst, er lernt, wir lernen, ihr lernt, sie lernen.

Two adjustments: if the stem ends in -t or -d, insert an e so it stays pronounceable (du arbeitest). And a group of strong verbs changes the stem vowel in du and er/sie/es only — fahren → du fährst, er fährt; sprechen → du sprichst, er spricht. The endings themselves never change.',
explanation_fa = 'فعل آلمانی پسوندش را متناسب با فاعل تغییر می‌دهد. مصدر را بگیر، -en را حذف کن و پسوند را اضافه کن:

ich -e · du -st · er/sie/es -t · wir -en · ihr -t · sie/Sie -en

lernen ← ich lerne، du lernst، er lernt، wir lernen، ihr lernt، sie lernen.

دو نکتهٔ اصلاحی: اگر ریشه به -t یا -d ختم شود، یک e اضافه می‌شود تا تلفظ‌پذیر بماند (du arbeitest). و گروهی از فعل‌های قوی فقط در du و er/sie/es حرف صدادار ریشه را عوض می‌کنند — fahren ← du fährst، er fährt؛ sprechen ← du sprichst، er spricht. خودِ پسوندها هرگز تغییر نمی‌کنند.',
pitfall_en = 'Persian conjugation is very regular and the personal ending is highly predictable. German has the same idea but adds the stem-vowel change in exactly two persons, which feels arbitrary at first.

When you learn a new verb, always test du and er. If the vowel shifts there, mark it — that is the only irregularity you need to remember.',
pitfall_fa = 'صرف فعل در فارسی بسیار باقاعده است و شناسهٔ شخصی کاملاً قابل پیش‌بینی. آلمانی همین ایده را دارد اما دقیقاً در دو شخص، حرف صدادار ریشه را عوض می‌کند که اولش بی‌قاعده به‌نظر می‌رسد.

وقتی فعل تازه‌ای یاد می‌گیری، همیشه du و er را امتحان کن. اگر آنجا حرف صدادار عوض شد، علامت بزن — همان تنها بی‌قاعدگی‌ای است که باید به خاطر بسپاری.'
WHERE key = 'verbConjugation';

-- ═══ modalVerbs ═══
UPDATE basics_categories SET
explanation_en = 'Modal verbs add an attitude to another verb: ability, necessity, permission, wish. There are six: können (can), müssen (must), wollen (want), dürfen (be allowed), sollen (be supposed to), mögen / möchten (like / would like).

Two rules cover almost everything:

1. The modal is conjugated in position two, and the MAIN verb goes to the very end as a bare infinitive.
   Ich muss heute früh aufstehen.
2. In the ich and er/sie/es forms the modal takes NO ending — ich kann, er kann. Not er kannt.

Most modals also change their vowel in the singular: können → ich kann, müssen → ich muss, dürfen → ich darf.',
explanation_fa = 'فعل‌های کمکی به فعل دیگری «نگرش» اضافه می‌کنند: توانایی، ضرورت، اجازه، خواست. شش‌تا هستند: können (توانستن)، müssen (باید)، wollen (خواستن)، dürfen (اجازه داشتن)، sollen (قرار بودن)، mögen / möchten (دوست داشتن / مایل بودن).

دو قاعده تقریباً همه‌چیز را پوشش می‌دهد:

۱. فعل کمکی در جایگاه دوم صرف می‌شود و فعل اصلی به‌شکل مصدرِ ساده به آخر جمله می‌رود.
   Ich muss heute früh aufstehen.
۲. در شکل‌های ich و er/sie/es، فعل کمکی هیچ پسوندی نمی‌گیرد — ich kann، er kann. نه er kannt.

بیشتر فعل‌های کمکی در مفرد حرف صدادارشان را هم عوض می‌کنند: können ← ich kann، müssen ← ich muss، dürfen ← ich darf.',
pitfall_en = 'In Persian the two verbs stay next to each other — «باید زود بیدار شوم» keeps باید and the main verb close together. German separates them across the whole sentence, and everything else piles up in between.

Practise building long middles: Ich muss morgen früh mit dem Bus zur Arbeit FAHREN. Getting comfortable with that gap is what makes you sound German rather than translated.',
pitfall_fa = 'در فارسی دو فعل کنار هم می‌مانند — «باید زود بیدار شوم» فاصلهٔ زیادی بین «باید» و فعل اصلی نمی‌اندازد. آلمانی آن‌ها را در کل جمله از هم جدا می‌کند و بقیهٔ اجزا وسط انباشته می‌شوند.

تمرین کن که وسط جمله را طولانی کنی: Ich muss morgen früh mit dem Bus zur Arbeit FAHREN. راحت شدن با این فاصله همان چیزی است که باعث می‌شود آلمانی‌ات طبیعی به‌نظر برسد، نه ترجمه‌شده.'
WHERE key = 'modalVerbs';

-- ═══ questionWords ═══
UPDATE basics_categories SET
explanation_en = 'German has two question shapes.

W-QUESTIONS start with a question word, and the verb comes immediately after it in position two:
  Wo wohnst du? · Wann kommt der Bus? · Warum lernst du Deutsch?

YES/NO QUESTIONS have no question word at all — you simply move the verb to position one:
  Wohnst du in Berlin? · Kommt der Bus bald?

Note that wer (who) changes with the case, exactly like a pronoun: wer (subject) → wen (direct object) → wem (receiver). And welcher (which) changes like an article: welcher Mann, welche Frau, welches Kind.',
explanation_fa = 'آلمانی دو شکل پرسش دارد.

پرسش‌های W با کلمهٔ پرسشی شروع می‌شوند و فعل بلافاصله بعد از آن، در جایگاه دوم می‌آید:
  Wo wohnst du؟ · Wann kommt der Bus؟ · Warum lernst du Deutsch؟

پرسش‌های بله/خیر اصلاً کلمهٔ پرسشی ندارند — فقط فعل را به جایگاه اول می‌بری:
  Wohnst du in Berlin؟ · Kommt der Bus bald؟

توجه کن که wer (چه کسی) مثل ضمیر با حالت تغییر می‌کند: wer (فاعل) ← wen (مفعول مستقیم) ← wem (دریافت‌کننده). و welcher (کدام) مثل حرف تعریف تغییر می‌کند: welcher Mann، welche Frau، welches Kind.',
pitfall_en = 'Persian forms a yes/no question with intonation alone, or with «آیا» at the front — the word order never changes: «تو در برلین زندگی می‌کنی؟». German has no آیا and does not rely on intonation: the verb physically moves to the front.

If you keep normal word order and just raise your voice, a German listener hears a statement, not a question.',
pitfall_fa = 'فارسی پرسش بله/خیر را فقط با لحن می‌سازد یا با «آیا» در ابتدا — ترتیب کلمات هرگز عوض نمی‌شود: «تو در برلین زندگی می‌کنی؟». آلمانی «آیا» ندارد و به لحن هم تکیه نمی‌کند: فعل واقعاً به اول جمله جابه‌جا می‌شود.

اگر ترتیب عادی را نگه داری و فقط صدایت را بالا ببری، شنوندهٔ آلمانی یک جملهٔ خبری می‌شنود، نه سؤال.'
WHERE key = 'questionWords';

-- ── Part 3: vocabulary categories — one usage line only where non-obvious ───

UPDATE basics_categories SET
explanation_en = 'From 13 upwards, German writes numbers as a single word and says the SMALL digit first: einundzwanzig is literally one-and-twenty. This reversal is why German phone numbers and prices are hard to catch at first — the order you hear is not the order you write.',
explanation_fa = 'از ۱۳ به بالا، آلمانی عدد را یک کلمهٔ سرِهم می‌نویسد و رقم یکان را اول می‌گوید: einundzwanzig یعنی «یک‌وبیست». همین وارونگی باعث می‌شود شمارهٔ تلفن و قیمت در آلمانی اولش سخت شنیده شود — ترتیبی که می‌شنوی با ترتیبی که می‌نویسی یکی نیست.'
WHERE key = 'numbers';

UPDATE basics_categories SET
explanation_en = 'Colours are adjectives. After sein they never change — Das Auto ist rot. Before a noun they take an ending — ein rotes Auto. Learn them first in the simple form after sein.',
explanation_fa = 'رنگ‌ها صفت‌اند. بعد از sein هرگز تغییر نمی‌کنند — Das Auto ist rot. قبل از اسم پسوند می‌گیرند — ein rotes Auto. اول شکل سادهٔ بعد از sein را یاد بگیر.'
WHERE key = 'colors';

UPDATE basics_categories SET
explanation_en = 'All days are masculine (der Montag), and to say ON a day you use am: am Montag. Days are capitalised, like every German noun.',
explanation_fa = 'همهٔ روزهای هفته مذکرند (der Montag) و برای گفتن «در روزِ …» از am استفاده می‌شود: am Montag. روزها مثل هر اسم آلمانی با حرف بزرگ نوشته می‌شوند.'
WHERE key = 'days';

UPDATE basics_categories SET
explanation_en = 'All months are masculine (der Januar), and to say IN a month you use im: im Januar. The same im works for seasons: im Sommer.',
explanation_fa = 'همهٔ ماه‌ها مذکرند (der Januar) و برای گفتن «در ماهِ …» از im استفاده می‌شود: im Januar. همین im برای فصل‌ها هم به‌کار می‌رود: im Sommer.'
WHERE key = 'months';

-- ── Part 4: section-level notes (multi categories) ──────────────────────────

UPDATE basics_sections s SET
explanation_en = 'This is the table to memorise first. Read across: the same noun takes a different article depending on its role. Only the masculine column changes in the accusative.',
explanation_fa = 'این جدولی است که باید اول حفظ کنی. افقی بخوان: یک اسم بسته به نقشش حرف تعریف متفاوتی می‌گیرد. در Akkusativ فقط ستون مذکر تغییر می‌کند.'
FROM basics_categories c
WHERE s.category_id = c.id AND c.key = 'cases' AND s.heading_en ILIKE '%Definite%';

UPDATE basics_sections s SET
explanation_en = 'ein follows the same pattern as der, with one difference: there is no plural. For plural indefinite nouns you use no article at all — Ich sehe Kinder.',
explanation_fa = 'ein همان الگوی der را دنبال می‌کند، با یک تفاوت: جمع ندارد. برای اسم جمعِ نامعین اصلاً حرف تعریف نمی‌آید — Ich sehe Kinder.'
FROM basics_categories c
WHERE s.category_id = c.id AND c.key = 'cases' AND s.heading_en ILIKE '%Indefinite%';

UPDATE basics_sections s SET
explanation_en = 'Pronouns change by case exactly as articles do. mich/dich are direct objects; mir/dir are receivers. Verbs like helfen and danken always take the mir column.',
explanation_fa = 'ضمیرها دقیقاً مثل حروف تعریف با حالت تغییر می‌کنند. mich/dich مفعول مستقیم‌اند؛ mir/dir دریافت‌کننده. فعل‌هایی مثل helfen و danken همیشه ستون mir را می‌گیرند.'
FROM basics_categories c
WHERE s.category_id = c.id AND c.key = 'cases' AND s.heading_en ILIKE '%Pronouns%';

UPDATE basics_sections s SET
explanation_en = 'These replace a person already mentioned. German cannot drop them the way Persian does — the pronoun must be spoken.',
explanation_fa = 'این‌ها جای شخصی می‌نشینند که قبلاً به آن اشاره شده. آلمانی نمی‌تواند مثل فارسی آن‌ها را حذف کند — ضمیر باید گفته شود.'
FROM basics_categories c
WHERE s.category_id = c.id AND c.key = 'pronounsAndSein' AND s.heading_en ILIKE '%Personal Pronouns%';

UPDATE basics_sections s SET
explanation_en = 'Possessives agree with the noun that FOLLOWS them, not with the owner: mein Vater but meine Mutter — both mean my, and the ending comes from Vater/Mutter.',
explanation_fa = 'ضمایر ملکی با اسمی که «بعد» از آن‌ها می‌آید مطابقت می‌کنند، نه با مالک: mein Vater اما meine Mutter — هر دو یعنی «مالِ من» و پسوند از Vater/Mutter می‌آید.'
FROM basics_categories c
WHERE s.category_id = c.id AND c.key = 'pronounsAndSein' AND s.heading_en ILIKE '%Possessive%';

UPDATE basics_sections s SET
explanation_en = 'sein is irregular in every person — there is no pattern to derive it from. Say the whole set out loud until it is automatic.',
explanation_fa = 'فعل sein در همهٔ اشخاص بی‌قاعده است — الگویی برای استنتاجش وجود ندارد. کل مجموعه را بلند تکرار کن تا خودکار شود.'
FROM basics_categories c
WHERE s.category_id = c.id AND c.key = 'pronounsAndSein' AND s.heading_en ILIKE '%Sein%';

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SELECT key, (explanation_fa IS NOT NULL) AS has_rule,
--          (pitfall_fa IS NOT NULL) AS has_pitfall
--   FROM basics_categories ORDER BY sort_order;
