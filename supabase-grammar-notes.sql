-- ============================================================================
--  Grammar Moments — end-of-lesson consolidation notes for all 100 days
-- ============================================================================
--
--  Run this whole file once in the Supabase SQL editor.
--
--  Part 1 adds the `grammar_note` JSONB column to `lessons` (safe to re-run).
--  Part 2 fills one note per day. Each note is shown AFTER the last sentence
--  of the lesson — the learner has just used the pattern, so this consolidates
--  rather than front-loads. Notes are editable afterwards in
--  /admin/lessons/<day>.
--
--  Shape:
--    title, title_fa            short rule name
--    explanation, explanation_fa   one or two lines, plain language
--    examples[]                 { de, en, fa } — drawn from the day's topic
--    basics_key                 deep-links into a Basics category (optional);
--                               valid keys: pronounsAndSein, articles,
--                               conjunctions, numbers, colors, days, months,
--                               prepositions, cases
--
--  Re-running Part 2 overwrites existing notes for those days.
-- ============================================================================

-- ── Part 1: schema ──────────────────────────────────────────────────────────
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS grammar_note jsonb;

COMMENT ON COLUMN lessons.grammar_note IS
  'End-of-lesson grammar moment: {title, title_fa, explanation, explanation_fa, examples[{de,en,fa}], basics_key}';

-- ── Part 2: content ─────────────────────────────────────────────────────────

-- Day 1
UPDATE lessons SET grammar_note = '{
  "title": "Formal address (Siezen/Duzen): du or Sie",
  "title_fa": "خطاب رسمی و خودمانی (Siezen/Duzen): du یا Sie",
  "explanation": "German has an informal you (du) for friends and family, and a formal you (Sie) for strangers, officials and older people. Sie is always capitalised.",
  "explanation_fa": "آلمانی دو شکل «تو» دارد: du برای دوستان و خانواده، و Sie برای غریبه‌ها و موقعیت‌های رسمی. Sie همیشه با حرف بزرگ نوشته می‌شود.",
  "examples": [
    {
      "de": "Wie heißt du?",
      "en": "What is your name? (informal)",
      "fa": "اسمت چیه؟ (خودمانی)"
    },
    {
      "de": "Wie heißen Sie?",
      "en": "What is your name? (formal)",
      "fa": "اسم شما چیست؟ (رسمی)"
    }
  ],
  "basics_key": "pronounsAndSein"
}'::jsonb WHERE day = 1;

-- Day 2
UPDATE lessons SET grammar_note = '{
  "title": "Verb conjugation: heißen and sein",
  "title_fa": "صرف فعل: heißen و sein",
  "explanation": "To introduce yourself you need two verbs: ich heiße (my name is) and ich bin (I am). Both are irregular, so learn the I-form by heart.",
  "explanation_fa": "برای معرفی خودت دو فعل لازم داری: ich heiße (اسم من … است) و ich bin (من … هستم). هر دو بی‌قاعده‌اند؛ شکل «من» را حفظ کن.",
  "examples": [
    {
      "de": "Ich heiße Sara.",
      "en": "My name is Sara.",
      "fa": "اسم من سارا است."
    },
    {
      "de": "Ich bin Studentin.",
      "en": "I am a student.",
      "fa": "من دانشجو هستم."
    }
  ],
  "basics_key": "pronounsAndSein"
}'::jsonb WHERE day = 2;

-- Day 3
UPDATE lessons SET grammar_note = '{
  "title": "Numbers (Zahlen): how compounds are built",
  "title_fa": "اعداد (Zahlen): ساخت اعداد مرکب",
  "explanation": "From 13 up, German builds numbers as a single word and says the small digit first: einundzwanzig is literally one-and-twenty.",
  "explanation_fa": "از ۱۳ به بالا، عدد یک کلمهٔ سرِهم است و رقم یکان اول گفته می‌شود: einundzwanzig یعنی «یک‌وبیست» (۲۱).",
  "examples": [
    {
      "de": "siebzehn",
      "en": "seventeen",
      "fa": "هفده"
    },
    {
      "de": "einundzwanzig",
      "en": "twenty-one (one-and-twenty)",
      "fa": "بیست‌ویک"
    }
  ],
  "basics_key": "numbers"
}'::jsonb WHERE day = 3;

-- Day 4
UPDATE lessons SET grammar_note = '{
  "title": "Spelling (Buchstabieren): umlauts and ß",
  "title_fa": "هجی‌کردن (Buchstabieren): اوملاوت و ß",
  "explanation": "German adds ä, ö, ü and ß. When spelling aloud you say A-Umlaut for ä and Eszett for ß. Umlauts change meaning, so they are not decoration.",
  "explanation_fa": "آلمانی چهار حرف ویژه دارد: ä, ö, ü و ß. هنگام هجی‌کردن، ä را A-Umlaut و ß را Eszett می‌گویند. این نشانه‌ها معنی کلمه را عوض می‌کنند.",
  "examples": [
    {
      "de": "Müller: M-U-Umlaut-L-L-E-R",
      "en": "spelling a name with ü",
      "fa": "هجی‌کردن نامی با ü"
    },
    {
      "de": "Straße: S-T-R-A-Eszett-E",
      "en": "spelling a word with ß",
      "fa": "هجی‌کردن کلمه‌ای با ß"
    }
  ]
}'::jsonb WHERE day = 4;

-- Day 5
UPDATE lessons SET grammar_note = '{
  "title": "Modal verbs (Modalverben): möchten",
  "title_fa": "افعال کمکی (Modalverben): möchten",
  "explanation": "Use ich möchte to order politely. The thing you want comes after it, and a second verb (if any) goes to the very end.",
  "explanation_fa": "برای سفارش مؤدبانه از ich möchte استفاده کن. چیزی که می‌خواهی بعد از آن می‌آید و اگر فعل دومی باشد، به آخر جمله می‌رود.",
  "examples": [
    {
      "de": "Ich möchte einen Kaffee.",
      "en": "I would like a coffee.",
      "fa": "یک قهوه می‌خواهم."
    },
    {
      "de": "Ich möchte bitte bezahlen.",
      "en": "I would like to pay, please.",
      "fa": "لطفاً می‌خواهم حساب کنم."
    }
  ],
  "basics_key": "modalVerbs"
}'::jsonb WHERE day = 5;

-- Day 6
UPDATE lessons SET grammar_note = '{
  "title": "Possessive articles (Possessivartikel): mein and meine",
  "title_fa": "ضمایر ملکی (Possessivartikel): mein و meine",
  "explanation": "Possessives copy the gender of the noun: mein Vater (masculine), meine Mutter (feminine), mein Kind (neuter), meine Eltern (plural).",
  "explanation_fa": "ضمیر ملکی از جنسیت اسم پیروی می‌کند: mein Vater (مذکر)، meine Mutter (مؤنث)، mein Kind (خنثی)، meine Eltern (جمع).",
  "examples": [
    {
      "de": "Das ist mein Bruder.",
      "en": "This is my brother.",
      "fa": "این برادر من است."
    },
    {
      "de": "Das ist meine Schwester.",
      "en": "This is my sister.",
      "fa": "این خواهر من است."
    }
  ],
  "basics_key": "pronounsAndSein"
}'::jsonb WHERE day = 6;

-- Day 7
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions of time (Temporalpräpositionen): am and im",
  "title_fa": "حروف اضافهٔ زمان (Temporalpräpositionen): am و im",
  "explanation": "Days take am (am Montag), months and seasons take im (im Mai, im Sommer). Both are short forms of an dem and in dem.",
  "explanation_fa": "برای روزها am می‌آید (am Montag) و برای ماه‌ها و فصل‌ها im (im Mai, im Sommer). این‌ها شکل کوتاه an dem و in dem هستند.",
  "examples": [
    {
      "de": "Am Montag arbeite ich.",
      "en": "On Monday I work.",
      "fa": "دوشنبه کار می‌کنم."
    },
    {
      "de": "Im Juli fahre ich nach Berlin.",
      "en": "In July I travel to Berlin.",
      "fa": "در ژوئیه به برلین می‌روم."
    }
  ],
  "basics_key": "days"
}'::jsonb WHERE day = 7;

-- Day 8
UPDATE lessons SET grammar_note = '{
  "title": "Adjectives (Adjektive): no ending after sein",
  "title_fa": "صفت‌ها (Adjektive): بدون پسوند بعد از sein",
  "explanation": "When the adjective comes after sein, it takes no ending at all: Das Auto ist rot. Endings only appear when the adjective sits before the noun.",
  "explanation_fa": "وقتی صفت بعد از فعل sein بیاید، هیچ پسوندی نمی‌گیرد: Das Auto ist rot. پسوند فقط وقتی لازم است که صفت قبل از اسم بیاید.",
  "examples": [
    {
      "de": "Der Himmel ist blau.",
      "en": "The sky is blue.",
      "fa": "آسمان آبی است."
    },
    {
      "de": "Das ist ein blaues Auto.",
      "en": "That is a blue car. (ending appears)",
      "fa": "آن یک ماشین آبی است. (اینجا پسوند می‌گیرد)"
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 8;

-- Day 9
UPDATE lessons SET grammar_note = '{
  "title": "Present tense (Präsens): regular endings",
  "title_fa": "زمان حال (Präsens): پسوندهای باقاعده",
  "explanation": "Regular verbs drop -en and add: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en. Learn this pattern once and hundreds of verbs follow it.",
  "explanation_fa": "فعل‌های باقاعده -en را حذف می‌کنند و می‌گیرند: ich -e، du -st، er/sie/es -t، wir -en، ihr -t، sie/Sie -en. این الگو برای صدها فعل کار می‌کند.",
  "examples": [
    {
      "de": "Ich lerne Deutsch.",
      "en": "I learn German.",
      "fa": "من آلمانی یاد می‌گیرم."
    },
    {
      "de": "Er wohnt in Berlin.",
      "en": "He lives in Berlin.",
      "fa": "او در برلین زندگی می‌کند."
    }
  ],
  "basics_key": "verbConjugation"
}'::jsonb WHERE day = 9;

-- Day 10
UPDATE lessons SET grammar_note = '{
  "title": "Articles and gender (Artikel): der, die, das",
  "title_fa": "حروف تعریف و جنسیت (Artikel): der، die، das",
  "explanation": "Every German noun is masculine (der), feminine (die) or neuter (das), and the gender is rarely logical. Always learn the article together with the noun.",
  "explanation_fa": "هر اسم آلمانی مذکر (der)، مؤنث (die) یا خنثی (das) است و معمولاً منطق مشخصی ندارد. همیشه حرف تعریف را همراه خود اسم حفظ کن.",
  "examples": [
    {
      "de": "der Tisch, die Lampe, das Fenster",
      "en": "the table, the lamp, the window",
      "fa": "میز، لامپ، پنجره"
    },
    {
      "de": "Plural is always die: die Tische",
      "en": "plural always takes die",
      "fa": "جمع همیشه die می‌گیرد"
    }
  ],
  "basics_key": "articles"
}'::jsonb WHERE day = 10;

