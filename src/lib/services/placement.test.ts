import { describe, it, expect } from 'vitest';
import {
	clampStartDay,
	parsePlacement,
	isAssumedKnown,
	summarizeProgress,
	startDayForScore,
	type Placement
} from './placement';
import { CURRICULUM } from './curriculum';

const TOTAL = 100;

describe('clampStartDay', () => {
	it('keeps a day that exists', () => {
		expect(clampStartDay(40, TOTAL)).toBe(40);
		expect(clampStartDay(1, TOTAL)).toBe(1);
		expect(clampStartDay(TOTAL, TOTAL)).toBe(TOTAL);
	});

	it('pulls a day past the end back to the last one', () => {
		// The band table points at day 60 of a 120-day plan, but only 100
		// days exist. Unclamped, the learner opens the app to nothing.
		expect(clampStartDay(120, TOTAL)).toBe(TOTAL);
		expect(clampStartDay(9999, TOTAL)).toBe(TOTAL);
	});

	it('refuses to start before day 1', () => {
		expect(clampStartDay(0, TOTAL)).toBe(1);
		expect(clampStartDay(-5, TOTAL)).toBe(1);
	});

	it('falls back to day 1 on anything that is not a number', () => {
		for (const bad of [undefined, null, 'forty', NaN, Infinity, {}, []]) {
			expect(clampStartDay(bad, TOTAL), `${JSON.stringify(bad)}`).toBe(1);
		}
	});

	it('floors a fractional day', () => {
		expect(clampStartDay(40.9, TOTAL)).toBe(40);
	});

	it('does not clamp when the total is unknown', () => {
		// Lesson index not loaded yet — better to keep the value than to
		// silently rewrite it to 0 and strand the learner on day 1 forever.
		expect(clampStartDay(40, 0)).toBe(40);
	});
});

describe('parsePlacement', () => {
	const good: Placement = { startDay: 40, source: 'self-test', placedAt: '2026-08-14' };

	it('accepts a well-formed record', () => {
		expect(parsePlacement(good, TOTAL)).toEqual(good);
	});

	it('clamps while parsing', () => {
		expect(parsePlacement({ ...good, startDay: 500 }, TOTAL)?.startDay).toBe(TOTAL);
	});

	it('rejects an unknown source', () => {
		// Guards against a value written by an older or newer build.
		expect(parsePlacement({ ...good, source: 'vibes' }, TOTAL)).toBeNull();
	});

	it('rejects a non-numeric startDay rather than defaulting it', () => {
		// Defaulting would silently move someone back to day 1 and look like
		// data loss. A null tells the caller nothing is stored.
		expect(parsePlacement({ ...good, startDay: '40' }, TOTAL)).toBeNull();
	});

	it('returns null for junk', () => {
		for (const bad of [null, undefined, 'x', 42, [], {}]) {
			expect(parsePlacement(bad, TOTAL), `${JSON.stringify(bad)}`).toBeNull();
		}
	});

	it('tolerates a missing date', () => {
		expect(parsePlacement({ startDay: 12, source: 'manual' }, TOTAL)).toEqual({
			startDay: 12,
			source: 'manual',
			placedAt: ''
		});
	});
});

