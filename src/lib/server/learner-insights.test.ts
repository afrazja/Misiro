import { describe, it, expect } from 'vitest';
import { readAll, loadInsights } from './learner-insights';
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
});
