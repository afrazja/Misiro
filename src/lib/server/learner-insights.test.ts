import { describe, it, expect } from 'vitest';
import { readAll, loadInsights, loadLessonCatalog } from './learner-insights';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lessonVersion } from '$lib/analytics/lesson-content';
describe('complete report loading', () => {
	it('fetches every page even when the database cap is smaller than the requested page', async () => {
		const all = [1, 2, 3, 4, 5];
		expect(await readAll<number>(async from => ({ data: all.slice(from, from + 2), error: null }))).toEqual(all);
	});
	it('rejects partial data when a later page fails or the safety cap is hit', async () => {
		await expect(readAll(async from => from ? { data: null, error: 'denied' } : { data: [1, 2], error: null })).rejects.toThrow('query failed');
		await expect(readAll(async () => ({ data: [1, 2], error: null }), 2)).rejects.toThrow('safe query limit');
	});
	it('shows unavailable instead of falling back to the current user when the service key is missing', async () => {
		expect(await loadInsights(null, { days: 30, includeTests: false, selfId: null })).toMatchObject({ status: 'unavailable', report: null });
	});
	it('loads all sentence pages and matches the identifier of the lesson actually shown to a learner', async () => {
		const rows: Record<string, unknown[]> = {
			lessons: [{ id: 'lesson-1', day: 1, title: 'Hello' }],
			sentences: [
				{ lesson_id: 'lesson-1', sentence_order: 1, role: 'sent', audio_text: null, target_text: 'Hallo!', translation: 'Hello!', translation_fa: null },
				{ lesson_id: 'lesson-1', sentence_order: 0, role: 'received', audio_text: 'Guten Tag.', target_text: null, translation: 'Good day.', translation_fa: null }
			]
		};
		const db = { from: (table: string) => ({ select: () => ({ order: () => ({ range: (from: number) => Promise.resolve({ data: rows[table].slice(from, from + 1), error: null }) }) }) }) } as unknown as SupabaseClient;
		const result = await loadLessonCatalog(db);
		expect(result.catalogError).toBeNull();
		expect(result.catalog[0].version).toBe(lessonVersion([
			{ id: 1, role: 'received', audioText: 'Guten Tag.', translation: 'Good day.' },
			{ id: 2, role: 'sent', targetText: 'Hallo!', translation: 'Hello!' }
		]));
	});
	it('discards the whole content match when a catalog query fails', async () => {
		const db = { from: () => ({ select: () => ({ order: () => ({ range: () => Promise.resolve({ data: null, error: 'unavailable' }) }) }) }) } as unknown as SupabaseClient;
		const result = await loadLessonCatalog(db);
		expect(result.catalog).toEqual([]); expect(result.catalogError).toContain('completely');
	});
});
