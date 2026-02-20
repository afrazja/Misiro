/**
 * Lesson Loader — dynamically loads lesson JSON files and glossary.
 * Uses Vite's import.meta.glob for code-splitting: users only download
 * the lesson data they actually need.
 */

import type { Lesson, Sentence } from '$stores/lesson';
import type { Language } from '$stores/preferences';

// Vite glob import: all lesson JSON files, lazy-loaded
const lessonModules = import.meta.glob('/lessons/day-*.json') as Record<string, () => Promise<{ default: Lesson }>>;

// Lesson index — loaded eagerly via Vite glob (avoids relative path TypeScript issues)
const indexModules = import.meta.glob('/lessons/index.json', { eager: true }) as Record<string, { default: { lessons: LessonMeta[] } }>;
const lessonIndex = indexModules['/lessons/index.json']?.default ?? { lessons: [] };

export interface LessonMeta {
	day: number;
	file: string;
	title: string;
	titleFa: string;
	group: string;
}

// In-memory cache for loaded lessons
const loadedLessons: Record<number, Lesson> = {};
let glossaryData: Record<string, { en: string; fa: string }> | null = null;

/**
 * Get all available lesson metadata from the index
 */
export function getLessonIndex(): LessonMeta[] {
	return lessonIndex.lessons;
}

/**
 * Get the total number of lessons available
 */
export function getTotalLessons(): number {
	return lessonIndex.lessons.length;
}

/**
 * Load a single lesson by day number. Returns from cache if already loaded.
 */
export async function loadLesson(day: number): Promise<Lesson | null> {
	if (loadedLessons[day]) {
		return loadedLessons[day];
	}

	const importPath = `/lessons/day-${day}.json`;
	const loader = lessonModules[importPath];

	if (!loader) {
		console.warn(`No lesson file found for day ${day}`);
		return null;
	}

	try {
		const module = await loader();
		const lesson = module.default;
		loadedLessons[day] = lesson;
		return lesson;
	} catch (e) {
		console.error(`Failed to load lesson for day ${day}:`, e);
		return null;
	}
}

/**
 * Load multiple lessons at once (for exam/review modes)
 */
export async function loadLessons(days: number[]): Promise<void> {
	await Promise.all(days.map(day => loadLesson(day)));
}

/**
 * Get a lesson from the cache (must be loaded first)
 */
export function getLesson(day: number): Lesson | null {
	return loadedLessons[day] || null;
}

/**
 * Get all currently loaded lessons
 */
export function getAllLoadedLessons(): Record<number, Lesson> {
	return loadedLessons;
}

/**
 * Load the glossary data
 */
export async function loadGlossary(): Promise<Record<string, { en: string; fa: string }>> {
	if (glossaryData) return glossaryData;

	try {
		// Use Vite glob for the glossary too (lazy-loaded)
		const glossaryModules = import.meta.glob('/lessons/glossary.json') as Record<string, () => Promise<{ default: Record<string, { en: string; fa: string }> }>>;
		const loader = glossaryModules['/lessons/glossary.json'];
		if (loader) {
			const module = await loader();
			glossaryData = module.default;
			return glossaryData;
		}
		return {};
	} catch (e) {
		console.error('Failed to load glossary:', e);
		return {};
	}
}

/**
 * Get glossary meaning for a word based on current language
 */
export function getGlossaryMeaning(word: string, language: Language): string | null {
	if (!glossaryData) return null;

	const entry = glossaryData[word.toLowerCase()];
	if (!entry) return null;

	// Handle both old string format and new {en, fa} format
	if (typeof entry === 'string') return entry;
	return language === 'fa' ? entry.fa : entry.en;
}

/**
 * Check if a day number has a lesson available
 */
export function hasLesson(day: number): boolean {
	return !!lessonModules[`/lessons/day-${day}.json`];
}
