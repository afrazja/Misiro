/**
 * Data Layer — Server-first data access with offline fallback.
 * Authenticated: Supabase is source of truth, localStorage is cache.
 * Not authenticated: localStorage only (offline mode).
 * Ported from data-layer.js (window.MisiroData IIFE).
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { isAuthenticated, getUser, updateDisplayName as authUpdateDisplayName } from './auth';
import { cloudWrite, flushQueue } from './sync-queue';

// ========== LANGUAGE ==========

export async function getLanguage(): Promise<string | null> {
	if (await isAuthenticated()) {
		try {
			const user = await getUser();
			if (!user) throw new Error('No user');
			const client = getSupabaseBrowserClient();
			const { data } = await client
				.from('user_profiles')
				.select('language')
				.eq('id', user.id)
				.maybeSingle();
			if (data?.language) {
				localStorage.setItem('misiro_language', data.language);
				return data.language;
			}
		} catch {
			/* fall through */
		}
	}
	return localStorage.getItem('misiro_language') || null;
}

export async function setLanguage(lang: string): Promise<void> {
	localStorage.setItem('misiro_language', lang);
	await cloudWrite('profile_update', 'language', { language: lang });
}

// ========== VOICE SPEED ==========

export async function getVoiceSpeed(): Promise<number | null> {
	if (await isAuthenticated()) {
		try {
			const user = await getUser();
			if (!user) throw new Error('No user');
			const client = getSupabaseBrowserClient();
			const { data } = await client
				.from('user_profiles')
				.select('voice_speed')
				.eq('id', user.id)
				.maybeSingle();
			if (data?.voice_speed != null) {
				localStorage.setItem('misiro_voice_speed', data.voice_speed.toString());
				return data.voice_speed;
			}
		} catch {
			/* fall through */
		}
	}
	const v = localStorage.getItem('misiro_voice_speed');
	return v ? parseFloat(v) : null;
}

export async function setVoiceSpeed(speed: number): Promise<void> {
	localStorage.setItem('misiro_voice_speed', speed.toString());
	await cloudWrite('profile_update', 'voice_speed', { voice_speed: speed });
}

// ========== PROGRESS ==========

export interface Progress {
	currentDay: number;
	currentSentenceIndex: number;
	lastSaved: number;
}