describe('startDayForScore', () => {
	const A1 = CURRICULUM.find((l) => l.level === 'A1')!;
	const A2 = CURRICULUM.find((l) => l.level === 'A2')!;

	it('sends a blank score to day 1', () => {
		expect(startDayForScore(0)).toBe(1);
		expect(startDayForScore(0.3)).toBe(1);
	});

	it('never moves anyone past A1 for an A1-format test', () => {
		// Both tests are A1 material. A perfect run is evidence of holding
		// A1, and says nothing whatsoever about B1. The Persian test used to
		// send a top scorer to day 60 — late A2 — on twelve A1 questions.
		expect(startDayForScore(1)).toBeLessThanOrEqual(A2.firstDay);
	});

	it('starts A2 exactly at the curriculum boundary on a clean sweep', () => {
		expect(startDayForScore(1)).toBe(A2.firstDay);
		expect(startDayForScore(0.9)).toBe(A2.firstDay);
	});

	it('lands on the curriculum’s own A1 thirds', () => {
		// A1 checkpoints are 10/20/30, so the thirds begin at 1, 11 and 21.
		// These are read off the course structure, not invented.
		expect(A1.checkpoints).toEqual([10, 20, 30]);
		expect([1, 11, 21, A2.firstDay]).toContain(startDayForScore(0.75));
		expect(startDayForScore(0.75)).toBe(21);
		expect(startDayForScore(0.6)).toBe(11);
	});

	it('never goes down as the score goes up', () => {
		let last = 0;
		for (let r = 0; r <= 1.0001; r += 0.01) {
			const d = startDayForScore(r);
			expect(d, `regressed at ${r.toFixed(2)}`).toBeGreaterThanOrEqual(last);
			last = d;
		}
	});

	it('stays inside the built curriculum at every score', () => {
		for (let r = 0; r <= 1.0001; r += 0.05) {
			const d = startDayForScore(r);
			expect(d).toBeGreaterThanOrEqual(1);
			expect(d).toBeLessThanOrEqual(100); // days 101-120 do not exist yet
		}
	});

	it('falls back to day 1 on a nonsense ratio', () => {
		for (const bad of [NaN, Infinity, -Infinity]) {
			expect(startDayForScore(bad), `${bad}`).toBe(1);
		}
	});
});

describe('isAssumedKnown', () => {
	it('covers everything before the start day and nothing after', () => {
		expect(isAssumedKnown(39, 40)).toBe(true);
		expect(isAssumedKnown(1, 40)).toBe(true);
		expect(isAssumedKnown(40, 40)).toBe(false);
		expect(isAssumedKnown(41, 40)).toBe(false);
	});

	it('assumes nothing when there was no skip', () => {
		expect(isAssumedKnown(1, 1)).toBe(false);
	});
});

describe('summarizeProgress', () => {
	const done = (days: number[]) => Object.fromEntries(days.map((d) => [d, { at: 1 }]));

	it('counts a fresh unplaced learner as zero of the whole course', () => {
		const s = summarizeProgress({}, 1, TOTAL);
		expect(s).toEqual({ completed: 0, assumed: 0, scheduled: 100, total: 100, percent: 0 });
	});

	it('never reports a skipped day as completed', () => {
		// The whole point of the two-field model. If these merged, placing at
		// day 40 would award 39 lessons nobody did — and the streak, the
		// readiness score and the review queue all read the completed set.
		const s = summarizeProgress({}, 40, TOTAL);
		expect(s.completed).toBe(0);
		expect(s.assumed).toBe(39);
	});

	it('measures progress against the learner’s own course, not the curriculum', () => {
		// Placed at 40, five lessons done: 5 of 61, not 5 of 100 and not 44%.
		const s = summarizeProgress(done([40, 41, 42, 43, 44]), 40, TOTAL);
		expect(s.completed).toBe(5);
		expect(s.assumed).toBe(39);
		expect(s.scheduled).toBe(61);
		expect(s.percent).toBe(8);
	});

	it('stays at 100 when a placed learner also goes back for earlier days', () => {
		// Nothing stops someone placed at 99 from doing day 1 from the day
		// dropdown, which can push completed past scheduled.
		const s = summarizeProgress(done([1, 2, 3, 99, 100]), 99, TOTAL);
		expect(s.scheduled).toBe(2);
		expect(s.percent).toBe(100);
	});

	it('ignores falsy entries in the completed map', () => {
		const s = summarizeProgress({ 1: null, 2: false, 3: { at: 1 } } as never, 1, TOTAL);
		expect(s.completed).toBe(1);
	});

	it('handles a null completed set', () => {
		expect(summarizeProgress(null, 1, TOTAL).completed).toBe(0);
		expect(summarizeProgress(undefined, 1, TOTAL).completed).toBe(0);
	});

	it('does not divide by zero when placed on the last day', () => {
		const s = summarizeProgress({}, TOTAL, TOTAL);
		expect(s.scheduled).toBe(1);
		expect(s.percent).toBe(0);
	});

	it('never lets assumed exceed the curriculum', () => {
		const s = summarizeProgress({}, 500, TOTAL);
		expect(s.assumed).toBeLessThanOrEqual(TOTAL);
		expect(s.scheduled).toBeGreaterThanOrEqual(0);
	});
});
