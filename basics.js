// =====================================================================
// German Basics — Single Source of Truth
// Shared vocabulary data, rendering, and TTS for basics.html + category.html
// =====================================================================

// =====================
// VOCABULARY DATA
// =====================

const basicsData = {
    pronounsAndSein: {
        icon: "👤",
        title: { en: "Pronouns, Possessives & Verb: Sein", fa: "ضمایر، ملکی و فعل بودن" },
        description: { en: "Personal/object pronouns, possessives & to be", fa: "ضمایر شخصی/مفعولی، ملکی و فعل بودن" },
        type: "multi",
        sections: [
            {
                heading: { en: "Personal Pronouns", fa: "ضمایر شخصی" },
                type: "table",
                words: [
                    { german: "ich", en: "I", fa: "من", example: "Ich bin hier.", exampleEn: "I am here.", exampleFa: "من اینجا هستم." },
                    { german: "du", en: "you (informal)", fa: "تو", example: "Du bist nett.", exampleEn: "You are nice.", exampleFa: "تو مهربانی." },
                    { german: "er", en: "he", fa: "او (مذکر)", example: "Er ist groß.", exampleEn: "He is tall.", exampleFa: "او قد بلند است." },
                    { german: "sie", en: "she", fa: "او (مؤنث)", example: "Sie ist schön.", exampleEn: "She is beautiful.", exampleFa: "او زیباست." },
                    { german: "es", en: "it", fa: "آن", example: "Es ist kalt.", exampleEn: "It is cold.", exampleFa: "هوا سرد است." },
                    { german: "wir", en: "we", fa: "ما", example: "Wir sind Freunde.", exampleEn: "We are friends.", exampleFa: "ما دوست هستیم." },
                    { german: "ihr", en: "you (plural)", fa: "شما (جمع)", example: "Ihr seid toll.", exampleEn: "You are great.", exampleFa: "شما عالی هستید." },
                    { german: "sie", en: "they", fa: "آنها", example: "Sie sind hier.", exampleEn: "They are here.", exampleFa: "آنها اینجا هستند." },
                    { german: "Sie", en: "you (formal)", fa: "شما (رسمی)", example: "Sind Sie Herr Müller?", exampleEn: "Are you Mr. Müller?", exampleFa: "شما آقای مولر هستید؟" }
                ]
            },
            {
                heading: { en: "Object Pronouns & Possessives", fa: "ضمایر مفعولی و ملکی" },
                type: "table",
                words: [
                    { german: "mich", en: "me (accusative)", fa: "مرا", example: "Das Geschenk ist für mich.", exampleEn: "The gift is for me.", exampleFa: "هدیه برای من است." },
                    { german: "dich", en: "you (accusative)", fa: "تو را", example: "Der Brief ist für dich.", exampleEn: "The letter is for you.", exampleFa: "نامه برای توست." },
                    { german: "ihn", en: "him", fa: "او را", example: "Ich nehme ihn ins Kino mit.", exampleEn: "I'm taking him to the cinema.", exampleFa: "او را به سینما می‌برم." },
                    { german: "uns", en: "us", fa: "ما را", example: "Sie sahen uns aus der Ferne.", exampleEn: "They saw us from afar.", exampleFa: "آنها ما را از دور دیدند." },
                    { german: "mir", en: "me (dative)", fa: "به من", example: "Es ist ein Geschenk von mir.", exampleEn: "It is a gift from me.", exampleFa: "این هدیه‌ای از طرف من است." },
                    { german: "sich", en: "oneself/themselves", fa: "خود", example: "Meine Tochter zieht sich an.", exampleEn: "My daughter gets dressed.", exampleFa: "دخترم لباس می‌پوشد." },
                    { german: "mein", en: "my (masc/neut)", fa: "مال من", example: "Es ist mein Hut.", exampleEn: "It is my hat.", exampleFa: "این کلاه من است." },
                    { german: "meine", en: "my (fem/pl)", fa: "مال من", example: "Meine Familie ist toll.", exampleEn: "My family is great.", exampleFa: "خانواده من عالی است." },
                    { german: "dein", en: "your (masc/neut)", fa: "مال تو", example: "Dein Hund ist sehr klug.", exampleEn: "Your dog is very smart.", exampleFa: "سگ تو خیلی باهوش است." },
                    { german: "deine", en: "your (fem/pl)", fa: "مال تو", example: "Deine Schwester ist nett.", exampleEn: "Your sister is nice.", exampleFa: "خواهرت مهربان است." }
                ]
            },
            {
                heading: { en: "Verb: Sein (To Be)", fa: "فعل بودن" },
                type: "conjugation",
                infinitive: { german: "sein", en: "to be", fa: "بودن" },
                tenses: [
                    {
                        name: { en: "Present (Präsens)", fa: "حال (Präsens)" },
                        forms: [
                            { pronoun: "ich", verb: "bin", en: "I am", fa: "من هستم", example: "Ich bin Deutschlehrer.", exampleEn: "I am a German teacher.", exampleFa: "من معلم آلمانی هستم." },
                            { pronoun: "du", verb: "bist", en: "you are", fa: "تو هستی", example: "Du bist eine ruhige Person.", exampleEn: "You are a quiet person.", exampleFa: "تو آدم آرامی هستی." },
                            { pronoun: "er/sie/es", verb: "ist", en: "he/she/it is", fa: "او/آن هست", example: "Er ist groß.", exampleEn: "He is tall.", exampleFa: "او قد بلند است." },
                            { pronoun: "wir", verb: "sind", en: "we are", fa: "ما هستیم", example: "Wir sind Brüder.", exampleEn: "We are brothers.", exampleFa: "ما برادر هستیم." },
                            { pronoun: "ihr", verb: "seid", en: "you are", fa: "شما هستید", example: "Ihr seid toll.", exampleEn: "You are great.", exampleFa: "شما عالی هستید." },
                            { pronoun: "sie/Sie", verb: "sind", en: "they/you are", fa: "آنها/شما هستند", example: "Sie sind hier.", exampleEn: "They are here.", exampleFa: "آنها اینجا هستند." }
                        ]
                    },
                    {
                        name: { en: "Simple Past (Präteritum)", fa: "گذشته ساده (Präteritum)" },
                        forms: [
                            { pronoun: "ich", verb: "war", en: "I was", fa: "من بودم", example: "Ich war müde.", exampleEn: "I was tired.", exampleFa: "من خسته بودم." },
                            { pronoun: "du", verb: "warst", en: "you were", fa: "تو بودی", example: "Du warst sehr nett.", exampleEn: "You were very nice.", exampleFa: "تو خیلی مهربان بودی." },
                            { pronoun: "er/sie/es", verb: "war", en: "he/she/it was", fa: "او/آن بود", example: "Es war kalt.", exampleEn: "It was cold.", exampleFa: "هوا سرد بود." },
                            { pronoun: "wir", verb: "waren", en: "we were", fa: "ما بودیم", example: "Wir waren in Berlin.", exampleEn: "We were in Berlin.", exampleFa: "ما در برلین بودیم." },
                            { pronoun: "ihr", verb: "wart", en: "you were", fa: "شما بودید", example: "Ihr wart toll.", exampleEn: "You were great.", exampleFa: "شما عالی بودید." },
                            { pronoun: "sie/Sie", verb: "waren", en: "they/you were", fa: "آنها/شما بودند", example: "Sie waren Freunde.", exampleEn: "They were friends.", exampleFa: "آنها دوست بودند." }
                        ]
                    },
                    {
                        name: { en: "Present Perfect (Perfekt)", fa: "ماضی نقلی (Perfekt)" },
                        forms: [
                            { pronoun: "ich", verb: "bin gewesen", en: "I have been", fa: "من بوده‌ام", example: "Ich bin in Paris gewesen.", exampleEn: "I have been to Paris.", exampleFa: "من در پاریس بوده‌ام." },
                            { pronoun: "du", verb: "bist gewesen", en: "you have been", fa: "تو بوده‌ای", example: "Du bist dort gewesen.", exampleEn: "You have been there.", exampleFa: "تو آنجا بوده‌ای." },
                            { pronoun: "er/sie/es", verb: "ist gewesen", en: "he/she/it has been", fa: "او بوده است", example: "Es ist schön gewesen.", exampleEn: "It has been nice.", exampleFa: "خوب بوده است." },
                            { pronoun: "wir", verb: "sind gewesen", en: "we have been", fa: "ما بوده‌ایم", example: "Wir sind dort gewesen.", exampleEn: "We have been there.", exampleFa: "ما آنجا بوده‌ایم." },
                            { pronoun: "ihr", verb: "seid gewesen", en: "you have been", fa: "شما بوده‌اید", example: "Ihr seid da gewesen.", exampleEn: "You have been there.", exampleFa: "شما آنجا بوده‌اید." },
                            { pronoun: "sie/Sie", verb: "sind gewesen", en: "they/you have been", fa: "آنها بوده‌اند", example: "Sie sind krank gewesen.", exampleEn: "They have been sick.", exampleFa: "آنها مریض بوده‌اند." }
                        ]
                    }
                ]
            }
        ]
    },
    articles: {
        icon: "📝",
        title: { en: "Articles", fa: "حروف تعریف" },
        description: { en: "German has 3 genders - learn the articles!", fa: "آلمانی ۳ جنسیت دارد - حروف تعریف را یاد بگیرید!" },
        type: "grid",
        words: [
            { german: "der", en: "the (masculine)", fa: "این (مذکر)", example: "Der Mann ist groß.", exampleEn: "The man is tall.", exampleFa: "مرد قد بلند است." },
            { german: "die", en: "the (feminine)", fa: "این (مؤنث)", example: "Die Frau liest ein Buch.", exampleEn: "The woman reads a book.", exampleFa: "زن یک کتاب می‌خواند." },
            { german: "das", en: "the (neuter)", fa: "این (خنثی)", example: "Das Kind spielt draußen.", exampleEn: "The child plays outside.", exampleFa: "بچه بیرون بازی می‌کند." },
            { german: "ein", en: "a/an (masc/neut)", fa: "یک (مذکر/خنثی)", example: "Ich lese ein Buch.", exampleEn: "I am reading a book.", exampleFa: "من یک کتاب می‌خوانم." },
            { german: "eine", en: "a/an (feminine)", fa: "یک (مؤنث)", example: "Das ist eine schöne Blume.", exampleEn: "That is a beautiful flower.", exampleFa: "آن یک گل زیباست." }
        ]
    },
    conjunctions: {
        icon: "🔗",
        title: { en: "Conjunctions", fa: "حروف ربط" },
        description: { en: "Connect words, phrases, and clauses", fa: "کلمات، عبارات و جملات را به هم وصل می‌کنند" },
        type: "grid",
        words: [
            { german: "und", en: "and", fa: "و", example: "Ich und du.", exampleEn: "Me and you.", exampleFa: "من و تو." },
            { german: "oder", en: "or", fa: "یا", example: "Ja oder nein?", exampleEn: "Yes or no?", exampleFa: "بله یا نه؟" },
            { german: "aber", en: "but", fa: "اما", example: "Klein, aber fein.", exampleEn: "Small but fine.", exampleFa: "کوچک، اما خوب." },
            { german: "denn", en: "because/for", fa: "زیرا", example: "Ich bleibe, denn es regnet.", exampleEn: "I stay because it's raining.", exampleFa: "می‌مانم زیرا باران می‌بارد." },
            { german: "sondern", en: "but rather", fa: "بلکه", example: "Nicht ich, sondern er.", exampleEn: "Not me, but him.", exampleFa: "نه من، بلکه او." },
            { german: "doch", en: "however/yet", fa: "با این حال", example: "Es ist teuer, doch gut.", exampleEn: "It's expensive, yet good.", exampleFa: "گران است، با این حال خوب است." },
            { german: "also", en: "so/therefore", fa: "پس/بنابراین", example: "Also gut!", exampleEn: "Alright then!", exampleFa: "خب باشه!" },
            { german: "sowohl...als auch", en: "both...and", fa: "هم...هم", example: "Sowohl Deutsch als auch Englisch.", exampleEn: "Both German and English.", exampleFa: "هم آلمانی هم انگلیسی." },
            { german: "entweder...oder", en: "either...or", fa: "یا...یا", example: "Entweder heute oder morgen.", exampleEn: "Either today or tomorrow.", exampleFa: "یا امروز یا فردا." },
            { german: "weder...noch", en: "neither...nor", fa: "نه...نه", example: "Weder hier noch dort.", exampleEn: "Neither here nor there.", exampleFa: "نه اینجا نه آنجا." },
            { german: "nicht nur...sondern auch", en: "not only...but also", fa: "نه تنها...بلکه", example: "Nicht nur schön, sondern auch klug.", exampleEn: "Not only beautiful but also smart.", exampleFa: "نه تنها زیبا، بلکه باهوش هم." },
            { german: "deshalb", en: "therefore", fa: "به همین دلیل", example: "Deshalb bin ich hier.", exampleEn: "That's why I'm here.", exampleFa: "به همین دلیل من اینجا هستم." }
        ]
    },
    numbers: {
        icon: "🔢",
        title: { en: "Numbers 1-20", fa: "اعداد ۱ تا ۲۰" },
        description: { en: "Learn to count in German", fa: "شمردن به آلمانی را یاد بگیرید" },
        type: "grid",
        words: [
            { german: "eins", en: "1", fa: "۱", example: "Ich habe eins.", exampleEn: "I have one.", exampleFa: "من یکی دارم." },
            { german: "zwei", en: "2", fa: "۲", example: "Ich habe zwei Hunde.", exampleEn: "I have two dogs.", exampleFa: "من دو سگ دارم." },
            { german: "drei", en: "3", fa: "۳", example: "Drei Kinder spielen.", exampleEn: "Three children are playing.", exampleFa: "سه بچه بازی می‌کنند." },
            { german: "vier", en: "4", fa: "۴", example: "Ein Tisch hat vier Beine.", exampleEn: "A table has four legs.", exampleFa: "یک میز چهار پایه دارد." },
            { german: "fünf", en: "5", fa: "۵", example: "Fünf Finger an einer Hand.", exampleEn: "Five fingers on a hand.", exampleFa: "پنج انگشت در یک دست." },
            { german: "sechs", en: "6", fa: "۶", example: "Es ist sechs Uhr.", exampleEn: "It is six o'clock.", exampleFa: "ساعت شش است." },
            { german: "sieben", en: "7", fa: "۷", example: "Die Woche hat sieben Tage.", exampleEn: "A week has seven days.", exampleFa: "یک هفته هفت روز دارد." },
            { german: "acht", en: "8", fa: "۸", example: "Ich arbeite acht Stunden.", exampleEn: "I work eight hours.", exampleFa: "من هشت ساعت کار می‌کنم." },
            { german: "neun", en: "9", fa: "۹", example: "Der Kurs beginnt um neun.", exampleEn: "The course starts at nine.", exampleFa: "دوره ساعت نه شروع می‌شود." },
            { german: "zehn", en: "10", fa: "۱۰", example: "Ich zähle bis zehn.", exampleEn: "I count to ten.", exampleFa: "من تا ده می‌شمارم." },
            { german: "elf", en: "11", fa: "۱۱", example: "Ein Team hat elf Spieler.", exampleEn: "A team has eleven players.", exampleFa: "یک تیم یازده بازیکن دارد." },
            { german: "zwölf", en: "12", fa: "۱۲", example: "Ein Jahr hat zwölf Monate.", exampleEn: "A year has twelve months.", exampleFa: "یک سال دوازده ماه دارد." },
            { german: "dreizehn", en: "13", fa: "۱۳", example: "Er ist dreizehn Jahre alt.", exampleEn: "He is thirteen years old.", exampleFa: "او سیزده ساله است." },
            { german: "vierzehn", en: "14", fa: "۱۴", example: "In vierzehn Tagen.", exampleEn: "In fourteen days.", exampleFa: "در چهارده روز." },
            { german: "fünfzehn", en: "15", fa: "۱۵", example: "Der Bus kommt in fünfzehn Minuten.", exampleEn: "The bus comes in fifteen minutes.", exampleFa: "اتوبوس در پانزده دقیقه می‌آید." },
            { german: "sechzehn", en: "16", fa: "۱۶", example: "Sie ist sechzehn.", exampleEn: "She is sixteen.", exampleFa: "او شانزده ساله است." },
            { german: "siebzehn", en: "17", fa: "۱۷", example: "Siebzehn Schüler in der Klasse.", exampleEn: "Seventeen students in the class.", exampleFa: "هفده دانش‌آموز در کلاس." },
            { german: "achtzehn", en: "18", fa: "۱۸", example: "Mit achtzehn ist man erwachsen.", exampleEn: "At eighteen you are an adult.", exampleFa: "در هجده سالگی بزرگسال هستید." },
            { german: "neunzehn", en: "19", fa: "۱۹", example: "Neunzehn Euro bitte.", exampleEn: "Nineteen euros please.", exampleFa: "نوزده یورو لطفاً." },
            { german: "zwanzig", en: "20", fa: "۲۰", example: "Er ist zwanzig Jahre alt.", exampleEn: "He is twenty years old.", exampleFa: "او بیست ساله است." }
        ]
    },
    colors: {
        icon: "🎨",
        title: { en: "Colors", fa: "رنگ‌ها" },
        description: { en: "Basic colors in German", fa: "رنگ‌های پایه به آلمانی" },
        type: "grid",
        words: [
            { german: "rot", en: "red", fa: "قرمز", example: "Die Rose ist rot.", exampleEn: "The rose is red.", exampleFa: "گل رز قرمز است." },
            { german: "blau", en: "blue", fa: "آبی", example: "Der Himmel ist blau.", exampleEn: "The sky is blue.", exampleFa: "آسمان آبی است." },
            { german: "grün", en: "green", fa: "سبز", example: "Das Gras ist grün.", exampleEn: "The grass is green.", exampleFa: "چمن سبز است." },
            { german: "gelb", en: "yellow", fa: "زرد", example: "Die Sonne ist gelb.", exampleEn: "The sun is yellow.", exampleFa: "خورشید زرد است." },
            { german: "orange", en: "orange", fa: "نارنجی", example: "Die Orange ist orange.", exampleEn: "The orange is orange.", exampleFa: "پرتقال نارنجی است." },
            { german: "lila", en: "purple", fa: "بنفش", example: "Ihre Bluse ist lila.", exampleEn: "Her blouse is purple.", exampleFa: "بلوز او بنفش است." },
            { german: "rosa", en: "pink", fa: "صورتی", example: "Das Baby trägt rosa.", exampleEn: "The baby wears pink.", exampleFa: "نوزاد صورتی پوشیده." },
            { german: "schwarz", en: "black", fa: "سیاه", example: "Die Katze ist schwarz.", exampleEn: "The cat is black.", exampleFa: "گربه سیاه است." },
            { german: "weiß", en: "white", fa: "سفید", example: "Der Schnee ist weiß.", exampleEn: "The snow is white.", exampleFa: "برف سفید است." },
            { german: "grau", en: "gray", fa: "خاکستری", example: "Der Elefant ist grau.", exampleEn: "The elephant is gray.", exampleFa: "فیل خاکستری است." },
            { german: "braun", en: "brown", fa: "قهوه‌ای", example: "Der Bär ist braun.", exampleEn: "The bear is brown.", exampleFa: "خرس قهوه‌ای است." }
        ]
    },
    days: {
        icon: "📅",
        title: { en: "Days of the Week", fa: "روزهای هفته" },
        description: { en: "Monday to Sunday", fa: "دوشنبه تا یکشنبه" },
        type: "grid",
        words: [
            { german: "Montag", en: "Monday", fa: "دوشنبه", example: "Am Montag gehe ich arbeiten.", exampleEn: "On Monday I go to work.", exampleFa: "دوشنبه من سر کار می‌روم." },
            { german: "Dienstag", en: "Tuesday", fa: "سه‌شنبه", example: "Dienstag habe ich Deutschkurs.", exampleEn: "On Tuesday I have German class.", exampleFa: "سه‌شنبه کلاس آلمانی دارم." },
            { german: "Mittwoch", en: "Wednesday", fa: "چهارشنبه", example: "Mittwoch ist die Mitte der Woche.", exampleEn: "Wednesday is the middle of the week.", exampleFa: "چهارشنبه وسط هفته است." },
            { german: "Donnerstag", en: "Thursday", fa: "پنج‌شنبه", example: "Am Donnerstag gehen wir einkaufen.", exampleEn: "On Thursday we go shopping.", exampleFa: "پنج‌شنبه خرید می‌رویم." },
            { german: "Freitag", en: "Friday", fa: "جمعه", example: "Freitag ist mein Lieblingstag.", exampleEn: "Friday is my favorite day.", exampleFa: "جمعه روز مورد علاقه من است." },
            { german: "Samstag", en: "Saturday", fa: "شنبه", example: "Am Samstag schlafe ich lange.", exampleEn: "On Saturday I sleep in.", exampleFa: "شنبه زیاد می‌خوابم." },
            { german: "Sonntag", en: "Sunday", fa: "یکشنبه", example: "Sonntag ist Ruhetag.", exampleEn: "Sunday is a rest day.", exampleFa: "یکشنبه روز استراحت است." }
        ]
    },
    months: {
        icon: "🗓️",
        title: { en: "Months", fa: "ماه‌ها" },
        description: { en: "January to December", fa: "ژانویه تا دسامبر" },
        type: "grid",
        words: [
            { german: "Januar", en: "January", fa: "ژانویه", example: "Im Januar schneit es oft.", exampleEn: "It often snows in January.", exampleFa: "در ژانویه اغلب برف می‌بارد." },
            { german: "Februar", en: "February", fa: "فوریه", example: "Februar ist kurz.", exampleEn: "February is short.", exampleFa: "فوریه کوتاه است." },
            { german: "März", en: "March", fa: "مارس", example: "Im März wird es wärmer.", exampleEn: "It gets warmer in March.", exampleFa: "در مارس هوا گرم‌تر می‌شود." },
            { german: "April", en: "April", fa: "آوریل", example: "April macht was er will.", exampleEn: "April does what it wants.", exampleFa: "آوریل هر کاری دلش بخواهد می‌کند." },
            { german: "Mai", en: "May", fa: "مه", example: "Im Mai blühen die Blumen.", exampleEn: "Flowers bloom in May.", exampleFa: "در ماه مه گل‌ها شکوفا می‌شوند." },
            { german: "Juni", en: "June", fa: "ژوئن", example: "Im Juni beginnt der Sommer.", exampleEn: "Summer starts in June.", exampleFa: "در ژوئن تابستان شروع می‌شود." },
            { german: "Juli", en: "July", fa: "ژوئیه", example: "Juli ist sehr heiß.", exampleEn: "July is very hot.", exampleFa: "ژوئیه خیلی گرم است." },
            { german: "August", en: "August", fa: "اوت", example: "Im August machen wir Urlaub.", exampleEn: "In August we go on vacation.", exampleFa: "در اوت به تعطیلات می‌رویم." },
            { german: "September", en: "September", fa: "سپتامبر", example: "Die Schule beginnt im September.", exampleEn: "School starts in September.", exampleFa: "مدرسه در سپتامبر شروع می‌شود." },
            { german: "Oktober", en: "October", fa: "اکتبر", example: "Im Oktober fallen die Blätter.", exampleEn: "Leaves fall in October.", exampleFa: "در اکتبر برگ‌ها می‌ریزند." },
            { german: "November", en: "November", fa: "نوامبر", example: "November ist oft neblig.", exampleEn: "November is often foggy.", exampleFa: "نوامبر اغلب مه‌آلود است." },
            { german: "Dezember", en: "December", fa: "دسامبر", example: "Im Dezember feiern wir Weihnachten.", exampleEn: "In December we celebrate Christmas.", exampleFa: "در دسامبر کریسمس را جشن می‌گیریم." }
        ]
    },
    prepositions: {
        icon: "📍",
        title: { en: "Prepositions", fa: "حروف اضافه" },
        description: { en: "Words describing relationships in space, time, and logic", fa: "کلماتی که رابطه مکان، زمان و منطق را توصیف می‌کنند" },
        type: "grid",
        words: [
            { german: "für", en: "for", fa: "برای", example: "Das ist für dich.", exampleEn: "This is for you.", exampleFa: "این برای توست." },
            { german: "bis", en: "until", fa: "تا", example: "Ich arbeite bis acht Uhr.", exampleEn: "I work until eight o'clock.", exampleFa: "من تا ساعت هشت کار می‌کنم." },
            { german: "in", en: "in", fa: "در", example: "Ich komme in zwei Stunden zurück.", exampleEn: "I'll be back in two hours.", exampleFa: "دو ساعت دیگر برمی‌گردم." },
            { german: "aus", en: "from/out of", fa: "از", example: "Ich komme aus Berlin.", exampleEn: "I come from Berlin.", exampleFa: "من اهل برلین هستم." },
            { german: "mit", en: "with", fa: "با", example: "Sie spielen mit einem Hund.", exampleEn: "They play with a dog.", exampleFa: "آنها با یک سگ بازی می‌کنند." },
            { german: "nach", en: "to/after", fa: "به/بعد از", example: "Ich fahre nach Genf.", exampleEn: "I'm going to Geneva.", exampleFa: "من به ژنو می‌روم." },
            { german: "auf", en: "on", fa: "روی", example: "Das Buch liegt auf dem Tisch.", exampleEn: "The book is on the table.", exampleFa: "کتاب روی میز است." },
            { german: "über", en: "over/about", fa: "بالای/درباره", example: "Das Flugzeug fliegt über den Berg.", exampleEn: "The plane flies over the mountain.", exampleFa: "هواپیما از بالای کوه پرواز می‌کند." },
            { german: "dann", en: "then", fa: "سپس", example: "Ich gehe dann mal los.", exampleEn: "I'll get going then.", exampleFa: "پس من دیگر می‌روم." },
            { german: "vielleicht", en: "maybe", fa: "شاید", example: "Vielleicht komme ich morgen.", exampleEn: "Maybe I'll come tomorrow.", exampleFa: "شاید فردا بیایم." },
            { german: "auch", en: "also/too", fa: "همچنین", example: "Er hat auch viel Talent.", exampleEn: "He also has a lot of talent.", exampleFa: "او همچنین استعداد زیادی دارد." },
            { german: "nicht", en: "not", fa: "نه/نیست", example: "Mein Name ist nicht Hendrik.", exampleEn: "My name is not Hendrik.", exampleFa: "اسم من هندریک نیست." }
        ]
    }
};


