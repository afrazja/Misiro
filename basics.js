// German Basics - Vocabulary Data and Logic

// =====================
// VOCABULARY DATA
// =====================

const basicsData = {
    pronouns: {
        icon: "👤",
        title: { en: "Personal Pronouns", fa: "ضمایر شخصی" },
        description: { en: "Master the German personal pronouns", fa: "ضمایر شخصی آلمانی را یاد بگیرید" },
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
    adverbs: {
        icon: "⚡",
        title: { en: "Common Adverbs", fa: "قیدهای پرکاربرد" },
        description: { en: "Words that describe how, when, where", fa: "کلماتی که چگونگی، زمان و مکان را توصیف می‌کنند" },
        type: "grid",
        words: [
            { german: "sehr", en: "very", fa: "خیلی", example: "Das ist sehr gut.", exampleEn: "That is very good.", exampleFa: "این خیلی خوب است." },
            { german: "gut", en: "well/good", fa: "خوب", example: "Er spielt gut Klavier.", exampleEn: "He plays piano well.", exampleFa: "او خوب پیانو می‌زند." },
            { german: "schnell", en: "fast/quickly", fa: "سریع", example: "Er läuft schnell.", exampleEn: "He runs fast.", exampleFa: "او سریع می‌دود." },
            { german: "langsam", en: "slow/slowly", fa: "آهسته", example: "Bitte sprechen Sie langsam.", exampleEn: "Please speak slowly.", exampleFa: "لطفاً آهسته صحبت کنید." },
            { german: "gern(e)", en: "gladly/like to", fa: "با میل", example: "Ich esse gerne Pizza.", exampleEn: "I like to eat pizza.", exampleFa: "من دوست دارم پیتزا بخورم." },
            { german: "oft", en: "often", fa: "اغلب", example: "Wir gehen oft spazieren.", exampleEn: "We often go for walks.", exampleFa: "ما اغلب پیاده‌روی می‌کنیم." },
            { german: "immer", en: "always", fa: "همیشه", example: "Er kommt immer pünktlich.", exampleEn: "He always comes on time.", exampleFa: "او همیشه به موقع می‌آید." },
            { german: "nie", en: "never", fa: "هرگز", example: "Ich trinke nie Kaffee.", exampleEn: "I never drink coffee.", exampleFa: "من هرگز قهوه نمی‌نوشم." },
            { german: "manchmal", en: "sometimes", fa: "گاهی", example: "Manchmal regnet es.", exampleEn: "Sometimes it rains.", exampleFa: "گاهی باران می‌بارد." },
            { german: "hier", en: "here", fa: "اینجا", example: "Komm bitte hier.", exampleEn: "Please come here.", exampleFa: "لطفاً بیا اینجا." },
            { german: "dort", en: "there", fa: "آنجا", example: "Das Buch liegt dort.", exampleEn: "The book is over there.", exampleFa: "کتاب آنجاست." },
            { german: "jetzt", en: "now", fa: "الان", example: "Ich muss jetzt gehen.", exampleEn: "I have to go now.", exampleFa: "من الان باید بروم." },
            { german: "heute", en: "today", fa: "امروز", example: "Heute ist ein schöner Tag.", exampleEn: "Today is a beautiful day.", exampleFa: "امروز روز زیبایی است." },
            { german: "morgen", en: "tomorrow", fa: "فردا", example: "Morgen habe ich frei.", exampleEn: "Tomorrow I have a day off.", exampleFa: "فردا تعطیلم." },
            { german: "gestern", en: "yesterday", fa: "دیروز", example: "Gestern war es kalt.", exampleEn: "Yesterday it was cold.", exampleFa: "دیروز هوا سرد بود." }
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
    greetings: {
        icon: "👋",
        title: { en: "Greetings & Phrases", fa: "سلام و عبارات" },
        description: { en: "Common greetings and expressions", fa: "سلام‌ها و عبارات رایج" },
        type: "grid",
        words: [
            { german: "Hallo", en: "Hello", fa: "سلام", example: "Hallo, wie geht es dir?", exampleEn: "Hello, how are you?", exampleFa: "سلام، حالت چطوره؟" },
            { german: "Guten Morgen", en: "Good morning", fa: "صبح بخیر", example: "Guten Morgen, gut geschlafen?", exampleEn: "Good morning, did you sleep well?", exampleFa: "صبح بخیر، خوب خوابیدی؟" },
            { german: "Guten Tag", en: "Good day", fa: "روز بخیر", example: "Guten Tag, kann ich Ihnen helfen?", exampleEn: "Good day, can I help you?", exampleFa: "روز بخیر، می‌توانم کمکتان کنم؟" },
            { german: "Guten Abend", en: "Good evening", fa: "عصر بخیر", example: "Guten Abend, willkommen!", exampleEn: "Good evening, welcome!", exampleFa: "عصر بخیر، خوش آمدید!" },
            { german: "Gute Nacht", en: "Good night", fa: "شب بخیر", example: "Gute Nacht, schlaf gut!", exampleEn: "Good night, sleep well!", exampleFa: "شب بخیر، خوب بخواب!" },
            { german: "Auf Wiedersehen", en: "Goodbye", fa: "خداحافظ", example: "Auf Wiedersehen, bis morgen!", exampleEn: "Goodbye, see you tomorrow!", exampleFa: "خداحافظ، تا فردا!" },
            { german: "Tschüss", en: "Bye (informal)", fa: "بای", example: "Tschüss, bis später!", exampleEn: "Bye, see you later!", exampleFa: "بای، بعداً می‌بینمت!" },
            { german: "Danke", en: "Thank you", fa: "ممنون", example: "Danke für die Hilfe.", exampleEn: "Thanks for the help.", exampleFa: "ممنون از کمکت." },
            { german: "Bitte", en: "Please / You're welcome", fa: "لطفاً / خواهش می‌کنم", example: "Bitte schön!", exampleEn: "You're welcome!", exampleFa: "خواهش می‌کنم!" },
            { german: "Entschuldigung", en: "Excuse me / Sorry", fa: "ببخشید", example: "Entschuldigung, wo ist der Bahnhof?", exampleEn: "Excuse me, where is the train station?", exampleFa: "ببخشید، ایستگاه قطار کجاست؟" },
            { german: "Ja", en: "Yes", fa: "بله", example: "Ja, ich komme gerne.", exampleEn: "Yes, I'd love to come.", exampleFa: "بله، با کمال میل می‌آیم." },
            { german: "Nein", en: "No", fa: "نه", example: "Nein, danke.", exampleEn: "No, thank you.", exampleFa: "نه، ممنون." }
        ]
    }
};

// =====================
// STATE
// =====================

let currentLang = 'en';
let voiceSpeed = 1.0;

// =====================
// INITIALIZATION
// =====================

document.addEventListener('DOMContentLoaded', async () => {
    await loadPreferences();
    setupControls();
    renderCategories();
    updatePageLanguage();
});

async function loadPreferences() {
    const savedLang = window.MisiroData ? await MisiroData.getLanguage() : localStorage.getItem('misiro_language');
    if (savedLang) {
        currentLang = savedLang;
    } else {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        currentLang = browserLang.startsWith('fa') ? 'fa' : 'en';
    }

    const savedSpeed = window.MisiroData ? await MisiroData.getVoiceSpeed() : localStorage.getItem('misiro_voice_speed');
    if (savedSpeed !== null) {
        voiceSpeed = typeof savedSpeed === 'number' ? savedSpeed : parseFloat(savedSpeed);
    }
}

function setupControls() {
    const langSelect = document.getElementById('language-select');
    const speedSelect = document.getElementById('speed-select');

    langSelect.value = currentLang;
    speedSelect.value = voiceSpeed.toString();

    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        if (window.MisiroData) MisiroData.setLanguage(currentLang);
        else localStorage.setItem('misiro_language', currentLang);
        renderCategories();
        updatePageLanguage();
    });

    speedSelect.addEventListener('change', (e) => {
        voiceSpeed = parseFloat(e.target.value);
        if (window.MisiroData) MisiroData.setVoiceSpeed(voiceSpeed);
        else localStorage.setItem('misiro_voice_speed', voiceSpeed.toString());
    });
}

function updatePageLanguage() {
    const backText = document.getElementById('back-text');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    if (currentLang === 'fa') {
        backText.textContent = 'خانه';
        pageTitle.textContent = '🔤 مبانی آلمانی';
        pageSubtitle.textContent = 'اصول اولیه را یاد بگیرید';
    } else {
        backText.textContent = 'Home';
        pageTitle.textContent = '🔤 German Basics';
        pageSubtitle.textContent = 'Master the fundamentals';
    }
}

// =====================
// RENDERING
// =====================

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    for (const [key, category] of Object.entries(basicsData)) {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category';
        categoryEl.id = `category-${key}`;

        const title = category.title[currentLang] || category.title.en;
        const desc = category.description[currentLang] || category.description.en;

        categoryEl.innerHTML = `
            <div class="category-header" onclick="toggleCategory('${key}')">
                <div class="category-icon">${category.icon}</div>
                <div class="category-info">
                    <h2>${title}</h2>
                    <p>${desc}</p>
                </div>
                <div class="category-toggle">▼</div>
            </div>
            ${category.type === 'table' ? renderPronounTable(category.words) : renderWordGrid(category.words)}
        `;

        container.appendChild(categoryEl);
    }
}

