import { describe, it, expect, beforeEach } from 'vitest';
import {
	weightedAccuracy,
	recordDrillResult,
	recordPracticeResult,
	hasBeenTested,
	checkAvailability,
	LESSONS_PER_CHECK,
	type DrillAttempt
} from './readiness';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const at = (daysAgo: number, earned: number, possible: number): DrillAttempt => ({
	earned,
	possible,
	at: NOW - daysAgo * DAY
});

describe('weightedAccuracy', () => {
	it('returns null when there is nothing gradeable', () => {
		expect(weightedAccuracy([], NOW)).toBeNull();
		expect(weightedAccuracy([at(0, 0, 0)], NOW)).toBeNull();
	});

	it('is plain accuracy for a single sitting', () => {
		const w = weightedAccuracy([at(0, 3, 4)], NOW)!;
		expect(w.accuracy).toBeCloseTo(0.75);
		expect(w.possible).toBe(4);
	});

	// The defect this replaces: lifetime totals meant a perfect retake after a
	// weak first attempt showed 75%, anchored forever to the first attempt.
	it('moves toward the most recent sitting, not the lifetime average', () => {
		const history = [at(0, 2, 2), at(30, 1, 2)]; // perfect retake after 50%
		const lifetimeAverage = 3 / 4; // 0.75 — what the old code produced
		const w = weightedAccuracy(history, NOW)!;
		expect(w.accuracy).toBeGreaterThan(lifetimeAverage);
		expect(w.accuracy).toBeCloseTo(2.6 / 3.2, 5); // 0.8125
	});

	it('lets a decline show up too', () => {
		const w = weightedAccuracy([at(0, 0, 2), at(30, 2, 2)], NOW)!;
		expect(w.accuracy).toBeLessThan(0.5);
	});

	// With 2-question modules, "latest only" would swing the bar 50 points on
	// one lucky answer, so older sittings still damp it.
	it('does not jump all the way to the latest result', () => {
		const w = weightedAccuracy([at(0, 2, 2), at(10, 0, 2)], NOW)!;
		expect(w.accuracy).toBeLessThan(1);
		expect(w.accuracy).toBeGreaterThan(0.5);
	});

	it('ignores sittings older than the freshness window', () => {
		const stale = weightedAccuracy([at(400, 2, 2)], NOW);
		expect(stale).toBeNull();
		// A stale perfect run must not prop up a weak recent one.
		const w = weightedAccuracy([at(0, 0, 2), at(400, 2, 2)], NOW)!;
		expect(w.accuracy).toBe(0);
		expect(w.possible).toBe(2);
	});

	it('clamps a nonsense record instead of exceeding 100%', () => {
		expect(weightedAccuracy([at(0, 9, 2)], NOW)!.accuracy).toBe(1);
	});

	it('reports total graded points, which gates the confidence check', () => {
		expect(weightedAccuracy([at(0, 1, 2), at(5, 2, 4)], NOW)!.possible).toBe(6);
	});
});

describe('recordDrillResult', () => {
	beforeEach(() => localStorage.clear());

	const stored = () => JSON.parse(localStorage.getItem('mirifer_drill_stats') || '{}');

	it('stores newest first', () => {
		recordDrillResult('lesen', 1, 2);
		recordDrillResult('lesen', 4, 4);
		const h = stored().lesen.history;
		expect(h.map((a: DrillAttempt) => a.earned)).toEqual([4, 1]);
	});

	it('ignores an empty result', () => {
		recordDrillResult('lesen', 0, 0);
		expect(stored().lesen).toBeUndefined();
	});

	it('caps the history so old sittings cannot accumulate forever', () => {
		for (let i = 0; i < 12; i++) recordDrillResult('hoeren', 1, 2);
		expect(stored().hoeren.history.length).toBeLessThanOrEqual(8);
	});

	it('keeps modules apart', () => {
		recordDrillResult('hoeren', 2, 2);
		recordDrillResult('sprechen', 0, 2);
		expect(stored().hoeren.history).toHaveLength(1);
		expect(stored().sprechen.history[0].earned).toBe(0);
	});

	// Anyone who already took the test has the lifetime-totals shape stored.
	// Dropping it would reset them to "not placed yet".
	it('migrates the old lifetime-totals record into a sitting', () => {
		localStorage.setItem(
			'mirifer_drill_stats',
			JSON.stringify({ lesen: { attempts: 1, earned: 3, possible: 4, updatedAt: NOW } })
		);
		recordDrillResult('lesen', 2, 2);
		const h = stored().lesen.history;
		expect(h).toHaveLength(2);
		expect(h[0]).toMatchObject({ earned: 2, possible: 2 });
		expect(h[1]).toMatchObject({ earned: 3, possible: 4 });
	});
});

