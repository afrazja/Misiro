// Lesson Data - All lessons embedded inline for file:// compatibility.
// Also works when served via HTTP. The loadLesson/loadLessons/loadGlossary
// functions are kept for backward compatibility but resolve immediately.

const dailyLessons = {
    1: {
        title: "Day 1: The Café",
        titleFa: "روز ۱: کافه",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Hallo! Guten Morgen.", translation: "Hello! Good morning.", translationFa: "سلام! صبح بخیر." },
            { id: 2, role: "sent", targetText: "Guten Morgen.", translation: "Good morning.", translationFa: "صبح بخیر." },
            { id: 3, role: "received", audioText: "Möchten Sie einen Kaffee?", translation: "Would you like a coffee?", translationFa: "قهوه میل دارید؟" },
            { id: 4, role: "sent", targetText: "Ja, bitte.", translation: "Yes, please.", translationFa: "بله، لطفاً." },
            { id: 5, role: "received", audioText: "Mit Milch und Zucker?", translation: "With milk and sugar?", translationFa: "با شیر و شکر؟" },
            { id: 6, role: "sent", targetText: "Nur Milch, bitte.", translation: "Only milk, please.", translationFa: "فقط شیر، لطفاً." }
        ]
    },
    2: {
        title: "Day 2: The Weather",
        titleFa: "روز ۲: آب و هوا",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Hallo! Wie geht es Ihnen?", translation: "Hello! How are you?", translationFa: "سلام! حال شما چطوره؟" },
            { id: 2, role: "sent", targetText: "Mir geht es gut, danke.", translation: "I am doing well, thanks.", translationFa: "حالم خوبه، ممنون." },
            { id: 3, role: "received", audioText: "Schönes Wetter heute, oder?", translation: "Nice weather today, right?", translationFa: "هوا امروز خوبه، نه؟" },
            { id: 4, role: "sent", targetText: "Ja, die Sonne scheint.", translation: "Yes, the sun is shining.", translationFa: "بله، آفتاب می‌تابه." },
            { id: 5, role: "received", audioText: "Aber es ist kalt.", translation: "But it is cold.", translationFa: "ولی هوا سرده." },
            { id: 6, role: "sent", targetText: "Stimmt, es ist windig.", translation: "True, it is windy.", translationFa: "درسته، باد میاد." },
            { id: 7, role: "received", audioText: "Haben Sie einen Regenschirm?", translation: "Do you have an umbrella?", translationFa: "چتر دارید؟" },
            { id: 8, role: "sent", targetText: "Nein, ich habe keinen.", translation: "No, I don't have one.", translationFa: "نه، ندارم." }
        ]
    },
    3: {
        title: "Day 3: Asking Directions",
        titleFa: "روز ۳: پرسیدن مسیر",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Entschuldigung, darf ich fragen?", translation: "Excuse me, may I ask?", translationFa: "ببخشید، میتونم بپرسم؟" },
            { id: 2, role: "received", audioText: "Ja, natürlich. Bitte schön.", translation: "Yes, of course. Go ahead.", translationFa: "بله، البته. بفرمایید." },
            { id: 3, role: "sent", targetText: "Wo ist der Bahnhof?", translation: "Where is the train station?", translationFa: "ایستگاه قطار کجاست؟" },
            { id: 4, role: "received", audioText: "Gehen Sie hier geradeaus.", translation: "Go straight ahead here.", translationFa: "از اینجا مستقیم برید." },
            { id: 5, role: "sent", targetText: "Und dann an der Kreuzung?", translation: "And then at the intersection?", translationFa: "و بعد سر چهارراه؟" },
            { id: 6, role: "received", audioText: "Biegen Sie rechts ab.", translation: "Turn right.", translationFa: "بپیچید به راست." },
            { id: 7, role: "sent", targetText: "Ist es weit von hier?", translation: "Is it far from here?", translationFa: "از اینجا دوره؟" },
            { id: 8, role: "received", audioText: "Nein, nur fünf Minuten.", translation: "No, only five minutes.", translationFa: "نه، فقط پنج دقیقه." },
            { id: 9, role: "sent", targetText: "Vielen Dank für Ihre Hilfe.", translation: "Many thanks for your help.", translationFa: "خیلی ممنون از کمکتون." },
            { id: 10, role: "received", audioText: "Gern geschehen. Auf Wiedersehen.", translation: "You're welcome. Goodbye.", translationFa: "خواهش می‌کنم. خداحافظ." }
        ]
    },
    4: {
        title: "Day 4: Self Introduction",
        titleFa: "روز ۴: معرفی خود",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Hallo zusammen!", translation: "Hello everyone!", translationFa: "سلام به همه!" },
            { id: 2, role: "sent", targetText: "Ich möchte mich kurz vorstellen.", translation: "I would like to introduce myself briefly.", translationFa: "می‌خوام خودمو معرفی کنم." },
            { id: 3, role: "sent", targetText: "Mein Name ist Lukas.", translation: "My name is Lukas.", translationFa: "اسم من لوکاس هست." },
            { id: 4, role: "sent", targetText: "Ich bin fünfundzwanzig Jahre alt.", translation: "I am twenty-five years old.", translationFa: "من ۲۵ سالمه." },
            { id: 5, role: "sent", targetText: "Ich komme ursprünglich aus Spanien.", translation: "I am originally from Spain.", translationFa: "من اصالتاً اهل اسپانیا هستم." },
            { id: 6, role: "sent", targetText: "Aber jetzt wohne ich in Berlin.", translation: "But now I live in Berlin.", translationFa: "ولی الان در برلین زندگی می‌کنم." },
            { id: 7, role: "sent", targetText: "Ich arbeite als Softwareentwickler.", translation: "I work as a software developer.", translationFa: "من برنامه‌نویس هستم." },
            { id: 8, role: "sent", targetText: "In meiner Freizeit spiele ich gerne Fußball.", translation: "In my free time, I like playing football.", translationFa: "تو وقت آزادم فوتبال بازی می‌کنم." },
            { id: 9, role: "sent", targetText: "Ich reise auch sehr gerne.", translation: "I also really like to travel.", translationFa: "من همچنین سفر کردن رو دوست دارم." },
            { id: 10, role: "sent", targetText: "Freut mich, Sie kennenzulernen.", translation: "Nice to meet you.", translationFa: "از آشناییتون خوشحالم." }
        ]
    },
    5: {
        title: "Day 5: Asking for Help",
        titleFa: "روز ۵: درخواست کمک",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Entschuldigung, können Sie mir helfen?", translation: "Excuse me, can you help me?", translationFa: "ببخشید، میتونید کمکم کنید؟" },
            { id: 2, role: "received", audioText: "Ja, natürlich. Was ist los?", translation: "Yes, of course. What's wrong?", translationFa: "بله، البته. چی شده؟" },
            { id: 3, role: "sent", targetText: "Ich habe ein Problem.", translation: "I have a problem.", translationFa: "من یک مشکلی دارم." },
            { id: 4, role: "sent", targetText: "Ich verstehe das nicht.", translation: "I don't understand this.", translationFa: "من اینو نمی‌فهمم." },
            { id: 5, role: "received", audioText: "Soll ich es erklären?", translation: "Should I explain it?", translationFa: "می‌خواید توضیح بدم؟" },
            { id: 6, role: "sent", targetText: "Können Sie das bitte wiederholen?", translation: "Can you please repeat that?", translationFa: "میتونید لطفاً تکرار کنید؟" },
            { id: 7, role: "received", audioText: "Kein Problem. Ich sage es nochmal.", translation: "No problem. I'll say it again.", translationFa: "اشکالی نداره. دوباره میگم." },
            { id: 8, role: "sent", targetText: "Vielen Dank für Ihre Hilfe.", translation: "Thank you very much for your help.", translationFa: "خیلی ممنون از کمکتون." },
            { id: 9, role: "received", audioText: "Gern geschehen.", translation: "You're welcome.", translationFa: "خواهش می‌کنم." }
        ]
    },
    6: {
        title: "Day 6: Understanding & Clarifying",
        titleFa: "روز ۶: فهمیدن و شفاف‌سازی",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Was bedeutet das?", translation: "What does this mean?", translationFa: "این یعنی چی؟" },
            { id: 2, role: "received", audioText: "Das bedeutet 'Auto'.", translation: "That means 'car'.", translationFa: "این یعنی 'ماشین'." },
            { id: 3, role: "sent", targetText: "Können Sie bitte langsamer sprechen?", translation: "Can you please speak more slowly?", translationFa: "میتونید لطفاً آروم‌تر صحبت کنید؟" },
            { id: 4, role: "received", audioText: "Ja, ich spreche langsam.", translation: "Yes, I'll speak slowly.", translationFa: "بله، آروم صحبت می‌کنم." },
            { id: 5, role: "sent", targetText: "Ich verstehe.", translation: "I understand.", translationFa: "میتوجه میشم." },
            { id: 6, role: "sent", targetText: "Ich verstehe noch nicht.", translation: "I don't understand yet.", translationFa: "هنوز متوجه نمیشم." },
            { id: 7, role: "received", audioText: "Ist es jetzt klar?", translation: "Is it clear now?", translationFa: "الان روشنه؟" },
            { id: 8, role: "sent", targetText: "Ja, das ist jetzt klar.", translation: "Yes, that is clear now.", translationFa: "بله، الان کاملاً روشنه." }
        ]
    },
    7: {
        title: "Day 7: Problems & Apologies",
        titleFa: "روز ۷: مشکلات و عذرخواهی",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Entschuldigung, ich bin zu spät.", translation: "Sorry, I am late.", translationFa: "ببخشید، من دیر کردم." },
            { id: 2, role: "received", audioText: "Das macht nichts.", translation: "That doesn't matter.", translationFa: "اشکالی نداره." },
            { id: 3, role: "sent", targetText: "Es gibt ein Problem.", translation: "There is a problem.", translationFa: "یک مشکلی هست." },
            { id: 4, role: "sent", targetText: "Etwas ist schiefgelaufen.", translation: "Something went wrong.", translationFa: "یک چیزی اشتباه پیش رفت." },
            { id: 5, role: "sent", targetText: "Es funktioniert nicht.", translation: "It's not working.", translationFa: "کار نمیکنه." },
            { id: 6, role: "received", audioText: "Wir können das reparieren.", translation: "We can fix that.", translationFa: "میتونیم درستش کنیم." },
            { id: 7, role: "sent", targetText: "Es tut mir leid.", translation: "I am sorry.", translationFa: "متأسفم." },
            { id: 8, role: "received", audioText: "Kein Problem.", translation: "No problem.", translationFa: "مشکلی نیست." }
        ]
    },
    8: {
        title: "Day 8: Social Small Talk",
        titleFa: "روز ۸: مکالمه کوتاه دوستانه",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Woher kommen Sie?", translation: "Where are you from?", translationFa: "اهل کجا هستید؟" },
            { id: 2, role: "received", audioText: "Ich komme aus Deutschland.", translation: "I come from Germany.", translationFa: "من اهل آلمان هستم." },
            { id: 3, role: "sent", targetText: "Wie lange bleiben Sie?", translation: "How long are you staying?", translationFa: "چقدر می‌مونید؟" },
            { id: 4, role: "received", audioText: "Nur für zwei Wochen.", translation: "Only for two weeks.", translationFa: "فقط برای دو هفته." },
            { id: 5, role: "sent", targetText: "Gefällt es Ihnen hier?", translation: "Do you like it here?", translationFa: "اینجا رو دوست دارید؟" },
            { id: 6, role: "received", audioText: "Ja, es ist sehr schön.", translation: "Yes, it is very beautiful.", translationFa: "بله، خیلی زیباست." },
            { id: 7, role: "sent", targetText: "Nett, mit Ihnen zu sprechen.", translation: "Nice talking to you.", translationFa: "از صحبت با شما خوشحال شدم." },
            { id: 8, role: "received", audioText: "Bis bald.", translation: "See you soon.", translationFa: "به زودی می‌بینمتون." }
        ]
    },
    9: {
        title: "Day 9: Asking for Opinions",
        titleFa: "روز ۹: پرسیدن نظر",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Was denken Sie?", translation: "What do you think?", translationFa: "نظرتون چیه؟" },
            { id: 2, role: "sent", targetText: "Ich mag es.", translation: "I like it.", translationFa: "دوستش دارم." },
            { id: 3, role: "sent", targetText: "Ich mag es nicht.", translation: "I don't like it.", translationFa: "دوستش ندارم." },
            { id: 4, role: "received", audioText: "Wie findest du das?", translation: "How do you find that?", translationFa: "نظرت راجع به این چیه؟" },
            { id: 5, role: "sent", targetText: "Das ist eine gute Idee.", translation: "That is a good idea.", translationFa: "ایده خوبیه." },
            { id: 6, role: "sent", targetText: "Ich bin mir nicht sicher.", translation: "I am not sure.", translationFa: "مطمئن نیستم." },
            { id: 7, role: "received", audioText: "Das denke ich auch.", translation: "I think so too.", translationFa: "من هم همین فکر رو می‌کنم." }
        ]
    },
    10: {
        title: "Day 10: Making Decisions",
        titleFa: "روز ۱۰: تصمیم‌گیری",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Ich nehme das.", translation: "I'll take that.", translationFa: "من اینو برمیدارم." },
            { id: 2, role: "sent", targetText: "Ich brauche mehr Zeit.", translation: "I need more time.", translationFa: "زمان بیشتری لازم دارم." },
            { id: 3, role: "sent", targetText: "Lass mich nachdenken.", translation: "Let me think.", translationFa: "بذار فکر کنم." },
            { id: 4, role: "sent", targetText: "Ich habe mich entschieden.", translation: "I have decided.", translationFa: "من تصمیمم رو گرفتم." },
            { id: 5, role: "received", audioText: "Bist du sicher?", translation: "Are you sure?", translationFa: "مطمئنی؟" },
            { id: 6, role: "sent", targetText: "Das passt mir.", translation: "That works for me.", translationFa: "برام مناسبه." }
        ]
    },
    11: {
        title: "Day 11: Time & Schedule Changes",
        titleFa: "روز ۱۱: زمان و تغییر برنامه",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Haben Sie heute Zeit?", translation: "Do you have time today?", translationFa: "امروز وقت دارید؟" },
            { id: 2, role: "received", audioText: "Ich bin gerade beschäftigt.", translation: "I am busy right now.", translationFa: "الان سرم شلوغه." },
            { id: 3, role: "sent", targetText: "Können wir das später machen?", translation: "Can we do that later?", translationFa: "میتونیم بعداً انجامش بدیم؟" },
            { id: 4, role: "sent", targetText: "Wann passt es Ihnen?", translation: "When does it suit you?", translationFa: "کی براتون مناسبه؟" },
            { id: 5, role: "sent", targetText: "Lass uns morgen treffen.", translation: "Let's meet tomorrow.", translationFa: "بیاید فردا همدیگه رو ببینیم." },
            { id: 6, role: "received", audioText: "Ja, das geht.", translation: "Yes, that works.", translationFa: "آره، میشه." }
        ]
    },
    12: {
        title: "Day 12: At Home (Daily Life)",
        titleFa: "روز ۱۲: در خانه (روزمره)",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Ich bin zu Hause.", translation: "I am at home.", translationFa: "من خونه‌م." },
            { id: 2, role: "sent", targetText: "Ich bin müde.", translation: "I am tired.", translationFa: "خسته‌م." },
            { id: 3, role: "sent", targetText: "Ich muss mich ausruhen.", translation: "I need to rest.", translationFa: "باید استراحت کنم." },
            { id: 4, role: "sent", targetText: "Lass uns essen.", translation: "Let's eat.", translationFa: "بیاید غذا بخوریم." },
            { id: 5, role: "sent", targetText: "Ich rufe dich später an.", translation: "I'll call you later.", translationFa: "بعداً بهت زنگ می‌زنم." }
        ]
    },
    13: {
        title: "Day 13: At Work (Casual)",
        titleFa: "روز ۱۳: سر کار",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Ich arbeite heute.", translation: "I am working today.", translationFa: "امروز کار می‌کنم." },
            { id: 2, role: "sent", targetText: "Ich habe eine Besprechung.", translation: "I have a meeting.", translationFa: "من جلسه دارم." },
            { id: 3, role: "sent", targetText: "Bitte schicken Sie mir eine E-Mail.", translation: "Please send me an email.", translationFa: "لطفاً برام ایمیل بفرستید." },
            { id: 4, role: "sent", targetText: "Ich mache das heute.", translation: "I'll do that today.", translationFa: "امروز انجامش میدم." },
            { id: 5, role: "sent", targetText: "Ich melde mich bei Ihnen.", translation: "I'll get back to you.", translationFa: "بهتون خبر میدم." }
        ]
    },
    14: {
        title: "Day 14: Health & Feelings",
        titleFa: "روز ۱۴: سلامتی و احساسات",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Ich fühle mich nicht gut.", translation: "I don't feel well.", translationFa: "حالم خوب نیست." },
            { id: 2, role: "sent", targetText: "Ich fühle mich jetzt besser.", translation: "I feel better now.", translationFa: "الان حالم بهتره." },
            { id: 3, role: "sent", targetText: "Ich bin gestresst.", translation: "I am stressed.", translationFa: "استرس دارم." },
            { id: 4, role: "sent", targetText: "Mir geht es gut.", translation: "I am okay.", translationFa: "حالم خوبه." },
            { id: 5, role: "sent", targetText: "Ich brauche eine Pause.", translation: "I need a break.", translationFa: "به استراحت نیاز دارم." }
        ]
    },
    15: {
        title: "Day 15: Money & Payment Issues",
        titleFa: "روز ۱۵: پول و پرداخت",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Wie viel kostet das?", translation: "How much is that?", translationFa: "قیمتش چنده؟" },
            { id: 2, role: "sent", targetText: "Das ist teuer.", translation: "That is expensive.", translationFa: "گرونه." },
            { id: 3, role: "sent", targetText: "Das ist billig.", translation: "That is cheap.", translationFa: "ارزونه." },
            { id: 4, role: "sent", targetText: "Kann ich später bezahlen?", translation: "Can I pay later?", translationFa: "میتونم بعداً پرداخت کنم؟" },
            { id: 5, role: "sent", targetText: "Ich habe kein Bargeld.", translation: "I don't have cash.", translationFa: "پول نقد ندارم." }
        ]
    },
    16: {
        title: "Day 16: Directions (Advanced)",
        titleFa: "روز ۱۶: آدرس‌دهی (پیشرفته)",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Biegen Sie links ab.", translation: "Turn left.", translationFa: "به چپ بپیچید." },
            { id: 2, role: "sent", targetText: "Biegen Sie rechts ab.", translation: "Turn right.", translationFa: "به راست بپیچید." },
            { id: 3, role: "sent", targetText: "Es ist nah.", translation: "It is near.", translationFa: "نزدیکه." },
            { id: 4, role: "sent", targetText: "Es ist weit.", translation: "It is far.", translationFa: "دوره." },
            { id: 5, role: "sent", targetText: "Es ist gegenüber von der Bank.", translation: "It is across from the bank.", translationFa: "ربروی بانکه." },
            { id: 6, role: "sent", targetText: "Es ist neben dem Hotel.", translation: "It is next to the hotel.", translationFa: "کنار هتله." }
        ]
    },
    17: {
        title: "Day 17: Hotel Booking",
        titleFa: "روز ۱۷: رزرو هتل",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, haben Sie ein Zimmer frei?", translation: "Good day, do you have a room free?", translationFa: "روز بخیر، اتاق خالی دارید؟" },
            { id: 2, role: "received", audioText: "Ja, für wie viele Nächte?", translation: "Yes, for how many nights?", translationFa: "بله، برای چند شب؟" },
            { id: 3, role: "sent", targetText: "Für drei Nächte, bitte.", translation: "For three nights, please.", translationFa: "برای سه شب، لطفاً." },
            { id: 4, role: "received", audioText: "Für eine Person oder zwei?", translation: "For one person or two?", translationFa: "برای یک نفر یا دو نفر؟" },
            { id: 5, role: "sent", targetText: "Für zwei Personen.", translation: "For two people.", translationFa: "برای دو نفر." },
            { id: 6, role: "received", audioText: "Das kostet 90 Euro pro Nacht.", translation: "That costs 90 Euro per night.", translationFa: "هر شب ۹۰ یورو هست." },
            { id: 7, role: "sent", targetText: "Ist das Frühstück inklusive?", translation: "Is breakfast included?", translationFa: "صبحانه شامل میشه؟" },
            { id: 8, role: "received", audioText: "Ja. Und wir haben kostenloses WLAN.", translation: "Yes. And we have free Wifi.", translationFa: "بله. و وای‌فای رایگان داریم." },
            { id: 9, role: "sent", targetText: "Super, ich nehme es.", translation: "Great, I'll take it.", translationFa: "عالی، میگیرمش." },
            { id: 10, role: "received", audioText: "Hier ist Ihr Schlüssel. Zimmer 20.", translation: "Here is your key. Room 20.", translationFa: "بفرمایید کلیدتون. اتاق ۲۰." }
        ]
    },
    18: {
        title: "Day 18: At the Restaurant",
        titleFa: "روز ۱۸: رستوران",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Einen Tisch für zwei, bitte.", translation: "A table for two, please.", translationFa: "یک میز برای دو نفر، لطفاً." },
            { id: 2, role: "received", audioText: "Hier ist die Speisekarte.", translation: "Here is the menu.", translationFa: "بفرمایید منو." },
            { id: 3, role: "sent", targetText: "Was empfehlen Sie?", translation: "What do you recommend?", translationFa: "چی پیشنهاد می‌کنید؟" },
            { id: 4, role: "received", audioText: "Die Schnitzel sind sehr gut.", translation: "The schnitzels are very good.", translationFa: "شنیتسل‌ها خیلی خوبن." },
            { id: 5, role: "sent", targetText: "Ich nehme das Schnitzel, bitte.", translation: "I'll take the schnitzel, please.", translationFa: "من شنیتسل میخورم، لطفاً." },
            { id: 6, role: "received", audioText: "Möchten Sie etwas zu trinken?", translation: "Would you like something to drink?", translationFa: "نوشیدنی هم میل دارید؟" },
            { id: 7, role: "sent", targetText: "Ein Glas Wasser, bitte.", translation: "A glass of water, please.", translationFa: "یک لیوان آب، لطفاً." },
            { id: 8, role: "received", audioText: "Guten Appetit!", translation: "Enjoy your meal!", translationFa: "نوش جان!" },
            { id: 9, role: "sent", targetText: "Die Rechnung, bitte.", translation: "The bill, please.", translationFa: "صورتحساب، لطفاً." },
            { id: 10, role: "received", audioText: "Das macht zusammen 25 Euro.", translation: "That comes to 25 Euro total.", translationFa: "جمعاً ۲۵ یورو میشه." }
        ]
    },
    19: {
        title: "Day 19: Shopping for Clothes",
        titleFa: "روز ۱۹: خرید لباس",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Kann ich Ihnen helfen?", translation: "Can I help you?", translationFa: "کمکتون کنم؟" },
            { id: 2, role: "sent", targetText: "Ich suche eine Jacke.", translation: "I'm looking for a jacket.", translationFa: "دنبال یک کاپشن می‌گردم." },
            { id: 3, role: "received", audioText: "Welche Größe brauchen Sie?", translation: "What size do you need?", translationFa: "چه سایزی لازم دارید؟" },
            { id: 4, role: "sent", targetText: "Größe Medium, bitte.", translation: "Size medium, please.", translationFa: "سایز مدیوم، لطفاً." },
            { id: 5, role: "received", audioText: "Diese Jacke ist sehr beliebt.", translation: "This jacket is very popular.", translationFa: "این کاپشن خیلی محبوبه." },
            { id: 6, role: "sent", targetText: "Kann ich sie anprobieren?", translation: "Can I try it on?", translationFa: "میتونم امتحانش کنم؟" },
            { id: 7, role: "received", audioText: "Ja, die Umkleidekabine ist dort.", translation: "Yes, the fitting room is there.", translationFa: "بله، اتاق پرو اونجاست." },
            { id: 8, role: "sent", targetText: "Sie passt perfekt!", translation: "It fits perfectly!", translationFa: "عالی اندازه‌ست!" },
            { id: 9, role: "sent", targetText: "Was kostet sie?", translation: "How much does it cost?", translationFa: "قیمتش چنده؟" },
            { id: 10, role: "received", audioText: "Sie kostet 80 Euro.", translation: "It costs 80 Euro.", translationFa: "۸۰ یورو هست." }
        ]
    },
    20: {
        title: "Day 20: At the Supermarket",
        titleFa: "روز ۲۰: در سوپرمارکت",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Entschuldigung, wo finde ich die Milchprodukte?", translation: "Excuse me, where can I find dairy products?", translationFa: "ببخشید، لبنیات کجاست؟" },
            { id: 2, role: "received", audioText: "Im Gang drei, links.", translation: "In aisle three, on the left.", translationFa: "راهروی سه، سمت چپ." },
            { id: 3, role: "sent", targetText: "Danke. Haben Sie frisches Brot?", translation: "Thanks. Do you have fresh bread?", translationFa: "ممنون. نون تازه دارید؟" },
            { id: 4, role: "received", audioText: "Ja, bei der Bäckerei hinten.", translation: "Yes, at the bakery in the back.", translationFa: "بله، نونوایی ته فروشگاه." },
            { id: 5, role: "sent", targetText: "Brauche ich eine Tüte?", translation: "Do I need a bag?", translationFa: "کیسه لازم دارم؟" },
            { id: 6, role: "received", audioText: "Die Tüten kosten 20 Cent.", translation: "The bags cost 20 cents.", translationFa: "کیسه‌ها ۲۰ سنت هست." },
            { id: 7, role: "sent", targetText: "Ich nehme eine, bitte.", translation: "I'll take one, please.", translationFa: "یکی می‌خوام، لطفاً." },
            { id: 8, role: "received", audioText: "Zahlen Sie bar oder mit Karte?", translation: "Are you paying cash or by card?", translationFa: "نقد می‌دید یا کارت؟" },
            { id: 9, role: "sent", targetText: "Mit Karte, bitte.", translation: "By card, please.", translationFa: "با کارت، لطفاً." },
            { id: 10, role: "received", audioText: "Bitte geben Sie Ihre PIN ein.", translation: "Please enter your PIN.", translationFa: "لطفاً رمزتون رو وارد کنید." }
        ]
    },
    21: {
        title: "Day 21: Public Transportation",
        titleFa: "روز ۲۱: حمل و نقل عمومی",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Wann fährt der nächste Bus?", translation: "When does the next bus leave?", translationFa: "اتوبوس بعدی کی حرکت می‌کنه؟" },
            { id: 2, role: "received", audioText: "In zehn Minuten.", translation: "In ten minutes.", translationFa: "ده دقیقه دیگه." },
            { id: 3, role: "sent", targetText: "Fährt er zum Hauptbahnhof?", translation: "Does it go to the main station?", translationFa: "به ایستگاه اصلی میره؟" },
            { id: 4, role: "received", audioText: "Ja, Linie 5 fährt direkt.", translation: "Yes, line 5 goes directly.", translationFa: "بله، خط ۵ مستقیم میره." },
            { id: 5, role: "sent", targetText: "Wo kann ich eine Fahrkarte kaufen?", translation: "Where can I buy a ticket?", translationFa: "از کجا میتونم بلیط بخرم؟" },
            { id: 6, role: "received", audioText: "Am Automaten dort drüben.", translation: "At the machine over there.", translationFa: "از اون دستگاه اونجا." },
            { id: 7, role: "sent", targetText: "Was kostet eine Einzelfahrt?", translation: "How much is a single trip?", translationFa: "بلیط یک‌طرفه چنده؟" },
            { id: 8, role: "received", audioText: "Drei Euro fünfzig.", translation: "Three Euro fifty.", translationFa: "سه یورو و پنجاه سنت." },
            { id: 9, role: "sent", targetText: "Danke für die Auskunft.", translation: "Thanks for the information.", translationFa: "ممنون بابت اطلاعات." },
            { id: 10, role: "received", audioText: "Gute Fahrt!", translation: "Have a good trip!", translationFa: "سفر خوبی داشته باشید!" }
        ]
    },
    22: {
        title: "Day 22: Travel Problems",
        titleFa: "روز ۲۲: مشکلات سفر",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Ich habe meinen Zug verpasst.", translation: "I missed my train.", translationFa: "قطارم رو از دست دادم." },
            { id: 2, role: "sent", targetText: "Mein Flug hat Verspätung.", translation: "My flight is delayed.", translationFa: "پروازم تأخیر داره." },
            { id: 3, role: "sent", targetText: "Ich brauche Hilfe.", translation: "I need help.", translationFa: "کمک می‌خوام." },
            { id: 4, role: "sent", targetText: "Wo ist die Information?", translation: "Where is the information desk?", translationFa: "میز اطلاعات کجاست؟" },
            { id: 5, role: "sent", targetText: "Was soll ich tun?", translation: "What should I do?", translationFa: "باید چیکار کنم؟" }
        ]
    },
    23: {
        title: "Day 23: At the Doctor",
        titleFa: "روز ۲۳: پیش دکتر",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, ich habe einen Termin.", translation: "Good day, I have an appointment.", translationFa: "روز بخیر، وقت ملاقات دارم." },
            { id: 2, role: "received", audioText: "Wie ist Ihr Name?", translation: "What is your name?", translationFa: "اسمتون چیه؟" },
            { id: 3, role: "sent", targetText: "Mein Name ist Schmidt.", translation: "My name is Schmidt.", translationFa: "اسم من اشمیت هست." },
            { id: 4, role: "received", audioText: "Bitte nehmen Sie Platz.", translation: "Please take a seat.", translationFa: "لطفاً بنشینید." },
            { id: 5, role: "received", audioText: "Was fehlt Ihnen?", translation: "What's wrong with you?", translationFa: "مشکلتون چیه؟" },
            { id: 6, role: "sent", targetText: "Ich habe Kopfschmerzen.", translation: "I have a headache.", translationFa: "سردرد دارم." },
            { id: 7, role: "received", audioText: "Seit wann haben Sie das?", translation: "Since when do you have this?", translationFa: "از کی این مشکل رو دارید؟" },
            { id: 8, role: "sent", targetText: "Seit gestern Abend.", translation: "Since yesterday evening.", translationFa: "از دیشب." },
            { id: 9, role: "received", audioText: "Ich schreibe Ihnen ein Rezept.", translation: "I'll write you a prescription.", translationFa: "براتون نسخه می‌نویسم." },
            { id: 10, role: "sent", targetText: "Vielen Dank, Herr Doktor.", translation: "Thank you very much, Doctor.", translationFa: "خیلی ممنون، آقای دکتر." }
        ]
    },
    24: {
        title: "Day 24: At the Pharmacy",
        titleFa: "روز ۲۴: در داروخانه",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, ich brauche etwas gegen Kopfschmerzen.", translation: "Good day, I need something for a headache.", translationFa: "روز بخیر، یه چیزی برای سردرد می‌خوام." },
            { id: 2, role: "received", audioText: "Haben Sie Allergien?", translation: "Do you have allergies?", translationFa: "آلرژی دارید؟" },
            { id: 3, role: "sent", targetText: "Nein, keine Allergien.", translation: "No, no allergies.", translationFa: "نه، آلرژی ندارم." },
            { id: 4, role: "received", audioText: "Ich empfehle Ihnen diese Tabletten.", translation: "I recommend these tablets for you.", translationFa: "این قرص‌ها رو بهتون پیشنهاد می‌کنم." },
            { id: 5, role: "sent", targetText: "Wie oft muss ich sie nehmen?", translation: "How often do I need to take them?", translationFa: "هر چند وقت باید بخورم؟" },
            { id: 6, role: "received", audioText: "Dreimal täglich nach dem Essen.", translation: "Three times daily after meals.", translationFa: "روزی سه بار بعد از غذا." },
            { id: 7, role: "sent", targetText: "Haben Sie auch Vitamine?", translation: "Do you also have vitamins?", translationFa: "ویتامین هم دارید؟" },
            { id: 8, role: "received", audioText: "Ja, in diesem Regal hier.", translation: "Yes, on this shelf here.", translationFa: "بله، تو این قفسه." },
            { id: 9, role: "sent", targetText: "Was kostet alles zusammen?", translation: "How much is everything together?", translationFa: "همه‌اش با هم چنده؟" },
            { id: 10, role: "received", audioText: "Das macht 15 Euro.", translation: "That's 15 Euro.", translationFa: "میشه ۱۵ یورو." }
        ]
    },
    25: {
        title: "Day 25: At the Bank",
        titleFa: "روز ۲۵: در بانک",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, ich möchte ein Konto eröffnen.", translation: "Good day, I'd like to open an account.", translationFa: "روز بخیر، می‌خوام یه حساب باز کنم." },
            { id: 2, role: "received", audioText: "Natürlich. Haben Sie einen Ausweis dabei?", translation: "Of course. Do you have an ID with you?", translationFa: "البته. کارت شناسایی همراهتون هست؟" },
            { id: 3, role: "sent", targetText: "Ja, hier ist mein Reisepass.", translation: "Yes, here is my passport.", translationFa: "بله، این پاسپورتم." },
            { id: 4, role: "received", audioText: "Möchten Sie ein Girokonto oder ein Sparkonto?", translation: "Would you like a checking account or a savings account?", translationFa: "حساب جاری می‌خواید یا پس‌انداز؟" },
            { id: 5, role: "sent", targetText: "Ein Girokonto, bitte.", translation: "A checking account, please.", translationFa: "حساب جاری، لطفاً." },
            { id: 6, role: "received", audioText: "Das kostet 5 Euro pro Monat.", translation: "That costs 5 Euro per month.", translationFa: "ماهی ۵ یورو هزینه داره." },
            { id: 7, role: "sent", targetText: "Kann ich auch eine Kreditkarte bekommen?", translation: "Can I also get a credit card?", translationFa: "میتونم کارت اعتباری هم بگیرم؟" },
            { id: 8, role: "received", audioText: "Ja, das ist möglich.", translation: "Yes, that's possible.", translationFa: "بله، امکانش هست." },
            { id: 9, role: "sent", targetText: "Wie lange dauert das?", translation: "How long does it take?", translationFa: "چقدر طول می‌کشه؟" },
            { id: 10, role: "received", audioText: "Ungefähr eine Woche.", translation: "About one week.", translationFa: "تقریباً یه هفته." }
        ]
    },
    26: {
        title: "Day 26: Phone Conversation",
        titleFa: "روز ۲۶: مکالمه تلفنی",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Hallo, hier ist Firma Schmidt. Wie kann ich helfen?", translation: "Hello, this is Schmidt Company. How can I help?", translationFa: "سلام، شرکت اشمیت. چطور کمکتون کنم؟" },
            { id: 2, role: "sent", targetText: "Guten Tag, ich möchte mit Herrn Müller sprechen.", translation: "Good day, I'd like to speak with Mr. Müller.", translationFa: "روز بخیر، می‌خوام با آقای مولر صحبت کنم." },
            { id: 3, role: "received", audioText: "Einen Moment bitte, ich verbinde Sie.", translation: "One moment please, I'll connect you.", translationFa: "یه لحظه، وصلتون می‌کنم." },
            { id: 4, role: "sent", targetText: "Danke schön.", translation: "Thank you.", translationFa: "ممنونم." },
            { id: 5, role: "received", audioText: "Es tut mir leid, er ist gerade nicht da.", translation: "I'm sorry, he's not here right now.", translationFa: "متأسفانه الان اینجا نیست." },
            { id: 6, role: "sent", targetText: "Kann ich eine Nachricht hinterlassen?", translation: "Can I leave a message?", translationFa: "میتونم پیغام بذارم؟" },
            { id: 7, role: "received", audioText: "Natürlich. Was soll ich ausrichten?", translation: "Of course. What should I tell him?", translationFa: "البته. چی بگم بهش؟" },
            { id: 8, role: "sent", targetText: "Bitte sagen Sie, dass ich angerufen habe.", translation: "Please say that I called.", translationFa: "لطفاً بگید من زنگ زدم." },
            { id: 9, role: "received", audioText: "Und Ihre Nummer?", translation: "And your number?", translationFa: "و شماره‌تون؟" },
            { id: 10, role: "sent", targetText: "Meine Nummer ist 0176 1234567.", translation: "My number is 0176 1234567.", translationFa: "شماره‌م ۰۱۷۶ ۱۲۳۴۵۶۷ هست." }
        ]
    },
    27: {
        title: "Day 27: Making Plans",
        titleFa: "روز ۲۷: قرار گذاشتن",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Hast du morgen Zeit?", translation: "Do you have time tomorrow?", translationFa: "فردا وقت داری؟" },
            { id: 2, role: "sent", targetText: "Ja, ich bin frei.", translation: "Yes, I'm free.", translationFa: "آره، بیکارم." },
            { id: 3, role: "received", audioText: "Wollen wir ins Kino gehen?", translation: "Do you want to go to the cinema?", translationFa: "بریم سینما؟" },
            { id: 4, role: "sent", targetText: "Gute Idee! Welcher Film?", translation: "Good idea! Which movie?", translationFa: "ایده خوبیه! چه فیلمی؟" },
            { id: 5, role: "received", audioText: "Es gibt einen neuen Actionfilm.", translation: "There's a new action movie.", translationFa: "یه فیلم اکشن جدید هست." },
            { id: 6, role: "sent", targetText: "Wann beginnt er?", translation: "When does it start?", translationFa: "کی شروع میشه؟" },
            { id: 7, role: "received", audioText: "Um acht Uhr abends.", translation: "At eight o'clock in the evening.", translationFa: "ساعت هشت شب." },
            { id: 8, role: "sent", targetText: "Wo treffen wir uns?", translation: "Where do we meet?", translationFa: "کجا همدیگه رو ببینیم؟" },
            { id: 9, role: "received", audioText: "Vor dem Kino um halb acht.", translation: "In front of the cinema at half past seven.", translationFa: "جلوی سینما ساعت هفت و نیم." },
            { id: 10, role: "sent", targetText: "Super, bis morgen dann!", translation: "Great, see you tomorrow then!", translationFa: "عالی، پس تا فردا!" }
        ]
    },
    28: {
        title: "Day 28: Job Interview",
        titleFa: "روز ۲۸: مصاحبه کاری",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Guten Tag, bitte nehmen Sie Platz.", translation: "Good day, please take a seat.", translationFa: "روز بخیر، بفرمایید بنشینید." },
            { id: 2, role: "sent", targetText: "Danke, freut mich, Sie kennenzulernen.", translation: "Thanks, nice to meet you.", translationFa: "ممنون، از آشناییتون خوشحالم." },
            { id: 3, role: "received", audioText: "Erzählen Sie mir etwas über sich.", translation: "Tell me something about yourself.", translationFa: "درباره خودتون بگید." },
            { id: 4, role: "sent", targetText: "Ich habe drei Jahre Erfahrung in diesem Bereich.", translation: "I have three years of experience in this field.", translationFa: "من سه سال تجربه تو این زمینه دارم." },
            { id: 5, role: "received", audioText: "Warum möchten Sie bei uns arbeiten?", translation: "Why do you want to work with us?", translationFa: "چرا می‌خواید اینجا کار کنید؟" },
            { id: 6, role: "sent", targetText: "Ihre Firma hat einen guten Ruf.", translation: "Your company has a good reputation.", translationFa: "شرکت شما شهرت خوبی داره." },
            { id: 7, role: "received", audioText: "Was sind Ihre Stärken?", translation: "What are your strengths?", translationFa: "نقاط قوتتون چیه؟" },
            { id: 8, role: "sent", targetText: "Ich bin teamfähig und zuverlässig.", translation: "I'm a team player and reliable.", translationFa: "من تیمی کار می‌کنم و قابل اعتمادم." },
            { id: 9, role: "received", audioText: "Wann können Sie anfangen?", translation: "When can you start?", translationFa: "کی میتونید شروع کنید؟" },
            { id: 10, role: "sent", targetText: "Ich kann sofort anfangen.", translation: "I can start immediately.", translationFa: "من همین الان میتونم شروع کنم." }
        ]
    },
    29: {
        title: "Day 29: Review Day",
        titleFa: "روز ۲۹: روز مرور",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Hallo! Guten Morgen.", translation: "Hello! Good morning.", translationFa: "سلام! صبح بخیر." },
            { id: 2, role: "sent", targetText: "Entschuldigung, können Sie mir helfen?", translation: "Excuse me, can you help me?", translationFa: "ببخشید، میتونید کمکم کنید؟" },
            { id: 3, role: "sent", targetText: "Wie viel kostet das?", translation: "How much is that?", translationFa: "قیمتش چنده؟" },
            { id: 4, role: "sent", targetText: "Wann fährt der nächste Bus?", translation: "When does the next bus leave?", translationFa: "اتوبوس بعدی کی حرکت می‌کنه؟" },
            { id: 5, role: "sent", targetText: "Ich verstehe nicht.", translation: "I don't understand.", translationFa: "من نمی‌فهمم." },
            { id: 6, role: "sent", targetText: "Vielen Dank für Ihre Hilfe.", translation: "Thank you very much for your help.", translationFa: "خیلی ممنون از کمکتون." },
            { id: 7, role: "sent", targetText: "Auf Wiedersehen.", translation: "Goodbye.", translationFa: "خداحافظ." }
        ]
    },
    30: {
        title: "Day 30: Renting an Apartment",
        titleFa: "روز ۳۰: اجاره آپارتمان",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Hallo, ich bin wegen der Wohnungsbesichtigung hier.", translation: "Hello, I'm here for the apartment viewing.", translationFa: "سلام، برای بازدید آپارتمان اومدم." },
            { id: 2, role: "received", audioText: "Willkommen! Kommen Sie rein, ich zeige Ihnen alles.", translation: "Welcome! Come in, I'll show you everything.", translationFa: "خوش اومدید! بفرمایید داخل، همه چیز رو نشونتون میدم." },
            { id: 3, role: "sent", targetText: "Wie viele Zimmer hat die Wohnung?", translation: "How many rooms does the apartment have?", translationFa: "آپارتمان چند تا اتاق داره؟" },
            { id: 4, role: "received", audioText: "Sie hat zwei Zimmer, eine Küche und ein Bad.", translation: "It has two rooms, a kitchen and a bathroom.", translationFa: "دو اتاق، یه آشپزخونه و یه حموم داره." },
            { id: 5, role: "sent", targetText: "Wie hoch ist die Miete pro Monat?", translation: "How much is the rent per month?", translationFa: "اجاره ماهانه چقدره؟" },
            { id: 6, role: "received", audioText: "Achthundert Euro pro Monat, warm.", translation: "Eight hundred Euro per month, utilities included.", translationFa: "هشتصد یورو در ماه، با هزینه‌های جانبی." },
            { id: 7, role: "sent", targetText: "Sind die Nebenkosten inklusive?", translation: "Are the utilities included?", translationFa: "هزینه‌های جانبی شامل میشه؟" },
            { id: 8, role: "received", audioText: "Heizung und Wasser schon. Strom zahlen Sie selbst.", translation: "Heating and water yes. You pay electricity yourself.", translationFa: "گرمایش و آب بله. برق رو خودتون میدید." },
            { id: 9, role: "sent", targetText: "Wie lange ist die Mindestlaufzeit?", translation: "How long is the minimum lease?", translationFa: "حداقل مدت قرارداد چقدره؟" },
            { id: 10, role: "received", audioText: "Ein Jahr Mindestlaufzeit, danach monatlich kündbar.", translation: "One year minimum, then cancellable monthly.", translationFa: "حداقل یه سال، بعدش ماه به ماه قابل فسخه." },
            { id: 11, role: "sent", targetText: "Gibt es eine Kaution?", translation: "Is there a deposit?", translationFa: "ودیعه هم هست؟" },
            { id: 12, role: "received", audioText: "Ja, drei Monatsmieten als Kaution.", translation: "Yes, three months' rent as a deposit.", translationFa: "بله، سه ماه اجاره به عنوان ودیعه." },
            { id: 13, role: "sent", targetText: "Ab wann wäre die Wohnung verfügbar?", translation: "When would the apartment be available?", translationFa: "آپارتمان از کی آزاده؟" },
            { id: 14, role: "received", audioText: "Ab dem ersten des nächsten Monats.", translation: "From the first of next month.", translationFa: "از اول ماه آینده." },
            { id: 15, role: "sent", targetText: "Sie gefällt mir sehr gut. Ich würde sie gerne nehmen.", translation: "I really like it. I'd like to take it.", translationFa: "خیلی دوستش دارم. می‌خوام بگیرمش." },
            { id: 16, role: "received", audioText: "Sehr gut! Ich schicke Ihnen den Mietvertrag zu.", translation: "Great! I'll send you the rental contract.", translationFa: "عالی! قرارداد اجاره رو برای شما می‌فرستم." }
        ]
    },
    31: {
        title: "Day 31: Renting a Car",
        titleFa: "روز ۳۱: اجاره ماشین",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, ich möchte einen Mietwagen.", translation: "Good day, I'd like to rent a car.", translationFa: "روز بخیر، می‌خوام یه ماشین اجاره کنم." },
            { id: 2, role: "received", audioText: "Natürlich. Für wie viele Tage brauchen Sie ihn?", translation: "Of course. How many days do you need it?", translationFa: "البته. چند روز بهش نیاز دارید؟" },
            { id: 3, role: "sent", targetText: "Für fünf Tage, bitte.", translation: "For five days, please.", translationFa: "برای پنج روز، لطفاً." },
            { id: 4, role: "received", audioText: "Welche Fahrzeugklasse möchten Sie? Klein, mittel oder groß?", translation: "What type of car would you like? Small, medium or large?", translationFa: "چه کلاس خودرویی می‌خواید؟ کوچیک، متوسط یا بزرگ؟" },
            { id: 5, role: "sent", targetText: "Ein mittelgroßes Auto wäre gut.", translation: "A medium-sized car would be good.", translationFa: "یه ماشین متوسط خوبه." },
            { id: 6, role: "received", audioText: "Wir haben einen VW Golf verfügbar. Er kostet 45 Euro pro Tag.", translation: "We have a VW Golf available. It costs 45 Euro per day.", translationFa: "یه VW Golf داریم. روزی ۴۵ یورو هست." },
            { id: 7, role: "sent", targetText: "Ist eine Versicherung inklusive?", translation: "Is insurance included?", translationFa: "بیمه هم شامل میشه؟" },
            { id: 8, role: "received", audioText: "Eine Basisversicherung ist dabei. Vollkasko kostet 10 Euro extra pro Tag.", translation: "Basic insurance is included. Full coverage costs 10 Euro extra per day.", translationFa: "بیمه پایه شامله. بیمه کامل روزی ۱۰ یورو اضافه‌ست." },
            { id: 9, role: "sent", targetText: "Ich nehme die Vollkaskoversicherung, bitte.", translation: "I'll take the full coverage, please.", translationFa: "بیمه کامل رو می‌خوام، لطفاً." },
            { id: 10, role: "received", audioText: "Haben Sie einen gültigen Führerschein?", translation: "Do you have a valid driver's license?", translationFa: "گواهینامه معتبر دارید؟" },
            { id: 11, role: "sent", targetText: "Ja, hier ist mein Führerschein.", translation: "Yes, here is my driver's license.", translationFa: "بله، اینم گواهینامه‌ام." },
            { id: 12, role: "received", audioText: "Und eine Kreditkarte für die Kaution?", translation: "And a credit card for the deposit?", translationFa: "و یه کارت اعتباری برای ودیعه؟" },
            { id: 13, role: "sent", targetText: "Selbstverständlich, hier bitte.", translation: "Of course, here you go.", translationFa: "البته، بفرمایید." },
            { id: 14, role: "received", audioText: "Der Tank ist voll. Bitte geben Sie das Auto auch voll zurück.", translation: "The tank is full. Please return the car full as well.", translationFa: "باک پره. لطفاً ماشین رو هم با باک پر برگردونید." },
            { id: 15, role: "sent", targetText: "Verstanden. Wo steht das Auto?", translation: "Understood. Where is the car parked?", translationFa: "فهمیدم. ماشین کجاست؟" },
            { id: 16, role: "received", audioText: "Parkplatz B12, direkt draußen. Hier sind Ihre Schlüssel.", translation: "Parking spot B12, right outside. Here are your keys.", translationFa: "پارکینگ B12، همین بیرون. اینم کلیدتون." },
            { id: 17, role: "sent", targetText: "Danke schön. Bis Freitag dann!", translation: "Thank you. Until Friday then!", translationFa: "ممنون. پس تا جمعه!" }
        ]
    },
    32: {
        title: "Day 32: Birthday Party",
        titleFa: "روز ۳۲: جشن تولد",
        _loaded: true,
        sentences: [
            { id: 1, role: "received", audioText: "Hey, mein Geburtstag ist am Samstag. Kommst du zur Party?", translation: "Hey, my birthday is on Saturday. Are you coming to the party?", translationFa: "هی، تولدم شنبه‌ست. میای به پارتی؟" },
            { id: 2, role: "sent", targetText: "Natürlich! Das würde ich nicht verpassen. Wo findet sie statt?", translation: "Of course! I wouldn't miss it. Where is it?", translationFa: "البته! این رو از دست نمیدم. کجاست؟" },
            { id: 3, role: "received", audioText: "Bei mir zu Hause, ab sieben Uhr abends.", translation: "At my place, starting at seven in the evening.", translationFa: "خونه‌ام، از ساعت هفت شب." },
            { id: 4, role: "sent", targetText: "Soll ich etwas mitbringen?", translation: "Should I bring something?", translationFa: "چیزی بیارم؟" },
            { id: 5, role: "received", audioText: "Nur dich selbst! Aber Wein wäre willkommen.", translation: "Just bring yourself! But wine would be welcome.", translationFa: "فقط خودت بیا! ولی شراب هم خوشحال میشیم." },
            { id: 6, role: "sent", targetText: "Herzlichen Glückwunsch zum Geburtstag! Alles Gute für dich!", translation: "Happy birthday! All the best for you!", translationFa: "تولدت مبارک! همه چیز بهت خیر باشه!" },
            { id: 7, role: "received", audioText: "Vielen herzlichen Dank! Ich freue mich so, dass du da bist.", translation: "Thank you so much! I'm so happy you're here.", translationFa: "خیلی ممنون! خیلی خوشحالم که اینجایی." },
            { id: 8, role: "sent", targetText: "Hier, das ist für dich. Ich hoffe, es gefällt dir.", translation: "Here, this is for you. I hope you like it.", translationFa: "بفرما، این برای توئه. امیدوارم خوشت بیاد." },
            { id: 9, role: "received", audioText: "Oh, wie schön! Das wäre doch nicht nötig gewesen!", translation: "Oh, how lovely! You shouldn't have!", translationFa: "اوه، چه قشنگ! لازم نبود زحمت بکشی!" },
            { id: 10, role: "sent", targetText: "Wie alt wirst du heute?", translation: "How old are you turning today?", translationFa: "امروز چند سالت میشه؟" },
            { id: 11, role: "received", audioText: "Ich werde dreißig. Ich kann es kaum glauben!", translation: "I'm turning thirty. I can't believe it!", translationFa: "سی سالم میشه. باورم نمیشه!" },
            { id: 12, role: "sent", targetText: "Der Kuchen sieht toll aus. Hast du ihn selbst gebacken?", translation: "The cake looks amazing. Did you bake it yourself?", translationFa: "کیک خیلی قشنگه. خودت پختیش؟" },
            { id: 13, role: "received", audioText: "Nein, meine Mutter hat ihn gebacken. Er ist aus Schokolade.", translation: "No, my mom baked it. It's chocolate.", translationFa: "نه، مامانم پخته. شکلاتیه." },
            { id: 14, role: "sent", targetText: "Lass uns anstoßen! Auf deine Gesundheit!", translation: "Let's make a toast! To your health!", translationFa: "بیاید乾杯 کنیم! به سلامتیت!" },
            { id: 15, role: "received", audioText: "Prost! Ich freue mich so, dass alle hier sind.", translation: "Cheers! I'm so glad everyone is here.", translationFa: "به سلامتی! خیلی خوشحالم که همه اینجان." },
            { id: 16, role: "sent", targetText: "Es war ein wunderschöner Abend. Danke für die Einladung!", translation: "It was a wonderful evening. Thank you for the invitation!", translationFa: "شب فوق‌العاده‌ای بود. ممنون از دعوتت!" },
            { id: 17, role: "received", audioText: "Danke, dass du gekommen bist. Bis bald!", translation: "Thank you for coming. See you soon!", translationFa: "ممنون که اومدی. به زودی میبینمت!" }
        ]
    },
    33: {
        title: "Day 33: Technology Problems",
        titleFa: "روز ۳۳: مشکلات فناوری",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Hallo, ich habe ein Problem mit meinem Internet. Es funktioniert nicht.", translation: "Hello, I have a problem with my internet. It's not working.", translationFa: "سلام، با اینترنتم مشکل دارم. کار نمیکنه." },
            { id: 2, role: "received", audioText: "Guten Tag. Was genau ist das Problem?", translation: "Good day. What exactly is the problem?", translationFa: "روز بخیر. مشکل دقیقاً چیه؟" },
            { id: 3, role: "sent", targetText: "Die Verbindung bricht immer wieder ab. Der Router zeigt ein rotes Licht.", translation: "The connection keeps dropping. The router shows a red light.", translationFa: "اتصال قطع و وصل میشه. روتر چراغ قرمز نشون میده." },
            { id: 4, role: "received", audioText: "Haben Sie versucht, den Router neu zu starten?", translation: "Have you tried restarting the router?", translationFa: "روتر رو ریستارت کردید؟" },
            { id: 5, role: "sent", targetText: "Ja, ich habe ihn bereits zweimal neu gestartet.", translation: "Yes, I've already restarted it twice.", translationFa: "بله، دوبار ریستارتش کردم." },
            { id: 6, role: "received", audioText: "Seit wann besteht das Problem?", translation: "How long has this problem been going on?", translationFa: "از کی این مشکل رو دارید؟" },
            { id: 7, role: "sent", targetText: "Seit gestern Abend. Ich arbeite im Homeoffice und brauche dringend Internet.", translation: "Since yesterday evening. I work from home and urgently need the internet.", translationFa: "از دیشب. من دورکاری می‌کنم و فوری به اینترنت نیاز دارم." },
            { id: 8, role: "received", audioText: "Ich sehe eine Störung in Ihrer Region. Wir arbeiten daran.", translation: "I can see an outage in your area. We're working on it.", translationFa: "تو منطقه شما اختلال میبینم. داریم روش کار می‌کنیم." },
            { id: 9, role: "sent", targetText: "Wann wird das Problem behoben?", translation: "When will it be fixed?", translationFa: "کِی درست میشه؟" },
            { id: 10, role: "received", audioText: "Voraussichtlich innerhalb von zwei Stunden.", translation: "Probably within two hours.", translationFa: "احتمالاً ظرف دو ساعت." },
            { id: 11, role: "sent", targetText: "Außerdem entlädt sich mein Handy-Akku sehr schnell.", translation: "Also, my phone battery drains very quickly.", translationFa: "ضمناً باتری گوشیم خیلی سریع خالی میشه." },
            { id: 12, role: "received", audioText: "Das ist eine andere Abteilung. Soll ich Sie verbinden?", translation: "That's a different department. Shall I connect you?", translationFa: "اون بخش دیگه‌ایه. وصلتون کنم؟" },
            { id: 13, role: "sent", targetText: "Nein danke, ich rufe später zurück. Kann ich eine Ticketnummer bekommen?", translation: "No thanks, I'll call back later. Can I get a ticket number?", translationFa: "نه ممنون، بعداً زنگ میزنم. میتونم یه شماره تیکت بگیرم؟" },
            { id: 14, role: "received", audioText: "Natürlich. Ihre Ticketnummer ist 4872.", translation: "Of course. Your ticket number is 4872.", translationFa: "البته. شماره تیکت شما ۴۸۷۲ هست." },
            { id: 15, role: "sent", targetText: "Danke. Ich warte auf Ihre Rückmeldung.", translation: "Thank you. I'll wait for your update.", translationFa: "ممنون. منتظر خبرتون میمونم." },
            { id: 16, role: "received", audioText: "Wir schicken Ihnen eine SMS, sobald das Problem behoben ist.", translation: "We'll send you an SMS as soon as it's fixed.", translationFa: "به محض اینکه درست شد، براتون SMS میفرستیم." }
        ]
    },
    34: {
        title: "Day 34: Enrolling in a Course",
        titleFa: "روز ۳۴: ثبت‌نام در یک دوره",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, ich möchte mich für einen Deutschkurs anmelden.", translation: "Good day, I'd like to enroll in a German course.", translationFa: "روز بخیر، می‌خوام تو یه کلاس آلمانی ثبت‌نام کنم." },
            { id: 2, role: "received", audioText: "Willkommen! Was ist Ihr aktuelles Sprachniveau?", translation: "Welcome! What is your current language level?", translationFa: "خوش اومدید! سطح زبانیتون الان چیه؟" },
            { id: 3, role: "sent", targetText: "Ich bin Anfänger. Ich lerne seit etwa zwei Monaten.", translation: "I'm a beginner. I've been learning for about two months.", translationFa: "من مبتدی هستم. حدود دو ماهه دارم یاد می‌گیرم." },
            { id: 4, role: "received", audioText: "Dann wäre der A1-Kurs genau das Richtige für Sie.", translation: "Then the A1 course would be just right for you.", translationFa: "پس کلاس A1 دقیقاً مناسب شماست." },
            { id: 5, role: "sent", targetText: "Wie oft findet der Kurs statt?", translation: "How often does the course take place?", translationFa: "کلاس چند بار در هفته برگزار میشه؟" },
            { id: 6, role: "received", audioText: "Zweimal pro Woche, dienstags und donnerstags abends.", translation: "Twice a week, Tuesday and Thursday evenings.", translationFa: "دو بار در هفته، شب‌های سه‌شنبه و پنج‌شنبه." },
            { id: 7, role: "sent", targetText: "Wie lange dauert jede Unterrichtsstunde?", translation: "How long does each lesson last?", translationFa: "هر جلسه چقدر طول میکشه؟" },
            { id: 8, role: "received", audioText: "Neunzig Minuten pro Einheit.", translation: "Ninety minutes per session.", translationFa: "نود دقیقه هر جلسه." },
            { id: 9, role: "sent", targetText: "Wie viele Teilnehmer sind in der Gruppe?", translation: "How many students are in the group?", translationFa: "چند نفر تو هر گروه هستن؟" },
            { id: 10, role: "received", audioText: "Maximal zwölf Teilnehmer pro Gruppe.", translation: "Maximum twelve participants per group.", translationFa: "حداکثر دوازده نفر در هر گروه." },
            { id: 11, role: "sent", targetText: "Gibt es einen Einstufungstest?", translation: "Is there a placement test?", translationFa: "آزمون سطح‌بندی هم هست؟" },
            { id: 12, role: "received", audioText: "Ja, einen kurzen Online-Test vor der ersten Stunde.", translation: "Yes, a short online test before the first lesson.", translationFa: "بله، یه آزمون آنلاین کوتاه قبل از اولین جلسه." },
            { id: 13, role: "sent", targetText: "Was kostet der Kurs?", translation: "What does the course cost?", translationFa: "هزینه کلاس چقدره؟" },
            { id: 14, role: "received", audioText: "Einhundertachtzig Euro für das gesamte Semester, Unterrichtsmaterialien inklusive.", translation: "180 Euro for the whole semester, materials included.", translationFa: "صد و هشتاد یورو برای کل ترم، شامل جزوه‌ها." },
            { id: 15, role: "sent", targetText: "Wann beginnt der nächste Kurs?", translation: "When does the next course start?", translationFa: "دوره بعدی کِی شروع میشه؟" },
            { id: 16, role: "received", audioText: "Am fünften des nächsten Monats. Sie können sich online oder hier vor Ort anmelden.", translation: "On the fifth of next month. You can register online or here on the spot.", translationFa: "پنجم ماه آینده. می‌تونید آنلاین یا همینجا ثبت‌نام کنید." },
            { id: 17, role: "sent", targetText: "Ich melde mich gleich hier an. Wo muss ich unterschreiben?", translation: "I'll register right here. Where do I sign?", translationFa: "همینجا ثبت‌نام می‌کنم. کجا باید امضا کنم؟" },
            { id: 18, role: "received", audioText: "Hier bitte. Wir schicken Ihnen eine Bestätigung per E-Mail.", translation: "Here please. We'll send you a confirmation by email.", translationFa: "اینجا لطفاً. یه تأییدیه برای شما ایمیل می‌کنیم." }
        ]
    },
    35: {
        title: "Day 35: Emergency Situations",
        titleFa: "روز ۳۵: موقعیت‌های اضطراری",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Hilfe! Ich brauche die Polizei.", translation: "Help! I need the police.", translationFa: "کمک! به پلیس نیاز دارم." },
            { id: 2, role: "received", audioText: "Beruhigen Sie sich. Was ist passiert?", translation: "Calm down. What happened?", translationFa: "آروم باشید. چی شده؟" },
            { id: 3, role: "sent", targetText: "Mein Geldbeutel wurde gestohlen. In der U-Bahn.", translation: "My wallet was stolen. On the subway.", translationFa: "کیف پولم دزدیده شد. تو مترو." },
            { id: 4, role: "received", audioText: "Wann ist das passiert?", translation: "When did that happen?", translationFa: "کِی اتفاق افتاد؟" },
            { id: 5, role: "sent", targetText: "Vor ungefähr zwanzig Minuten, auf der Linie U3.", translation: "About twenty minutes ago, on the U3 line.", translationFa: "حدود بیست دقیقه پیش، تو خط U3." },
            { id: 6, role: "received", audioText: "Befanden sich Dokumente in dem Geldbeutel?", translation: "Were there any documents in the wallet?", translationFa: "مدرکی توی کیف پول بود؟" },
            { id: 7, role: "sent", targetText: "Ja, mein Reisepass und meine Kreditkarte waren drin.", translation: "Yes, my passport and credit card were in it.", translationFa: "بله، پاسپورتم و کارت اعتباریم توش بود." },
            { id: 8, role: "received", audioText: "Sie müssen sofort Ihre Kreditkarte sperren lassen.", translation: "You must have your credit card blocked immediately.", translationFa: "باید فوری کارت اعتباریتون رو مسدود کنید." },
            { id: 9, role: "sent", targetText: "Wie kann ich das tun? Ich bin Tourist und kenne die Nummer nicht.", translation: "How can I do that? I'm a tourist and don't know the number.", translationFa: "چطور میتونم این کارو بکنم؟ من توریستم و شماره رو نمیدونم." },
            { id: 10, role: "received", audioText: "Wir können Ihnen dabei helfen. Welche Bank war das?", translation: "We can help you with that. Which bank was it?", translationFa: "ما می‌تونیم کمکتون کنیم. کدوم بانک بود؟" },
            { id: 11, role: "sent", targetText: "Es war eine Visa-Karte von meiner deutschen Bank.", translation: "It was a Visa card from my German bank.", translationFa: "یه کارت ویزا از بانک آلمانیم بود." },
            { id: 12, role: "received", audioText: "Gut. Wir leiten Sie weiter. Und für den Pass müssen Sie zur Botschaft.", translation: "Good. We'll transfer you. And for the passport you'll need to go to the embassy.", translationFa: "خوب. شما رو وصل می‌کنیم. و برای پاسپورت باید برید سفارتخونه." },
            { id: 13, role: "sent", targetText: "Kann ich hier eine Verlustanzeige machen?", translation: "Can I file a loss report here?", translationFa: "میتونم اینجا گزارش گم‌شدن بدم؟" },
            { id: 14, role: "received", audioText: "Ja, natürlich. Ich nehme Ihre persönlichen Daten auf.", translation: "Yes, of course. I'll take your personal details.", translationFa: "بله، البته. مشخصات شخصیتون رو می‌گیرم." },
            { id: 15, role: "sent", targetText: "Mein Name ist Kamran Hosseini, geboren am dritten März neunzehnneunzig.", translation: "My name is Kamran Hosseini, born on the third of March, 1999.", translationFa: "اسمم کامران حسینی هست، متولد سوم مارس هزار و نهصد و نود و نه." },
            { id: 16, role: "received", audioText: "Danke. Haben Sie eine Adresse in Deutschland, unter der wir Sie erreichen können?", translation: "Thank you. Do you have an address in Germany where we can reach you?", translationFa: "ممنون. آدرسی در آلمان دارید که بتونیم باهاتون تماس بگیریم؟" },
            { id: 17, role: "sent", targetText: "Ja, ich wohne im Hotel Zentrum, Zimmer dreizehn.", translation: "Yes, I'm staying at Hotel Zentrum, room thirteen.", translationFa: "بله، در هتل تسنتروم اتاق سیزده اقامت دارم." },
            { id: 18, role: "received", audioText: "Alles klar. Hier ist Ihre Anzeigenummer: 2024-8831. Bitte bewahren Sie diese gut auf.", translation: "All right. Here is your report number: 2024-8831. Please keep it safe.", translationFa: "باشه. شماره گزارشتون اینه: ۲۰۲۴-۸۸۳۱. لطفاً خوب نگهش دارید." }
        ]
    },
    36: {
        title: "Day 36: At the Post Office",
        titleFa: "روز ۳۶: در اداره پست",
        _loaded: true,
        sentences: [
            { id: 1, role: "sent", targetText: "Guten Tag, ich möchte dieses Paket in den Iran schicken.", translation: "Good day, I'd like to send this package to Iran.", translationFa: "روز بخیر، می‌خوام این بسته رو به ایران بفرستم." },
            { id: 2, role: "received", audioText: "Natürlich. Legen Sie es bitte auf die Waage.", translation: "Of course. Please put it on the scale.", translationFa: "البته. لطفاً روی ترازو بذارید." },
            { id: 3, role: "sent", targetText: "Wie viel wiegt es?", translation: "How much does it weigh?", translationFa: "چقدر وزن داره؟" },
            { id: 4, role: "received", audioText: "Einkommazwei Kilogramm. Wohin genau soll es geliefert werden?", translation: "1.2 kilograms. Where exactly should it be delivered?", translationFa: "یک و دو دهم کیلوگرم. دقیقاً کجا باید تحویل داده بشه؟" },
            { id: 5, role: "sent", targetText: "Nach Teheran. Es ist ein Geschenk für meine Familie.", translation: "To Tehran. It's a gift for my family.", translationFa: "به تهران. یه هدیه برای خانواده‌امه." },
            { id: 6, role: "received", audioText: "Möchten Sie Standardversand oder Express?", translation: "Would you like standard or express shipping?", translationFa: "ارسال معمولی می‌خواید یا اکسپرس؟" },
            { id: 7, role: "sent", targetText: "Was ist der Unterschied bei der Lieferzeit?", translation: "What's the difference in delivery time?", translationFa: "فرق زمان تحویل چقدره؟" },
            { id: 8, role: "received", audioText: "Standard dauert zehn bis vierzehn Tage, Express drei bis fünf Tage.", translation: "Standard takes 10 to 14 days, express 3 to 5 days.", translationFa: "معمولی ده تا چهارده روز، اکسپرس سه تا پنج روز." },
            { id: 9, role: "sent", targetText: "Ich nehme Express, bitte. Was kostet das?", translation: "I'll take express, please. How much does it cost?", translationFa: "اکسپرس رو می‌خوام، لطفاً. چقدر میشه؟" },
            { id: 10, role: "received", audioText: "Express in den Iran kostet achtundzwanzig Euro.", translation: "Express to Iran costs 28 euros.", translationFa: "اکسپرس به ایران بیست و هشت یورو میشه." },
            { id: 11, role: "sent", targetText: "In Ordnung. Kann ich das Paket versichern lassen?", translation: "Fine. Can I insure the package?", translationFa: "باشه. میتونم بسته رو بیمه کنم؟" },
            { id: 12, role: "received", audioText: "Ja, für fünf Euro zusätzlich bis zu einem Warenwert von hundert Euro.", translation: "Yes, for an additional 5 euros up to 100 euros in value.", translationFa: "بله، پنج یورو اضافه تا ارزش صد یورو." },
            { id: 13, role: "sent", targetText: "Ja bitte, ich versichere es. Der Inhalt ist etwa achtzig Euro wert.", translation: "Yes please, I'll insure it. The contents are worth about 80 euros.", translationFa: "بله لطفاً، بیمه‌اش می‌کنم. محتوا حدود هشتاد یورو ارزش داره." },
            { id: 14, role: "received", audioText: "Gut. Füllen Sie bitte diese Zollerklärung aus.", translation: "Good. Please fill out this customs declaration.", translationFa: "خوب. لطفاً این فرم گمرکی رو پر کنید." },
            { id: 15, role: "sent", targetText: "Schreibe ich den Inhalt auf Deutsch oder auf Englisch?", translation: "Do I write the contents in German or English?", translationFa: "محتوا رو به آلمانی بنویسم یا انگلیسی؟" },
            { id: 16, role: "received", audioText: "Deutsch oder Englisch, beides wird akzeptiert.", translation: "German or English, both are accepted.", translationFa: "آلمانی یا انگلیسی، هر دو قبوله." },
            { id: 17, role: "sent", targetText: "Bitte schön, alles ausgefüllt.", translation: "Here you go, all filled out.", translationFa: "بفرمایید، همه چیز پر شد." },
            { id: 18, role: "received", audioText: "Perfekt. Hier ist Ihre Sendungsnummer. Sie können das Paket online verfolgen.", translation: "Perfect. Here is your tracking number. You can track the package online.", translationFa: "عالی. اینم شماره رهگیری شما. می‌تونید بسته رو آنلاین ردیابی کنید." }
        ]
    }
};

