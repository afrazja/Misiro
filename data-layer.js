// Misiro Data Layer — Server-first data access with retry queue
// Authenticated: Supabase is source of truth, localStorage is cache.
// Not authenticated: localStorage only (offline mode).
// Failed cloud writes are queued and retried automatically.

(function () {
    const sb = () => window.misiroAuth?._supabase;
    const isAuthed = async () => window.misiroAuth?.isAuthenticated() || false;
    const getUserId = async () => {
        const user = await window.misiroAuth?.getUser();
        return user?.id || null;
    };

    // =====================
    // RETRY QUEUE — persists failed writes and retries them
    // =====================
    const QUEUE_KEY = 'misiro_sync_queue';
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 10000; // 10 seconds between retries
    let _retryTimer = null;
    let _syncStatus = 'synced'; // 'synced' | 'pending' | 'offline' | 'error'

    function getSyncQueue() {
        try {
            const raw = localStorage.getItem(QUEUE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveSyncQueue(queue) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    function enqueue(operation) {
        const queue = getSyncQueue();
        // Deduplicate: if same operation type + key exists, replace it with newer data
        const existing = queue.findIndex(q => q.type === operation.type && q.key === operation.key);
        if (existing >= 0) {
            queue[existing] = { ...operation, retries: 0, createdAt: Date.now() };
        } else {
            queue.push({ ...operation, retries: 0, createdAt: Date.now() });
        }
        saveSyncQueue(queue);
        updateSyncStatus('pending');
        scheduleRetry();
    }

    function scheduleRetry() {
        if (_retryTimer) return; // Already scheduled
        _retryTimer = setTimeout(async () => {
            _retryTimer = null;
            await flushQueue();
        }, RETRY_DELAY_MS);
    }

    async function flushQueue() {
        const queue = getSyncQueue();
        if (queue.length === 0) {
            updateSyncStatus('synced');
            return;
        }

        if (!navigator.onLine) {
            updateSyncStatus('offline');
            scheduleRetry();
            return;
        }

        const uid = await getUserId();
        if (!uid || !sb()) {
            // Not authenticated — clear queue (data is safe in localStorage)
            saveSyncQueue([]);
            updateSyncStatus('synced');
            return;
        }

        const remaining = [];
        for (const op of queue) {
            try {
                await executeCloudWrite(uid, op);
                // Success — don't re-add
            } catch (e) {
                op.retries = (op.retries || 0) + 1;
                if (op.retries < MAX_RETRIES) {
                    remaining.push(op);
                } else {
                    console.error(`Dropping failed sync after ${MAX_RETRIES} retries:`, op.type, op.key);
                }
            }
        }

        saveSyncQueue(remaining);
        updateSyncStatus(remaining.length > 0 ? 'pending' : 'synced');
        if (remaining.length > 0) scheduleRetry();
    }

    async function executeCloudWrite(uid, op) {
        switch (op.type) {
            case 'profile_update':
                await sb().from('user_profiles').update({
                    ...op.data, updated_at: new Date().toISOString()
                }).eq('id', uid);
                break;
            case 'progress_upsert':
                await sb().from('user_progress').upsert({
                    user_id: uid, ...op.data, updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
                break;
            case 'sr_upsert':
                if (op.data.rows && op.data.rows.length > 0) {
                    const rows = op.data.rows.map(r => ({
                        ...r, user_id: uid, updated_at: new Date().toISOString()
                    }));
                    await sb().from('spaced_repetition').upsert(rows, {
                        onConflict: 'user_id,day,sentence_id'
                    });
                }
                break;
            case 'sr_single':
                await sb().from('spaced_repetition').upsert({
                    user_id: uid, ...op.data, updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,day,sentence_id' });
                break;
            case 'exam_upsert':
                await sb().from('exam_results').upsert({
                    user_id: uid, ...op.data
                }, { onConflict: 'user_id,week_number' });
                break;
            default:
                console.warn('Unknown sync operation type:', op.type);
        }
    }

    // =====================
    // SYNC STATUS — broadcasts to UI
    // =====================
    function updateSyncStatus(status) {
        _syncStatus = status;
        // Dispatch custom event so UI can listen and show indicator
        window.dispatchEvent(new CustomEvent('misiro-sync-status', { detail: { status } }));
    }

    // =====================
    // CLOUD WRITE HELPER — tries immediately, queues on failure
    // =====================
    async function cloudWrite(type, key, data) {
        const uid = await getUserId();
        if (!uid || !sb()) return; // Not authenticated, skip cloud

        if (!navigator.onLine) {
            enqueue({ type, key, data });
            return;
        }

        try {
            await executeCloudWrite(uid, { type, key, data });
        } catch (e) {
            console.warn(`Cloud write failed (${type}), queuing for retry:`, e.message);
            enqueue({ type, key, data });
        }
    }

    // =====================
    // ONLINE/OFFLINE LISTENERS
    // =====================
    window.addEventListener('online', () => {
        console.log('Network restored — flushing sync queue');
        updateSyncStatus('pending');
        flushQueue();
    });

    window.addEventListener('offline', () => {
        updateSyncStatus('offline');
    });

    // Check initial state
    if (!navigator.onLine) {
        updateSyncStatus('offline');
    }

    // =====================
    // PUBLIC API
    // =====================
    window.MisiroData = {

        // ========== SYNC STATUS ==========
        getSyncStatus() { return _syncStatus; },
        getPendingCount() { return getSyncQueue().length; },
        async flushSyncQueue() { await flushQueue(); },

        // ========== LANGUAGE ==========
        async getLanguage() {
            if (await isAuthed()) {
                try {
                    const uid = await getUserId();
                    const { data } = await sb().from('user_profiles')
                        .select('language').eq('id', uid).maybeSingle();
                    if (data?.language) {
                        localStorage.setItem('misiro_language', data.language);
                        return data.language;
                    }
                } catch (e) { /* fall through */ }
            }
            return localStorage.getItem('misiro_language') || null;
        },

        async setLanguage(lang) {
            localStorage.setItem('misiro_language', lang);
            await cloudWrite('profile_update', 'language', { language: lang });
        },

        // ========== VOICE SPEED ==========
        async getVoiceSpeed() {
            if (await isAuthed()) {
                try {
                    const uid = await getUserId();
                    const { data } = await sb().from('user_profiles')
                        .select('voice_speed').eq('id', uid).maybeSingle();
                    if (data?.voice_speed != null) {
                        localStorage.setItem('misiro_voice_speed', data.voice_speed.toString());
                        return data.voice_speed;
                    }
                } catch (e) { /* fall through */ }
            }
            const v = localStorage.getItem('misiro_voice_speed');
            return v ? parseFloat(v) : null;
        },

        async setVoiceSpeed(speed) {
            localStorage.setItem('misiro_voice_speed', speed.toString());
            await cloudWrite('profile_update', 'voice_speed', { voice_speed: speed });
        },

        // ========== PROGRESS ==========
        async getProgress() {
            if (await isAuthed()) {
                try {
                    const uid = await getUserId();
                    const { data } = await sb().from('user_progress')
                        .select('current_day, current_sentence_index, last_saved')
                        .eq('user_id', uid).maybeSingle();
                    if (data) {
                        const progress = {
                            currentDay: data.current_day,
                            currentSentenceIndex: data.current_sentence_index,
                            lastSaved: data.last_saved
                        };
                        localStorage.setItem('misiro_progress', JSON.stringify(progress));
                        return progress;
                    }
                } catch (e) { /* fall through */ }
            }
            const raw = localStorage.getItem('misiro_progress');
            if (!raw) return null;
            try { return JSON.parse(raw); } catch (e) { return null; }
        },

        async saveProgress(currentDay, currentSentenceIndex) {
            const data = {
                currentDay,
                currentSentenceIndex,
                lastSaved: Date.now()
            };
            localStorage.setItem('misiro_progress', JSON.stringify(data));
            await cloudWrite('progress_upsert', 'progress', {
                current_day: currentDay,
                current_sentence_index: currentSentenceIndex,
                last_saved: data.lastSaved
            });
        },

        // ========== COMPLETED LESSONS ==========
        async getCompletedLessons() {
            if (await isAuthed()) {
                try {
                    const uid = await getUserId();
                    const { data } = await sb().from('user_progress')
                        .select('completed_lessons').eq('user_id', uid).maybeSingle();
                    if (data?.completed_lessons) {
                        localStorage.setItem('misiro_completed_lessons', JSON.stringify(data.completed_lessons));
                        return data.completed_lessons;
                    }
                } catch (e) { /* fall through */ }
            }
            const raw = localStorage.getItem('misiro_completed_lessons');
            if (!raw) return {};
            try { return JSON.parse(raw); } catch (e) { return {}; }
        },

        async saveCompletedLessons(completedLessons) {
            localStorage.setItem('misiro_completed_lessons', JSON.stringify(completedLessons || {}));
            await cloudWrite('progress_upsert', 'completed_lessons', {
                completed_lessons: completedLessons || {}
            });
        },

        // ========== SPACED REPETITION ==========
        async loadSRData() {
            if (await isAuthed()) {
                try {
                    const uid = await getUserId();
                    const { data: cloudCards } = await sb().from('spaced_repetition')
                        .select('*').eq('user_id', uid);
                    if (cloudCards && cloudCards.length > 0) {
                        const srMap = {};
                        for (const c of cloudCards) {
                            srMap[`${c.day}:${c.sentence_id}`] = {
                                ease: c.ease,
                                interval: c.interval_days,
                                nextReview: c.next_review,
                                attempts: c.attempts,
                                successes: c.successes,
                                lastReview: c.last_review
                            };
                        }
                        localStorage.setItem('misiro_sr_data', JSON.stringify(srMap));
                        return srMap;
                    }
                } catch (e) { /* fall through */ }
            }
            try {
                const data = localStorage.getItem('misiro_sr_data');
                return data ? JSON.parse(data) : {};
            } catch (e) { return {}; }
        },

        async saveSRData(srData) {
            localStorage.setItem('misiro_sr_data', JSON.stringify(srData));
            const rows = Object.entries(srData).map(([key, card]) => {
                const [day, sentenceId] = key.split(':').map(Number);
                return {
                    day, sentence_id: sentenceId,
                    ease: card.ease, interval_days: card.interval,
                    next_review: card.nextReview, attempts: card.attempts,
                    successes: card.successes, last_review: card.lastReview || null
                };
            });
            if (rows.length > 0) {
                await cloudWrite('sr_upsert', 'sr_bulk', { rows });
            }
        },

        async recordSRAttempt(day, sentenceId, card) {
            await cloudWrite('sr_single', `sr_${day}_${sentenceId}`, {
                day, sentence_id: sentenceId,
                ease: card.ease, interval_days: card.interval,
                next_review: card.nextReview, attempts: card.attempts,
                successes: card.successes, last_review: card.lastReview || null
            });
        },

        // ========== DISPLAY NAME ==========
        getDisplayName() {
            return localStorage.getItem('misiro_display_name') || null;
        },

        async setDisplayName(name) {
            localStorage.setItem('misiro_display_name', name);
            if (window.misiroAuth) {
                try {
                    await window.misiroAuth.updateDisplayName(name);
                } catch (e) { console.error('setDisplayName sync error:', e); }
            }
        },

        // ========== AVATAR ==========
        getAvatarUrl() {
            return localStorage.getItem('misiro_avatar_url') || null;
        },

        setAvatarUrl(url) {
            if (url) {
                localStorage.setItem('misiro_avatar_url', url);
            } else {
                localStorage.removeItem('misiro_avatar_url');
            }
        },

        // ========== EXAM RESULTS ==========
        async getExamResults() {
            if (await isAuthed()) {
                try {
                    const uid = await getUserId();
                    const { data: cloudExams } = await sb().from('exam_results')
                        .select('*').eq('user_id', uid);
                    if (cloudExams && cloudExams.length > 0) {
                        const examsMap = {};
                        for (const c of cloudExams) {
                            examsMap[`week_${c.week_number}`] = {
                                score: c.score, total: c.total,
                                percentage: c.percentage, date: c.taken_at,
                                wrongAnswers: c.wrong_answers || []
                            };
                        }
                        localStorage.setItem('misiro_exam_results', JSON.stringify(examsMap));
                        return examsMap;
                    }
                } catch (e) { /* fall through */ }
            }
            try {
                const data = localStorage.getItem('misiro_exam_results');
                return data ? JSON.parse(data) : {};
            } catch (e) { return {}; }
        },

        async saveExamResult(weekKey, resultData) {
            // Update local cache
            let all = {};
            try {
                const raw = localStorage.getItem('misiro_exam_results');
                all = raw ? JSON.parse(raw) : {};
            } catch (e) { all = {}; }
            all[weekKey] = resultData;
            localStorage.setItem('misiro_exam_results', JSON.stringify(all));

            const weekNum = parseInt(weekKey.replace('week_', ''), 10);
            await cloudWrite('exam_upsert', `exam_${weekKey}`, {
                week_number: weekNum,
                score: resultData.score, total: resultData.total,
                percentage: resultData.percentage,
                wrong_answers: resultData.wrongAnswers || [],
                taken_at: resultData.date,
            });
        },

        // ========== CLEAR ALL LOCAL DATA ==========
        clearAllLocal() {
            localStorage.removeItem('misiro_progress');
            localStorage.removeItem('misiro_completed_lessons');
            localStorage.removeItem('misiro_sr_data');
            localStorage.removeItem('misiro_exam_results');
            localStorage.removeItem('misiro_language');
            localStorage.removeItem('misiro_voice_speed');
            localStorage.removeItem('misiro_display_name');
            localStorage.removeItem('misiro_avatar_url');
            localStorage.removeItem(QUEUE_KEY);
        },

        // ========== SYNC ON LOGIN ==========
        // Server is source of truth — pull cloud data, then flush any pending writes
        async syncOnLogin() {
            const uid = await getUserId();
            if (!uid || !sb()) return;

            try {
                // Pull profile prefs
                const { data: profile } = await sb().from('user_profiles')
                    .select('*').eq('id', uid).maybeSingle();
                if (profile) {
                    if (profile.language) localStorage.setItem('misiro_language', profile.language);
                    if (profile.voice_speed) localStorage.setItem('misiro_voice_speed', profile.voice_speed.toString());
                    if (profile.display_name) localStorage.setItem('misiro_display_name', profile.display_name);
                    if (profile.avatar_url) {
                        localStorage.setItem('misiro_avatar_url', profile.avatar_url);
                    } else {
                        localStorage.removeItem('misiro_avatar_url');
                    }
                }

                // Pull progress + completed lessons
                const { data: progress } = await sb().from('user_progress')
                    .select('*').eq('user_id', uid).maybeSingle();
                if (progress) {
                    localStorage.setItem('misiro_progress', JSON.stringify({
                        currentDay: progress.current_day,
                        currentSentenceIndex: progress.current_sentence_index,
                        lastSaved: progress.last_saved
                    }));
                    if (progress.completed_lessons) {
                        localStorage.setItem('misiro_completed_lessons', JSON.stringify(progress.completed_lessons));
                    }
                }

                // Pull SR data
                const { data: srCards } = await sb().from('spaced_repetition')
                    .select('*').eq('user_id', uid);
                if (srCards && srCards.length > 0) {
                    const srMap = {};
                    for (const c of srCards) {
                        srMap[`${c.day}:${c.sentence_id}`] = {
                            ease: c.ease, interval: c.interval_days,
                            nextReview: c.next_review, attempts: c.attempts,
                            successes: c.successes, lastReview: c.last_review
                        };
                    }
                    localStorage.setItem('misiro_sr_data', JSON.stringify(srMap));
                }

                // Pull exam results
                const { data: exams } = await sb().from('exam_results')
                    .select('*').eq('user_id', uid);
                if (exams && exams.length > 0) {
                    const examsMap = {};
                    for (const c of exams) {
                        examsMap[`week_${c.week_number}`] = {
                            score: c.score, total: c.total,
                            percentage: c.percentage, date: c.taken_at,
                            wrongAnswers: c.wrong_answers || []
                        };
                    }
                    localStorage.setItem('misiro_exam_results', JSON.stringify(examsMap));
                }

                // After pulling cloud data, flush any pending local writes
                await flushQueue();
            } catch (e) {
                console.error('Sync on login failed:', e);
            }
        }
    };
})();
