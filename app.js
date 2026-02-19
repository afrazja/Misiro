// Debug mode: set to true to enable verbose logging, or use URL param ?debug=true
const DEBUG = new URLSearchParams(window.location.search).has('debug');

// Detect browser language - default to English unless browser is Persian/Farsi
const browserLang = navigator.language || navigator.userLanguage || 'en';
const defaultLang = browserLang.startsWith('fa') ? 'fa' : 'en';

const appData = {
    currentDay: 1,
    currentSentenceIndex: 0,
    isListening: false,
    sessionID: 0,
    language: defaultLang,
    voiceSpeed: 1.0,
    isExamMode: false,
    examWeek: 0,
    examQuestions: [],
    currentExamIndex: 0,
    examScore: 0
};

// Data: Day 1 - The Café
// Data and Glossary are now loaded from lessons_data.js

// Helper function to get glossary meaning based on language
function getGlossaryMeaning(word) {
    const entry = wordGlossary[word.toLowerCase()];
    if (!entry) return null;
    if (typeof entry === 'string') return entry; // Old format fallback
    return appData.language === 'fa' ? entry.fa : entry.en;
}


// --- DOM Elements ---
const dom = {
    chatHistory: document.getElementById('chat-history'),
    answerLine: document.getElementById('answer-line'),
    btnSend: document.getElementById('btn-send'),
    daySelect: document.getElementById('day-select'),
    blindModeToggle: document.getElementById('blind-mode-toggle'),
    voiceEvalToggle: document.getElementById('voice-eval-toggle'),
    languageSelect: document.getElementById('language-select'),
    speedSelect: document.getElementById('speed-select'),
    scenarioTitle: document.getElementById('scenario-title-text'),
    currentScenarioDisplay: document.getElementById('current-scenario'),
    scriptContainer: document.getElementById('script-container')
};

// --- Voice Recognition Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'de-DE';
    recognition.interimResults = false; // We want final results for simplicity
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        appData.isListening = true;
        updateMicUI('listening');
        playTone('start');
    };

    recognition.onend = () => {
        appData.isListening = false;
        updateMicUI('idle');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (DEBUG) console.log("Heard:", transcript);
        handleVoiceInput(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Voice Error", event.error);
        playTone('error');
        updateMicUI('error');
    };
}

// --- Load/Save State ---
async function loadConversationState() {
    // Load saved language preference (async — server-first)
    const savedLang = await MisiroData.getLanguage();
    if (savedLang) {
        appData.language = savedLang;
    }

    // Load completed lessons first (needed to determine which day to show)
    appData.completedLessons = await MisiroData.getCompletedLessons();

    // Find the first uncompleted lesson and go there
    try {
        const completedDays = Object.keys(appData.completedLessons || {}).map(Number).filter(d => dailyLessons[d]);
        if (completedDays.length > 0) {
            const lastCompletedDay = Math.max(...completedDays);
            const nextDay = lastCompletedDay + 1;
            // If there's a next lesson, go to it (first uncompleted)
            if (dailyLessons[nextDay]) {
                appData.currentDay = nextDay;
                appData.currentSentenceIndex = 0;
            } else {
                // All lessons completed — show the last one's completion card
                appData.currentDay = lastCompletedDay;
                const lesson = dailyLessons[lastCompletedDay];
                appData.currentSentenceIndex = lesson ? lesson.sentences.length : 0;
            }
        } else {
            // No completed lessons — start at Day 1
            appData.currentDay = 1;
            appData.currentSentenceIndex = 0;
        }
    } catch (e) {
        console.error('Failed to load progress:', e);
    }

    if (DEBUG) console.log('Loaded state - language:', appData.language, 'day:', appData.currentDay, 'sentence:', appData.currentSentenceIndex);
}

// Check if a lesson day is unlocked (Day 1 always open, Day N requires Day N-1 completed)
function isDayUnlocked(day) {
    const d = parseInt(day);
    if (d === 1) return true;
    return !!(appData.completedLessons && appData.completedLessons[d - 1]);
}

async function saveProgress() {
    await MisiroData.saveProgress(appData.currentDay, appData.currentSentenceIndex);
    await MisiroData.saveCompletedLessons(appData.completedLessons || {});
}

function saveLanguagePreference() {
    MisiroData.setLanguage(appData.language);
}

// --- Spaced Repetition System ---
// SM-2 inspired: each sentence gets ease, interval, and next review date.
// Key format: "day:sentenceId" → { ease, interval, nextReview, attempts, successes }

const SR_MIN_EASE = 1.3;
const SR_INITIAL_INTERVAL = 1;  // 1 day

async function loadSRData() {
    return await MisiroData.loadSRData();
}

async function saveSRData(srData) {
    await MisiroData.saveSRData(srData);
}

function getSRKey(day, sentenceId) {
    return `${day}:${sentenceId}`;
}

async function recordSRAttempt(day, sentenceId, wasCorrect) {
    const srData = await loadSRData();
    const key = getSRKey(day, sentenceId);
    const now = Date.now();

    if (!srData[key]) {
        srData[key] = {
            ease: 2.5,
            interval: SR_INITIAL_INTERVAL,
            nextReview: 0,
            attempts: 0,
            successes: 0
        };
    }

    const card = srData[key];
    card.attempts++;

    if (wasCorrect) {
        card.successes++;
        // SM-2: increase interval
        if (card.interval === 1) {
            card.interval = 3;
        } else {
            card.interval = Math.round(card.interval * card.ease);
        }
        card.ease = Math.max(SR_MIN_EASE, card.ease + 0.1);
    } else {
        // Reset interval, decrease ease
        card.interval = SR_INITIAL_INTERVAL;
        card.ease = Math.max(SR_MIN_EASE, card.ease - 0.2);
    }

    // Set next review date (interval days from now)
    card.nextReview = now + (card.interval * 24 * 60 * 60 * 1000);
    card.lastReview = now;

    srData[key] = card;
    await saveSRData(srData);
}

async function getDueReviewItems() {
    const srData = await loadSRData();
    const now = Date.now();
    const due = [];

    for (const key in srData) {
        const card = srData[key];
        if (card.nextReview <= now && card.attempts > 0) {
            const [day, sentenceId] = key.split(':');
            due.push({
                key: key,
                day: parseInt(day),
                sentenceId: parseInt(sentenceId),
                ease: card.ease,
                interval: card.interval,
                attempts: card.attempts,
                successes: card.successes
            });
        }
    }

    // Sort: lowest ease first (hardest items reviewed first)
    due.sort((a, b) => a.ease - b.ease);
    return due;
}

