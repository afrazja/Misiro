/**
 * Data Layer — Server-first data access with offline fallback.
 * Authenticated: Supabase is source of truth, localStorage is cache.
 * Not authenticated: localStorage only (offline mode).
 * Ported from data-layer.js (window.MiriferData IIFE).
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { isAuthenticated, getUser, updateDisplayName as authUpdateDisplayName } from './auth';
import { cloudWrite, flushQueue } from './sync-queue';
import { logError, logWarn } from '$utils/error';
import {
	UserProfileLanguageRowSchema,
	UserProfileVoiceSpeedRowSchema,
	UserProfileRowSchema,
	UserProgressRowSchema,
	UserProgressFullRowSchema,
	CompletedLessonsRowSchema,
	SRCardRowSchema,
	ExamResultRowSchema
} from '$lib/schemas';

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
			if (data) {
				const parsed = UserProfileLanguageRowSchema.safeParse(data);
				if (parsed.success && parsed.data.language) {
					localStorage.setItem('mirifer_language', parsed.data.language);
					return parsed.data.language;
				} else if (!parsed.success) {
					logWarn('data-layer:getLanguage', `Profile language row failed validation: ${parsed.error.message}`);
				}
			}
		} catch (e) {
			logError('data-layer:getLanguage', e);
		}
	}
	return localStorage.getItem('mirifer_language') || null;
}

export async function setLanguage(lang: string): Promise<void> {
	localStorage.setItem('mirifer_language', lang);
	await cloudWrite('profile_update', 'language', { language: lang });
}

// ========== TARGET LANGUAGE (stored in auth metadata, cached in localStorage) ==========

export async function getTargetLanguage(): Promise<string | null> {
	if (await isAuthenticated()) {
		try {
			// Target language lives in Supabase Auth user metadata
			const { getTargetLanguage: authGetTL } = await import('./auth');
			const tl = await authGetTL();
			if (tl) {
				localStorage.setItem('mirifer_target_language', tl);
				return tl;
			}
		} catch (e) {
			logError('data-layer:getTargetLanguage', e);
		}
	}
	return localStorage.getItem('mirifer_target_language') || null;
}

export async function setTargetLanguage(lang: string): Promise<void> {
	localStorage.setItem('mirifer_target_language', lang);
	try {
		const { updateLanguagePreferences } = await import('./auth');
		const client = (await import('$lib/supabase/client')).getSupabaseBrowserClient();
		await client.auth.updateUser({ data: { target_language: lang } });
	} catch (e) {
		logError('data-layer:setTargetLanguage', e);
	}
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
			if (data) {
				const parsed = UserProfileVoiceSpeedRowSchema.safeParse(data);
				if (parsed.success && parsed.data.voice_speed != null) {
					localStorage.setItem('mirifer_voice_speed', parsed.data.voice_speed.toString());
					return parsed.data.voice_speed;
				} else if (!parsed.success) {
					logWarn('data-layer:getVoiceSpeed', `Profile voice_speed row failed validation: ${parsed.error.message}`);
				}
			}
		} catch (e) {
			logError('data-layer:getVoiceSpeed', e);
		}
	}
	const v = localStorage.getItem('mirifer_voice_speed');
	return v ? parseFloat(v) : null;
}

export async function setVoiceSpeed(speed: number): Promise<void> {
	localStorage.setItem('mirifer_voice_speed', speed.toString());
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
				const parsed = UserProgressRowSchema.safeParse(data);
				if (parsed.success) {
					const progress: Progress = {
						currentDay: parsed.data.current_day,
						currentSentenceIndex: parsed.data.current_sentence_index,
						lastSaved: parsed.data.last_saved
					};
					localStorage.setItem('mirifer_progress', JSON.stringify(progress));
					return progress;
				} else {
					logWarn('data-layer:getProgress', `Progress row failed validation: ${parsed.error.message}`);
				}
			}
		} catch (e) {
			logError('data-layer:getProgress', e);
		}
	}
	const raw = localStorage.getItem('mirifer_progress');
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch (e) {
		logWarn('data-layer:getProgress', 'Corrupted progress data in localStorage — clearing');
		return null;
	}
}

export async function saveProgress(currentDay: number, currentSentenceIndex: number): Promise<void> {
	const data = {
		currentDay,
		currentSentenceIndex,
		lastSaved: Date.now()
	};
	localStorage.setItem('mirifer_progress', JSON.stringify(data));
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
			if (data) {
				const parsed = CompletedLessonsRowSchema.safeParse(data);
				if (parsed.success && parsed.data.completed_lessons) {
					localStorage.setItem('mirifer_completed_lessons', JSON.stringify(parsed.data.completed_lessons));
					return parsed.data.completed_lessons;
				} else if (!parsed.success) {
					logWarn('data-layer:getCompletedLessons', `Completed lessons row failed validation: ${parsed.error.message}`);
				}
			}
		} catch (e) {
			logError('data-layer:getCompletedLessons', e);
		}
	}
	const raw = localStorage.getItem('mirifer_completed_lessons');
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch (e) {
		logWarn('data-layer:getCompletedLessons', 'Corrupted completed lessons in localStorage — clearing');
		return {};
	}
}

export async function saveCompletedLessons(completedLessons: Record<number, any>): Promise<void> {
	localStorage.setItem('mirifer_completed_lessons', JSON.stringify(completedLessons || {}));
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
					const parsed = SRCardRowSchema.safeParse(c);
					if (!parsed.success) {
						logWarn('data-layer:loadSRData', `SR card failed validation: ${parsed.error.message}`);
						continue;
					}
					srMap[`${parsed.data.day}:${parsed.data.sentence_id}`] = {
						ease: parsed.data.ease,
						interval: parsed.data.interval_days,
						nextReview: parsed.data.next_review,
						attempts: parsed.data.attempts,
						successes: parsed.data.successes,
						lastReview: parsed.data.last_review
					};
				}
				localStorage.setItem('mirifer_sr_data', JSON.stringify(srMap));
				return srMap;
			}
		} catch (e) {
			logError('data-layer:loadSRData', e);
		}
	}
	try {
		const data = localStorage.getItem('mirifer_sr_data');
		return data ? JSON.parse(data) : {};
	} catch (e) {
		logWarn('data-layer:loadSRData', 'Corrupted SR data in localStorage — clearing');
		return {};
	}
}

export async function saveSRData(srData: Record<string, SRCard>): Promise<void> {
	localStorage.setItem('mirifer_sr_data', JSON.stringify(srData));
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
	return localStorage.getItem('mirifer_display_name') || null;
}

export async function setDisplayName(name: string): Promise<void> {
	localStorage.setItem('mirifer_display_name', name);
	try {
		await authUpdateDisplayName(name);
	} catch (e) {
		logError('data-layer:setDisplayName', e);
	}
}

// ========== AVATAR ==========

export function getAvatarUrl(): string | null {
	return localStorage.getItem('mirifer_avatar_url') || null;
}

export function setAvatarUrl(url: string | null): void {
	if (url) {
		localStorage.setItem('mirifer_avatar_url', url);
	} else {
		localStorage.removeItem('mirifer_avatar_url');
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
					const parsed = ExamResultRowSchema.safeParse(c);
					if (!parsed.success) {
						logWarn('data-layer:getExamResults', `Exam result row failed validation: ${parsed.error.message}`);
						continue;
					}
					examsMap[`week_${parsed.data.week_number}`] = {
						score: parsed.data.score,
						total: parsed.data.total,
						percentage: parsed.data.percentage,
						date: parsed.data.taken_at,
						wrongAnswers: parsed.data.wrong_answers ?? []
					};
				}
				localStorage.setItem('mirifer_exam_results', JSON.stringify(examsMap));
				return examsMap;
			}
		} catch (e) {
			logError('data-layer:getExamResults', e);
		}
	}
	try {
		const data = localStorage.getItem('mirifer_exam_results');
		return data ? JSON.parse(data) : {};
	} catch (e) {
		logWarn('data-layer:getExamResults', 'Corrupted exam results in localStorage — clearing');
		return {};
	}
}

export async function saveExamResult(weekKey: string, resultData: ExamResultData): Promise<void> {
	let all: Record<string, ExamResultData> = {};
	try {
		const raw = localStorage.getItem('mirifer_exam_results');
		all = raw ? JSON.parse(raw) : {};
	} catch (e) {
		logWarn('data-layer:saveExamResult', 'Corrupted exam results in localStorage — resetting before save');
		all = {};
	}
	all[weekKey] = resultData;
	localStorage.setItem('mirifer_exam_results', JSON.stringify(all));

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
	localStorage.removeItem('mirifer_progress');
	localStorage.removeItem('mirifer_completed_lessons');
	localStorage.removeItem('mirifer_sr_data');
	localStorage.removeItem('mirifer_exam_results');
	localStorage.removeItem('mirifer_language');
	localStorage.removeItem('mirifer_voice_speed');
	localStorage.removeItem('mirifer_display_name');
	localStorage.removeItem('mirifer_avatar_url');
	localStorage.removeItem('mirifer_sync_queue');
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
			const profileParsed = UserProfileRowSchema.safeParse(profile);
			if (!profileParsed.success) {
				logWarn('data-layer:syncOnLogin', `User profile row failed validation: ${profileParsed.error.message}`);
			} else {
				const p = profileParsed.data;
				if (p.language) localStorage.setItem('mirifer_language', p.language);
				if (p.voice_speed)
					localStorage.setItem('mirifer_voice_speed', p.voice_speed.toString());
				if (p.display_name)
					localStorage.setItem('mirifer_display_name', p.display_name);
				if (p.avatar_url) {
					localStorage.setItem('mirifer_avatar_url', p.avatar_url);
				} else {
					localStorage.removeItem('mirifer_avatar_url');
				}
			}
		}

		// Pull progress
		const { data: progress } = await client
			.from('user_progress')
			.select('*')
			.eq('user_id', uid)
			.maybeSingle();
		if (progress) {
			const progressParsed = UserProgressFullRowSchema.safeParse(progress);
			if (!progressParsed.success) {
				logWarn('data-layer:syncOnLogin', `User progress row failed validation: ${progressParsed.error.message}`);
			} else {
				const p = progressParsed.data;
				localStorage.setItem(
					'mirifer_progress',
					JSON.stringify({
						currentDay: p.current_day,
						currentSentenceIndex: p.current_sentence_index,
						lastSaved: p.last_saved
					})
				);
				if (p.completed_lessons) {
					localStorage.setItem(
						'mirifer_completed_lessons',
						JSON.stringify(p.completed_lessons)
					);
				}
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
				const parsed = SRCardRowSchema.safeParse(c);
				if (!parsed.success) {
					logWarn('data-layer:syncOnLogin', `SR card row failed validation: ${parsed.error.message}`);
					continue;
				}
				srMap[`${parsed.data.day}:${parsed.data.sentence_id}`] = {
					ease: parsed.data.ease,
					interval: parsed.data.interval_days,
					nextReview: parsed.data.next_review,
					attempts: parsed.data.attempts,
					successes: parsed.data.successes,
					lastReview: parsed.data.last_review
				};
			}
			localStorage.setItem('mirifer_sr_data', JSON.stringify(srMap));
		}

		// Pull exam results
		const { data: exams } = await client
			.from('exam_results')
			.select('*')
			.eq('user_id', uid);
		if (exams && exams.length > 0) {
			const examsMap: Record<string, ExamResultData> = {};
			for (const c of exams) {
				const parsed = ExamResultRowSchema.safeParse(c);
				if (!parsed.success) {
					logWarn('data-layer:syncOnLogin', `Exam result row failed validation: ${parsed.error.message}`);
					continue;
				}
				examsMap[`week_${parsed.data.week_number}`] = {
					score: parsed.data.score,
					total: parsed.data.total,
					percentage: parsed.data.percentage,
					date: parsed.data.taken_at,
					wrongAnswers: parsed.data.wrong_answers ?? []
				};
			}
			localStorage.setItem('mirifer_exam_results', JSON.stringify(examsMap));
		}

		// Flush pending writes
		await flushQueue();
	} catch (e) {
		logError('data-layer:syncOnLogin', e);
	}
}
