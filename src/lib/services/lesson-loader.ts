/**
 * Lesson Loader — fetches lesson data from Supabase.
 * Replaces the old Vite import.meta.glob approach.
 * Maintains same in-memory cache pattern.
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import type { Lesson, Sentence } from '$stores/lesson';
import type { Language } from '$stores/preferences';
import { logError, logWarn } from '$utils/error';
import {
	LessonRowSchema,
	LessonDetailRowSchema,
	SentenceRowSchema,
	GlossaryRowSchema
} from '$lib/schemas';

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
		logError('lesson-loader:getLessonIndex', error?.message ?? 'No data returned');
		indexCache = [];
		return [];
	}

	const validated = data
		.map((r, i) => {
			const result = LessonRowSchema.safeParse(r);
			if (!result.success) {
				logWarn(
					'lesson-loader:getLessonIndex',
					`Row ${i} failed validation: ${result.error.message}`
				);
				return null;
			}
			return result.data;
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	indexCache = validated.map((r) => ({
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
		.select('id, title, title_fa, description, description_fa, grammar_focus, grammar_focus_fa, difficulty')
		.eq('day', day)
		.maybeSingle();

	if (lessonErr || !lessonRow) {
		logWarn('lesson-loader:loadLesson', `No lesson found for day ${day}`);
		return null;
	}

	const lessonValidation = LessonDetailRowSchema.safeParse(lessonRow);
	if (!lessonValidation.success) {
		logError(
			'lesson-loader:loadLesson',
			`Lesson row for day ${day} failed validation: ${lessonValidation.error.message}`
		);
		return null;
	}
	const validatedLesson = lessonValidation.data;

	// Fetch sentences ordered by sentence_order
	const { data: sentenceRows, error: sentErr } = await sb
		.from('sentences')
		.select('sentence_order, role, audio_text, target_text, translation, translation_fa, hint, hint_fa')
		.eq('lesson_id', lessonRow.id)
		.order('sentence_order', { ascending: true });

	if (sentErr) {
		logError('lesson-loader:loadLesson', `Failed to fetch sentences for day ${day}: ${sentErr.message}`);
		return null;
	}

	const validatedSentences = (sentenceRows ?? [])
		.map((s, i) => {
			const result = SentenceRowSchema.safeParse(s);
			if (!result.success) {
				logWarn(
					'lesson-loader:loadLesson',
					`Sentence ${i} for day ${day} failed validation: ${result.error.message}`
				);
				return null;
			}
			return result.data;
		})
		.filter((s): s is NonNullable<typeof s> => s !== null);

	const lesson: Lesson = {
		title: validatedLesson.title,
		titleFa: validatedLesson.title_fa ?? undefined,
		description: validatedLesson.description ?? undefined,
		descriptionFa: validatedLesson.description_fa ?? undefined,
		grammarFocus: validatedLesson.grammar_focus ?? undefined,
		grammarFocusFa: validatedLesson.grammar_focus_fa ?? undefined,
		difficulty: validatedLesson.difficulty ?? undefined,
		sentences: validatedSentences.map((s) => ({
			id: s.sentence_order + 1, // 1-based to match original JSON format
			role: s.role,
			audioText: s.audio_text ?? undefined,
			targetText: s.target_text ?? undefined,
			translation: s.translation,
			translationFa: s.translation_fa ?? undefined,
			hint: s.hint ?? undefined,
			hintFa: s.hint_fa ?? undefined
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
		logError('lesson-loader:loadGlossary', error.message);
		return {};
	}

	glossaryCache = {};
	for (const row of data ?? []) {
		const result = GlossaryRowSchema.safeParse(row);
		if (!result.success) {
			logWarn(
				'lesson-loader:loadGlossary',
				`Glossary row for word "${(row as { word?: unknown }).word}" failed validation: ${result.error.message}`
			);
			continue;
		}
		glossaryCache[result.data.word] = { en: result.data.en, fa: result.data.fa };
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