async function getDueCount() {
    return (await getDueReviewItems()).length;
}

async function startReviewMode() {
    const dueItems = (await getDueReviewItems()).slice(0, 15); // Max 15 per review session

    if (dueItems.length === 0) {
        const noMsg = appData.language === 'fa' ? 'هیچ موردی برای مرور نیست!' : 'No items due for review!';
        addSystemMessage(noMsg);
        return;
    }

    // Load all needed lessons
    const uniqueDays = [...new Set(dueItems.map(item => item.day))];
    await loadLessons(uniqueDays);

    // Build review questions
    appData.isExamMode = true;
    appData.isReviewMode = true;
    appData.examWeek = 0;
    appData.currentExamIndex = 0;
    appData.examScore = 0;
    appData.examRetry = false;
    appData.examWrongAnswers = [];
    appData.examQuestions = [];

    for (const item of dueItems) {
        const lesson = dailyLessons[item.day];
        if (!lesson || !lesson.sentences) continue;

        const sentence = lesson.sentences.find(s => s.id === item.sentenceId);
        if (!sentence) continue;

        if (sentence.role === 'sent') {
            appData.examQuestions.push({
                type: 'speak',
                prompt: appData.language === 'fa' ? sentence.translationFa : sentence.translation,
                target: sentence.targetText,
                day: item.day,
                sentenceId: item.sentenceId
            });
        } else {
            appData.examQuestions.push({
                type: 'listen',
                prompt: sentence.audioText,
                target: sentence.audioText,
                translation: appData.language === 'fa' ? sentence.translationFa : sentence.translation,
                day: item.day,
                sentenceId: item.sentenceId
            });
        }
    }

    if (appData.examQuestions.length === 0) {
        appData.isExamMode = false;
        appData.isReviewMode = false;
        const noMsg = appData.language === 'fa' ? 'هیچ موردی برای مرور نیست!' : 'No items due for review!';
        addSystemMessage(noMsg);
        return;
    }

    const totalQ = appData.examQuestions.length;
    const isFa = appData.language === 'fa';
    const title = isFa ? `مرور فاصله‌دار` : `Spaced Review`;
    const desc = isFa
        ? `${totalQ} جمله برای مرور آماده‌ست. جمله‌هایی که بیشتر باهاشون مشکل داشتی اول میان.`
        : `${totalQ} sentences due for review. Items you struggled with come first.`;

    dom.chatHistory.innerHTML = `
        <div class="message system" style="background:#fff3e0; border-radius:10px; padding:15px; margin:10px;">
            <div class="text" style="color:#e65100; ${isFa ? 'direction:rtl;' : ''}">
                <b>🔄 ${title}</b><br>${desc}
            </div>
        </div>
        <div id="exam-progress-bar" style="width:100%; background:#e0e0e0; border-radius:10px; height:8px; margin:5px 10px;">
            <div id="exam-progress-fill" style="width:0%; background:#FF9800; height:100%; border-radius:10px; transition:width 0.3s;"></div>
        </div>
    `;

    processNextExamQuestion();
}

async function populateDaySelect() {
    const select = dom.daySelect;
    if (!select) return;

    select.innerHTML = ''; // Clear existing

    // Add review option at the top if items are due
    const dueCount = await getDueCount();
    if (dueCount > 0) {
        const reviewGroup = document.createElement('optgroup');
        const isFa = appData.language === 'fa';
        reviewGroup.label = isFa ? 'مرور' : 'Review';

        const reviewOpt = document.createElement('option');
        reviewOpt.value = 'review';
        reviewOpt.textContent = isFa ? `🔄 مرور (${dueCount} مورد)` : `🔄 Review (${dueCount} due)`;
        reviewOpt.style.fontWeight = 'bold';
        reviewGroup.appendChild(reviewOpt);
        select.appendChild(reviewGroup);
    }

    // Group days into weeks
    const weeks = {};
    Object.keys(dailyLessons).forEach(day => {
        const weekNum = Math.ceil(day / 7);
        if (!weeks[weekNum]) weeks[weekNum] = [];
        weeks[weekNum].push(day);
    });

    Object.keys(weeks).forEach(weekNum => {
        const group = document.createElement('optgroup');
        group.label = `Week ${weekNum}`;

        weeks[weekNum].forEach(day => {
            const lesson = dailyLessons[day];
            const option = document.createElement('option');
            option.value = day;
            const isCompleted = appData.completedLessons && appData.completedLessons[day];
            const unlocked = isDayUnlocked(day);

            if (isCompleted) {
                option.textContent = '✅ ' + lesson.title;
            } else if (!unlocked) {
                option.textContent = '🔒 ' + lesson.title;
                option.disabled = true;
            } else {
                option.textContent = lesson.title;
            }
            if (parseInt(day) === appData.currentDay) option.selected = true;
            group.appendChild(option);
        });

        // Add Exam for this week if full week (locked until all days completed)
        if (weeks[weekNum].length === 7) {
            const allWeekDone = weeks[weekNum].every(d =>
                appData.completedLessons && appData.completedLessons[d]
            );
            const examOpt = document.createElement('option');
            examOpt.value = `exam${weekNum}`;
            examOpt.textContent = allWeekDone
                ? `Week ${weekNum} Exam`
                : `🔒 Week ${weekNum} Exam`;
            if (!allWeekDone) examOpt.disabled = true;
            group.appendChild(examOpt);
        }

        select.appendChild(group);
    });
}

async function updateDaySelectMarkers() {
    // Re-render the day select to show updated completion markers
    const currentVal = dom.daySelect ? dom.daySelect.value : null;
    await populateDaySelect();
    if (currentVal && dom.daySelect) {
        dom.daySelect.value = currentVal;
    }
}

// --- Initialization ---
async function init() {
    await loadConversationState();
    await populateDaySelect();
    setupVoiceUI();
    setupLanguageSelection();
    await setupSpeedSelection();
    setupDaySelection();

    // Sync data from cloud if user is logged in
    if (window.MisiroData && window.misiroAuth) {
        const authed = await misiroAuth.isAuthenticated();
        if (authed) {
            await MisiroData.syncOnLogin();
            // Reload state after sync in case cloud data was newer
            await loadConversationState();
            await populateDaySelect();
        }
    }

    // Load current lesson data + glossary before starting
    await Promise.all([
        loadLesson(appData.currentDay),
        loadGlossary()
    ]);

    // Signal that init is complete — early click handler will use this
    window._misiroReady = true;
    _startLessonIfClicked();
}

