/**
 * Lesson Loader — fetches lesson data from Supabase.
 * Replaces the old Vite import.meta.glob approach.
 * Maintains same in-memory cache pattern.
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import type { Lesson, Sentence } from '$stores/lesson';
import type { Language } from '$stores/preferences';

export interface LessonMeta {
	day: number;
	file: string; // kept for compatibility
	title: string;
	titleFa: string;
	group: string;
}

// Module-level caches (persist for the tab's lifetime)
const lessonCache: Record<number, Lesson> = {};
let indexCache: LessonMeta[] | null = null;
let glossaryCache: Record<string, { en: string; fa: string }> | null = null;

/**
 * Get all available lesson metadata from the lessons table.
 * Now async — fetches from Supabase.
 */
export async function getLessonIndex(): Promise<LessonMeta[]> {
	if (indexCache) return indexCache;

	const sb = getSupabaseBrowserClient();
	const { data, error } = await sb
		.from('lessons')
		.select('day, title, title_fa, group, sort_order')
		.order('day', { ascending: true });

	if (error || !data) {
		console.error('Failed to fetch lesson index:', error?.message);
		indexCache = [];
		return [];
	}

	indexCache = data.map((r) => ({
		day: r.day,
		file: `day-${r.day}.json`, // backward-compat shim
		title: r.title,
		titleFa: r.title_fa ?? '',
		group: r.group
	}));

	return indexCache;
}

/**
 * Get the total number of lessons available (from cache).
 */
export function getTotalLessons(): number {
	return indexCache?.length ?? 0;
}

/**
 * Load a single lesson by day number. Returns from cache if already loaded.
 */
export async function loadLesson(day: number): Promise<Lesson | null> {
	if (lessonCache[day]) return lessonCache[day];

	const sb = getSupabaseBrowserClient();

	// Fetch lesson metadata
	const { data: lessonRow, error: lessonErr } = await sb
		.from('lessons')
		.select('id, title, title_fa')
		.eq('day', day)
		.maybeSingle();

	if (lessonErr || !lessonRow) {
		console.warn(`No lesson found for day ${day}`);
		return null;
	}

	// Fetch sentences ordered by sentence_order
	const { data: sentenceRows, error: sentErr } = await sb
		.from('sentences')
		.select('sentence_order, role, audio_text, target_text, translation, translation_fa')
		.eq('lesson_id', lessonRow.id)
		.order('sentence_order', { ascending: true });

	if (sentErr) {
		console.error(`Failed to fetch sentences for day ${day}:`, sentErr.message);
		return null;
	}

	const lesson: Lesson = {
		title: lessonRow.title,
		titleFa: lessonRow.title_fa ?? undefined,
		sentences: (sentenceRows ?? []).map((s) => ({
			id: s.sentence_order + 1, // 1-based to match original JSON format
			role: s.role as 'received' | 'sent',
			audioText: s.audio_text ?? undefined,
			targetText: s.target_text ?? undefined,
			translation: s.translation,
			translationFa: s.translation_fa ?? undefined
		}))
	};

	lessonCache[day] = lesson;
	return lesson;
}

/**
 * Load multiple lessons at once (for exam/review modes)
 */
export async function loadLessons(days: number[]): Promise<void> {
	await Promise.all(days.map((day) => loadLesson(day)));
}

/**
 * Get a lesson from the cache (must be loaded first)
 */
export function getLesson(day: number): Lesson | null {
	return lessonCache[day] || null;
}

/**
 * Get all currently loaded lessons
 */
export function getAllLoadedLessons(): Record<number, Lesson> {
	return lessonCache;
}

/**
 * Load the glossary from Supabase
 */
export async function loadGlossary(): Promise<Record<string, { en: string; fa: string }>> {
	if (glossaryCache) return glossaryCache;

	const sb = getSupabaseBrowserClient();
	const { data, error } = await sb.from('glossary').select('word, en, fa');

	if (error) {
		console.error('Failed to load glossary:', error.message);
		return {};
	}

	glossaryCache = {};
	for (const row of data ?? []) {
		glossaryCache[row.word] = { en: row.en, fa: row.fa };
	}

	return glossaryCache;
}

/**
 * Get glossary meaning for a word based on current language
 */
export function getGlossaryMeaning(word: string, language: Language): string | null {
	if (!glossaryCache) return null;

	const entry = glossaryCache[word.toLowerCase()];
	if (!entry) return null;

	if (typeof entry === 'string') return entry;
	return language === 'fa' ? entry.fa : entry.en;
}

/**
 * Check if a day number has a lesson available (sync, uses cache).
 * Returns false if the index has not been loaded yet.
 */
export function hasLesson(day: number): boolean {
	if (!indexCache) return false;
	return indexCache.some((m) => m.day === day);
}

/**
 * Invalidate all caches (useful after admin edits)
 */
export function invalidateLessonCache(day?: number): void {
	if (day !== undefined) {
		delete lessonCache[day];
	} else {
		Object.keys(lessonCache).forEach((k) => delete lessonCache[+k]);
		indexCache = null;
		glossaryCache = null;
	}
}
