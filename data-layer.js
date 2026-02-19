// Misiro Data Layer — unified data access (localStorage + Supabase)
// Always reads from localStorage (fast, offline).
// Writes to both localStorage AND Supabase when authenticated.

(function () {
    const sb = () => window.misiroAuth?._supabase;
    const isAuthed = async () => window.misiroAuth?.isAuthenticated() || false;
    const getUserId = async () => {
        const user = await window.misiroAuth?.getUser();
        return user?.id || null;
    };

    // Supabase writes are fire-and-forget to keep the UI fast
    function bgSync(fn) {
        fn().catch(e => console.error('Sync error:', e));
    }

    window.MisiroData = {

        // ========== LANGUAGE ==========
        getLanguage() {
            return localStorage.getItem('misiro_language') || null;
        },

        setLanguage(lang) {
            localStorage.setItem('misiro_language', lang);
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                await sb().from('user_profiles').update({
                    language: lang, updated_at: new Date().toISOString()
                }).eq('id', uid);
            });
        },

        // ========== VOICE SPEED ==========
        getVoiceSpeed() {
            const v = localStorage.getItem('misiro_voice_speed');
            return v ? parseFloat(v) : null;
        },

        setVoiceSpeed(speed) {
            localStorage.setItem('misiro_voice_speed', speed.toString());
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                await sb().from('user_profiles').update({
                    voice_speed: speed, updated_at: new Date().toISOString()
                }).eq('id', uid);
            });
        },

        // ========== PROGRESS ==========
        getProgress() {
            const raw = localStorage.getItem('misiro_progress');
            if (!raw) return null;
            try { return JSON.parse(raw); } catch (e) { return null; }
        },

        saveProgress(currentDay, currentSentenceIndex) {
            const data = {
                currentDay,
                currentSentenceIndex,
                lastSaved: Date.now()
            };
            localStorage.setItem('misiro_progress', JSON.stringify(data));
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                await sb().from('user_progress').upsert({
                    user_id: uid,
                    current_day: currentDay,
                    current_sentence_index: currentSentenceIndex,
                    last_saved: data.lastSaved,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            });
        },

        // ========== COMPLETED LESSONS ==========
        getCompletedLessons() {
            const raw = localStorage.getItem('misiro_completed_lessons');
            if (!raw) return {};
            try { return JSON.parse(raw); } catch (e) { return {}; }
        },

        saveCompletedLessons(completedLessons) {
            localStorage.setItem('misiro_completed_lessons', JSON.stringify(completedLessons || {}));
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                await sb().from('user_progress').upsert({
                    user_id: uid,
                    completed_lessons: completedLessons || {},
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            });
        },

        // ========== SPACED REPETITION ==========
        loadSRData() {
            try {
                const data = localStorage.getItem('misiro_sr_data');
                return data ? JSON.parse(data) : {};
            } catch (e) {
                return {};
            }
        },

        saveSRData(srData) {
            localStorage.setItem('misiro_sr_data', JSON.stringify(srData));
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                // Batch upsert all SR cards
                const rows = Object.entries(srData).map(([key, card]) => {
                    const [day, sentenceId] = key.split(':').map(Number);
                    return {
                        user_id: uid,
                        day,
                        sentence_id: sentenceId,
                        ease: card.ease,
                        interval_days: card.interval,
                        next_review: card.nextReview,
                        attempts: card.attempts,
                        successes: card.successes,
                        last_review: card.lastReview || null,
                        updated_at: new Date().toISOString()
                    };
                });
                if (rows.length > 0) {
                    await sb().from('spaced_repetition').upsert(rows, {
                        onConflict: 'user_id,day,sentence_id'
                    });
                }
            });
        },

        recordSRAttempt(day, sentenceId, card) {
            // card is the full card object { ease, interval, nextReview, attempts, successes, lastReview }
            // localStorage is handled by the caller (app.js saveSRData)
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                await sb().from('spaced_repetition').upsert({
                    user_id: uid,
                    day,
                    sentence_id: sentenceId,
                    ease: card.ease,
                    interval_days: card.interval,
                    next_review: card.nextReview,
                    attempts: card.attempts,
                    successes: card.successes,
                    last_review: card.lastReview || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,day,sentence_id' });
            });
        },

        // ========== DISPLAY NAME ==========
        getDisplayName() {
            return localStorage.getItem('misiro_display_name') || null;
        },

        setDisplayName(name) {
            localStorage.setItem('misiro_display_name', name);
            bgSync(async () => {
                if (!window.misiroAuth) return;
                await window.misiroAuth.updateDisplayName(name);
            });
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
        getExamResults() {
            try {
                const data = localStorage.getItem('misiro_exam_results');
                return data ? JSON.parse(data) : {};
            } catch (e) {
                return {};
            }
        },

        saveExamResult(weekKey, resultData) {
            const all = this.getExamResults();
            all[weekKey] = resultData;
            localStorage.setItem('misiro_exam_results', JSON.stringify(all));
            bgSync(async () => {
                const uid = await getUserId();
                if (!uid || !sb()) return;
                const weekNum = parseInt(weekKey.replace('week_', ''), 10);
                await sb().from('exam_results').upsert({
                    user_id: uid,
                    week_number: weekNum,
                    score: resultData.score,
                    total: resultData.total,
                    percentage: resultData.percentage,
                    wrong_answers: resultData.wrongAnswers || [],
                    taken_at: resultData.date,
                }, { onConflict: 'user_id,week_number' });
            });
        },

        // ========== SYNC ON LOGIN ==========
        async syncOnLogin() {
            const uid = await getUserId();
            if (!uid || !sb()) return;

            try {
                await this._syncProfile(uid);
                await this._syncProgress(uid);
                await this._syncSRData(uid);
                await this._syncExamResults(uid);
            } catch (e) {
                console.error('Sync on login failed:', e);
            }
        },

        async _syncProfile(uid) {
            const { data: profile } = await sb().from('user_profiles')
                .select('*').eq('id', uid).maybeSingle();
            if (!profile) return;

            // Cloud preferences win
            if (profile.language) localStorage.setItem('misiro_language', profile.language);
            if (profile.voice_speed) localStorage.setItem('misiro_voice_speed', profile.voice_speed.toString());
            if (profile.display_name) localStorage.setItem('misiro_display_name', profile.display_name);
            if (profile.avatar_url) {
                localStorage.setItem('misiro_avatar_url', profile.avatar_url);
            } else {
                localStorage.removeItem('misiro_avatar_url');
            }
        },

        async _syncProgress(uid) {
            const { data: cloud } = await sb().from('user_progress')
                .select('*').eq('user_id', uid).single();

            const local = this.getProgress();
            const localCompleted = this.getCompletedLessons();

            if (!cloud) {
                // No cloud data — push local to cloud
                if (local) {
                    this.saveProgress(local.currentDay, local.currentSentenceIndex);
                }
                if (Object.keys(localCompleted).length > 0) {
                    this.saveCompletedLessons(localCompleted);
                }
                return;
            }

            // Merge: most recent lastSaved wins for progress
            const localTime = local?.lastSaved || 0;
            const cloudTime = cloud.last_saved || 0;

            if (cloudTime > localTime) {
                // Cloud is newer — update localStorage
                localStorage.setItem('misiro_progress', JSON.stringify({
                    currentDay: cloud.current_day,
                    currentSentenceIndex: cloud.current_sentence_index,
                    lastSaved: cloud.last_saved
                }));
            } else if (localTime > cloudTime) {
                // Local is newer — push to cloud
                this.saveProgress(local.currentDay, local.currentSentenceIndex);
            }

            // Merge completed lessons: union of both
            const cloudCompleted = cloud.completed_lessons || {};
            const merged = { ...cloudCompleted, ...localCompleted };
            // For overlapping keys, keep the one with the earlier completedAt
            for (const day of Object.keys(cloudCompleted)) {
                if (localCompleted[day] && cloudCompleted[day]) {
                    const lt = localCompleted[day].completedAt || 0;
                    const ct = cloudCompleted[day].completedAt || 0;
                    merged[day] = ct < lt ? cloudCompleted[day] : localCompleted[day];
                }
            }
            localStorage.setItem('misiro_completed_lessons', JSON.stringify(merged));
            this.saveCompletedLessons(merged);
        },

        async _syncSRData(uid) {
            const { data: cloudCards } = await sb().from('spaced_repetition')
                .select('*').eq('user_id', uid);

            const localSR = this.loadSRData();

            if (!cloudCards || cloudCards.length === 0) {
                // No cloud data — push local
                if (Object.keys(localSR).length > 0) {
                    this.saveSRData(localSR);
                }
                return;
            }

            // Build cloud map
            const cloudMap = {};
            for (const c of cloudCards) {
                cloudMap[`${c.day}:${c.sentence_id}`] = {
                    ease: c.ease,
                    interval: c.interval_days,
                    nextReview: c.next_review,
                    attempts: c.attempts,
                    successes: c.successes,
                    lastReview: c.last_review
                };
            }

            // Merge: higher attempts wins per card
            const merged = { ...cloudMap };
            for (const [key, localCard] of Object.entries(localSR)) {
                const cloudCard = cloudMap[key];
                if (!cloudCard) {
                    merged[key] = localCard;
                } else if (localCard.attempts > cloudCard.attempts) {
                    merged[key] = localCard;
                } else if (localCard.attempts === cloudCard.attempts
                    && (localCard.lastReview || 0) > (cloudCard.lastReview || 0)) {
                    merged[key] = localCard;
                }
                // else cloud wins (already in merged)
            }

            localStorage.setItem('misiro_sr_data', JSON.stringify(merged));
            this.saveSRData(merged);
        },

        async _syncExamResults(uid) {
            const { data: cloudExams } = await sb().from('exam_results')
                .select('*').eq('user_id', uid);

            const localExams = this.getExamResults();

            if (!cloudExams || cloudExams.length === 0) {
                // Push local to cloud
                for (const [weekKey, result] of Object.entries(localExams)) {
                    this.saveExamResult(weekKey, result);
                }
                return;
            }

            // Build cloud map
            const cloudMap = {};
            for (const c of cloudExams) {
                cloudMap[`week_${c.week_number}`] = {
                    score: c.score,
                    total: c.total,
                    percentage: c.percentage,
                    date: c.taken_at,
                    wrongAnswers: c.wrong_answers || []
                };
            }

            // Merge: higher score wins per week
            const merged = { ...cloudMap };
            for (const [weekKey, localResult] of Object.entries(localExams)) {
                const cloudResult = cloudMap[weekKey];
                if (!cloudResult) {
                    merged[weekKey] = localResult;
                } else if (localResult.score > cloudResult.score) {
                    merged[weekKey] = localResult;
                }
            }

            localStorage.setItem('misiro_exam_results', JSON.stringify(merged));
            // Push merged to cloud
            for (const [weekKey, result] of Object.entries(merged)) {
                this.saveExamResult(weekKey, result);
            }
        }
    };
})();