// Early-registered start button handler — works even before init() finishes
let _userClickedStart = false;
function _startLessonIfClicked() {
    if (!_userClickedStart || !window._misiroReady) return;
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.style.display = 'none';
    // Resume AudioContext
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // Start flow
    processNextStep();
    const startMsg = appData.language === 'fa' ? 'شروع درس.' : 'Starting lesson.';
    playAudio(startMsg, 1.0, appData.language === 'fa' ? 'fa-IR' : 'en-US');
}

// Register click handler immediately when script loads (before init)
(function() {
    const startBtn = document.getElementById('btn-start-lesson');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            _userClickedStart = true;
            // Show loading state on button
            startBtn.textContent = '⏳ Loading...';
            startBtn.disabled = true;
            // If init already done, start immediately; otherwise init will call us
            _startLessonIfClicked();
        });
    } else {
        // No overlay — auto-start when init completes
        _userClickedStart = true;
    }
})();

// --- Language Selection ---
function setupLanguageSelection() {
    if (!dom.languageSelect) return;
    dom.languageSelect.value = appData.language;

    dom.languageSelect.addEventListener('change', (e) => {
        appData.language = e.target.value;
        saveLanguagePreference();
        if (DEBUG) console.log('Language changed to:', appData.language);

        // Stop current activities
        if (appData.isListening && recognition) recognition.stop();
        stopAllAudio();

        // Remove teach bubble if exists
        if (appData.currentTeachBubble) {
            appData.currentTeachBubble.remove();
            appData.currentTeachBubble = null;
        }

        // Increment session to abort any running async processes
        appData.sessionID++;

        // Update UI
        updateScenarioTitle();
        renderScript();
        dom.chatHistory.innerHTML = '<div class="date-divider">Today</div>';
        dom.answerLine.innerHTML = '';

        // Restart current step with new language
        processNextStep();
    });
}

// Helper to get translation based on current language
function getTranslation(step) {
    if (appData.language === 'fa' && step.translationFa) {
        return step.translationFa;
    }
    return step.translation;
}

// Helper to get audio language code
function getTranslationLang() {
    return appData.language === 'fa' ? 'fa-IR' : 'en-US';
}

// --- Speed Selection ---
async function setupSpeedSelection() {
    if (!dom.speedSelect) return;

    // Load saved speed preference (async — server-first)
    const savedSpeed = await MisiroData.getVoiceSpeed();
    if (savedSpeed !== null) {
        appData.voiceSpeed = savedSpeed;
    }
    dom.speedSelect.value = appData.voiceSpeed.toString();

    dom.speedSelect.addEventListener('change', (e) => {
        appData.voiceSpeed = parseFloat(e.target.value);
        MisiroData.setVoiceSpeed(appData.voiceSpeed);
        if (DEBUG) console.log('Voice speed changed to:', appData.voiceSpeed);
    });
}

// Helper to get current voice speed
function getVoiceSpeed() {
    return appData.voiceSpeed;
}

function setupVoiceUI() {
    const wb = document.getElementById('word-bank');
    if (wb) wb.innerHTML = '<div style="text-align:center; width:100%; color:#888; padding:10px;">🎙️ Voice Mode Active</div>';

    dom.btnSend.innerHTML = '🎤';
    dom.btnSend.classList.add('ready');
    dom.btnSend.style.fontSize = "24px";

    // Clone to remove old listeners
    const newBtn = dom.btnSend.cloneNode(true);
    dom.btnSend.parentNode.replaceChild(newBtn, dom.btnSend);
    dom.btnSend = newBtn;

    dom.btnSend.addEventListener('click', toggleMic);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !appData.isListening) {
            e.preventDefault();
            toggleMic();
        }
    });
}