describe('recordPracticeResult', () => {
	beforeEach(() => localStorage.clear());

	const stored = () => JSON.parse(localStorage.getItem('mirifer_practice_signal') || '{}');

	// Practice arrives one answer at a time. Without day bucketing an
	// 8-entry history would cover the last eight ANSWERS, not the last eight
	// sessions, and the whole recency idea would collapse to "this minute".
	it('merges answers from the same day into one bucket', () => {
		recordPracticeResult('lesen', 1, 1);
		recordPracticeResult('lesen', 0, 1);
		recordPracticeResult('lesen', 1, 1);
		const h = stored().lesen.history;
		expect(h).toHaveLength(1);
		expect(h[0]).toMatchObject({ earned: 2, possible: 3 });
	});

	it('keeps a separate bucket per module', () => {
		recordPracticeResult('sprechen', 1, 1);
		recordPracticeResult('schreiben', 0, 1);
		expect(stored().sprechen.history[0].earned).toBe(1);
		expect(stored().schreiben.history[0].earned).toBe(0);
	});

	it('starts a new bucket on a later day', () => {
		recordPracticeResult('lesen', 1, 1);
		const raw = stored();
		raw.lesen.history[0].at = Date.now() - 3 * DAY;
		localStorage.setItem('mirifer_practice_signal', JSON.stringify(raw));
		recordPracticeResult('lesen', 1, 1);
		expect(stored().lesen.history).toHaveLength(2);
	});

	it('ignores an empty result', () => {
		recordPracticeResult('lesen', 0, 0);
		expect(stored().lesen).toBeUndefined();
	});

	it('caps the number of days kept', () => {
		for (let i = 0; i < 12; i++) {
			recordPracticeResult('hoeren', 1, 1);
			const raw = stored();
			raw.hoeren.history[0].at = Date.now() - (i + 1) * DAY;
			localStorage.setItem('mirifer_practice_signal', JSON.stringify(raw));
		}
		expect(stored().hoeren.history.length).toBeLessThanOrEqual(8);
	});

	it('does not touch the drill bucket', () => {
		recordPracticeResult('lesen', 1, 1);
		expect(localStorage.getItem('mirifer_drill_stats')).toBeNull();
	});
});

describe('hasBeenTested', () => {
	beforeEach(() => localStorage.clear());

	it('is false with nothing stored', () => {
		expect(hasBeenTested()).toBe(false);
	});

	it('is true once a module has a sitting', () => {
		localStorage.setItem(
			'mirifer_drill_stats',
			JSON.stringify({ lesen: { history: [{ earned: 3, possible: 4, at: NOW }], updatedAt: NOW } })
		);
		expect(hasBeenTested()).toBe(true);
	});

	it('is true for the legacy lifetime-totals shape too', () => {
		localStorage.setItem(
			'mirifer_drill_stats',
			JSON.stringify({ lesen: { attempts: 1, earned: 3, possible: 4, updatedAt: NOW } })
		);
		expect(hasBeenTested()).toBe(true);
	});

	it('is false for an empty history', () => {
		localStorage.setItem('mirifer_drill_stats', JSON.stringify({ lesen: { history: [] } }));
		expect(hasBeenTested()).toBe(false);
	});
});

describe('checkAvailability', () => {
	const lessons = (n: number, since: number) =>
		Array.from({ length: n }, (_, i) => since + (i + 1) * 60_000);

	it('is always open before the first sitting — placement is calibration', () => {
		const a = checkAvailability([], null, NOW);
		expect(a.unlocked).toBe(true);
		expect(a.isFirstSitting).toBe(true);
	});

	// The point of the gate: retaking with nothing studied samples the same
	// ability twice, and the difference is noise on twelve questions.
	it('stays locked when nothing has been finished since the last check', () => {
		const a = checkAvailability([], NOW - 10 * DAY, NOW);
		expect(a.unlocked).toBe(false);
		expect(a.lessonsNeeded).toBe(LESSONS_PER_CHECK);
	});

	it('counts down the lessons still needed', () => {
		const last = NOW - 10 * DAY;
		expect(checkAvailability(lessons(2, last), last, NOW).lessonsNeeded).toBe(
			LESSONS_PER_CHECK - 2
		);
	});

	it('opens once enough lessons are done', () => {
		const last = NOW - 10 * DAY;
		const a = checkAvailability(lessons(LESSONS_PER_CHECK, last), last, NOW);
		expect(a.unlocked).toBe(true);
		expect(a.lessonsNeeded).toBe(0);
	});

	it('ignores lessons finished BEFORE the last check', () => {
		const last = NOW - 10 * DAY;
		const older = Array.from({ length: 20 }, (_, i) => last - (i + 1) * DAY);
		expect(checkAvailability(older, last, NOW).lessonsNeeded).toBe(LESSONS_PER_CHECK);
	});

	// Otherwise someone could bulk-complete five days and immediately re-roll.
	it('holds the 24h floor even with the lessons done', () => {
		const last = NOW - 2 * 60 * 60 * 1000;
		const a = checkAvailability(lessons(LESSONS_PER_CHECK, last), last, NOW);
		expect(a.unlocked).toBe(false);
		expect(a.lessonsNeeded).toBe(0);
		expect(a.hoursNeeded).toBe(22);
	});

	it('reports no hours left once the floor has passed', () => {
		const last = NOW - 30 * 60 * 60 * 1000;
		expect(checkAvailability([], last, NOW).hoursNeeded).toBe(0);
	});

	it('survives junk in the completion timestamps', () => {
		const last = NOW - 10 * DAY;
		const junk = [null, undefined, 'x', NaN] as unknown as number[];
		expect(checkAvailability(junk, last, NOW).lessonsNeeded).toBe(LESSONS_PER_CHECK);
	});
});
