import { describe, it, expect } from 'vitest';
import { highestCompleted, frontierDay, isUnlocked, unlockedBy } from './lesson-access';

const done = (days: number[]) => Object.fromEntries(days.map((d) => [String(d), { at: 1 }]));

describe('highestCompleted', () => {
	it('is zero for a new account', () => {
		expect(highestCompleted({})).toBe(0);
		expect(highestCompleted(null)).toBe(0);
		expect(highestCompleted(undefined)).toBe(0);
	});

	it('reads the furthest day, not the count', () => {
		// Three lessons done but the furthest is 40 — a count would say 3 and
		// lock everything from day 4.
		expect(highestCompleted(done([1, 2, 40]))).toBe(40);
	});

	it('ignores falsy entries', () => {
		// The completed map has carried both { at } objects and bare flags;
		// a false value means not completed, not "completed with no data".
		expect(highestCompleted({ 1: { at: 1 }, 2: false, 3: null } as never)).toBe(1);
	});

	it('survives a non-numeric key', () => {
		expect(highestCompleted({ 5: { at: 1 }, notADay: { at: 1 } } as never)).toBe(5);
	});
});

describe('isUnlocked', () => {
	it('always opens day 1, even with nothing completed', () => {
		expect(isUnlocked(1, {})).toBe(true);
		expect(isUnlocked(1, null)).toBe(true);
	});

	it('locks everything else for a brand new account', () => {
		for (const d of [2, 3, 10, 44, 100]) {
			expect(isUnlocked(d, {}), `day ${d}`).toBe(false);
		}
	});

	it('opens exactly one more day per lesson finished', () => {
		expect(isUnlocked(2, done([1]))).toBe(true);
		expect(isUnlocked(3, done([1]))).toBe(false);
		expect(isUnlocked(3, done([1, 2]))).toBe(true);
		expect(isUnlocked(4, done([1, 2]))).toBe(false);
	});

	it('does not punish a learner for gaps the app used to allow', () => {
		// The day picker was ungated for the app's whole life. Someone who
		// jumped and completed 1, 2 and 4 would find day 5 locked under a
		// strict "previous day must be done" rule — penalised today for
		// navigation the app invited yesterday.
		const legacy = done([1, 2, 4]);
		expect(isUnlocked(4, legacy)).toBe(true);
		expect(isUnlocked(5, legacy)).toBe(true);
		expect(isUnlocked(6, legacy)).toBe(false);
	});

	it('keeps an established learner where they were', () => {
		// Someone mid-course must not open the app to a locked day 45.
		const mid = done(Array.from({ length: 44 }, (_, i) => i + 1));
		expect(isUnlocked(44, mid)).toBe(true);
		expect(isUnlocked(45, mid)).toBe(true);
		expect(isUnlocked(46, mid)).toBe(false);
	});

	it('re-opens a completed day', () => {
		// Revisiting a finished lesson is not cheating; it is revision.
		expect(isUnlocked(1, done([1, 2, 3]))).toBe(true);
		expect(isUnlocked(2, done([1, 2, 3]))).toBe(true);
	});

	it('refuses nonsense rather than defaulting open', () => {
		for (const bad of [NaN, Infinity, -Infinity]) {
			expect(isUnlocked(bad as number, done([1, 2])), `${bad}`).toBe(false);
		}
	});

	it('treats day 0 and negatives as the first day', () => {
		// Nothing should produce these, but a guard that throws is worse than
		// one that lets the learner into day 1.
		expect(isUnlocked(0, {})).toBe(true);
		expect(isUnlocked(-3, {})).toBe(true);
	});
});

describe('frontierDay', () => {
	it('is day 1 for a new account', () => {
		expect(frontierDay({})).toBe(1);
	});

	it('is one past the furthest finished lesson', () => {
		expect(frontierDay(done([1, 2, 3]))).toBe(4);
		expect(frontierDay(done([40]))).toBe(41);
	});

	it('never goes backwards below day 1', () => {
		expect(frontierDay(null)).toBe(1);
	});
});

describe('unlockedBy', () => {
	it('is null when the day is already open', () => {
		expect(unlockedBy(1, {})).toBeNull();
		expect(unlockedBy(2, done([1]))).toBeNull();
	});

	it('names the day that must be finished first', () => {
		// "Finish day 3 first" is actionable; a bare padlock is not.
		expect(unlockedBy(9, done([1, 2]))).toBe(3);
		expect(unlockedBy(2, {})).toBe(1);
	});
});