function toggleMic() {
    if (!recognition) return;
    if (appData.isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function updateMicUI(state) {
    if (state === 'listening') {
        dom.btnSend.style.background = '#f44336';
        dom.btnSend.innerHTML = '🛑';
        dom.btnSend.classList.add('pulse');
        dom.answerLine.innerHTML = '<span style="color:#f44336">Listening...</span>';
    } else if (state === 'idle') {
        dom.btnSend.style.background = '#075E54';
        dom.btnSend.innerHTML = '🎤';
        dom.btnSend.classList.remove('pulse');
    } else if (state === 'error') {
        dom.btnSend.style.background = '#aaa';
        dom.btnSend.innerHTML = '⚠️';
    }
}

// setupVoiceEval and updateModeUI deprecated.
// All controls are always visible now.

function setupDaySelection() {
    if (!dom.daySelect) return;

    // Set initial value based on appData
    dom.daySelect.value = appData.currentDay;

    // Update title initially
    updateScenarioTitle();
    // Render script initially
    renderScript();

    dom.daySelect.addEventListener('change', async (e) => {
        const val = e.target.value;

        // Stop current activities
        if (appData.isListening && recognition) recognition.stop();
        stopAllAudio();

        // Clear teach bubble
        if (appData.currentTeachBubble) {
            appData.currentTeachBubble.remove();
            appData.currentTeachBubble = null;
        }

        if (val === 'review') {
            startReviewMode();
            return;
        }

        if (val.startsWith('exam')) {
            const week = parseInt(val.replace('exam', ''));
            startExam(week);
            return;
        }

        const newDay = parseInt(val);
        if (!isDayUnlocked(newDay)) {
            dom.daySelect.value = appData.currentDay; // revert to current day
            return;
        }
        if (newDay === appData.currentDay && !appData.isExamMode) return;

        appData.isExamMode = false;
        appData.currentDay = newDay;
        // If this day is completed, show completion card; otherwise start from sentence 0
        const selectedLesson = dailyLessons[newDay];
        if (appData.completedLessons && appData.completedLessons[newDay] && selectedLesson) {
            appData.currentSentenceIndex = selectedLesson.sentences.length;
        } else {
            appData.currentSentenceIndex = 0;
        }
        appData.sessionID++;

        await saveProgress();

        // Load the new lesson data before rendering
        await loadLesson(newDay);

        dom.chatHistory.innerHTML = '<div class="date-divider">Today</div>';
        dom.answerLine.innerHTML = '';
        updateScenarioTitle();
        renderScript();
        processNextStep();
    });
}

function updateScenarioTitle() {
    const lesson = getCurrentLesson();
    if (lesson && dom.scenarioTitle) {
        // Use Persian title if available and language is Persian
        if (appData.language === 'fa' && lesson.titleFa) {
            const titleParts = lesson.titleFa.split(': ');
            dom.scenarioTitle.textContent = titleParts.length > 1 ? titleParts[1] : lesson.titleFa;
        } else {
            const titleParts = lesson.title.split(': ');
            dom.scenarioTitle.textContent = titleParts.length > 1 ? titleParts[1] : lesson.title;
        }

        if (dom.currentScenarioDisplay) {
            dom.currentScenarioDisplay.textContent = appData.currentDay;
        }
    }
}

function renderScript() {
    if (!dom.scriptContainer) return;
    const lesson = getCurrentLesson();
    dom.scriptContainer.innerHTML = '';

    const isLessonCompleted = !!(appData.completedLessons && appData.completedLessons[appData.currentDay]);

    lesson.sentences.forEach((step, index) => {
        const div = document.createElement('div');
        div.className = 'script-item';
        if (isLessonCompleted || index < appData.currentSentenceIndex) {
            div.classList.add('done');
        }
        div.id = `script-item-${index}`;

        const german = step.role === 'received' ? step.audioText : step.targetText;
        const translation = getTranslation(step);

        div.innerHTML = `
            <div class="german">${german}</div>
            <div class="translation" style="direction: ${appData.language === 'fa' ? 'rtl' : 'ltr'};">${translation}</div>
        `;

        // Make sidebar sentences clickable — jump to that sentence for practice
        div.addEventListener('click', () => {
            if (appData.isListening && recognition) recognition.stop();
            stopAllAudio();
            if (appData.currentTeachBubble) {
                appData.currentTeachBubble.remove();
                appData.currentTeachBubble = null;
            }
            appData.sessionID++;
            appData.currentSentenceIndex = index;
            dom.chatHistory.innerHTML = '<div class="date-divider">Today</div>';
            dom.answerLine.innerHTML = '';
            processNextStep();
        });

        dom.scriptContainer.appendChild(div);
    });
}

function highlightScriptItem(index) {
    if (!dom.scriptContainer) return;

    // Remove old active
    const old = dom.scriptContainer.querySelector('.script-item.active');
    if (old) old.classList.remove('active');

    // Add new active
    const current = document.getElementById(`script-item-${index}`);
    if (current) {
        current.classList.add('active');
        current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function markScriptItemDone(index) {
    const item = document.getElementById(`script-item-${index}`);
    if (item) item.classList.add('done');
}

// --- Logic ---

function getCurrentLesson() { return dailyLessons[appData.currentDay]; }

async function processNextStep() {
    const mySessionID = appData.sessionID; // Capture current session
    const lesson = getCurrentLesson();
    if (appData.currentSentenceIndex >= lesson.sentences.length) {
        const wasAlreadyCompleted = !!(appData.completedLessons && appData.completedLessons[appData.currentDay]);

        if (!wasAlreadyCompleted) {
            const doneMsg = appData.language === 'fa' ? 'آفرین! درس تموم شد.' : 'Great job! You finished the lesson.';
            playAudio(doneMsg, 1.0, getTranslationLang());
        }

        // Mark lesson as completed and save progress
        if (!appData.completedLessons) appData.completedLessons = {};
        appData.completedLessons[appData.currentDay] = {
            completedAt: Date.now(),
            sentenceCount: lesson.sentences.length
        };
        await saveProgress();
        await updateDaySelectMarkers();

        // Build completion card with optional "Next Day" button
        const isFa = appData.language === 'fa';
        const nextDay = appData.currentDay + 1;
        const hasNextDay = !!dailyLessons[nextDay];
        const nextLesson = hasNextDay ? dailyLessons[nextDay] : null;

        let nextBtnHTML = '';
        if (hasNextDay) {
            const nextTitle = (isFa && nextLesson.titleFa) ? nextLesson.titleFa : nextLesson.title;
            const btnLabel = isFa ? 'درس بعدی' : 'Next Lesson';
            nextBtnHTML = `
                <button id="btn-next-day" style="padding:12px 30px; border-radius:30px; border:none; background:linear-gradient(90deg,#2196F3,#42a5f5); color:white; cursor:pointer; font-size:1.05rem; font-weight:600; margin-top:15px; transition:all 0.3s ease;"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 20px rgba(33,150,243,0.4)'"
                    onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                    ${btnLabel} → <span style="font-weight:400; font-size:0.9em;">${nextTitle}</span>
                </button>
            `;
        } else {
            const allDoneMsg = isFa ? 'همه درس‌ها را تمام کردید! 🏆' : 'All lessons completed! 🏆';
            nextBtnHTML = `<p style="color:#a0a0a0; margin-top:10px;">${allDoneMsg}</p>`;
        }

        const completionCard = document.createElement('div');
        completionCard.className = 'message system';
        completionCard.style.cssText = 'background:#e8f5e9; border-radius:15px; padding:25px; margin:10px;';
        completionCard.innerHTML = `
            <div class="text" style="text-align:center;">
                <div style="font-size:2.5em; margin-bottom:10px;">🎉</div>
                <h2 style="margin:0 0 5px; color:#2e7d32;">${isFa ? 'آفرین!' : 'Well Done!'}</h2>
                <p style="color:#555; margin:0;">${isFa ? 'این درس را با موفقیت تمام کردید.' : 'You completed this lesson successfully.'}</p>
                ${nextBtnHTML}
            </div>
        `;
        dom.chatHistory.appendChild(completionCard);
        scrollToBottom();

        // Attach next day button handler
        if (hasNextDay) {
            const nextBtn = document.getElementById('btn-next-day');
            if (nextBtn) {
                nextBtn.addEventListener('click', async () => {
                    appData.isExamMode = false;
                    appData.currentDay = nextDay;
                    appData.currentSentenceIndex = 0;
                    appData.sessionID++;

                    await saveProgress();
                    await loadLesson(nextDay);

                    dom.chatHistory.innerHTML = '<div class="date-divider">Today</div>';
                    dom.answerLine.innerHTML = '';
                    dom.daySelect.value = nextDay;
                    updateScenarioTitle();
                    renderScript();
                    processNextStep();
                });
            }
        }
        return;
    }

    const currentStep = lesson.sentences[appData.currentSentenceIndex];

    // Highlight Script
    highlightScriptItem(appData.currentSentenceIndex);

    // Normalize target text: Role 'received' uses audioText, 'sent' uses targetText
    const germanText = currentStep.role === 'received' ? currentStep.audioText : currentStep.targetText;
    const translationText = getTranslation(currentStep);

    // --- SCAFFOLDING SEQUENCE ---
    // Visual
    const isBlindMode = dom.blindModeToggle && dom.blindModeToggle.checked;
    let visualContent = '';

    if (isBlindMode) {
        const hiddenMsg = appData.language === 'fa' ? '🙈 [مخفی] - گوش کن!' : '🙈 [Hidden] - Listen!';
        visualContent = `<span style="color:#ccc; font-weight:normal;">${hiddenMsg}</span>`;
    } else {
        visualContent = createInteractiveSentence(germanText);
    }

    const isFaDir = appData.language === 'fa';
    const nextLabel = isFaDir ? 'بعدی ←' : 'Next ➡';

    const teachBubble = document.createElement('div');
    teachBubble.className = 'message instruction';
    teachBubble.innerHTML = `
        <div style="font-size:1.2em; color:#333; margin-bottom:5px; direction:${isFaDir ? 'rtl' : 'ltr'};">${translationText}</div>
        <div style="font-weight:bold; font-size:1.1em; color:#555; display:flex; align-items:center; gap:10px;">
            <span id="speaker-icon" style="cursor:pointer; font-size:1.2em;" title="Play Full Sentence">🔊</span>
            <span id="teach-text-container">${visualContent}</span>
            <button id="btn-inline-next" style="padding:6px 16px; border-radius:20px; border:none; background:#4CAF50; color:white; cursor:pointer; font-weight:bold; font-size:0.95em; margin-left:10px; transition:all 0.3s ease;"
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 3px 10px rgba(76,175,80,0.3)'"
                onmouseout="this.style.transform='none'; this.style.boxShadow='none'">${nextLabel}</button>
        </div>
    `;
    dom.chatHistory.appendChild(teachBubble);

    // Add Listener for Full Sentence Replay (Speaker Icon)
    const speakerIcon = teachBubble.querySelector('#speaker-icon');
    if (speakerIcon) {
        speakerIcon.onclick = async () => {
            stopAllAudio();
            if (appData.isListening && recognition) recognition.stop();
            await playAudioPromise(germanText, 0.8, 'de-DE');
        };
    }

    // Add Listener for Inline Next Button
    const inlineNextBtn = teachBubble.querySelector('#btn-inline-next');
    if (inlineNextBtn) {
        inlineNextBtn.onclick = () => {
            appData.manualNext();
        };
    }

    // Blind Mode Replay (Clicking text area)
    const textContainer = teachBubble.querySelector('#teach-text-container');
    if (isBlindMode && textContainer) {
        textContainer.style.cursor = 'pointer';
        textContainer.onclick = async () => {
            stopAllAudio();
            if (appData.isListening && recognition) recognition.stop();
            await playAudioPromise(germanText, 0.8, 'de-DE');
        };
    }

    appData.currentTeachBubble = teachBubble; // Store reference to remove later
    scrollToBottom();

    // AUDIO SEQUENCE:
    // 1. Translation (Persian or English based on language setting)
    await playAudioPromise(translationText, 1.1, getTranslationLang());
    if (appData.sessionID !== mySessionID) return; // Abort if session changed
    await wait(300);
    if (appData.sessionID !== mySessionID) return;

    // 2. German (Slower)
    await playAudioPromise(germanText, 0.8, 'de-DE');
    if (appData.sessionID !== mySessionID) return;

    // Stop here. Wait for user.
    const promptMsg = appData.language === 'fa' ? 'برای تمرین 🎙️ را بزنید یا بعدی.' : 'Tap 🎙️ to practice or Next to skip.';
    dom.answerLine.innerHTML = `<span class="placeholder-text">${promptMsg}</span>`;
}

appData.manualNext = async function () {
    // Manual Next Button Clicked
    const lesson = getCurrentLesson();
    const currentStep = lesson.sentences[appData.currentSentenceIndex];

    // Visuals: If they skipped, we still might want to show the bubble as "done"?
    // Or just move on. Let's just move on.
    if (appData.currentTeachBubble) {
        appData.currentTeachBubble.remove();
        appData.currentTeachBubble = null;
    }
    // Add the "received" bubble to history so they see it.
    addMessageBubble(currentStep);
    dom.answerLine.innerHTML = '';

    // Stop things
    if (appData.isListening && recognition) recognition.stop();
    stopAllAudio();

    markScriptItemDone(appData.currentSentenceIndex);
    appData.currentSentenceIndex++;
    await saveProgress();
    processNextStep();
};

async function prepareUserTurn(step, germanText) {
    dom.answerLine.innerHTML = `<span class="placeholder-text">Speak: "${germanText}"</span>`;

    // Prompt
    await playAudioPromise("Your turn.", 1.1, 'en-US');

    try {
        toggleMic();
    } catch (e) {
        playAudio("Tap mic.", 1.0, 'en-US');
    }
}

async function handleVoiceInput(transcript) {
    // Determine target text based on mode
    let targetGerman;
    const lesson = !appData.isExamMode ? getCurrentLesson() : null;
    const currentStep = lesson ? lesson.sentences[appData.currentSentenceIndex] : null;

    if (appData.isExamMode) {
        const examQ = appData.examQuestions[appData.currentExamIndex];
        targetGerman = examQ ? examQ.target : '';
    } else {
        targetGerman = currentStep.role === 'received' ? currentStep.audioText : currentStep.targetText;
    }

    const cleanUser = transcript.toLowerCase().replace(/[.,!?]/g, '').trim();
    const cleanTarget = targetGerman.toLowerCase().replace(/[.,!?]/g, '').trim();

    if (DEBUG) console.log(`Compare: '${cleanUser}' vs '${cleanTarget}'`);

    // Word-based matching - require at least 80% of words to be spoken
    const targetWords = cleanTarget.split(/\s+/);
    const userWords = cleanUser.split(/\s+/);

    let matchedWords = 0;
    targetWords.forEach(targetWord => {
        if (userWords.some(userWord => userWord === targetWord ||
            userWord.includes(targetWord) || targetWord.includes(userWord))) {
            matchedWords++;
        }
    });

    const matchPercentage = matchedWords / targetWords.length;
    if (DEBUG) console.log(`Matched ${matchedWords}/${targetWords.length} words (${Math.round(matchPercentage * 100)}%)`);

    // Require at least 80% of words to match
    if (matchPercentage >= 0.8) {
        playTone('success');

        if (appData.isExamMode) {
            appData.examScore++;
            // Track SR for exam/review questions
            const examQ = appData.examQuestions[appData.currentExamIndex];
            if (examQ && examQ.day && examQ.sentenceId) {
                await recordSRAttempt(examQ.day, examQ.sentenceId, true);
            }
            const correctMsg = appData.language === 'fa' ? 'درسته!' : 'Correct!';
            dom.answerLine.innerHTML = `<span style="color:green">${correctMsg}</span>`;
            setTimeout(() => {
                appData.currentExamIndex++;
                processNextExamQuestion();
            }, 1000);
            return;
        }

        // VISUAL FEEDBACK: Mark all correct
        const words = appData.currentTeachBubble.querySelectorAll('.interactive-word');
        words.forEach(el => {
            el.classList.remove('error');
            el.classList.add('success');
        });

        // Finalize Visuals
        // if (appData.currentTeachBubble) { ... } // Do NOT remove bubble yet, user might see green.
        // Actually flow says: add "received" bubble, remove prompt.
        // Let's delay slighty or just proceed.

        // We'll proceed.
        if (appData.currentTeachBubble) {
            appData.currentTeachBubble.remove();
            appData.currentTeachBubble = null;
        }
        addMessageBubble(currentStep);
        dom.answerLine.innerHTML = '';

        // Track spaced repetition (correct in lesson mode)
        if (currentStep) {
            await recordSRAttempt(appData.currentDay, currentStep.id, true);
        }

        // Feedback
        await playAudioPromise("Good.", 1.2, 'en-US');
        markScriptItemDone(appData.currentSentenceIndex);
        appData.currentSentenceIndex++;
        await saveProgress();
        processNextStep();

    } else {
        playTone('error');
        dom.answerLine.innerHTML = `<span style="color:red">Heard: "${transcript}"</span>`;
        dom.answerLine.classList.add('wrong');
        setTimeout(() => dom.answerLine.classList.remove('wrong'), 1000);

        // VISUAL FEEDBACK: Check individual words (only in lesson mode with teach bubble)
        if (appData.currentTeachBubble) {
            const words = appData.currentTeachBubble.querySelectorAll('.interactive-word');
            words.forEach(el => {
                const wordText = el.textContent.toLowerCase().replace(/[.,!?]/g, '').trim();
                if (cleanUser.includes(wordText)) {
                    el.classList.remove('error');
                    el.classList.add('success');
                } else {
                    el.classList.remove('success');
                    el.classList.add('error');
                }
            });
        }

        if (appData.isExamMode) {
            if (!appData.examRetry) {
                appData.examRetry = true;
                const retryMsg = appData.language === 'fa' ? 'یکبار دیگه تلاش کن...' : 'Try once more...';
                dom.answerLine.innerHTML = `<span style="color:orange">${retryMsg}</span>`;
                playAudioPromise(targetGerman, 0.8, 'de-DE');
            } else {
                appData.examRetry = false;
                // Track SR failure for exam/review questions
                const examQ = appData.examQuestions[appData.currentExamIndex];
                if (examQ && examQ.day && examQ.sentenceId) {
                    await recordSRAttempt(examQ.day, examQ.sentenceId, false);
                }
                // Record wrong answer for review
                if (!appData.examWrongAnswers) appData.examWrongAnswers = [];
                appData.examWrongAnswers.push({
                    prompt: appData.examQuestions[appData.currentExamIndex].prompt,
                    target: targetGerman,
                    heard: transcript
                });
                const nextMsg = appData.language === 'fa' ? 'سوال بعدی...' : 'Moving to next...';
                dom.answerLine.innerHTML = `<span style="color:red">${nextMsg}</span>`;
                setTimeout(() => {
                    appData.currentExamIndex++;
                    processNextExamQuestion();
                }, 1500);
            }
        } else {
            // Track SR failure in lesson mode
            if (currentStep) {
                await recordSRAttempt(appData.currentDay, currentStep.id, false);
            }
            playAudioPromise(targetGerman, 0.8, 'de-DE');
        }
    }
}

// --- Exam System ---

async function startExam(week) {
    appData.isExamMode = true;
    appData.examWeek = week;
    appData.currentExamIndex = 0;
    appData.examScore = 0;
    appData.examQuestions = [];
    appData.examRetry = false;
    appData.examWrongAnswers = [];

    const startDay = (week - 1) * 7 + 1;
    const endDay = week * 7;

    // Load all lessons for this week
    const daysToLoad = [];
    for (let d = startDay; d <= endDay; d++) {
        if (dailyLessons[d]) daysToLoad.push(d);
    }
    await loadLessons(daysToLoad);

    let pool = [];
    for (let d = startDay; d <= endDay; d++) {
        if (dailyLessons[d]) {
            dailyLessons[d].sentences.forEach(s => {
                if (s.role === 'sent') {
                    // Speaking question: see translation, speak German
                    pool.push({
                        type: 'speak',
                        prompt: appData.language === 'fa' ? s.translationFa : s.translation,
                        target: s.targetText,
                        day: d
                    });
                } else if (s.role === 'received') {
                    // Listening question: hear German audio, speak it back
                    pool.push({
                        type: 'listen',
                        prompt: s.audioText,
                        target: s.audioText,
                        translation: appData.language === 'fa' ? s.translationFa : s.translation,
                        day: d
                    });
                }
            });
        }
    }

    // Shuffle and pick up to 20
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 20);
    appData.examQuestions = pool;
    const totalQ = pool.length;

    const isFa = appData.language === 'fa';
    const title = isFa ? `آزمون هفته ${week} شروع شد!` : `Week ${week} Exam Started!`;
    const desc = isFa
        ? `${totalQ} سوال برای ارزیابی یادگیری شما.<br>ترجمه‌ها را ببینید و نسخه آلمانی را بگویید.`
        : `${totalQ} questions to evaluate your learning.<br>Translate the prompts and speak the German version.`;

    dom.chatHistory.innerHTML = `
        <div class="message system" style="background:#e3f2fd; border-radius:10px; padding:15px; margin:10px;">
            <div class="text" style="color:#1565c0; ${isFa ? 'direction:rtl;' : ''}">
                <b>${title}</b><br>${desc}
            </div>
        </div>
        <div id="exam-progress-bar" style="width:100%; background:#e0e0e0; border-radius:10px; height:8px; margin:5px 10px;">
            <div id="exam-progress-fill" style="width:0%; background:#2196F3; height:100%; border-radius:10px; transition:width 0.3s;"></div>
        </div>
    `;

    processNextExamQuestion();
}

function updateExamProgress() {
    const fill = document.getElementById('exam-progress-fill');
    if (fill && appData.examQuestions.length > 0) {
        const pct = Math.round((appData.currentExamIndex / appData.examQuestions.length) * 100);
        fill.style.width = pct + '%';
    }
}

function processNextExamQuestion() {
    // Reset retry flag for new question
    appData.examRetry = false;

    if (appData.currentExamIndex >= appData.examQuestions.length) {
        finishExam();
        return;
    }

    updateExamProgress();

    const q = appData.examQuestions[appData.currentExamIndex];
    const totalQ = appData.examQuestions.length;
    const isFa = appData.language === 'fa';
    const qNum = appData.currentExamIndex + 1;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'message received';
    msgDiv.style.borderLeft = q.type === 'listen' ? '4px solid #FF9800' : '4px solid #2196F3';

    if (q.type === 'listen') {
        // Listening question: play audio, user repeats
        const typeLabel = isFa ? '🎧 گوش کن و تکرار کن' : '🎧 Listen & Repeat';
        msgDiv.innerHTML = `
            <div class="avatar">🎓</div>
            <div class="content">
                <div class="sub-text" style="font-size:0.75em; color:#FF9800; font-weight:bold; margin-bottom:4px;">${typeLabel}</div>
                <div class="text" style="font-style:italic; color:#888; ${isFa ? 'direction:rtl;' : ''}">${q.translation}</div>
                <div class="sub-text" style="font-size:0.8em; color:#666;">${isFa ? `سوال ${qNum} از ${totalQ}` : `Question ${qNum}/${totalQ}`}</div>
            </div>
        `;
        dom.chatHistory.appendChild(msgDiv);
        scrollToBottom();

        // Play the German audio, then auto-start mic
        const listenMsg = isFa ? 'گوش کن...' : 'Listening...';
        dom.answerLine.innerHTML = `<span class="placeholder-text">${listenMsg}</span>`;
        playAudioPromise(q.prompt, 0.8, 'de-DE').then(() => {
            const speakMsg = isFa ? 'حالا بگو...' : 'Now speak...';
            dom.answerLine.innerHTML = `<span class="placeholder-text">🎤 ${speakMsg}</span>`;
            setTimeout(() => {
                if (!appData.isListening && appData.isExamMode) toggleMic();
            }, 500);
        });
    } else {
        // Speaking question: show translation, user speaks German
        const typeLabel = isFa ? '🗣️ به آلمانی بگو' : '🗣️ Say in German';
        msgDiv.innerHTML = `
            <div class="avatar">🎓</div>
            <div class="content">
                <div class="sub-text" style="font-size:0.75em; color:#2196F3; font-weight:bold; margin-bottom:4px;">${typeLabel}</div>
                <div class="text" style="${isFa ? 'direction:rtl;' : ''}">${q.prompt}</div>
                <div class="sub-text" style="font-size:0.8em; color:#666;">${isFa ? `سوال ${qNum} از ${totalQ}` : `Question ${qNum}/${totalQ}`}</div>
            </div>
        `;
        dom.chatHistory.appendChild(msgDiv);
        scrollToBottom();

        const speakMsg = isFa ? 'آلمانی بگو...' : 'Speak in German...';
        dom.answerLine.innerHTML = `<span class="placeholder-text">🎤 ${speakMsg}</span>`;

        // Auto start mic
        setTimeout(() => {
            if (!appData.isListening && appData.isExamMode) toggleMic();
        }, 500);
    }
}

async function finishExam() {
    const wasReview = appData.isReviewMode || false;
    appData.isExamMode = false;
    appData.isReviewMode = false;
    const totalQ = appData.examQuestions.length;
    const percentage = totalQ > 0 ? Math.round((appData.examScore / totalQ) * 100) : 0;
    const isFa = appData.language === 'fa';

    // Update progress bar to 100%
    updateExamProgress();
    const fill = document.getElementById('exam-progress-fill');
    if (fill) fill.style.width = '100%';

    // Save exam results
    const weekKey = `week_${appData.examWeek}`;
    const examResultData = {
        score: appData.examScore,
        total: totalQ,
        percentage: percentage,
        date: Date.now(),
        wrongAnswers: appData.examWrongAnswers || []
    };
    await MisiroData.saveExamResult(weekKey, examResultData);

    // Build wrong answers review
    let wrongReviewHTML = '';
    if (appData.examWrongAnswers && appData.examWrongAnswers.length > 0) {
        const reviewTitle = isFa ? 'مرور اشتباهات:' : 'Review mistakes:';
        wrongReviewHTML = `
            <div style="text-align:left; margin-top:15px; padding-top:15px; border-top:1px solid #ddd;">
                <b style="${isFa ? 'direction:rtl; display:block;' : ''}">${reviewTitle}</b>
                <div style="margin-top:8px; font-size:0.9em;">
                    ${appData.examWrongAnswers.map(w => `
                        <div style="padding:6px 0; border-bottom:1px solid #eee;">
                            <div style="color:#333; font-weight:bold;">${w.target}</div>
                            <div style="color:#888; font-size:0.85em; ${isFa ? 'direction:rtl;' : ''}">${w.prompt}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let passTitle, failTitle, passMsg, failMsg;
    if (wasReview) {
        passTitle = isFa ? '🎉 مرور عالی بود!' : '🎉 Great Review!';
        failTitle = isFa ? '🔄 ادامه بده!' : '🔄 Keep Going!';
        passMsg = isFa ? 'مرور فاصله‌دار عالی پیش رفت!' : "Your spaced review went great!";
        failMsg = isFa ? 'این جملات دوباره برای مرور برمی‌گردن.' : "These sentences will come back for review.";
    } else {
        passTitle = isFa ? '🎉 آفرین!' : '🎉 Well Done!';
        failTitle = isFa ? '📚 بیشتر تمرین کن' : '📚 Keep Practicing';
        passMsg = isFa ? 'این هفته رو یاد گرفتی!' : "You've mastered this week!";
        failMsg = isFa ? 'درس‌های این هفته رو مرور کن.' : "Review this week's lessons to improve.";
    }
    const btnText = isFa ? 'برگشت به درس‌ها' : 'Return to Lessons';

    const summary = document.createElement('div');
    summary.className = 'message system';
    summary.style.background = percentage >= 80 ? '#e8f5e9' : '#fff3e0';
    summary.style.padding = "20px";
    summary.style.borderRadius = "15px";
    summary.innerHTML = `
        <div class="text" style="text-align:center">
            <h2 style="margin:0">${percentage >= 80 ? passTitle : failTitle}</h2>
            <div style="font-size:2em; margin:10px 0;">${appData.examScore} / ${totalQ}</div>
            <p>${percentage}% — ${percentage >= 80 ? passMsg : failMsg}</p>
            ${wrongReviewHTML}
            <button onclick="location.reload()" style="padding:10px 20px; border-radius:30px; border:none; background:#2196F3; color:white; cursor:pointer; margin-top:15px;">${btnText}</button>
        </div>
    `;
    dom.chatHistory.appendChild(summary);
    scrollToBottom();

    // Refresh day selector to update review due count
    updateDaySelectMarkers();
}

// --- Helpers ---

function addMessageBubble(step) {
    const bubble = document.createElement('div');
    bubble.className = `message ${step.role}`;

    const textToPlay = step.role === 'received' ? step.audioText : step.targetText;

    if (step.role === 'received') {
        bubble.textContent = step.audioText;
    } else {
        bubble.textContent = step.targetText;
    }

    // Tap to Replay
    bubble.style.cursor = 'pointer';
    bubble.onclick = () => {
        // Just play the audio
        stopAllAudio();
        if (appData.isListening && recognition) recognition.stop();
        playAudioPromise(textToPlay, 0.8, 'de-DE');
    };

    dom.chatHistory.appendChild(bubble);
    scrollToBottom();
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'date-divider';
    div.textContent = text;
    dom.chatHistory.appendChild(div);
}

function scrollToBottom() {
    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
}

function playTone(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'start') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    } else if (type === 'success') {
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.2);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// =====================
// AUDIO — Vercel /api/tts proxy (same-origin, works on all devices)
// Mobile: ALL languages route through proxy (speechSynthesis unreliable on phones)
// Desktop: German/Farsi → proxy; English → speechSynthesis with proxy fallback
// =====================
const _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Stop ALL audio sources (browser TTS + proxy Audio element)
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
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'fa' ? 'fa-IR' : lang === 'en' ? 'en-US' : lang;
        const r = rate || 0.9;
        u.rate = (isFinite(r) && r > 0) ? r : 1.0;
        u.onend = resolve;
        u.onerror = () => resolve();
        if (_isMobile) {
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

// Play via same-origin Vercel serverless TTS proxy
function playWebAudio(text, lang) {
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
            if (DEBUG) console.warn('TTS proxy failed, using browser speech');
            _browserTTS(text, lang).then(resolve);
        };
        const audio = new Audio(url);
        window.currentAudio = audio;
        audio.onerror = fallback;
        const timeout = setTimeout(fallback, 4000);
        audio.onended = () => { clearTimeout(timeout); if (!fellBack) resolve(); };
        audio.play().catch(fallback);
    });
}

function playAudioPromise(text, rate, lang = 'de-DE') {
    return new Promise(resolve => {
        stopAllAudio();

        // On mobile: route ALL languages through Vercel TTS proxy
        // (speechSynthesis is unreliable on mobile — often fails silently)
        if (_isMobile) {
            if (DEBUG) console.log(`Mobile: using TTS proxy for ${lang}`);
            playWebAudio(text, lang).then(resolve);
            return;
        }

        // On desktop: German & Farsi always use proxy (best quality)
        if (lang.startsWith('de') || lang.startsWith('fa')) {
            playWebAudio(text, lang).then(resolve);
            return;
        }

        // Desktop English / other: try browser speech first (good quality on desktop)
        const voices = window.speechSynthesis.getVoices();
        const hasNativeVoice = voices.some(v => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));

        if (!hasNativeVoice) {
            if (DEBUG) console.log(`No native voice for ${lang}, using TTS proxy`);
            playWebAudio(text, lang).then(resolve);
            return;
        }

        // Apply user's voice speed setting
        const effectiveRate = rate * appData.voiceSpeed;

        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = effectiveRate;

        u.onend = resolve;
        u.onerror = (e) => {
            console.error("Audio Error:", e);
            // Fallback to proxy if speechSynthesis fails on desktop too
            playWebAudio(text, lang).then(resolve);
        };

        window.speechSynthesis.speak(u);
    });
}
function playAudio(text, rate = 1.0, lang = 'en-US') { // Default to EN for system messages
    playAudioPromise(text, rate, lang);
}

function createInteractiveSentence(text) {
    const words = text.split(' ');
    // Safe HTML construction
    return words.map(word => {
        // Simple sanitization
        const safeWord = word.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const cleanKey = safeWord.toLowerCase().replace(/[.,!?]/g, '');
        const meaning = getGlossaryMeaning(cleanKey) || "";
        const tooltipAttr = meaning ? `data-tooltip="${meaning}"` : "";

        return `<span class="interactive-word" ${tooltipAttr} onclick="playWord('${safeWord.replace(/'/g, "\\'")}')">${safeWord}</span>`;
    }).join(' ');
}

window.playWord = function (word) {
    // Clean punctuation for TTS
    const clean = word.replace(/[.,!?]/g, '');
    stopAllAudio();
    if (appData.isListening && recognition) recognition.stop();
    // Use voice speed setting for word playback (base rate 0.8)
    playAudioPromise(clean, 0.8, 'de-DE');
};



window.addEventListener('load', init);
window.playAudio = playAudio;