// =====================
// HELPER: Count words in a category (for card listing)
// =====================

function basicsWordCount(cat) {
    if (!cat) return 0;
    if (cat.words) return cat.words.length;
    if (cat.type === 'multi' && cat.sections) {
        let count = 0;
        for (const s of cat.sections) {
            if (s.words) count += s.words.length;
            if (s.type === 'conjugation' && s.tenses) {
                for (const t of s.tenses) count += t.forms.length;
            }
        }
        return count;
    }
    return 0;
}


// =====================
// RENDERING FUNCTIONS (used by category.html)
// =====================

function basicsRenderMultiSection(cat, currentLang) {
    return cat.sections.map(section => {
        const heading = section.heading[currentLang] || section.heading.en;
        let content = '';
        if (section.type === 'conjugation') {
            content = basicsRenderConjugation(section, currentLang);
        } else if (section.type === 'table') {
            content = basicsRenderPronounTable(section.words, currentLang);
        } else {
            content = basicsRenderWordGrid(section.words, currentLang);
        }
        return `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2ecc71; font-size: 1.2rem; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">${heading}</h3>
                ${content}
            </div>
        `;
    }).join('');
}

function basicsRenderWordGrid(words, currentLang) {
    const items = words.map(word => {
        const translation = currentLang === 'fa' ? word.fa : word.en;
        const escapedGerman = word.german.replace(/'/g, "\\'");
        const escapedExample = word.example ? word.example.replace(/'/g, "\\'") : '';

        let exampleHtml = '';
        if (word.example) {
            const exampleTranslation = currentLang === 'fa'
                ? (word.exampleFa || '')
                : (word.exampleEn || '');
            exampleHtml = `
                <div class="word-example" tabindex="0" role="button" aria-label="Example: ${word.example}"
                    onclick="event.stopPropagation(); playExample('${escapedExample}')"
                    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();playExample('${escapedExample}')}">
                    ${word.example} <span class="example-speaker" aria-hidden="true">🔊</span>
                    ${exampleTranslation ? `<div class="example-translation">${exampleTranslation}</div>` : ''}
                </div>`;
        }

        return `
            <div class="word-card" tabindex="0" role="button" aria-label="${word.german} - ${translation}"
                onclick="playWord('${escapedGerman}')"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();playWord('${escapedGerman}')}">
                <div class="word-german">${word.german}</div>
                <div class="word-translation">${translation}</div>
                ${exampleHtml}
                <div class="play-icon" aria-hidden="true">🔊</div>
            </div>
        `;
    }).join('');

    return `<div class="word-grid">${items}</div>`;
}

function basicsRenderPronounTable(words, currentLang) {
    const rows = words.map(word => {
        const meaning = currentLang === 'fa' ? word.fa : word.en;
        const escapedGerman = word.german.replace(/'/g, "\\'");
        const escapedExample = word.example ? word.example.replace(/'/g, "\\'") : '';
        const exampleTranslation = currentLang === 'fa'
            ? (word.exampleFa || '')
            : (word.exampleEn || '');
        return `
            <div class="pronoun-row" tabindex="0" role="button" aria-label="${word.german} - ${meaning}"
                onclick="playWord('${escapedGerman}')"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();playWord('${escapedGerman}')}">
                <div class="pronoun-german">${word.german}</div>
                <div class="pronoun-meaning">${meaning}</div>
                <div class="pronoun-example" tabindex="0" role="button" aria-label="Example: ${word.example}"
                    onclick="event.stopPropagation(); playExample('${escapedExample}')"
                    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();playExample('${escapedExample}')}">
                    ${word.example} <span aria-hidden="true">🔊</span>
                    ${exampleTranslation ? `<div class="example-translation">${exampleTranslation}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="pronoun-grid">${rows}</div>`;
}

function basicsRenderConjugation(cat, currentLang) {
    const inf = cat.infinitive;
    const infMeaning = currentLang === 'fa' ? inf.fa : inf.en;
    const escapedInf = inf.german.replace(/'/g, "\\'");

    const hPronoun = currentLang === 'fa' ? 'ضمیر' : 'Pronoun';
    const hVerb    = currentLang === 'fa' ? 'فعل' : 'Verb';
    const hMeaning = currentLang === 'fa' ? 'معنی' : 'Meaning';
    const hExample = currentLang === 'fa' ? 'مثال' : 'Example';

    let html = `
        <div class="verb-infinitive-banner" tabindex="0" role="button" aria-label="${inf.german} - ${infMeaning}"
            onclick="playWord('${escapedInf}')"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();playWord('${escapedInf}')}">
            <div>
                <span class="verb-main">${inf.german}</span>
                <span class="verb-meaning">— ${infMeaning}</span>
            </div>
            <span class="verb-play" aria-hidden="true">🔊</span>
        </div>
    `;

    cat.tenses.forEach(tense => {
        const tenseName = tense.name[currentLang] || tense.name.en;
        html += `
            <div class="conjugation-section">
                <h3>${tenseName}</h3>
                <table class="conjugation-table">
                    <thead>
                        <tr>
                            <th>${hPronoun}</th>
                            <th>${hVerb}</th>
                            <th>${hMeaning}</th>
                            <th class="example-cell">${hExample}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tense.forms.forEach(form => {
            const meaning = currentLang === 'fa' ? form.fa : form.en;
            const fullVerb = `${form.pronoun} ${form.verb}`;
            const escapedVerb = fullVerb.replace(/'/g, "\\'");
            const escapedExample = form.example ? form.example.replace(/'/g, "\\'") : '';
            const exampleTranslation = currentLang === 'fa'
                ? (form.exampleFa || '')
                : (form.exampleEn || '');

            html += `
                <tr tabindex="0" aria-label="${form.pronoun} ${form.verb} - ${meaning}"
                    onclick="playWord('${escapedVerb}')"
                    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();playWord('${escapedVerb}')}">
                    <td class="pronoun-cell">${form.pronoun}</td>
                    <td class="verb-cell">${form.verb}</td>
                    <td class="meaning-cell">${meaning}</td>
                    <td class="example-cell" tabindex="0" role="button" aria-label="Example: ${form.example || ''}"
                        onclick="event.stopPropagation(); playExample('${escapedExample}')"
                        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();playExample('${escapedExample}')}">
                        <div>${form.example || ''}</div>
                        ${exampleTranslation ? `<div class="example-cell-translation">${exampleTranslation}</div>` : ''}
                    </td>
                    <td class="play-cell" aria-hidden="true">🔊</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    return html;
}


// =====================
// AUDIO — Vercel /api/tts proxy (same-origin, works on all devices)
// Falls back to browser speechSynthesis if proxy fails
// =====================

const _basics_isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function stopAllAudio() {
    window.speechSynthesis.cancel();
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.removeAttribute('src');
        window.currentAudio.load();
        window.currentAudio = null;
    }
}

function _browserTTS(text, lang, rate) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        const r = rate || window._basicsVoiceSpeed || 1.0;
        u.rate = (isFinite(r) && r > 0) ? r : 1.0;
        u.onend = resolve;
        u.onerror = () => resolve();
        if (_basics_isMobile) {
            const timer = setInterval(() => {
                if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) window.speechSynthesis.resume();
            }, 5000);
            const cleanup = () => clearInterval(timer);
            u.onend = () => { cleanup(); resolve(); };
            u.onerror = () => { cleanup(); resolve(); };
        }
        window.speechSynthesis.speak(u);
    });
}

function playTTS(text, lang) {
    const shortLang = lang.split('-')[0];
    const url = `/api/tts?q=${encodeURIComponent(text)}&tl=${shortLang}`;
    return new Promise((resolve) => {
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio = null;
        }
        let fellBack = false;
        const fallback = () => {
            if (fellBack) return;
            fellBack = true;
            console.warn('TTS proxy failed, using browser speech');
            _browserTTS(text, lang, window._basicsVoiceSpeed).then(resolve);
        };
        const audio = new Audio(url);
        window.currentAudio = audio;
        audio.onerror = fallback;
        const timeout = setTimeout(fallback, 4000);
        audio.onended = () => { clearTimeout(timeout); if (!fellBack) resolve(); };
        audio.play().catch(fallback);
    });
}

function playWord(text) {
    stopAllAudio();
    playTTS(text, 'de-DE');
}

function playExample(text) {
    if (!text) return;
    stopAllAudio();
    playTTS(text, 'de-DE');
}

function playWordAndExample(word, example) {
    stopAllAudio();
    playTTS(word, 'de-DE').then(() => {
        if (example) {
            setTimeout(() => playTTS(example, 'de-DE'), 300);
        }
    });
}

// Make functions globally available
window.stopAllAudio = stopAllAudio;
window.playWord = playWord;
window.playExample = playExample;
window.playWordAndExample = playWordAndExample;

// Voice speed — pages set this after loading preferences
window._basicsVoiceSpeed = 1.0;
