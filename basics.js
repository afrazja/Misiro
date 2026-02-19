// German Basics - Vocabulary Data and Logic

// =====================
// VOCABULARY DATA
// =====================

const basicsData = {
    pronouns: {
        icon: "👤",
        title: { en: "Personal Pronouns", fa: "ضمایر شخصی" },
        description: { en: "I, you, he, she, it, we, they", fa: "من، تو، او، ما، شما، آنها" },
        type: "table",
        words: [
            { german: "ich", en: "I", fa: "من", example: "Ich bin hier." },
            { german: "du", en: "you (informal)", fa: "تو", example: "Du bist nett." },
            { german: "er", en: "he", fa: "او (مذکر)", example: "Er ist groß." },
            { german: "sie", en: "she", fa: "او (مؤنث)", example: "Sie ist schön." },
            { german: "es", en: "it", fa: "آن", example: "Es ist kalt." },
            { german: "wir", en: "we", fa: "ما", example: "Wir sind Freunde." },
            { german: "ihr", en: "you (plural)", fa: "شما (جمع)", example: "Ihr seid toll." },
            { german: "sie", en: "they", fa: "آنها", example: "Sie sind hier." },
            { german: "Sie", en: "you (formal)", fa: "شما (رسمی)", example: "Sind Sie Herr Müller?" }
        ]
    },
    articles: {
        icon: "📝",
        title: { en: "Articles", fa: "حروف تعریف" },
        description: { en: "the, a/an - German has 3 genders!", fa: "حروف تعریف - آلمانی ۳ جنسیت دارد!" },
        type: "grid",
        words: [
            { german: "der", en: "the (masculine)", fa: "این (مذکر)" },
            { german: "die", en: "the (feminine)", fa: "این (مؤنث)" },
            { german: "das", en: "the (neuter)", fa: "این (خنثی)" },
            { german: "ein", en: "a/an (masc/neut)", fa: "یک (مذکر/خنثی)" },
            { german: "eine", en: "a/an (feminine)", fa: "یک (مؤنث)" }
        ]
    },
    adverbs: {
        icon: "⚡",
        title: { en: "Common Adverbs", fa: "قیدهای پرکاربرد" },
        description: { en: "Words that describe how, when, where", fa: "کلماتی که چگونگی، زمان و مکان را توصیف می‌کنند" },
        type: "grid",
        words: [
            { german: "sehr", en: "very", fa: "خیلی" },
            { german: "gut", en: "well/good", fa: "خوب" },
            { german: "schnell", en: "fast/quickly", fa: "سریع" },
            { german: "langsam", en: "slow/slowly", fa: "آهسته" },
            { german: "gern(e)", en: "gladly/like to", fa: "با میل" },
            { german: "oft", en: "often", fa: "اغلب" },
            { german: "immer", en: "always", fa: "همیشه" },
            { german: "nie", en: "never", fa: "هرگز" },
            { german: "manchmal", en: "sometimes", fa: "گاهی" },
            { german: "hier", en: "here", fa: "اینجا" },
            { german: "dort", en: "there", fa: "آنجا" },
            { german: "jetzt", en: "now", fa: "الان" },
            { german: "heute", en: "today", fa: "امروز" },
            { german: "morgen", en: "tomorrow", fa: "فردا" },
            { german: "gestern", en: "yesterday", fa: "دیروز" }
        ]
    },
    numbers: {
        icon: "🔢",
        title: { en: "Numbers 1-20", fa: "اعداد ۱ تا ۲۰" },
        description: { en: "Learn to count in German", fa: "شمردن به آلمانی را یاد بگیرید" },
        type: "grid",
        words: [
            { german: "eins", en: "1", fa: "۱" },
            { german: "zwei", en: "2", fa: "۲" },
            { german: "drei", en: "3", fa: "۳" },
            { german: "vier", en: "4", fa: "۴" },
            { german: "fünf", en: "5", fa: "۵" },
            { german: "sechs", en: "6", fa: "۶" },
            { german: "sieben", en: "7", fa: "۷" },
            { german: "acht", en: "8", fa: "۸" },
            { german: "neun", en: "9", fa: "۹" },
            { german: "zehn", en: "10", fa: "۱۰" },
            { german: "elf", en: "11", fa: "۱۱" },
            { german: "zwölf", en: "12", fa: "۱۲" },
            { german: "dreizehn", en: "13", fa: "۱۳" },
            { german: "vierzehn", en: "14", fa: "۱۴" },
            { german: "fünfzehn", en: "15", fa: "۱۵" },
            { german: "sechzehn", en: "16", fa: "۱۶" },
            { german: "siebzehn", en: "17", fa: "۱۷" },
            { german: "achtzehn", en: "18", fa: "۱۸" },
            { german: "neunzehn", en: "19", fa: "۱۹" },
            { german: "zwanzig", en: "20", fa: "۲۰" }
        ]
    },
    colors: {
        icon: "🎨",
        title: { en: "Colors", fa: "رنگ‌ها" },
        description: { en: "Basic colors in German", fa: "رنگ‌های پایه به آلمانی" },
        type: "grid",
        words: [
            { german: "rot", en: "red", fa: "قرمز" },
            { german: "blau", en: "blue", fa: "آبی" },
            { german: "grün", en: "green", fa: "سبز" },
            { german: "gelb", en: "yellow", fa: "زرد" },
            { german: "orange", en: "orange", fa: "نارنجی" },
            { german: "lila", en: "purple", fa: "بنفش" },
            { german: "rosa", en: "pink", fa: "صورتی" },
            { german: "schwarz", en: "black", fa: "سیاه" },
            { german: "weiß", en: "white", fa: "سفید" },
            { german: "grau", en: "gray", fa: "خاکستری" },
            { german: "braun", en: "brown", fa: "قهوه‌ای" }
        ]
    },
    days: {
        icon: "📅",
        title: { en: "Days of the Week", fa: "روزهای هفته" },
        description: { en: "Monday to Sunday", fa: "دوشنبه تا یکشنبه" },
        type: "grid",
        words: [
            { german: "Montag", en: "Monday", fa: "دوشنبه" },
            { german: "Dienstag", en: "Tuesday", fa: "سه‌شنبه" },
            { german: "Mittwoch", en: "Wednesday", fa: "چهارشنبه" },
            { german: "Donnerstag", en: "Thursday", fa: "پنج‌شنبه" },
            { german: "Freitag", en: "Friday", fa: "جمعه" },
            { german: "Samstag", en: "Saturday", fa: "شنبه" },
            { german: "Sonntag", en: "Sunday", fa: "یکشنبه" }
        ]
    },
    months: {
        icon: "🗓️",
        title: { en: "Months", fa: "ماه‌ها" },
        description: { en: "January to December", fa: "ژانویه تا دسامبر" },
        type: "grid",
        words: [
            { german: "Januar", en: "January", fa: "ژانویه" },
            { german: "Februar", en: "February", fa: "فوریه" },
            { german: "März", en: "March", fa: "مارس" },
            { german: "April", en: "April", fa: "آوریل" },
            { german: "Mai", en: "May", fa: "مه" },
            { german: "Juni", en: "June", fa: "ژوئن" },
            { german: "Juli", en: "July", fa: "ژوئیه" },
            { german: "August", en: "August", fa: "اوت" },
            { german: "September", en: "September", fa: "سپتامبر" },
            { german: "Oktober", en: "October", fa: "اکتبر" },
            { german: "November", en: "November", fa: "نوامبر" },
            { german: "Dezember", en: "December", fa: "دسامبر" }
        ]
    },
    greetings: {
        icon: "👋",
        title: { en: "Greetings & Phrases", fa: "سلام و عبارات" },
        description: { en: "Common greetings and expressions", fa: "سلام‌ها و عبارات رایج" },
        type: "grid",
        words: [
            { german: "Hallo", en: "Hello", fa: "سلام" },
            { german: "Guten Morgen", en: "Good morning", fa: "صبح بخیر" },
            { german: "Guten Tag", en: "Good day", fa: "روز بخیر" },
            { german: "Guten Abend", en: "Good evening", fa: "شب بخیر" },
            { german: "Gute Nacht", en: "Good night", fa: "شب بخیر (خداحافظی)" },
            { german: "Auf Wiedersehen", en: "Goodbye", fa: "خداحافظ" },
            { german: "Tschüss", en: "Bye (informal)", fa: "بای" },
            { german: "Danke", en: "Thank you", fa: "ممنون" },
            { german: "Bitte", en: "Please / You're welcome", fa: "لطفاً / خواهش می‌کنم" },
            { german: "Entschuldigung", en: "Excuse me / Sorry", fa: "ببخشید" },
            { german: "Ja", en: "Yes", fa: "بله" },
            { german: "Nein", en: "No", fa: "نه" }
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

document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    setupControls();
    renderCategories();
    updatePageLanguage();
});

function loadPreferences() {
    const savedLang = window.MisiroData ? MisiroData.getLanguage() : localStorage.getItem('misiro_language');
    if (savedLang) {
        currentLang = savedLang;
    } else {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        currentLang = browserLang.startsWith('fa') ? 'fa' : 'en';
    }

    const savedSpeed = window.MisiroData ? MisiroData.getVoiceSpeed() : localStorage.getItem('misiro_voice_speed');
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
        return `
            <div class="word-card" onclick="playWord('${word.german}')">
                <div class="word-german">${word.german}</div>
                <div class="word-translation">${translation}</div>
                <div class="play-icon">🔊</div>
            </div>
        `;
    }).join('');

    return `<div class="word-grid">${items}</div>`;
}

function renderPronounTable(words) {
    const rows = words.map(word => {
        const meaning = currentLang === 'fa' ? word.fa : word.en;
        return `
            <div class="pronoun-row" onclick="playWord('${word.german}')">
                <div class="pronoun-german">${word.german}</div>
                <div class="pronoun-english">${meaning}</div>
                <div class="pronoun-meaning">${word.example} 🔊</div>
            </div>
        `;
    }).join('');

    return `<div class="pronoun-table">${rows}</div>`;
}

// =====================
// INTERACTIONS
// =====================

function toggleCategory(key) {
    const category = document.getElementById(`category-${key}`);
    category.classList.toggle('open');
}

function playWord(text) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = voiceSpeed;

    window.speechSynthesis.speak(utterance);
}

// Make functions globally available
window.toggleCategory = toggleCategory;
window.playWord = playWord;
