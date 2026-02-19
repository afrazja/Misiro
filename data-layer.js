// Misiro Data Layer — Server-first data access
// Authenticated: Supabase is source of truth, localStorage is cache.
// Not authenticated: localStorage only (offline mode).

(function () {
    const sb = () => window.misiroAuth?._supabase;
    const isAuthed = async () => window.misiroAuth?.isAuthenticated() || false;
    const getUserId = async () => {
        const user = await window.misiroAuth?.getUser();
        return user?.id || null;
    };

    window.MisiroData = {

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
            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    await sb().from('user_profiles').update({
                        language: lang, updated_at: new Date().toISOString()
                    }).eq('id', uid);
                } catch (e) { console.error('setLanguage sync error:', e); }
            }
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
            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    await sb().from('user_profiles').update({
                        voice_speed: speed, updated_at: new Date().toISOString()
                    }).eq('id', uid);
                } catch (e) { console.error('setVoiceSpeed sync error:', e); }
            }
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
            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    await sb().from('user_progress').upsert({
                        user_id: uid,
                        current_day: currentDay,
                        current_sentence_index: currentSentenceIndex,
                        last_saved: data.lastSaved,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                } catch (e) { console.error('saveProgress sync error:', e); }
            }
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
            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    await sb().from('user_progress').upsert({
                        user_id: uid,
                        completed_lessons: completedLessons || {},
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                } catch (e) { console.error('saveCompletedLessons sync error:', e); }
            }
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
            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    const rows = Object.entries(srData).map(([key, card]) => {
                        const [day, sentenceId] = key.split(':').map(Number);
                        return {
                            user_id: uid, day, sentence_id: sentenceId,
                            ease: card.ease, interval_days: card.interval,
                            next_review: card.nextReview, attempts: card.attempts,
                            successes: card.successes, last_review: card.lastReview || null,
                            updated_at: new Date().toISOString()
                        };
                    });
                    if (rows.length > 0) {
                        await sb().from('spaced_repetition').upsert(rows, {
                            onConflict: 'user_id,day,sentence_id'
                        });
                    }
                } catch (e) { console.error('saveSRData sync error:', e); }
            }
        },

        async recordSRAttempt(day, sentenceId, card) {
            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    await sb().from('spaced_repetition').upsert({
                        user_id: uid, day, sentence_id: sentenceId,
                        ease: card.ease, interval_days: card.interval,
                        next_review: card.nextReview, attempts: card.attempts,
                        successes: card.successes, last_review: card.lastReview || null,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id,day,sentence_id' });
                } catch (e) { console.error('recordSRAttempt sync error:', e); }
            }
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

            const uid = await getUserId();
            if (uid && sb()) {
                try {
                    const weekNum = parseInt(weekKey.replace('week_', ''), 10);
                    await sb().from('exam_results').upsert({
                        user_id: uid, week_number: weekNum,
                        score: resultData.score, total: resultData.total,
                        percentage: resultData.percentage,
                        wrong_answers: resultData.wrongAnswers || [],
                        taken_at: resultData.date,
                    }, { onConflict: 'user_id,week_number' });
                } catch (e) { console.error('saveExamResult sync error:', e); }
            }
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
        },

        // ========== SYNC ON LOGIN ==========
        // Server is source of truth — just pull cloud data into localStorage cache
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
            } catch (e) {
                console.error('Sync on login failed:', e);
            }
        }
    };
})();