function renderWordGrid(words) {
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
                <div class="word-example" onclick="event.stopPropagation(); playExample('${escapedExample}')">
                    ${word.example} <span class="example-speaker">🔊</span>
                    ${exampleTranslation ? `<div class="example-translation">${exampleTranslation}</div>` : ''}
                </div>`;
        }

        return `
            <div class="word-card" onclick="playWord('${escapedGerman}')">
                <div class="word-german">${word.german}</div>
                <div class="word-translation">${translation}</div>
                ${exampleHtml}
                <div class="play-icon">🔊</div>
            </div>
        `;
    }).join('');

    return `<div class="word-grid">${items}</div>`;
}

function renderPronounTable(words) {
    const rows = words.map(word => {
        const meaning = currentLang === 'fa' ? word.fa : word.en;
        const escapedGerman = word.german.replace(/'/g, "\\'");
        const escapedExample = word.example ? word.example.replace(/'/g, "\\'") : '';
        const exampleTranslation = currentLang === 'fa'
            ? (word.exampleFa || '')
            : (word.exampleEn || '');
        return `
            <div class="pronoun-row" onclick="playWord('${escapedGerman}')">
                <div class="pronoun-german">${word.german}</div>
                <div class="pronoun-meaning">${meaning}</div>
                <div class="pronoun-example" onclick="event.stopPropagation(); playExample('${escapedExample}')">
                    ${word.example} 🔊
                    ${exampleTranslation ? `<div class="example-translation">${exampleTranslation}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="pronoun-grid">${rows}</div>`;
}

// =====================
// INTERACTIONS
// =====================

function toggleCategory(key) {
    const category = document.getElementById(`category-${key}`);
    category.classList.toggle('open');
}

// =====================
// AUDIO (Render TTS Proxy with browser fallback)
// =====================
const _MISIRO_API = window.MISIRO_CONFIG?.apiUrl || '';
const _hasTTSProxy = !!_MISIRO_API;

function stopAllAudio() {
    window.speechSynthesis.cancel();
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
        window.currentAudio = null;
    }
}

function _browserTTS(text, lang, rate) {
    return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate || voiceSpeed;
        u.onend = resolve;
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
    });
}

function playWebAudio(text, lang) {
    if (!_hasTTSProxy) {
        return _browserTTS(text, lang, voiceSpeed);
    }
    return new Promise((resolve) => {
        const url = `${_MISIRO_API}/tts?q=${encodeURIComponent(text)}&tl=${lang}`;
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio = null;
        }
        const audio = new Audio();
        audio.src = url;
        window.currentAudio = audio;
        audio.onended = () => resolve();
        audio.onerror = () => {
            _browserTTS(text, lang, voiceSpeed).then(resolve);
        };
        audio.play().catch(() => {
            _browserTTS(text, lang, voiceSpeed).then(resolve);
        });
    });
}

function playWord(text) {
    stopAllAudio();
    playWebAudio(text, 'de-DE');
}

function playExample(text) {
    if (!text) return;
    stopAllAudio();
    playWebAudio(text, 'de-DE');
}

// Make functions globally available
window.toggleCategory = toggleCategory;
window.playWord = playWord;
window.playExample = playExample;
