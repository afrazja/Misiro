import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./data-layer', () => ({
	loadSRData: vi.fn(),
	saveSRData: vi.fn(),
	recordSRAttempt: vi.fn()
}));

import { recordSRAttempt, getDueReviewItems, getDueCount } from './spaced-repetition';
import { loadSRData, saveSRData, recordSRAttempt as dataLayerRecordSR } from './data-layer';

describe('recordSRAttempt', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(saveSRData).mockResolvedValue(undefined);
		vi.mocked(dataLayerRecordSR).mockResolvedValue(undefined);
	});

	it('creates a new card if one does not exist', async () => {
		vi.mocked(loadSRData).mockResolvedValue({});
		await recordSRAttempt(1, 1, true);
		const saved = vi.mocked(saveSRData).mock.calls[0][0];
		expect(saved['1:1']).toBeDefined();
		expect(saved['1:1'].attempts).toBe(1);
	});

	it('increments attempts on each call', async () => {
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 2.5, interval: 1, nextReview: 0, attempts: 3, successes: 2 }
		});
		await recordSRAttempt(1, 1, true);
		const saved = vi.mocked(saveSRData).mock.calls[0][0];
		expect(saved['1:1'].attempts).toBe(4);
	});

	describe('on a correct answer', () => {
		it('increments successes', async () => {
			vi.mocked(loadSRData).mockResolvedValue({});
			await recordSRAttempt(1, 1, true);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].successes).toBe(1);
		});

		it('advances interval from 1 to 3 on the first success', async () => {
			vi.mocked(loadSRData).mockResolvedValue({});
			await recordSRAttempt(1, 1, true);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].interval).toBe(3);
		});

		it('multiplies interval by ease on subsequent successes', async () => {
			vi.mocked(loadSRData).mockResolvedValue({
				'2:5': { ease: 2.5, interval: 3, nextReview: 0, attempts: 2, successes: 2 }
			});
			await recordSRAttempt(2, 5, true);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['2:5'].interval).toBe(Math.round(3 * 2.5)); // 8
		});

		it('increases ease by 0.1', async () => {
			vi.mocked(loadSRData).mockResolvedValue({
				'1:1': { ease: 2.5, interval: 3, nextReview: 0, attempts: 2, successes: 2 }
			});
			await recordSRAttempt(1, 1, true);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].ease).toBeCloseTo(2.6);
		});

		it('does not raise ease above its calculated value for a new card (2.5 + 0.1 = 2.6)', async () => {
			vi.mocked(loadSRData).mockResolvedValue({});
			await recordSRAttempt(1, 1, true);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].ease).toBeCloseTo(2.6);
		});
	});

	describe('on an incorrect answer', () => {
		it('does not increment successes', async () => {
			vi.mocked(loadSRData).mockResolvedValue({});
			await recordSRAttempt(1, 1, false);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].successes).toBe(0);
		});

		it('resets interval to 1', async () => {
			vi.mocked(loadSRData).mockResolvedValue({
				'1:1': { ease: 2.5, interval: 10, nextReview: 0, attempts: 5, successes: 4 }
			});
			await recordSRAttempt(1, 1, false);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].interval).toBe(1);
		});

		it('decreases ease by 0.2', async () => {
			vi.mocked(loadSRData).mockResolvedValue({
				'1:1': { ease: 2.5, interval: 3, nextReview: 0, attempts: 2, successes: 2 }
			});
			await recordSRAttempt(1, 1, false);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].ease).toBeCloseTo(2.3);
		});

		it('does not drop ease below the minimum of 1.3', async () => {
			vi.mocked(loadSRData).mockResolvedValue({
				'1:1': { ease: 1.3, interval: 3, nextReview: 0, attempts: 10, successes: 2 }
			});
			await recordSRAttempt(1, 1, false);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			expect(saved['1:1'].ease).toBe(1.3);
		});

		it('keeps ease at minimum even when already at 1.3', async () => {
			vi.mocked(loadSRData).mockResolvedValue({
				'1:1': { ease: 1.4, interval: 3, nextReview: 0, attempts: 5, successes: 1 }
			});
			await recordSRAttempt(1, 1, false);
			const saved = vi.mocked(saveSRData).mock.calls[0][0];
			// 1.4 - 0.2 = 1.2, but min is 1.3
			expect(saved['1:1'].ease).toBe(1.3);
		});
	});

	it('sets nextReview to the correct number of days from now', async () => {
		vi.mocked(loadSRData).mockResolvedValue({});
		const before = Date.now();
		await recordSRAttempt(1, 1, true); // new card → interval becomes 3
		const after = Date.now();

		const saved = vi.mocked(saveSRData).mock.calls[0][0];
		const nextReview = saved['1:1'].nextReview;

		expect(nextReview).toBeGreaterThanOrEqual(before + 3 * 24 * 60 * 60 * 1000);
		expect(nextReview).toBeLessThanOrEqual(after + 3 * 24 * 60 * 60 * 1000);
	});

	it('sets lastReview to approximately now', async () => {
		vi.mocked(loadSRData).mockResolvedValue({});
		const before = Date.now();
		await recordSRAttempt(1, 1, true);
		const after = Date.now();

		const saved = vi.mocked(saveSRData).mock.calls[0][0];
		expect(saved['1:1'].lastReview).toBeGreaterThanOrEqual(before);
		expect(saved['1:1'].lastReview).toBeLessThanOrEqual(after);
	});

	it('calls dataLayerRecordSR for cloud sync', async () => {
		vi.mocked(loadSRData).mockResolvedValue({});
		await recordSRAttempt(1, 2, true);
		expect(dataLayerRecordSR).toHaveBeenCalledWith(1, 2, expect.objectContaining({ attempts: 1 }));
	});
});

