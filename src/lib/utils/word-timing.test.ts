import { describe, it, expect, vi } from 'vitest';
import { computeWordTimings, wordIndexAtTime, makeWordHighlighter } from './word-timing';

describe('computeWordTimings', () => {
	it('returns one span per space-separated word', () => {
		const spans = computeWordTimings('Guten Morgen zusammen');
		expect(spans).toHaveLength(3);
	});

	it('spans cover the full 0–1 range contiguously', () => {
		const spans = computeWordTimings('Ich lerne Deutsch');
		expect(spans[0].start).toBe(0);
		expect(spans[spans.length - 1].end).toBeCloseTo(1, 5);
		for (let i = 1; i < spans.length; i++) {
			expect(spans[i].start).toBeCloseTo(spans[i - 1].end, 5);
		}
	});

	it('gives longer words a larger time slice', () => {
		const spans = computeWordTimings('Ich Entschuldigung');
		const first = spans[0].end - spans[0].start;
		const second = spans[1].end - spans[1].start;
		expect(second).toBeGreaterThan(first);
	});

	it('adds extra weight (pause) for a sentence-ending word', () => {
		const noPunct = computeWordTimings('Hallo Welt');
		const withPunct = computeWordTimings('Hallo Welt.');
		// The final word ends the range in both, but with punctuation it takes a
		// larger share, so the first word's slice shrinks.
		expect(withPunct[0].end).toBeLessThan(noPunct[0].end);
	});

	it('handles a single word', () => {
		const spans = computeWordTimings('Danke');
		expect(spans).toHaveLength(1);
		expect(spans[0]).toEqual({ start: 0, end: 1 });
	});

	it('handles empty string without throwing', () => {
		expect(computeWordTimings('')).toEqual([{ start: 0, end: 1 }]);
	});
});

describe('wordIndexAtTime', () => {
	const spans = computeWordTimings('Ich lerne Deutsch'); // 3 roughly-even words

	it('returns -1 when duration is unknown', () => {
		expect(wordIndexAtTime(spans, 0, 0)).toBe(-1);
	});

	it('returns 0 at the start', () => {
		expect(wordIndexAtTime(spans, 0, 10)).toBe(0);
	});

	it('returns the last word at/after the end', () => {
		expect(wordIndexAtTime(spans, 10, 10)).toBe(2);
		expect(wordIndexAtTime(spans, 99, 10)).toBe(2);
	});

	it('advances through words as time progresses', () => {
		const mid = wordIndexAtTime(spans, 5, 10); // halfway
		expect(mid).toBeGreaterThanOrEqual(0);
		expect(mid).toBeLessThanOrEqual(2);
	});

	it('returns -1 for empty spans', () => {
		expect(wordIndexAtTime([], 5, 10)).toBe(-1);
	});
});

describe('makeWordHighlighter', () => {
	it('only fires onIndex when the highlighted word changes', () => {
		const onIndex = vi.fn();
		const tick = makeWordHighlighter('Ich lerne Deutsch', onIndex);

		tick(0, 9); // word 0
		tick(0.1, 9); // still word 0 → no new call
		tick(4.5, 9); // word 1
		tick(8.9, 9); // word 2

		const calledWith = onIndex.mock.calls.map((c) => c[0]);
		expect(calledWith).toEqual([0, 1, 2]);
	});
});