export async function getProgress(): Promise<Progress | null> {
	if (await isAuthenticated()) {
		try {
			const user = await getUser();
			if (!user) throw new Error('No user');
			const client = getSupabaseBrowserClient();
			const { data } = await client
				.from('user_progress')
				.select('current_day, current_sentence_index, last_saved')
				.eq('user_id', user.id)
				.maybeSingle();
			if (data) {
				const progress: Progress = {
					currentDay: data.current_day,
					currentSentenceIndex: data.current_sentence_index,
					lastSaved: data.last_saved
				};
				localStorage.setItem('misiro_progress', JSON.stringify(progress));
				return progress;
			}
		} catch {
			/* fall through */
		}
	}
	const raw = localStorage.getItem('misiro_progress');
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export async function saveProgress(currentDay: number, currentSentenceIndex: number): Promise<void> {
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
}

// ========== COMPLETED LESSONS ==========

export async function getCompletedLessons(): Promise<Record<number, any>> {
	if (await isAuthenticated()) {
		try {
			const user = await getUser();
			if (!user) throw new Error('No user');
			const client = getSupabaseBrowserClient();
			const { data } = await client
				.from('user_progress')
				.select('completed_lessons')
				.eq('user_id', user.id)
				.maybeSingle();
			if (data?.completed_lessons) {
				localStorage.setItem('misiro_completed_lessons', JSON.stringify(data.completed_lessons));
				return data.completed_lessons;
			}
		} catch {
			/* fall through */
		}
	}
	const raw = localStorage.getItem('misiro_completed_lessons');
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

export async function saveCompletedLessons(completedLessons: Record<number, any>): Promise<void> {
	localStorage.setItem('misiro_completed_lessons', JSON.stringify(completedLessons || {}));
	await cloudWrite('progress_upsert', 'completed_lessons', {
		completed_lessons: completedLessons || {}
	});
}

// ========== SPACED REPETITION ==========

export interface SRCard {
	ease: number;
	interval: number;
	nextReview: number;
	attempts: number;
	successes: number;
	lastReview?: number | null;
}

export async function loadSRData(): Promise<Record<string, SRCard>> {
	if (await isAuthenticated()) {
		try {
			const user = await getUser();
			if (!user) throw new Error('No user');
			const client = getSupabaseBrowserClient();
			const { data: cloudCards } = await client
				.from('spaced_repetition')
				.select('*')
				.eq('user_id', user.id);
			if (cloudCards && cloudCards.length > 0) {
				const srMap: Record<string, SRCard> = {};
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
		} catch {
			/* fall through */
		}
	}
	try {
		const data = localStorage.getItem('misiro_sr_data');
		return data ? JSON.parse(data) : {};
	} catch {
		return {};
	}
}

export async function saveSRData(srData: Record<string, SRCard>): Promise<void> {
	localStorage.setItem('misiro_sr_data', JSON.stringify(srData));
	const rows = Object.entries(srData).map(([key, card]) => {
		const [day, sentenceId] = key.split(':').map(Number);
		return {
			day,
			sentence_id: sentenceId,
			ease: card.ease,
			interval_days: card.interval,
			next_review: card.nextReview,
			attempts: card.attempts,
			successes: card.successes,
			last_review: card.lastReview || null
		};
	});
	if (rows.length > 0) {
		await cloudWrite('sr_upsert', 'sr_bulk', { rows });
	}
}

export async function recordSRAttempt(
	day: number,
	sentenceId: number,
	card: SRCard
): Promise<void> {
	await cloudWrite('sr_single', `sr_${day}_${sentenceId}`, {
		day,
		sentence_id: sentenceId,
		ease: card.ease,
		interval_days: card.interval,
		next_review: card.nextReview,
		attempts: card.attempts,
		successes: card.successes,
		last_review: card.lastReview || null
	});
}

// ========== DISPLAY NAME ==========

export function getDisplayName(): string | null {
	return localStorage.getItem('misiro_display_name') || null;
}

export async function setDisplayName(name: string): Promise<void> {
	localStorage.setItem('misiro_display_name', name);
	try {
		await authUpdateDisplayName(name);
	} catch (e) {
		console.error('setDisplayName sync error:', e);
	}
}

// ========== AVATAR ==========

export function getAvatarUrl(): string | null {
	return localStorage.getItem('misiro_avatar_url') || null;
}

export function setAvatarUrl(url: string | null): void {
	if (url) {
		localStorage.setItem('misiro_avatar_url', url);
	} else {
		localStorage.removeItem('misiro_avatar_url');
	}
}

// ========== EXAM RESULTS ==========

export interface ExamResultData {
	score: number;
	total: number;
	percentage: number;
	date: number;
	wrongAnswers: any[];
}

export async function getExamResults(): Promise<Record<string, ExamResultData>> {
	if (await isAuthenticated()) {
		try {
			const user = await getUser();
			if (!user) throw new Error('No user');
			const client = getSupabaseBrowserClient();
			const { data: cloudExams } = await client
				.from('exam_results')
				.select('*')
				.eq('user_id', user.id);
			if (cloudExams && cloudExams.length > 0) {
				const examsMap: Record<string, ExamResultData> = {};
				for (const c of cloudExams) {
					examsMap[`week_${c.week_number}`] = {
						score: c.score,
						total: c.total,
						percentage: c.percentage,
						date: c.taken_at,
						wrongAnswers: c.wrong_answers || []
					};
				}
				localStorage.setItem('misiro_exam_results', JSON.stringify(examsMap));
				return examsMap;
			}
		} catch {
			/* fall through */
		}
	}
	try {
		const data = localStorage.getItem('misiro_exam_results');
		return data ? JSON.parse(data) : {};
	} catch {
		return {};
	}
}

export async function saveExamResult(weekKey: string, resultData: ExamResultData): Promise<void> {
	let all: Record<string, ExamResultData> = {};
	try {
		const raw = localStorage.getItem('misiro_exam_results');
		all = raw ? JSON.parse(raw) : {};
	} catch {
		all = {};
	}
	all[weekKey] = resultData;
	localStorage.setItem('misiro_exam_results', JSON.stringify(all));

	const weekNum = parseInt(weekKey.replace('week_', ''), 10);
	await cloudWrite('exam_upsert', `exam_${weekKey}`, {
		week_number: weekNum,
		score: resultData.score,
		total: resultData.total,
		percentage: resultData.percentage,
		wrong_answers: resultData.wrongAnswers || [],
		taken_at: resultData.date
	});
}

// ========== CLEAR ALL LOCAL DATA ==========

export function clearAllLocal(): void {
	localStorage.removeItem('misiro_progress');
	localStorage.removeItem('misiro_completed_lessons');
	localStorage.removeItem('misiro_sr_data');
	localStorage.removeItem('misiro_exam_results');
	localStorage.removeItem('misiro_language');
	localStorage.removeItem('misiro_voice_speed');
	localStorage.removeItem('misiro_display_name');
	localStorage.removeItem('misiro_avatar_url');
	localStorage.removeItem('misiro_sync_queue');
}

// ========== SYNC ON LOGIN ==========

export async function syncOnLogin(): Promise<void> {
	const user = await getUser();
	const uid = user?.id;
	if (!uid) return;

	try {
		const client = getSupabaseBrowserClient();

		// Pull profile prefs
		const { data: profile } = await client
			.from('user_profiles')
			.select('*')
			.eq('id', uid)
			.maybeSingle();
		if (profile) {
			if (profile.language) localStorage.setItem('misiro_language', profile.language);
			if (profile.voice_speed)
				localStorage.setItem('misiro_voice_speed', profile.voice_speed.toString());
			if (profile.display_name)
				localStorage.setItem('misiro_display_name', profile.display_name);
			if (profile.avatar_url) {
				localStorage.setItem('misiro_avatar_url', profile.avatar_url);
			} else {
				localStorage.removeItem('misiro_avatar_url');
			}
		}

		// Pull progress
		const { data: progress } = await client
			.from('user_progress')
			.select('*')
			.eq('user_id', uid)
			.maybeSingle();
		if (progress) {
			localStorage.setItem(
				'misiro_progress',
				JSON.stringify({
					currentDay: progress.current_day,
					currentSentenceIndex: progress.current_sentence_index,
					lastSaved: progress.last_saved
				})
			);
			if (progress.completed_lessons) {
				localStorage.setItem(
					'misiro_completed_lessons',
					JSON.stringify(progress.completed_lessons)
				);
			}
		}

		// Pull SR data
		const { data: srCards } = await client
			.from('spaced_repetition')
			.select('*')
			.eq('user_id', uid);
		if (srCards && srCards.length > 0) {
			const srMap: Record<string, SRCard> = {};
			for (const c of srCards) {
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
		}

		// Pull exam results
		const { data: exams } = await client
			.from('exam_results')
			.select('*')
			.eq('user_id', uid);
		if (exams && exams.length > 0) {
			const examsMap: Record<string, ExamResultData> = {};
			for (const c of exams) {
				examsMap[`week_${c.week_number}`] = {
					score: c.score,
					total: c.total,
					percentage: c.percentage,
					date: c.taken_at,
					wrongAnswers: c.wrong_answers || []
				};
			}
			localStorage.setItem('misiro_exam_results', JSON.stringify(examsMap));
		}

		// Flush pending writes
		await flushQueue();
	} catch (e) {
		console.error('Sync on login failed:', e);
	}
}