// Glossary embedded inline
let wordGlossary = {
    "hallo": { "en": "Hello", "fa": "سلام" },
    "morgen": { "en": "Morning", "fa": "صبح" },
    "danke": { "en": "Thanks", "fa": "ممنون" },
    "bitte": { "en": "Please", "fa": "لطفاً" },
    "ja": { "en": "Yes", "fa": "بله" },
    "nein": { "en": "No", "fa": "نه" },
    "ich": { "en": "I", "fa": "من" },
    "du": { "en": "You", "fa": "تو" },
    "sie": { "en": "You (formal)/She/They", "fa": "شما/او/آنها" },
    "helfen": { "en": "Help", "fa": "کمک کردن" },
    "problem": { "en": "Problem", "fa": "مشکل" },
    "verstehe": { "en": "Understand", "fa": "می‌فهمم" },
    "wiederholen": { "en": "Repeat", "fa": "تکرار کردن" },
    "langsammer": { "en": "Slower", "fa": "آروم‌تر" },
    "bedeutet": { "en": "Means", "fa": "یعنی" },
    "heute": { "en": "Today", "fa": "امروز" },
    "jetzt": { "en": "Now", "fa": "الان" },
    "hier": { "en": "Here", "fa": "اینجا" },
    "dort": { "en": "There", "fa": "آنجا" },
    "wo": { "en": "Where", "fa": "کجا" },
    "wann": { "en": "When", "fa": "کی" },
    "gut": { "en": "Good", "fa": "خوب" },
    "schlecht": { "en": "Bad", "fa": "بد" },
    "teuer": { "en": "Expensive", "fa": "گرون" },
    "billig": { "en": "Cheap", "fa": "ارزون" },
    "denken": { "en": "Think", "fa": "فکر کردن" },
    "idee": { "en": "Idea", "fa": "ایده" },
    "stress": { "en": "Stress", "fa": "استرس" },
    "müde": { "en": "Tired", "fa": "خسته" }
};

// Backward-compatible async functions — resolve immediately from embedded data.
// These keep the same API so app.js doesn't need any changes.

async function loadLesson(day) {
    if (dailyLessons[day]) {
        return dailyLessons[day];
    }
    // Day not found — return a fallback
    return {
        title: `Day ${day}`,
        titleFa: `روز ${day}`,
        sentences: [{ id: 1, role: "received", audioText: "Lektion nicht gefunden.", translation: "Lesson not found.", translationFa: "درس پیدا نشد." }],
        _loaded: true
    };
}

async function loadLessons(days) {
    return Promise.all(days.map(d => loadLesson(d)));
}

async function loadGlossary() {
    // Already loaded inline — nothing to do
    if (typeof DEBUG !== 'undefined' && DEBUG) console.log('Glossary loaded inline:', Object.keys(wordGlossary).length, 'words');
}