-- Day 11
UPDATE lessons SET grammar_note = '{
  "title": "Accusative case (Akkusativ): der becomes den",
  "title_fa": "حالت مفعولی (Akkusativ): der به den",
  "explanation": "The object of a verb goes into the accusative. Only masculine changes visibly: der becomes den, ein becomes einen. Feminine and neuter look the same.",
  "explanation_fa": "مفعول مستقیم در حالت Akkusativ می‌آید. فقط مذکر تغییر دیده می‌شود: der به den و ein به einen. مؤنث و خنثی تغییری نمی‌کنند.",
  "examples": [
    {
      "de": "Ich kaufe einen Apfel.",
      "en": "I buy an apple. (masculine)",
      "fa": "یک سیب می‌خرم. (مذکر)"
    },
    {
      "de": "Ich kaufe eine Banane.",
      "en": "I buy a banana. (feminine, unchanged)",
      "fa": "یک موز می‌خرم. (مؤنث، بدون تغییر)"
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 11;

-- Day 12
UPDATE lessons SET grammar_note = '{
  "title": "Telling the time (Uhrzeit): um and halb",
  "title_fa": "بیان ساعت (Uhrzeit): um و halb",
  "explanation": "Use um for a point in time: um acht Uhr. Careful with halb — halb acht means seven thirty, because it counts toward eight.",
  "explanation_fa": "برای بیان ساعت از um استفاده کن: um acht Uhr. مراقب halb باش: halb acht یعنی ۷:۳۰، چون به سمت هشت می‌شمارد.",
  "examples": [
    {
      "de": "Der Kurs beginnt um neun Uhr.",
      "en": "The course starts at nine.",
      "fa": "کلاس ساعت نُه شروع می‌شود."
    },
    {
      "de": "Es ist halb acht.",
      "en": "It is half past seven.",
      "fa": "ساعت هفت‌ونیم است."
    }
  ],
  "basics_key": "numbers"
}'::jsonb WHERE day = 12;

-- Day 13
UPDATE lessons SET grammar_note = '{
  "title": "Impersonal es: talking about the weather",
  "title_fa": "esِ غیرشخصی: صحبت دربارهٔ هوا",
  "explanation": "Weather sentences need a subject, so German inserts es even though it refers to nothing: es regnet, es ist kalt.",
  "explanation_fa": "جمله‌های آلمانی به فاعل نیاز دارند، پس برای هوا es می‌آید حتی وقتی به چیزی اشاره نمی‌کند: es regnet، es ist kalt.",
  "examples": [
    {
      "de": "Es regnet heute.",
      "en": "It is raining today.",
      "fa": "امروز باران می‌بارد."
    },
    {
      "de": "Es ist sehr kalt.",
      "en": "It is very cold.",
      "fa": "خیلی سرد است."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 13;

-- Day 14
UPDATE lessons SET grammar_note = '{
  "title": "Expressing preference: gern",
  "title_fa": "بیان علاقه: gern",
  "explanation": "German has no verb for to like doing. Add gern after the verb instead: Ich spiele gern Fußball means I like playing football.",
  "explanation_fa": "آلمانی فعلی برای «دوست داشتنِ انجام کاری» ندارد. به‌جایش gern را بعد از فعل می‌آورد: Ich spiele gern Fußball یعنی «فوتبال بازی کردن را دوست دارم».",
  "examples": [
    {
      "de": "Ich lese gern.",
      "en": "I like reading.",
      "fa": "خواندن را دوست دارم."
    },
    {
      "de": "Ich trinke nicht gern Kaffee.",
      "en": "I do not like drinking coffee.",
      "fa": "قهوه خوردن را دوست ندارم."
    }
  ]
}'::jsonb WHERE day = 14;

-- Day 15
UPDATE lessons SET grammar_note = '{
  "title": "Polite requests: Ich nehme and Ich hätte gern",
  "title_fa": "درخواست مؤدبانه: Ich nehme و Ich hätte gern",
  "explanation": "Ich nehme is the everyday way to order. Ich hätte gern is softer and more polite — useful with waiters and shop staff.",
  "explanation_fa": "Ich nehme روش معمول سفارش دادن است. Ich hätte gern مؤدبانه‌تر است و در رستوران و مغازه بهتر جواب می‌دهد.",
  "examples": [
    {
      "de": "Ich nehme die Suppe.",
      "en": "I will take the soup.",
      "fa": "سوپ می‌گیرم."
    },
    {
      "de": "Ich hätte gern die Rechnung.",
      "en": "I would like the bill.",
      "fa": "لطفاً صورتحساب."
    }
  ]
}'::jsonb WHERE day = 15;

-- Day 16
UPDATE lessons SET grammar_note = '{
  "title": "Imperative (Imperativ): giving directions",
  "title_fa": "وجه امری (Imperativ): مسیر دادن",
  "explanation": "For instructions the verb moves to position one. Formal keeps Sie: Gehen Sie geradeaus. Informal drops the pronoun: Geh geradeaus.",
  "explanation_fa": "در جملهٔ امری فعل به جایگاه اول می‌رود. شکل رسمی Sie را نگه می‌دارد: Gehen Sie geradeaus. شکل خودمانی ضمیر را حذف می‌کند: Geh geradeaus.",
  "examples": [
    {
      "de": "Gehen Sie hier links.",
      "en": "Turn left here. (formal)",
      "fa": "اینجا به چپ بروید. (رسمی)"
    },
    {
      "de": "Nimm die erste Straße rechts.",
      "en": "Take the first street on the right.",
      "fa": "اولین خیابان سمت راست را بگیر."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 16;

-- Day 17
UPDATE lessons SET grammar_note = '{
  "title": "Dative case (Dativ): Mir tut ... weh",
  "title_fa": "حالت به‌ای (Dativ): Mir tut … weh",
  "explanation": "To say something hurts, the person goes into the dative: Mir tut der Kopf weh. Literally: to me the head hurts.",
  "explanation_fa": "برای گفتن اینکه جایی درد می‌کند، شخص در حالت Dativ می‌آید: Mir tut der Kopf weh — یعنی «سرم درد می‌کند».",
  "examples": [
    {
      "de": "Mir tut der Hals weh.",
      "en": "My throat hurts.",
      "fa": "گلویم درد می‌کند."
    },
    {
      "de": "Ich habe Kopfschmerzen.",
      "en": "I have a headache.",
      "fa": "سردرد دارم."
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 17;

-- Day 18
UPDATE lessons SET grammar_note = '{
  "title": "Demonstratives (Demonstrativartikel): dieser, diese, dieses",
  "title_fa": "صفات اشاره (Demonstrativartikel): dieser، diese، dieses",
  "explanation": "To point at a specific item, use dieser with the same endings as der/die/das: dieser Pullover, diese Jacke, dieses Hemd.",
  "explanation_fa": "برای اشاره به یک چیز مشخص از dieser استفاده کن که پسوندهایش مثل der/die/das است: dieser Pullover، diese Jacke، dieses Hemd.",
  "examples": [
    {
      "de": "Ich nehme diesen Pullover.",
      "en": "I will take this sweater.",
      "fa": "این پلیور را می‌گیرم."
    },
    {
      "de": "Diese Hose ist zu teuer.",
      "en": "These trousers are too expensive.",
      "fa": "این شلوار خیلی گران است."
    }
  ],
  "basics_key": "articles"
}'::jsonb WHERE day = 18;

-- Day 19
UPDATE lessons SET grammar_note = '{
  "title": "Impersonal es gibt: saying what exists",
  "title_fa": "ساختار es gibt: بیان وجود",
  "explanation": "es gibt never changes, and what follows it is always accusative: Es gibt einen Balkon. Use it for both singular and plural.",
  "explanation_fa": "عبارت es gibt هرگز تغییر نمی‌کند و آنچه بعدش می‌آید همیشه Akkusativ است: Es gibt einen Balkon. برای مفرد و جمع یکسان است.",
  "examples": [
    {
      "de": "Es gibt einen Garten.",
      "en": "There is a garden.",
      "fa": "یک باغ وجود دارد."
    },
    {
      "de": "Es gibt drei Zimmer.",
      "en": "There are three rooms.",
      "fa": "سه اتاق وجود دارد."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 19;

-- Day 20
UPDATE lessons SET grammar_note = '{
  "title": "Word order (Satzbau): verb in position 2",
  "title_fa": "ترتیب کلمات (Satzbau): فعل در جایگاه دوم",
  "explanation": "You may start a sentence with a time expression, but the conjugated verb must remain the second element, so the subject moves behind it.",
  "explanation_fa": "می‌توانی جمله را با عبارت زمان شروع کنی، اما فعل صرف‌شده باید عنصر دوم بماند؛ پس فاعل بعد از فعل می‌آید.",
  "examples": [
    {
      "de": "Ich stehe um sieben Uhr auf.",
      "en": "I get up at seven.",
      "fa": "ساعت هفت بیدار می‌شوم."
    },
    {
      "de": "Um sieben Uhr stehe ich auf.",
      "en": "At seven I get up. (verb still second)",
      "fa": "ساعت هفت بیدار می‌شوم. (فعل باز هم دوم)"
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 20;

-- Day 21
UPDATE lessons SET grammar_note = '{
  "title": "Irregular verbs (unregelmäßige Verben): sein and haben",
  "title_fa": "فعل‌های بی‌قاعده (unregelmäßige Verben): sein و haben",
  "explanation": "These two are the most common verbs in German and are fully irregular: ich bin, du bist, er ist — ich habe, du hast, er hat. They also build the perfect tense later.",
  "explanation_fa": "این دو پرکاربردترین فعل‌های آلمانی و کاملاً بی‌قاعده‌اند: ich bin, du bist, er ist — ich habe, du hast, er hat. بعداً زمان ماضی هم با همین‌ها ساخته می‌شود.",
  "examples": [
    {
      "de": "Ich bin müde.",
      "en": "I am tired.",
      "fa": "خسته‌ام."
    },
    {
      "de": "Wir haben Zeit.",
      "en": "We have time.",
      "fa": "وقت داریم."
    }
  ],
  "basics_key": "pronounsAndSein"
}'::jsonb WHERE day = 21;

-- Day 22
UPDATE lessons SET grammar_note = '{
  "title": "Negation (Negation): nicht or kein",
  "title_fa": "نفی (Negation): nicht یا kein",
  "explanation": "Use kein to negate a noun with ein or no article: Ich habe kein Auto. Use nicht for everything else — verbs, adjectives, and nouns with der/die/das.",
  "explanation_fa": "برای نفی اسمی که ein دارد یا بدون حرف تعریف است از kein استفاده کن: Ich habe kein Auto. برای بقیه موارد — فعل، صفت و اسم‌های با der/die/das — از nicht.",
  "examples": [
    {
      "de": "Ich habe keine Zeit.",
      "en": "I have no time.",
      "fa": "وقت ندارم."
    },
    {
      "de": "Ich komme heute nicht.",
      "en": "I am not coming today.",
      "fa": "امروز نمی‌آیم."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 22;

-- Day 23
UPDATE lessons SET grammar_note = '{
  "title": "Questions (Fragesätze): yes/no questions",
  "title_fa": "جمله‌های پرسشی (Fragesätze): پرسش بله یا خیر",
  "explanation": "Move the conjugated verb to position one and you have a question. No extra word is needed — German has nothing like do you.",
  "explanation_fa": "کافی است فعل صرف‌شده را به اول جمله ببری تا سؤال بسازی. آلمانی معادلی برای «آیا/do» لازم ندارد.",
  "examples": [
    {
      "de": "Du sprichst Deutsch. → Sprichst du Deutsch?",
      "en": "You speak German. → Do you speak German?",
      "fa": "تو آلمانی صحبت می‌کنی. ← آلمانی صحبت می‌کنی؟"
    },
    {
      "de": "Haben Sie Zeit?",
      "en": "Do you have time?",
      "fa": "وقت دارید؟"
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 23;

-- Day 24
UPDATE lessons SET grammar_note = '{
  "title": "Questions (Fragesätze): W-questions",
  "title_fa": "جمله‌های پرسشی (Fragesätze): پرسش با کلمهٔ W",
  "explanation": "wer, was, wo, wann, wie, warum all take position one, and the verb follows immediately in position two.",
  "explanation_fa": "کلمه‌های پرسشی wer, was, wo, wann, wie, warum در جایگاه اول می‌آیند و بلافاصله فعل در جایگاه دوم قرار می‌گیرد.",
  "examples": [
    {
      "de": "Wo wohnst du?",
      "en": "Where do you live?",
      "fa": "کجا زندگی می‌کنی؟"
    },
    {
      "de": "Warum lernst du Deutsch?",
      "en": "Why are you learning German?",
      "fa": "چرا آلمانی یاد می‌گیری؟"
    }
  ],
  "basics_key": "questionWords"
}'::jsonb WHERE day = 24;

-- Day 25
UPDATE lessons SET grammar_note = '{
  "title": "Personal pronouns (Personalpronomen): by case",
  "title_fa": "ضمایر شخصی (Personalpronomen): بر اساس حالت",
  "explanation": "ich becomes mich in the accusative and mir in the dative; du becomes dich and dir. The case is decided by the verb or the preposition.",
  "explanation_fa": "ich در Akkusativ به mich و در Dativ به mir تبدیل می‌شود؛ du به dich و dir. اینکه کدام حالت لازم است را فعل یا حرف اضافه تعیین می‌کند.",
  "examples": [
    {
      "de": "Kannst du mich hören?",
      "en": "Can you hear me? (accusative)",
      "fa": "صدایم را می‌شنوی؟ (مفعولی)"
    },
    {
      "de": "Kannst du mir helfen?",
      "en": "Can you help me? (dative)",
      "fa": "می‌توانی کمکم کنی؟ (به‌ای)"
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 25;

-- Day 26
UPDATE lessons SET grammar_note = '{
  "title": "Perfect tense (Perfekt): with haben",
  "title_fa": "ماضی نقلی (Perfekt): با haben",
  "explanation": "Most verbs build the past with haben plus the participle, and the participle jumps to the end: Ich habe Deutsch gelernt.",
  "explanation_fa": "بیشتر فعل‌ها گذشته را با haben و اسم مفعول می‌سازند و اسم مفعول به آخر جمله می‌رود: Ich habe Deutsch gelernt.",
  "examples": [
    {
      "de": "Ich habe Pizza gegessen.",
      "en": "I ate pizza.",
      "fa": "پیتزا خوردم."
    },
    {
      "de": "Wir haben viel gearbeitet.",
      "en": "We worked a lot.",
      "fa": "خیلی کار کردیم."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 26;

-- Day 27
UPDATE lessons SET grammar_note = '{
  "title": "Perfect tense (Perfekt): with sein",
  "title_fa": "ماضی نقلی (Perfekt): با sein",
  "explanation": "Verbs of movement or change of state use sein instead of haben: gehen, fahren, kommen, bleiben, werden.",
  "explanation_fa": "فعل‌های حرکت یا تغییر حالت به‌جای haben از sein استفاده می‌کنند: gehen، fahren، kommen، bleiben، werden.",
  "examples": [
    {
      "de": "Ich bin nach Berlin gefahren.",
      "en": "I travelled to Berlin.",
      "fa": "به برلین رفتم."
    },
    {
      "de": "Sie ist zu Hause geblieben.",
      "en": "She stayed at home.",
      "fa": "او خانه ماند."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 27;

-- Day 28
UPDATE lessons SET grammar_note = '{
  "title": "Separable verbs (trennbare Verben)",
  "title_fa": "فعل‌های جداشدنی (trennbare Verben)",
  "explanation": "Verbs like aufstehen and einkaufen send their prefix to the end of the sentence: Ich stehe um sieben auf.",
  "explanation_fa": "فعل‌هایی مثل aufstehen و einkaufen پیشوندشان به آخر جمله می‌رود: Ich stehe um sieben auf.",
  "examples": [
    {
      "de": "Ich kaufe im Supermarkt ein.",
      "en": "I shop at the supermarket.",
      "fa": "در سوپرمارکت خرید می‌کنم."
    },
    {
      "de": "Der Zug kommt um acht an.",
      "en": "The train arrives at eight.",
      "fa": "قطار ساعت هشت می‌رسد."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 28;

-- Day 29
UPDATE lessons SET grammar_note = '{
  "title": "Modal verbs (Modalverben): können, müssen, wollen",
  "title_fa": "افعال کمکی (Modalverben): können، müssen، wollen",
  "explanation": "können, müssen and wollen are conjugated in position two, and the main verb stays in the infinitive at the very end.",
  "explanation_fa": "können، müssen و wollen در جایگاه دوم صرف می‌شوند و فعل اصلی به شکل مصدر در آخر جمله می‌ماند.",
  "examples": [
    {
      "de": "Ich kann gut schwimmen.",
      "en": "I can swim well.",
      "fa": "خوب شنا می‌کنم."
    },
    {
      "de": "Wir müssen jetzt gehen.",
      "en": "We must go now.",
      "fa": "الان باید برویم."
    }
  ],
  "basics_key": "modalVerbs"
}'::jsonb WHERE day = 29;

-- Day 30
UPDATE lessons SET grammar_note = '{
  "title": "Modal verbs (Modalverben): dürfen, sollen, mögen",
  "title_fa": "افعال کمکی (Modalverben): dürfen، sollen، mögen",
  "explanation": "dürfen is permission, sollen is an obligation someone else set, and mögen is liking. They follow the same end-position rule as other modals.",
  "explanation_fa": "dürfen یعنی اجازه، sollen یعنی وظیفه‌ای که دیگری تعیین کرده، و mögen یعنی دوست داشتن. همان قاعدهٔ «فعل اصلی در آخر» را دارند.",
  "examples": [
    {
      "de": "Darf ich hier parken?",
      "en": "May I park here?",
      "fa": "می‌توانم اینجا پارک کنم؟"
    },
    {
      "de": "Du sollst mehr schlafen.",
      "en": "You should sleep more.",
      "fa": "باید بیشتر بخوابی."
    }
  ],
  "basics_key": "modalVerbs"
}'::jsonb WHERE day = 30;

-- Day 31
UPDATE lessons SET grammar_note = '{
  "title": "Dative case (Dativ): the indirect object",
  "title_fa": "حالت به‌ای (Dativ): مفعول غیرمستقیم",
  "explanation": "The person who receives something goes into the dative: der becomes dem, die becomes der, das becomes dem, plural becomes den plus -n.",
  "explanation_fa": "کسی که چیزی را دریافت می‌کند در Dativ می‌آید: der به dem، die به der، das به dem و جمع به den با -n اضافه.",
  "examples": [
    {
      "de": "Ich gebe dem Kind ein Buch.",
      "en": "I give the child a book.",
      "fa": "به بچه یک کتاب می‌دهم."
    },
    {
      "de": "Er hilft der Frau.",
      "en": "He helps the woman.",
      "fa": "او به آن خانم کمک می‌کند."
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 31;

-- Day 32
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): always with dative",
  "title_fa": "حروف اضافه (Präpositionen): همیشه با Dativ",
  "explanation": "mit, nach, bei, seit, von, zu, aus are always followed by the dative. Memorise them as one block — they never change case.",
  "explanation_fa": "بعد از mit، nach، bei، seit، von، zu و aus همیشه Dativ می‌آید. این‌ها را یکجا حفظ کن؛ هرگز حالتشان عوض نمی‌شود.",
  "examples": [
    {
      "de": "Ich fahre mit dem Bus.",
      "en": "I go by bus.",
      "fa": "با اتوبوس می‌روم."
    },
    {
      "de": "Sie kommt aus der Türkei.",
      "en": "She comes from Turkey.",
      "fa": "او اهل ترکیه است."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 32;

-- Day 33
UPDATE lessons SET grammar_note = '{
  "title": "Two-way prepositions (Wechselpräpositionen): wo or wohin",
  "title_fa": "حروف اضافهٔ دوحالته (Wechselpräpositionen): wo یا wohin",
  "explanation": "in, auf, an and others take dative for a location (wo) and accusative for a direction (wohin). Ask yourself: staying or moving?",
  "explanation_fa": "in، auf، an و چند حرف دیگر برای مکان (wo) حالت Dativ و برای جهت (wohin) حالت Akkusativ می‌گیرند. از خودت بپرس: ثابت است یا در حرکت؟",
  "examples": [
    {
      "de": "Ich bin in der Stadt.",
      "en": "I am in the city. (location, dative)",
      "fa": "در شهر هستم. (مکان)"
    },
    {
      "de": "Ich gehe in die Stadt.",
      "en": "I go into the city. (direction, accusative)",
      "fa": "به شهر می‌روم. (جهت)"
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 33;

-- Day 34
UPDATE lessons SET grammar_note = '{
  "title": "Comparative (Komparativ): -er ... als",
  "title_fa": "صفت تفضیلی (Komparativ): ‏-er … als",
  "explanation": "Add -er to the adjective and use als for than: schneller als. A few short adjectives also add an umlaut: alt becomes älter.",
  "explanation_fa": "به صفت -er اضافه کن و برای «از» از als استفاده کن: schneller als. چند صفت کوتاه اوملاوت هم می‌گیرند: alt به älter.",
  "examples": [
    {
      "de": "Der Zug ist schneller als das Auto.",
      "en": "The train is faster than the car.",
      "fa": "قطار از ماشین سریع‌تر است."
    },
    {
      "de": "Mein Bruder ist älter als ich.",
      "en": "My brother is older than me.",
      "fa": "برادرم از من بزرگ‌تر است."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 34;

-- Day 35
UPDATE lessons SET grammar_note = '{
  "title": "Superlative (Superlativ): am ...-sten",
  "title_fa": "صفت عالی (Superlativ): am …-sten",
  "explanation": "After a verb the superlative is am schnellsten. Before a noun it becomes der/die/das schnellste.",
  "explanation_fa": "بعد از فعل، صفت عالی به شکل am schnellsten می‌آید. قبل از اسم به شکل der/die/das schnellste.",
  "examples": [
    {
      "de": "Dieser Weg ist am kürzesten.",
      "en": "This way is the shortest.",
      "fa": "این راه کوتاه‌ترین است."
    },
    {
      "de": "Das ist die beste Lösung.",
      "en": "That is the best solution.",
      "fa": "این بهترین راه‌حل است."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 35;

-- Day 36
UPDATE lessons SET grammar_note = '{
  "title": "Dative case (Dativ): Mir geht es ...",
  "title_fa": "حالت به‌ای (Dativ): Mir geht es …",
  "explanation": "German expresses wellbeing with a dative person: Mir geht es gut. The same pattern works for others: Wie geht es Ihnen?",
  "explanation_fa": "آلمانی حال‌واحوال را با شخص در Dativ بیان می‌کند: Mir geht es gut. همین الگو برای دیگران هم هست: Wie geht es Ihnen؟",
  "examples": [
    {
      "de": "Mir geht es nicht gut.",
      "en": "I am not feeling well.",
      "fa": "حالم خوب نیست."
    },
    {
      "de": "Wie geht es Ihnen?",
      "en": "How are you? (formal)",
      "fa": "حال شما چطور است؟"
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 36;

-- Day 37
UPDATE lessons SET grammar_note = '{
  "title": "Modal verbs (Modalverben): möchte + infinitive",
  "title_fa": "افعال کمکی (Modalverben): möchte به‌همراه مصدر",
  "explanation": "At counters, state your business with möchte and put the action verb at the end: Ich möchte ein Konto eröffnen.",
  "explanation_fa": "پشت باجه، خواسته‌ات را با möchte بگو و فعل اصلی را به آخر ببر: Ich möchte ein Konto eröffnen.",
  "examples": [
    {
      "de": "Ich möchte Geld abheben.",
      "en": "I would like to withdraw money.",
      "fa": "می‌خواهم پول برداشت کنم."
    },
    {
      "de": "Ich möchte ein Paket schicken.",
      "en": "I would like to send a parcel.",
      "fa": "می‌خواهم یک بسته بفرستم."
    }
  ],
  "basics_key": "modalVerbs"
}'::jsonb WHERE day = 37;

-- Day 38
UPDATE lessons SET grammar_note = '{
  "title": "Konjunktiv II: making requests softer",
  "title_fa": "وجه شرطی (Konjunktiv II): نرم‌کردن درخواست",
  "explanation": "For appointments, könnte and würde sound noticeably more polite than kann and will: Könnte ich einen Termin haben?",
  "explanation_fa": "برای گرفتن وقت، könnte و würde خیلی مؤدبانه‌تر از kann و will به‌نظر می‌رسند: Könnte ich einen Termin haben؟",
  "examples": [
    {
      "de": "Könnte ich einen Termin bekommen?",
      "en": "Could I get an appointment?",
      "fa": "می‌توانم یک وقت بگیرم؟"
    },
    {
      "de": "Würde Montag passen?",
      "en": "Would Monday work?",
      "fa": "دوشنبه مناسب است؟"
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 38;

-- Day 39
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): mit + dative for transport",
  "title_fa": "حروف اضافه (Präpositionen): mit با Dativ برای وسیلهٔ نقلیه",
  "explanation": "Say how you travel with mit plus dative: mit dem Zug, mit der Bahn, mit dem Auto. On foot is the exception: zu Fuß.",
  "explanation_fa": "برای گفتن وسیلهٔ سفر از mit با Dativ استفاده کن: mit dem Zug، mit der Bahn، mit dem Auto. استثنا: پیاده یعنی zu Fuß.",
  "examples": [
    {
      "de": "Ich fahre mit dem Zug nach Hamburg.",
      "en": "I travel to Hamburg by train.",
      "fa": "با قطار به هامبورگ می‌روم."
    },
    {
      "de": "Wir gehen zu Fuß.",
      "en": "We go on foot.",
      "fa": "پیاده می‌رویم."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 39;

-- Day 40
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): für + accusative for duration",
  "title_fa": "حروف اضافه (Präpositionen): für با Akkusativ برای مدت",
  "explanation": "Booking a stay uses für with the accusative: für zwei Nächte, für eine Woche.",
  "explanation_fa": "برای رزرو مدت اقامت از für با Akkusativ استفاده کن: für zwei Nächte، für eine Woche.",
  "examples": [
    {
      "de": "Ich brauche ein Zimmer für zwei Nächte.",
      "en": "I need a room for two nights.",
      "fa": "برای دو شب یک اتاق می‌خواهم."
    },
    {
      "de": "Wir bleiben für eine Woche.",
      "en": "We are staying for one week.",
      "fa": "یک هفته می‌مانیم."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 40;

-- Day 41
UPDATE lessons SET grammar_note = '{
  "title": "Reflexive verbs (reflexive Verben): sich",
  "title_fa": "فعل‌های انعکاسی (reflexive Verben): sich",
  "explanation": "Some verbs always carry a reflexive pronoun: ich freue mich, du freust dich. The pronoun changes with the subject.",
  "explanation_fa": "بعضی فعل‌ها همیشه ضمیر انعکاسی دارند: ich freue mich، du freust dich. این ضمیر با فاعل تغییر می‌کند.",
  "examples": [
    {
      "de": "Ich wasche mich.",
      "en": "I wash myself.",
      "fa": "خودم را می‌شویم."
    },
    {
      "de": "Wir freuen uns auf das Wochenende.",
      "en": "We look forward to the weekend.",
      "fa": "منتظر آخر هفته‌ایم."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 41;

-- Day 42
UPDATE lessons SET grammar_note = '{
  "title": "Subordinate clauses (Nebensatz): weil",
  "title_fa": "جمله‌وارهٔ پیرو (Nebensatz): weil",
  "explanation": "After weil the conjugated verb moves to the very end of the clause: Ich lerne Deutsch, weil ich in Deutschland arbeiten will.",
  "explanation_fa": "بعد از weil فعل صرف‌شده به آخر جملهٔ پیرو می‌رود: Ich lerne Deutsch, weil ich in Deutschland arbeiten will.",
  "examples": [
    {
      "de": "Ich bleibe zu Hause, weil ich krank bin.",
      "en": "I am staying home because I am ill.",
      "fa": "خانه می‌مانم چون مریضم."
    },
    {
      "de": "Er lernt viel, weil er die Prüfung hat.",
      "en": "He studies a lot because he has the exam.",
      "fa": "زیاد درس می‌خواند چون آزمون دارد."
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 42;

-- Day 43
UPDATE lessons SET grammar_note = '{
  "title": "Subordinate clauses (Nebensatz): dass",
  "title_fa": "جمله‌وارهٔ پیرو (Nebensatz): dass",
  "explanation": "dass introduces what someone thinks or says, and like weil it pushes the verb to the end.",
  "explanation_fa": "dass محتوای فکر یا گفتهٔ کسی را معرفی می‌کند و مثل weil فعل را به آخر می‌برد.",
  "examples": [
    {
      "de": "Ich denke, dass er recht hat.",
      "en": "I think that he is right.",
      "fa": "فکر می‌کنم حق با اوست."
    },
    {
      "de": "Sie sagt, dass sie morgen kommt.",
      "en": "She says that she is coming tomorrow.",
      "fa": "می‌گوید فردا می‌آید."
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 43;

-- Day 44
UPDATE lessons SET grammar_note = '{
  "title": "Subordinate clauses (Nebensatz): wenn or als",
  "title_fa": "جمله‌وارهٔ پیرو (Nebensatz): wenn یا als",
  "explanation": "Use als for a single completed event in the past, and wenn for repeated events or for the present and future.",
  "explanation_fa": "برای یک رویداد یکبارهٔ گذشته از als استفاده کن و برای رویدادهای تکراری یا حال و آینده از wenn.",
  "examples": [
    {
      "de": "Als ich Kind war, wohnte ich in Isfahan.",
      "en": "When I was a child, I lived in Isfahan.",
      "fa": "وقتی بچه بودم، در اصفهان زندگی می‌کردم."
    },
    {
      "de": "Wenn ich Zeit habe, lese ich.",
      "en": "When I have time, I read.",
      "fa": "هر وقت وقت دارم، مطالعه می‌کنم."
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 44;

-- Day 45
UPDATE lessons SET grammar_note = '{
  "title": "Adjective declension (Adjektivdeklination): nominative",
  "title_fa": "صرف صفت (Adjektivdeklination): حالت فاعلی",
  "explanation": "After der/die/das the adjective takes -e; after ein it takes the gender ending: ein guter Mann, eine gute Frau, ein gutes Kind.",
  "explanation_fa": "بعد از der/die/das صفت پسوند -e می‌گیرد؛ بعد از ein پسوند جنسیتی: ein guter Mann، eine gute Frau، ein gutes Kind.",
  "examples": [
    {
      "de": "Der neue Lehrer ist nett.",
      "en": "The new teacher is nice.",
      "fa": "معلم جدید مهربان است."
    },
    {
      "de": "Das ist ein schönes Haus.",
      "en": "That is a beautiful house.",
      "fa": "آن یک خانهٔ زیباست."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 45;

-- Day 46
UPDATE lessons SET grammar_note = '{
  "title": "Adjective declension (Adjektivdeklination): accusative and dative",
  "title_fa": "صرف صفت (Adjektivdeklination): حالت مفعولی و به‌ای",
  "explanation": "In the accusative only masculine changes (den guten Mann). In the dative nearly everything ends in -en: dem guten Mann, der guten Frau.",
  "explanation_fa": "در Akkusativ فقط مذکر تغییر می‌کند (den guten Mann). در Dativ تقریباً همه‌چیز به -en ختم می‌شود: dem guten Mann، der guten Frau.",
  "examples": [
    {
      "de": "Ich sehe den neuen Film.",
      "en": "I am watching the new film.",
      "fa": "فیلم جدید را می‌بینم."
    },
    {
      "de": "Ich helfe dem alten Mann.",
      "en": "I help the old man.",
      "fa": "به آن مرد مسن کمک می‌کنم."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 46;

-- Day 47
UPDATE lessons SET grammar_note = '{
  "title": "Articles (Artikel): none with professions",
  "title_fa": "حروف تعریف (Artikel): شغل بدون حرف تعریف",
  "explanation": "Unlike English, German drops the article with professions: Ich bin Lehrer, not ein Lehrer. With als it is the same: Ich arbeite als Ingenieur.",
  "explanation_fa": "برخلاف انگلیسی، آلمانی برای شغل حرف تعریف نمی‌آورد: Ich bin Lehrer نه ein Lehrer. با als هم همین‌طور: Ich arbeite als Ingenieur.",
  "examples": [
    {
      "de": "Ich bin Ärztin.",
      "en": "I am a doctor.",
      "fa": "پزشک هستم."
    },
    {
      "de": "Er arbeitet als Koch.",
      "en": "He works as a cook.",
      "fa": "به‌عنوان آشپز کار می‌کند."
    }
  ],
  "basics_key": "articles"
}'::jsonb WHERE day = 47;

-- Day 48
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): seit with the present tense",
  "title_fa": "حروف اضافه (Präpositionen): seit با زمان حال",
  "explanation": "For something that started in the past and still continues, German uses seit with the present tense — not the past as in English.",
  "explanation_fa": "برای کاری که در گذشته شروع شده و هنوز ادامه دارد، آلمانی seit را با زمان حال می‌آورد — نه گذشته مثل انگلیسی.",
  "examples": [
    {
      "de": "Ich lerne seit zwei Jahren Deutsch.",
      "en": "I have been learning German for two years.",
      "fa": "دو سال است آلمانی می‌خوانم."
    },
    {
      "de": "Er wohnt seit 2020 hier.",
      "en": "He has lived here since 2020.",
      "fa": "از سال ۲۰۲۰ اینجا زندگی می‌کند."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 48;

-- Day 49
UPDATE lessons SET grammar_note = '{
  "title": "Compound nouns (Komposita): the last part sets the gender",
  "title_fa": "اسم‌های مرکب (Komposita): جنسیت از جزء آخر",
  "explanation": "German glues nouns together and the final part decides the article: die Internetverbindung, because Verbindung is feminine.",
  "explanation_fa": "آلمانی اسم‌ها را به هم می‌چسباند و جزء آخر حرف تعریف را تعیین می‌کند: die Internetverbindung، چون Verbindung مؤنث است.",
  "examples": [
    {
      "de": "das Handy + die Nummer = die Handynummer",
      "en": "the mobile number",
      "fa": "شمارهٔ موبایل"
    },
    {
      "de": "der Computer + das Problem = das Computerproblem",
      "en": "the computer problem",
      "fa": "مشکل کامپیوتر"
    }
  ],
  "basics_key": "articles"
}'::jsonb WHERE day = 49;

-- Day 50
UPDATE lessons SET grammar_note = '{
  "title": "Coordinating conjunctions (Konjunktionen): und, aber, oder, denn",
  "title_fa": "حروف ربط هم‌پایه (Konjunktionen): und، aber، oder، denn",
  "explanation": "These four connect two main clauses and do not count as an element, so the verb stays in second position — unlike weil.",
  "explanation_fa": "این چهار حرف ربط دو جملهٔ اصلی را وصل می‌کنند و خودشان جزء شمرده نمی‌شوند، پس فعل در جایگاه دوم می‌ماند — برخلاف weil.",
  "examples": [
    {
      "de": "Ich bleibe hier, denn ich bin müde.",
      "en": "I am staying here because I am tired.",
      "fa": "اینجا می‌مانم، چون خسته‌ام."
    },
    {
      "de": "Sie kocht und er deckt den Tisch.",
      "en": "She cooks and he sets the table.",
      "fa": "او آشپزی می‌کند و او میز را می‌چیند."
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 50;

-- Day 51
UPDATE lessons SET grammar_note = '{
  "title": "Simple past (Präteritum)",
  "title_fa": "گذشتهٔ ساده (Präteritum)",
  "explanation": "Written German and a few common verbs prefer the simple past: war, hatte, ging, kam. In speech, the perfect tense is more usual.",
  "explanation_fa": "در نوشتار و برای چند فعل پرکاربرد از گذشتهٔ ساده استفاده می‌شود: war، hatte، ging، kam. در گفتار معمولاً ماضی نقلی رایج‌تر است.",
  "examples": [
    {
      "de": "Ich war gestern zu Hause.",
      "en": "I was at home yesterday.",
      "fa": "دیروز خانه بودم."
    },
    {
      "de": "Wir hatten keine Zeit.",
      "en": "We had no time.",
      "fa": "وقت نداشتیم."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 51;

-- Day 52
UPDATE lessons SET grammar_note = '{
  "title": "Passive voice (Passiv): present",
  "title_fa": "ساختار مجهول (Passiv): زمان حال",
  "explanation": "When the doer does not matter, use werden plus the participle: Das Formular wird ausgefüllt.",
  "explanation_fa": "وقتی انجام‌دهنده مهم نیست، از werden با اسم مفعول استفاده کن: Das Formular wird ausgefüllt.",
  "examples": [
    {
      "de": "Das Geschäft wird um neun geöffnet.",
      "en": "The shop is opened at nine.",
      "fa": "مغازه ساعت نُه باز می‌شود."
    },
    {
      "de": "Hier wird Deutsch gesprochen.",
      "en": "German is spoken here.",
      "fa": "اینجا آلمانی صحبت می‌شود."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 52;

-- Day 53
UPDATE lessons SET grammar_note = '{
  "title": "Relative clauses (Relativsätze)",
  "title_fa": "جمله‌های موصولی (Relativsätze)",
  "explanation": "The relative pronoun copies the gender of the noun it describes, and the verb goes to the end: der Mann, der dort steht.",
  "explanation_fa": "ضمیر موصولی جنسیت اسمی را می‌گیرد که توصیفش می‌کند و فعل به آخر می‌رود: der Mann, der dort steht.",
  "examples": [
    {
      "de": "Das ist die Frau, die hier arbeitet.",
      "en": "That is the woman who works here.",
      "fa": "این خانمی است که اینجا کار می‌کند."
    },
    {
      "de": "Ich kenne den Mann, der dort wohnt.",
      "en": "I know the man who lives there.",
      "fa": "مردی را می‌شناسم که آنجا زندگی می‌کند."
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 53;

-- Day 54
UPDATE lessons SET grammar_note = '{
  "title": "Genitive case (Genitiv)",
  "title_fa": "حالت اضافی (Genitiv)",
  "explanation": "Formal German marks possession with des/der plus -s on masculine and neuter nouns: das Auto des Mannes. In speech, von plus dative is common.",
  "explanation_fa": "آلمانی رسمی مالکیت را با des/der و افزودن -s به اسم مذکر و خنثی نشان می‌دهد: das Auto des Mannes. در گفتار معمولاً von با Dativ به‌کار می‌رود.",
  "examples": [
    {
      "de": "das Haus meiner Eltern",
      "en": "my parents house",
      "fa": "خانهٔ والدینم"
    },
    {
      "de": "das Auto von meinem Bruder",
      "en": "my brothers car (spoken)",
      "fa": "ماشین برادرم (گفتاری)"
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 54;

-- Day 55
UPDATE lessons SET grammar_note = '{
  "title": "Indirect questions (indirekte Fragen): ob and W-words",
  "title_fa": "پرسش غیرمستقیم (indirekte Fragen): ob و کلمهٔ پرسشی",
  "explanation": "Wrap a question inside a sentence with ob (whether) or the question word, and send the verb to the end.",
  "explanation_fa": "سؤال را داخل جمله با ob (آیا) یا کلمهٔ پرسشی بیاور و فعل را به آخر بفرست.",
  "examples": [
    {
      "de": "Ich weiß nicht, ob er kommt.",
      "en": "I do not know whether he is coming.",
      "fa": "نمی‌دانم آیا می‌آید."
    },
    {
      "de": "Können Sie mir sagen, wo der Bahnhof ist?",
      "en": "Can you tell me where the station is?",
      "fa": "می‌توانید بگویید ایستگاه کجاست؟"
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 55;

-- Day 56
UPDATE lessons SET grammar_note = '{
  "title": "Impersonal pronoun man",
  "title_fa": "ضمیر غیرشخصی man",
  "explanation": "man means people in general and always takes the er/sie/es verb form: Man muss Müll trennen.",
  "explanation_fa": "man یعنی «آدم/مردم» به‌طور کلی و همیشه فعل را مثل er/sie/es صرف می‌کند: Man muss Müll trennen.",
  "examples": [
    {
      "de": "Man soll Wasser sparen.",
      "en": "One should save water.",
      "fa": "باید در مصرف آب صرفه‌جویی کرد."
    },
    {
      "de": "Hier darf man nicht rauchen.",
      "en": "Smoking is not allowed here.",
      "fa": "اینجا سیگار کشیدن ممنوع است."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 56;

-- Day 57
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): laut and nach for sources",
  "title_fa": "حروف اضافه (Präpositionen): laut و nach برای ذکر منبع",
  "explanation": "News language uses laut plus dative to attribute information: Laut der Zeitung ...",
  "explanation_fa": "زبان خبری با laut و Dativ منبع را ذکر می‌کند: Laut der Zeitung …",
  "examples": [
    {
      "de": "Laut dem Bericht steigt der Preis.",
      "en": "According to the report the price is rising.",
      "fa": "بر اساس گزارش، قیمت بالا می‌رود."
    },
    {
      "de": "Nach Angaben der Polizei war niemand verletzt.",
      "en": "According to the police nobody was injured.",
      "fa": "به گفتهٔ پلیس کسی مجروح نشد."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 57;

-- Day 58
UPDATE lessons SET grammar_note = '{
  "title": "Modal verbs (Modalverben): sollte for advice",
  "title_fa": "افعال کمکی (Modalverben): sollte برای توصیه",
  "explanation": "sollte is the softened form of sollen and is the normal way to give health advice: Du solltest mehr Wasser trinken.",
  "explanation_fa": "sollte شکل نرم‌شدهٔ sollen است و روش معمول توصیهٔ سلامتی: Du solltest mehr Wasser trinken.",
  "examples": [
    {
      "de": "Sie sollten mehr schlafen.",
      "en": "You should sleep more.",
      "fa": "باید بیشتر بخوابید."
    },
    {
      "de": "Man sollte jeden Tag laufen.",
      "en": "One should walk every day.",
      "fa": "آدم باید هر روز پیاده‌روی کند."
    }
  ],
  "basics_key": "modalVerbs"
}'::jsonb WHERE day = 58;

-- Day 59
UPDATE lessons SET grammar_note = '{
  "title": "Expressing opinion: Ich finde, dass ...",
  "title_fa": "بیان نظر: Ich finde, dass …",
  "explanation": "Ich finde, dass ... and Meiner Meinung nach ... are the two safest ways to give an opinion. After dass the verb goes to the end.",
  "explanation_fa": "دو الگوی مطمئن برای بیان نظر: Ich finde, dass … و Meiner Meinung nach … . بعد از dass فعل به آخر می‌رود.",
  "examples": [
    {
      "de": "Ich finde, dass das wichtig ist.",
      "en": "I think that this is important.",
      "fa": "فکر می‌کنم این مهم است."
    },
    {
      "de": "Meiner Meinung nach ist das falsch.",
      "en": "In my opinion that is wrong.",
      "fa": "به نظر من این اشتباه است."
    }
  ]
}'::jsonb WHERE day = 59;

-- Day 60
UPDATE lessons SET grammar_note = '{
  "title": "Comparison (Vergleich): anders als, genauso wie",
  "title_fa": "مقایسه (Vergleich): anders als و genauso wie",
  "explanation": "Use anders als for different from and genauso wie for just like.",
  "explanation_fa": "برای «متفاوت از» از anders als و برای «درست مثل» از genauso wie استفاده کن.",
  "examples": [
    {
      "de": "Das ist anders als in meinem Land.",
      "en": "That is different from in my country.",
      "fa": "این با کشور من فرق دارد."
    },
    {
      "de": "Das ist genauso wie zu Hause.",
      "en": "That is just like at home.",
      "fa": "این دقیقاً مثل خانه است."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 60;

-- Day 61
UPDATE lessons SET grammar_note = '{
  "title": "Konjunktiv II: würde + infinitive",
  "title_fa": "وجه شرطی (Konjunktiv II): würde به‌همراه مصدر",
  "explanation": "For hypothetical or very polite statements, use würde plus the infinitive at the end: Ich würde gern mitkommen.",
  "explanation_fa": "برای جمله‌های فرضی یا خیلی مؤدبانه از würde با مصدر در آخر استفاده کن: Ich würde gern mitkommen.",
  "examples": [
    {
      "de": "Ich würde gern mitkommen.",
      "en": "I would like to come along.",
      "fa": "دوست دارم همراه بیایم."
    },
    {
      "de": "Würden Sie mir bitte helfen?",
      "en": "Would you please help me?",
      "fa": "لطفاً کمکم می‌کنید؟"
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 61;

-- Day 62
UPDATE lessons SET grammar_note = '{
  "title": "Konjunktiv II: hätte and wäre",
  "title_fa": "وجه شرطی (Konjunktiv II): hätte و wäre",
  "explanation": "haben and sein have their own conditional forms and do not use würde: Ich hätte gern ..., Das wäre schön.",
  "explanation_fa": "فعل‌های haben و sein شکل شرطی خودشان را دارند و würde نمی‌گیرند: Ich hätte gern …، Das wäre schön.",
  "examples": [
    {
      "de": "Ich hätte gern einen Tee.",
      "en": "I would like a tea.",
      "fa": "یک چای می‌خواهم."
    },
    {
      "de": "Das wäre sehr nett.",
      "en": "That would be very kind.",
      "fa": "خیلی لطف می‌کنید."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 62;

-- Day 63
UPDATE lessons SET grammar_note = '{
  "title": "Passive voice (Passiv): past",
  "title_fa": "ساختار مجهول (Passiv): زمان گذشته",
  "explanation": "The past passive swaps wird for wurde: Das Haus wurde 1990 gebaut.",
  "explanation_fa": "در مجهول گذشته به‌جای wird از wurde استفاده می‌شود: Das Haus wurde 1990 gebaut.",
  "examples": [
    {
      "de": "Der Brief wurde gestern geschickt.",
      "en": "The letter was sent yesterday.",
      "fa": "نامه دیروز فرستاده شد."
    },
    {
      "de": "Die Schule wurde renoviert.",
      "en": "The school was renovated.",
      "fa": "مدرسه بازسازی شد."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 63;

-- Day 64
UPDATE lessons SET grammar_note = '{
  "title": "N-declension (N-Deklination)",
  "title_fa": "صرف N (N-Deklination)",
  "explanation": "A group of masculine nouns adds -n or -en in every case except the nominative: der Student, but den Studenten.",
  "explanation_fa": "گروهی از اسم‌های مذکر در همهٔ حالت‌ها به‌جز فاعلی، -n یا -en می‌گیرند: der Student اما den Studenten.",
  "examples": [
    {
      "de": "Ich kenne den Studenten.",
      "en": "I know the student.",
      "fa": "آن دانشجو را می‌شناسم."
    },
    {
      "de": "Ich helfe dem Kollegen.",
      "en": "I help the colleague.",
      "fa": "به همکار کمک می‌کنم."
    }
  ],
  "basics_key": "cases"
}'::jsonb WHERE day = 64;

-- Day 65
UPDATE lessons SET grammar_note = '{
  "title": "Modal verbs (Modalverben): double infinitive in the perfect",
  "title_fa": "افعال کمکی (Modalverben): مصدر دوگانه در ماضی نقلی",
  "explanation": "In the perfect tense, modals do not use a participle. Two infinitives end the sentence instead: Ich habe arbeiten müssen.",
  "explanation_fa": "در ماضی نقلی، فعل‌های کمکی اسم مفعول نمی‌گیرند؛ به‌جایش دو مصدر آخر جمله می‌آیند: Ich habe arbeiten müssen.",
  "examples": [
    {
      "de": "Ich habe gestern arbeiten müssen.",
      "en": "I had to work yesterday.",
      "fa": "دیروز مجبور بودم کار کنم."
    },
    {
      "de": "Er hat nicht kommen können.",
      "en": "He was not able to come.",
      "fa": "نتوانست بیاید."
    }
  ],
  "basics_key": "modalVerbs"
}'::jsonb WHERE day = 65;

-- Day 66
UPDATE lessons SET grammar_note = '{
  "title": "Adjective declension (Adjektivdeklination): with no article",
  "title_fa": "صرف صفت (Adjektivdeklination): بدون حرف تعریف",
  "explanation": "With no article at all, the adjective itself carries the case ending: guter Kaffee, kaltes Wasser, mit gutem Wetter.",
  "explanation_fa": "وقتی هیچ حرف تعریفی نیست، خود صفت پسوند حالت را می‌گیرد: guter Kaffee، kaltes Wasser، mit gutem Wetter.",
  "examples": [
    {
      "de": "Ich trinke gern schwarzen Kaffee.",
      "en": "I like drinking black coffee.",
      "fa": "قهوهٔ تلخ دوست دارم."
    },
    {
      "de": "Wir haben schönes Wetter.",
      "en": "We have nice weather.",
      "fa": "هوای خوبی داریم."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 66;

-- Day 67
UPDATE lessons SET grammar_note = '{
  "title": "Register (Register): formal letters",
  "title_fa": "لحن (Register): نامهٔ رسمی",
  "explanation": "Formal letters open with Sehr geehrte Damen und Herren and close with Mit freundlichen Grüßen. Note the comma after the greeting and the small letter that follows.",
  "explanation_fa": "نامهٔ رسمی با Sehr geehrte Damen und Herren شروع و با Mit freundlichen Grüßen تمام می‌شود. بعد از سلام کاما می‌آید و جملهٔ بعد با حرف کوچک شروع می‌شود.",
  "examples": [
    {
      "de": "Sehr geehrte Frau Müller,",
      "en": "Dear Ms Müller,",
      "fa": "خانم مولر گرامی،"
    },
    {
      "de": "Mit freundlichen Grüßen",
      "en": "Kind regards",
      "fa": "با احترام"
    }
  ]
}'::jsonb WHERE day = 67;

-- Day 68
UPDATE lessons SET grammar_note = '{
  "title": "Register (Register): job interviews",
  "title_fa": "لحن (Register): مصاحبهٔ شغلی",
  "explanation": "In interviews combine Sie with könnte and würde, and describe experience with the perfect tense: Ich habe drei Jahre gearbeitet.",
  "explanation_fa": "در مصاحبه، Sie را با könnte و würde ترکیب کن و تجربه‌ات را با ماضی نقلی بگو: Ich habe drei Jahre gearbeitet.",
  "examples": [
    {
      "de": "Ich habe drei Jahre als Verkäufer gearbeitet.",
      "en": "I worked as a salesperson for three years.",
      "fa": "سه سال فروشنده بودم."
    },
    {
      "de": "Ich würde gern in Ihrem Team arbeiten.",
      "en": "I would like to work in your team.",
      "fa": "دوست دارم در تیم شما کار کنم."
    }
  ]
}'::jsonb WHERE day = 68;

-- Day 69
UPDATE lessons SET grammar_note = '{
  "title": "Passive voice (Passiv): rental notices",
  "title_fa": "ساختار مجهول (Passiv): آگهی و قرارداد اجاره",
  "explanation": "Rental adverts and contracts prefer the passive and nominalised forms: Die Wohnung wird ab Mai vermietet.",
  "explanation_fa": "آگهی و قرارداد اجاره معمولاً مجهول و اسم‌سازی دارد: Die Wohnung wird ab Mai vermietet.",
  "examples": [
    {
      "de": "Die Wohnung wird ab Mai vermietet.",
      "en": "The flat is rented out from May.",
      "fa": "آپارتمان از ماه مه اجاره داده می‌شود."
    },
    {
      "de": "Die Kaution beträgt zwei Monatsmieten.",
      "en": "The deposit amounts to two months rent.",
      "fa": "ودیعه معادل دو ماه اجاره است."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 69;

-- Day 70
UPDATE lessons SET grammar_note = '{
  "title": "Nominalization (Nominalisierung): das Rauchen",
  "title_fa": "اسم‌سازی (Nominalisierung): das Rauchen",
  "explanation": "Any infinitive can become a neuter noun: das Rauchen, das Lernen. Discussion German uses this constantly.",
  "explanation_fa": "هر مصدری می‌تواند اسم خنثی شود: das Rauchen، das Lernen. در بحث‌های جدی این ساختار زیاد به‌کار می‌رود.",
  "examples": [
    {
      "de": "Das Rauchen ist hier verboten.",
      "en": "Smoking is forbidden here.",
      "fa": "سیگار کشیدن اینجا ممنوع است."
    },
    {
      "de": "Das Lernen macht mir Spaß.",
      "en": "Learning is fun for me.",
      "fa": "یادگیری برایم لذت‌بخش است."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 70;

-- Day 71
UPDATE lessons SET grammar_note = '{
  "title": "Future (Futur): present tense for plans",
  "title_fa": "آینده (Futur): زمان حال برای برنامه",
  "explanation": "With a time word, the present tense already means the future. No special tense is needed: Morgen gehe ich ins Kino.",
  "explanation_fa": "با یک قید زمان، همان زمان حال معنی آینده می‌دهد و نیازی به زمان ویژه نیست: Morgen gehe ich ins Kino.",
  "examples": [
    {
      "de": "Am Samstag besuche ich meine Familie.",
      "en": "On Saturday I am visiting my family.",
      "fa": "شنبه به دیدن خانواده‌ام می‌روم."
    },
    {
      "de": "Nächste Woche fahren wir weg.",
      "en": "Next week we are going away.",
      "fa": "هفتهٔ آینده سفر می‌رویم."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 71;

-- Day 72
UPDATE lessons SET grammar_note = '{
  "title": "Imperative (Imperativ): the informal du form",
  "title_fa": "وجه امری (Imperativ): شکل خودمانی du",
  "explanation": "The du-imperative uses the bare stem with no pronoun: Nimm, Gib, Komm. Recipes and cooking together are full of it.",
  "explanation_fa": "امری du فقط ریشهٔ فعل است، بدون ضمیر: Nimm، Gib، Komm. دستور پخت و آشپزی پر از این ساختار است.",
  "examples": [
    {
      "de": "Gib mir bitte das Salz.",
      "en": "Pass me the salt please.",
      "fa": "لطفاً نمک را بده."
    },
    {
      "de": "Schneide die Zwiebeln klein.",
      "en": "Chop the onions finely.",
      "fa": "پیازها را ریز خرد کن."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 72;

-- Day 73
UPDATE lessons SET grammar_note = '{
  "title": "Reflexive verbs (reflexive Verben): daily routine",
  "title_fa": "فعل‌های انعکاسی (reflexive Verben): برنامهٔ روزانه",
  "explanation": "Fitness talk is full of reflexives: sich anmelden, sich umziehen, sich aufwärmen. The pronoun follows the conjugated verb.",
  "explanation_fa": "زبان ورزش پر از فعل انعکاسی است: sich anmelden، sich umziehen، sich aufwärmen. ضمیر بعد از فعل صرف‌شده می‌آید.",
  "examples": [
    {
      "de": "Ich melde mich für den Kurs an.",
      "en": "I am signing up for the course.",
      "fa": "برای کلاس ثبت‌نام می‌کنم."
    },
    {
      "de": "Wir wärmen uns zuerst auf.",
      "en": "First we warm up.",
      "fa": "اول گرم می‌کنیم."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 73;

-- Day 74
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): zu and bei with people",
  "title_fa": "حروف اضافه (Präpositionen): zu و bei دربارهٔ اشخاص",
  "explanation": "zu plus dative means going to someone, bei plus dative means being at their place: Ich gehe zu Anna. Ich bin bei Anna.",
  "explanation_fa": "zu با Dativ یعنی رفتن پیش کسی و bei با Dativ یعنی بودن پیش کسی: Ich gehe zu Anna. Ich bin bei Anna.",
  "examples": [
    {
      "de": "Ich gehe zu meinem Freund.",
      "en": "I am going to my friend.",
      "fa": "پیش دوستم می‌روم."
    },
    {
      "de": "Ich bin bei meinen Eltern.",
      "en": "I am at my parents place.",
      "fa": "خانهٔ والدینم هستم."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 74;

-- Day 75
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): nach or in with places",
  "title_fa": "حروف اضافه (Präpositionen): nach یا in برای مکان‌ها",
  "explanation": "Use nach with cities and most countries: nach Berlin. Use in die/in den with countries that take an article: in die Türkei, in den Iran.",
  "explanation_fa": "برای شهرها و بیشتر کشورها nach می‌آید: nach Berlin. برای کشورهایی که حرف تعریف دارند in die/in den: in die Türkei، in den Iran.",
  "examples": [
    {
      "de": "Ich ziehe nach München.",
      "en": "I am moving to Munich.",
      "fa": "به مونیخ نقل‌مکان می‌کنم."
    },
    {
      "de": "Wir fliegen in die Türkei.",
      "en": "We are flying to Turkey.",
      "fa": "به ترکیه پرواز می‌کنیم."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 75;

-- Day 76
UPDATE lessons SET grammar_note = '{
  "title": "Perfect tense (Perfekt): reporting problems",
  "title_fa": "ماضی نقلی (Perfekt): گزارش مشکل",
  "explanation": "Problems that just happened are reported in the perfect: Der Zug hat Verspätung gehabt. Ich habe den Anschluss verpasst.",
  "explanation_fa": "مشکلاتی که تازه رخ داده با ماضی نقلی گفته می‌شود: Der Zug hat Verspätung gehabt. Ich habe den Anschluss verpasst.",
  "examples": [
    {
      "de": "Der Bus ist nicht gekommen.",
      "en": "The bus did not come.",
      "fa": "اتوبوس نیامد."
    },
    {
      "de": "Ich habe meinen Zug verpasst.",
      "en": "I missed my train.",
      "fa": "قطارم را از دست دادم."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 76;

-- Day 77
UPDATE lessons SET grammar_note = '{
  "title": "Quantities (Mengenangaben): ein Kilo Tomaten",
  "title_fa": "بیان مقدار (Mengenangaben): ein Kilo Tomaten",
  "explanation": "German puts the measure and the product side by side with nothing between: ein Kilo Tomaten, zwei Flaschen Wasser.",
  "explanation_fa": "آلمانی واحد و کالا را بدون هیچ کلمه‌ای کنار هم می‌گذارد: ein Kilo Tomaten، zwei Flaschen Wasser.",
  "examples": [
    {
      "de": "Ich nehme ein Kilo Äpfel.",
      "en": "I will take a kilo of apples.",
      "fa": "یک کیلو سیب می‌گیرم."
    },
    {
      "de": "Zwei Flaschen Wasser, bitte.",
      "en": "Two bottles of water, please.",
      "fa": "لطفاً دو بطری آب."
    }
  ]
}'::jsonb WHERE day = 77;

-- Day 78
UPDATE lessons SET grammar_note = '{
  "title": "Future (Futur I): werden + infinitive",
  "title_fa": "آینده (Futur I): werden به‌همراه مصدر",
  "explanation": "werden plus an infinitive at the end states a firm intention or prediction: Wir werden eine Party machen.",
  "explanation_fa": "werden با مصدر در آخر جمله، قصد یا پیش‌بینی قاطع را نشان می‌دهد: Wir werden eine Party machen.",
  "examples": [
    {
      "de": "Ich werde alle einladen.",
      "en": "I will invite everyone.",
      "fa": "همه را دعوت خواهم کرد."
    },
    {
      "de": "Es wird bestimmt lustig.",
      "en": "It will definitely be fun.",
      "fa": "حتماً خوش می‌گذرد."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 78;

-- Day 79
UPDATE lessons SET grammar_note = '{
  "title": "Verbs with a fixed preposition (Verben mit Präposition)",
  "title_fa": "فعل‌های با حرف اضافهٔ ثابت (Verben mit Präposition)",
  "explanation": "Some verbs come welded to a preposition and you must learn them as a unit: sich bewerben um, warten auf, sich freuen über.",
  "explanation_fa": "بعضی فعل‌ها حرف اضافهٔ ثابتی دارند و باید یکجا حفظ شوند: sich bewerben um، warten auf، sich freuen über.",
  "examples": [
    {
      "de": "Ich bewerbe mich um die Stelle.",
      "en": "I am applying for the position.",
      "fa": "برای این شغل درخواست می‌دهم."
    },
    {
      "de": "Ich warte auf eine Antwort.",
      "en": "I am waiting for an answer.",
      "fa": "منتظر پاسخ هستم."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 79;

-- Day 80
UPDATE lessons SET grammar_note = '{
  "title": "Adjective declension (Adjektivdeklination): describing a home",
  "title_fa": "صرف صفت (Adjektivdeklination): توصیف خانه",
  "explanation": "Describing a home means adjectives before nouns, so the endings matter: ein großes Wohnzimmer, eine kleine Küche.",
  "explanation_fa": "توصیف خانه یعنی صفت قبل از اسم، پس پسوندها مهم می‌شوند: ein großes Wohnzimmer، eine kleine Küche.",
  "examples": [
    {
      "de": "Wir haben eine kleine Küche.",
      "en": "We have a small kitchen.",
      "fa": "آشپزخانهٔ کوچکی داریم."
    },
    {
      "de": "Das ist ein helles Zimmer.",
      "en": "That is a bright room.",
      "fa": "این یک اتاق روشن است."
    }
  ],
  "basics_key": "adjectives"
}'::jsonb WHERE day = 80;

-- Day 81
UPDATE lessons SET grammar_note = '{
  "title": "Simple past (Präteritum): telling a story",
  "title_fa": "گذشتهٔ ساده (Präteritum): داستان‌گویی",
  "explanation": "When telling a longer story, German switches to the simple past — especially war, hatte, konnte, ging.",
  "explanation_fa": "برای تعریف داستان طولانی، آلمانی به گذشتهٔ ساده می‌رود — به‌ویژه war، hatte، konnte، ging.",
  "examples": [
    {
      "de": "Als Kind hatte ich einen Hund.",
      "en": "As a child I had a dog.",
      "fa": "بچه که بودم یک سگ داشتم."
    },
    {
      "de": "Wir gingen jeden Sommer ans Meer.",
      "en": "We went to the sea every summer.",
      "fa": "هر تابستان به دریا می‌رفتیم."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 81;

-- Day 82
UPDATE lessons SET grammar_note = '{
  "title": "Passive voice (Passiv): describing a process",
  "title_fa": "ساختار مجهول (Passiv): بیان فرایند",
  "explanation": "Shops describe steps without naming a doer: Die Bestellung wird bearbeitet. Das Paket wird geliefert.",
  "explanation_fa": "فروشگاه‌ها مراحل را بدون ذکر انجام‌دهنده می‌گویند: Die Bestellung wird bearbeitet. Das Paket wird geliefert.",
  "examples": [
    {
      "de": "Ihre Bestellung wird bearbeitet.",
      "en": "Your order is being processed.",
      "fa": "سفارش شما در حال پردازش است."
    },
    {
      "de": "Das Paket wird morgen geliefert.",
      "en": "The parcel will be delivered tomorrow.",
      "fa": "بسته فردا تحویل داده می‌شود."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 82;

-- Day 83
UPDATE lessons SET grammar_note = '{
  "title": "The verb lassen: having something done",
  "title_fa": "فعل lassen: انجام کار توسط دیگری",
  "explanation": "lassen plus an infinitive means you have someone else do it: Ich lasse mir die Haare schneiden.",
  "explanation_fa": "lassen با مصدر یعنی کاری را دیگری برایت انجام می‌دهد: Ich lasse mir die Haare schneiden.",
  "examples": [
    {
      "de": "Ich lasse mir die Haare schneiden.",
      "en": "I am having my hair cut.",
      "fa": "موهایم را کوتاه می‌کنم (توسط آرایشگر)."
    },
    {
      "de": "Er lässt das Auto reparieren.",
      "en": "He is having the car repaired.",
      "fa": "ماشین را برای تعمیر می‌برد."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 83;

-- Day 84
UPDATE lessons SET grammar_note = '{
  "title": "Relative clauses (Relativsätze): describing things",
  "title_fa": "جمله‌های موصولی (Relativsätze): توصیف کردن",
  "explanation": "Talking about films naturally produces relative clauses: ein Film, der mich beeindruckt hat.",
  "explanation_fa": "صحبت دربارهٔ فیلم به‌طور طبیعی جملهٔ موصولی می‌سازد: ein Film, der mich beeindruckt hat.",
  "examples": [
    {
      "de": "Das ist ein Film, der mir gefallen hat.",
      "en": "That is a film that I liked.",
      "fa": "این فیلمی است که خوشم آمد."
    },
    {
      "de": "Der Schauspieler, den ich mag, spielt gut.",
      "en": "The actor whom I like acts well.",
      "fa": "بازیگری که دوستش دارم خوب بازی می‌کند."
    }
  ],
  "basics_key": "wordOrder"
}'::jsonb WHERE day = 84;

-- Day 85
UPDATE lessons SET grammar_note = '{
  "title": "Impersonal pronoun man: with modal verbs",
  "title_fa": "ضمیر غیرشخصی man: همراه افعال کمکی",
  "explanation": "Rules and recommendations combine man with a modal: Man muss den Müll trennen. Man sollte weniger Plastik benutzen.",
  "explanation_fa": "قاعده‌ها و توصیه‌ها man را با فعل کمکی ترکیب می‌کنند: Man muss den Müll trennen. Man sollte weniger Plastik benutzen.",
  "examples": [
    {
      "de": "Man muss Glas extra sammeln.",
      "en": "Glass must be collected separately.",
      "fa": "شیشه را باید جدا جمع کرد."
    },
    {
      "de": "Man sollte weniger Auto fahren.",
      "en": "One should drive less.",
      "fa": "آدم باید کمتر رانندگی کند."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 85;

-- Day 86
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): seit for duration",
  "title_fa": "حروف اضافه (Präpositionen): seit برای مدت زمان",
  "explanation": "Say how long you have been learning with seit plus dative and the present tense: Ich lerne seit sechs Monaten Deutsch.",
  "explanation_fa": "مدت یادگیری را با seit و Dativ و زمان حال بگو: Ich lerne seit sechs Monaten Deutsch.",
  "examples": [
    {
      "de": "Ich lerne seit einem Jahr Deutsch.",
      "en": "I have been learning German for a year.",
      "fa": "یک سال است آلمانی می‌خوانم."
    },
    {
      "de": "Seit wann lernst du Deutsch?",
      "en": "How long have you been learning German?",
      "fa": "از کی آلمانی می‌خوانی؟"
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 86;

-- Day 87
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions of time (Temporalpräpositionen): im with seasons",
  "title_fa": "حروف اضافهٔ زمان (Temporalpräpositionen): im برای فصل‌ها",
  "explanation": "Seasons take im: im Frühling, im Sommer, im Herbst, im Winter. The one exception is in der Nacht.",
  "explanation_fa": "فصل‌ها با im می‌آیند: im Frühling، im Sommer، im Herbst، im Winter. استثنا: in der Nacht.",
  "examples": [
    {
      "de": "Im Winter schneit es oft.",
      "en": "In winter it often snows.",
      "fa": "زمستان‌ها اغلب برف می‌آید."
    },
    {
      "de": "Im Sommer gehen wir schwimmen.",
      "en": "In summer we go swimming.",
      "fa": "تابستان‌ها شنا می‌رویم."
    }
  ],
  "basics_key": "months"
}'::jsonb WHERE day = 87;

-- Day 88
UPDATE lessons SET grammar_note = '{
  "title": "Konjunktiv II: polite complaints",
  "title_fa": "وجه شرطی (Konjunktiv II): شکایت مؤدبانه",
  "explanation": "To complain without conflict, use könnten plus bitte: Könnten Sie bitte etwas leiser sein?",
  "explanation_fa": "برای شکایت بدون تنش از könnten به‌همراه bitte استفاده کن: Könnten Sie bitte etwas leiser sein؟",
  "examples": [
    {
      "de": "Könnten Sie bitte leiser sein?",
      "en": "Could you please be quieter?",
      "fa": "لطفاً می‌شود کمی آرام‌تر باشید؟"
    },
    {
      "de": "Es wäre nett, wenn Sie das machen könnten.",
      "en": "It would be kind if you could do that.",
      "fa": "ممنون می‌شوم اگر این کار را بکنید."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 88;

-- Day 89
UPDATE lessons SET grammar_note = '{
  "title": "Articles (Artikel): animal nouns",
  "title_fa": "حروف تعریف (Artikel): نام حیوانات",
  "explanation": "Animals follow no gender logic either: der Hund, die Katze, das Pferd. Learn each with its article.",
  "explanation_fa": "نام حیوانات هم منطق جنسیتی ندارد: der Hund، die Katze، das Pferd. هرکدام را با حرف تعریفش یاد بگیر.",
  "examples": [
    {
      "de": "Ich habe einen Hund.",
      "en": "I have a dog.",
      "fa": "یک سگ دارم."
    },
    {
      "de": "Die Katze schläft auf dem Sofa.",
      "en": "The cat sleeps on the sofa.",
      "fa": "گربه روی مبل می‌خوابد."
    }
  ],
  "basics_key": "articles"
}'::jsonb WHERE day = 89;

-- Day 90
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): an and zu with festivals",
  "title_fa": "حروف اضافه (Präpositionen): an و zu برای مناسبت‌ها",
  "explanation": "Festivals take zu or an: zu Weihnachten, an Ostern. Both are followed by the dative.",
  "explanation_fa": "برای مناسبت‌ها zu یا an می‌آید: zu Weihnachten، an Ostern. بعد از هر دو Dativ می‌آید.",
  "examples": [
    {
      "de": "Zu Weihnachten besuchen wir die Familie.",
      "en": "At Christmas we visit the family.",
      "fa": "کریسمس به دیدن خانواده می‌رویم."
    },
    {
      "de": "An Ostern haben wir frei.",
      "en": "At Easter we have time off.",
      "fa": "عید پاک تعطیلیم."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 90;

-- Day 91
UPDATE lessons SET grammar_note = '{
  "title": "Konjunktiv II: giving advice",
  "title_fa": "وجه شرطی (Konjunktiv II): نصیحت کردن",
  "explanation": "The natural way to give advice: An deiner Stelle würde ich ... with the infinitive at the end.",
  "explanation_fa": "روش طبیعی نصیحت کردن: An deiner Stelle würde ich … و مصدر در آخر جمله.",
  "examples": [
    {
      "de": "An deiner Stelle würde ich warten.",
      "en": "In your place I would wait.",
      "fa": "جای تو بودم صبر می‌کردم."
    },
    {
      "de": "Du solltest mit ihm sprechen.",
      "en": "You should talk to him.",
      "fa": "باید با او صحبت کنی."
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 91;

-- Day 92
UPDATE lessons SET grammar_note = '{
  "title": "Prepositions (Präpositionen): vor and nach for time",
  "title_fa": "حروف اضافه (Präpositionen): vor و nach برای زمان",
  "explanation": "vor means before or ago, nach means after — both with the dative: vor zwei Wochen, nach dem Frühstück.",
  "explanation_fa": "vor یعنی قبل یا «پیش» و nach یعنی بعد — هر دو با Dativ: vor zwei Wochen، nach dem Frühstück.",
  "examples": [
    {
      "de": "Vor der Reise buche ich das Hotel.",
      "en": "Before the trip I book the hotel.",
      "fa": "قبل از سفر هتل رزرو می‌کنم."
    },
    {
      "de": "Nach dem Flug nehmen wir ein Taxi.",
      "en": "After the flight we take a taxi.",
      "fa": "بعد از پرواز تاکسی می‌گیریم."
    }
  ],
  "basics_key": "prepositions"
}'::jsonb WHERE day = 92;

-- Day 93
UPDATE lessons SET grammar_note = '{
  "title": "Register (Register): telephone conversations",
  "title_fa": "لحن (Register): مکالمهٔ تلفنی",
  "explanation": "Phone German is formulaic: answer with your surname, then Hier spricht ... and Kann ich bitte mit ... sprechen?",
  "explanation_fa": "مکالمهٔ تلفنی آلمانی الگوی ثابت دارد: با نام خانوادگی جواب بده، بعد Hier spricht … و Kann ich bitte mit … sprechen؟",
  "examples": [
    {
      "de": "Hier spricht Sara Ahmadi.",
      "en": "This is Sara Ahmadi speaking.",
      "fa": "سارا احمدی هستم."
    },
    {
      "de": "Kann ich bitte mit Herrn Weber sprechen?",
      "en": "May I speak to Mr Weber please?",
      "fa": "می‌توانم با آقای وبر صحبت کنم؟"
    }
  ]
}'::jsonb WHERE day = 93;

-- Day 94
UPDATE lessons SET grammar_note = '{
  "title": "Verb choice: spielen, machen, gehen for sports",
  "title_fa": "انتخاب فعل: spielen، machen و gehen برای ورزش",
  "explanation": "Ball sports take spielen, individual sports take machen, and activities ending in -en take gehen: schwimmen gehen.",
  "explanation_fa": "ورزش‌های توپی با spielen، ورزش‌های انفرادی با machen و فعالیت‌ها با gehen می‌آیند: schwimmen gehen.",
  "examples": [
    {
      "de": "Ich spiele Fußball.",
      "en": "I play football.",
      "fa": "فوتبال بازی می‌کنم."
    },
    {
      "de": "Wir gehen jeden Freitag schwimmen.",
      "en": "We go swimming every Friday.",
      "fa": "هر جمعه شنا می‌رویم."
    }
  ],
  "basics_key": "verbTypes"
}'::jsonb WHERE day = 94;

-- Day 95
UPDATE lessons SET grammar_note = '{
  "title": "Konjunktiv II: requests in a restaurant",
  "title_fa": "وجه شرطی (Konjunktiv II): درخواست در رستوران",
  "explanation": "Advanced restaurant language leans on hätte, wäre and könnten: Wir hätten gern die Karte. Wäre es möglich ...?",
  "explanation_fa": "زبان پیشرفتهٔ رستوران بر hätte، wäre و könnten تکیه دارد: Wir hätten gern die Karte. Wäre es möglich …؟",
  "examples": [
    {
      "de": "Wir hätten gern die Speisekarte.",
      "en": "We would like the menu.",
      "fa": "لطفاً منو را می‌خواهیم."
    },
    {
      "de": "Wäre es möglich, draußen zu sitzen?",
      "en": "Would it be possible to sit outside?",
      "fa": "امکانش هست بیرون بنشینیم؟"
    }
  ],
  "basics_key": "passiveKonjunktiv"
}'::jsonb WHERE day = 95;

-- Day 96
UPDATE lessons SET grammar_note = '{
  "title": "Purpose clauses (Finalsätze): um ... zu and damit",
  "title_fa": "جمله‌های هدف (Finalsätze): um … zu و damit",
  "explanation": "Use um ... zu when both clauses share a subject, and damit when the subject changes.",
  "explanation_fa": "وقتی فاعل هر دو جمله یکی است um … zu بیاور و وقتی فاعل عوض می‌شود damit.",
  "examples": [
    {
      "de": "Ich jogge, um fit zu bleiben.",
      "en": "I jog in order to stay fit.",
      "fa": "می‌دوم تا سالم بمانم."
    },
    {
      "de": "Ich erkläre es, damit du es verstehst.",
      "en": "I explain it so that you understand.",
      "fa": "توضیح می‌دهم تا بفهمی."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 96;

-- Day 97
UPDATE lessons SET grammar_note = '{
  "title": "Register (Register): du or Sie in writing",
  "title_fa": "لحن (Register): du یا Sie در نوشتار",
  "explanation": "Pick the register first: Hallo plus du and Liebe Grüße, or Sehr geehrte plus Sie and Mit freundlichen Grüßen. Never mix them.",
  "explanation_fa": "اول لحن را انتخاب کن: Hallo با du و Liebe Grüße، یا Sehr geehrte با Sie و Mit freundlichen Grüßen. هرگز قاطی نکن.",
  "examples": [
    {
      "de": "Hallo Anna, kannst du mir helfen? Liebe Grüße",
      "en": "informal email",
      "fa": "ایمیل خودمانی"
    },
    {
      "de": "Sehr geehrte Frau Weber, könnten Sie ...? Mit freundlichen Grüßen",
      "en": "formal email",
      "fa": "ایمیل رسمی"
    }
  ]
}'::jsonb WHERE day = 97;

-- Day 98
UPDATE lessons SET grammar_note = '{
  "title": "Infinitive with zu: es ist üblich, ... zu",
  "title_fa": "مصدر با zu: es ist üblich, … zu",
  "explanation": "Describe customs with es ist üblich plus a zu-infinitive at the end: Es ist üblich, pünktlich zu sein.",
  "explanation_fa": "برای توصیف رسم‌ها از es ist üblich و مصدر با zu در آخر استفاده کن: Es ist üblich, pünktlich zu sein.",
  "examples": [
    {
      "de": "Es ist üblich, pünktlich zu sein.",
      "en": "It is customary to be on time.",
      "fa": "رسم است که وقت‌شناس باشی."
    },
    {
      "de": "Es ist normal, die Hand zu geben.",
      "en": "It is normal to shake hands.",
      "fa": "عادی است که دست بدهی."
    }
  ],
  "basics_key": "negationImpersonal"
}'::jsonb WHERE day = 98;

-- Day 99
UPDATE lessons SET grammar_note = '{
  "title": "Perfect tense (Perfekt): describing experience",
  "title_fa": "ماضی نقلی (Perfekt): بیان تجربه",
  "explanation": "Summing up what you have achieved uses the perfect: Ich habe viel gelernt. Ich bin sicherer geworden.",
  "explanation_fa": "برای جمع‌بندی دستاوردها از ماضی نقلی استفاده کن: Ich habe viel gelernt. Ich bin sicherer geworden.",
  "examples": [
    {
      "de": "Ich habe viele neue Wörter gelernt.",
      "en": "I have learned many new words.",
      "fa": "کلمه‌های جدید زیادی یاد گرفته‌ام."
    },
    {
      "de": "Ich bin viel sicherer geworden.",
      "en": "I have become much more confident.",
      "fa": "خیلی مطمئن‌تر شده‌ام."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 99;

-- Day 100
UPDATE lessons SET grammar_note = '{
  "title": "Future (Futur I) and Konjunktiv II: plans and wishes",
  "title_fa": "آینده (Futur I) و وجه شرطی: برنامه و آرزو",
  "explanation": "Combine Futur I for plans with Konjunktiv II for hopes: Ich werde weiterlernen. Ich würde gern die B1-Prüfung machen.",
  "explanation_fa": "برای برنامه‌ها Futur I و برای آرزوها Konjunktiv II را ترکیب کن: Ich werde weiterlernen. Ich würde gern die B1-Prüfung machen.",
  "examples": [
    {
      "de": "Ich werde weiter Deutsch lernen.",
      "en": "I will keep learning German.",
      "fa": "به یادگیری آلمانی ادامه خواهم داد."
    },
    {
      "de": "Ich würde gern die B1-Prüfung machen.",
      "en": "I would like to take the B1 exam.",
      "fa": "دوست دارم آزمون B1 بدهم."
    }
  ],
  "basics_key": "verbTenses"
}'::jsonb WHERE day = 100;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect 100 rows with a note, and no day left empty:
--   SELECT count(*) FROM lessons WHERE grammar_note IS NOT NULL;
--   SELECT day FROM lessons WHERE grammar_note IS NULL ORDER BY day;