describe('getDueReviewItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns an empty array when there is no SR data', async () => {
		vi.mocked(loadSRData).mockResolvedValue({});
		expect(await getDueReviewItems()).toEqual([]);
	});

	it('returns items where nextReview is in the past and attempts > 0', async () => {
		const past = Date.now() - 1000;
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 2.5, interval: 1, nextReview: past, attempts: 1, successes: 1 }
		});
		const items = await getDueReviewItems();
		expect(items).toHaveLength(1);
		expect(items[0].day).toBe(1);
		expect(items[0].sentenceId).toBe(1);
	});

	it('excludes items where nextReview is in the future', async () => {
		const future = Date.now() + 1_000_000;
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 2.5, interval: 3, nextReview: future, attempts: 2, successes: 1 }
		});
		expect(await getDueReviewItems()).toHaveLength(0);
	});

	it('excludes items with 0 attempts (never practiced)', async () => {
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 2.5, interval: 1, nextReview: 0, attempts: 0, successes: 0 }
		});
		expect(await getDueReviewItems()).toHaveLength(0);
	});

	it('sorts results by ease ascending (hardest items first)', async () => {
		const past = Date.now() - 1000;
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 2.5, interval: 1, nextReview: past, attempts: 2, successes: 1 },
			'1:2': { ease: 1.3, interval: 1, nextReview: past, attempts: 3, successes: 0 },
			'1:3': { ease: 3.0, interval: 1, nextReview: past, attempts: 1, successes: 1 }
		});
		const items = await getDueReviewItems();
		expect(items[0].ease).toBe(1.3);
		expect(items[1].ease).toBe(2.5);
		expect(items[2].ease).toBe(3.0);
	});

	it('correctly parses day and sentenceId from composite key', async () => {
		const past = Date.now() - 1000;
		vi.mocked(loadSRData).mockResolvedValue({
			'5:12': { ease: 2.5, interval: 1, nextReview: past, attempts: 1, successes: 1 }
		});
		const items = await getDueReviewItems();
		expect(items[0].day).toBe(5);
		expect(items[0].sentenceId).toBe(12);
	});

	it('includes ease, interval, attempts, and successes in each result', async () => {
		const past = Date.now() - 1000;
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 1.8, interval: 2, nextReview: past, attempts: 4, successes: 3 }
		});
		const [item] = await getDueReviewItems();
		expect(item.ease).toBe(1.8);
		expect(item.interval).toBe(2);
		expect(item.attempts).toBe(4);
		expect(item.successes).toBe(3);
	});
});

describe('getDueCount', () => {
	it('returns the count of due items', async () => {
		const past = Date.now() - 1000;
		vi.mocked(loadSRData).mockResolvedValue({
			'1:1': { ease: 2.5, interval: 1, nextReview: past, attempts: 1, successes: 1 },
			'1:2': { ease: 2.5, interval: 1, nextReview: past, attempts: 1, successes: 1 }
		});
		expect(await getDueCount()).toBe(2);
	});

	it('returns 0 when nothing is due', async () => {
		vi.mocked(loadSRData).mockResolvedValue({});
		expect(await getDueCount()).toBe(0);
	});
});
