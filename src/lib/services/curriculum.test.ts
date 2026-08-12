import { describe, it, expect } from 'vitest';
import {
	CURRICULUM,
	MAX_SENTENCES,
	MIN_SENTENCES,
	TOTAL_DAYS,
	allCheckpoints,
	checkpointKey,
	dueCheckpoint,
	levelForDay,
	levelProgress,
	nextCheckpoint,
	targetSentencesForDay
} from './curriculum';

const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('CURRICULUM', () => {
	it('covers every day of the course with no gaps or overlaps', () => {
		for (let d = 1; d <= TOTAL_DAYS; d++) {
			expect(levelForDay(d), `day ${d}`).not.toBeNull();
		}
		expect(levelForDay(0)).toBeNull();
		expect(levelForDay(TOTAL_DAYS + 1)).toBeNull();
	});

	it('runs A1 → A2 → B1 in order', () => {
		expect(levelForDay(1)).toBe('A1');
		expect(levelForDay(30)).toBe('A1');
		expect(levelForDay(31)).toBe('A2');
		expect(levelForDay(65)).toBe('A2');
		expect(levelForDay(66)).toBe('B1');
		expect(levelForDay(120)).toBe('B1');
	});

	it('gives every level exactly three checkpoints', () => {
		for (const l of CURRICULUM) expect(l.checkpoints).toHaveLength(3);
		expect(allCheckpoints()).toHaveLength(9);
	});

	// Finishing a level and proving it should be the same moment.
	it('ends each level on a checkpoint', () => {
		for (const l of CURRICULUM) {
			expect(l.checkpoints[l.checkpoints.length - 1]).toBe(l.lastDay);
		}
	});

	it('keeps checkpoints inside their level and in ascending order', () => {
		for (const l of CURRICULUM) {
			for (const d of l.checkpoints) {
				expect(d).toBeGreaterThanOrEqual(l.firstDay);
				expect(d).toBeLessThanOrEqual(l.lastDay);
			}
			expect([...l.checkpoints].sort((a, b) => a - b)).toEqual(l.checkpoints);
		}
	});

	it('gives every checkpoint a unique key', () => {
		const keys = allCheckpoints().map(checkpointKey);
		expect(new Set(keys).size).toBe(keys.length);
		expect(keys.slice(0, 4)).toEqual(['A1-1', 'A1-2', 'A1-3', 'A2-1']);
	});
});

describe('dueCheckpoint', () => {
	it('is null before the first milestone', () => {
		expect(dueCheckpoint(upTo(9), [])).toBeNull();
	});

	it('unlocks on the milestone day', () => {
		expect(dueCheckpoint(upTo(10), [])).toMatchObject({ level: 'A1', index: 1, day: 10 });
	});

	it('stays available until taken', () => {
		expect(dueCheckpoint(upTo(14), [])).toMatchObject({ index: 1 });
	});

	it('moves on once taken', () => {
		expect(dueCheckpoint(upTo(14), ['A1-1'])).toBeNull();
		expect(dueCheckpoint(upTo(20), ['A1-1'])).toMatchObject({ index: 2, day: 20 });
	});

	// Earliest first: a learner on day 40 who never took the A1 checkpoints
	// should be offered A1-1, not dropped into A2.
	it('never lets a learner skip ahead', () => {
		expect(dueCheckpoint(upTo(50), [])).toMatchObject({ level: 'A1', index: 1 });
	});

	it('is null once every checkpoint is done', () => {
		const all = allCheckpoints().map(checkpointKey);
		expect(dueCheckpoint(upTo(120), all)).toBeNull();
	});
});

describe('nextCheckpoint', () => {
	it('counts the lessons still standing in the way', () => {
		expect(nextCheckpoint(upTo(5), [])).toMatchObject({ lessonsRemaining: 5 });
		expect(nextCheckpoint([], [])).toMatchObject({ lessonsRemaining: 10 });
	});

	it('reports 0 remaining when it is available now', () => {
		expect(nextCheckpoint(upTo(10), [])).toMatchObject({ lessonsRemaining: 0 });
	});

	// A skipped day is still a lesson owed, so the count must not be a
	// simple "milestone minus highest day finished".
	it('counts a skipped day as still outstanding', () => {
		const withGap = upTo(10).filter((d) => d !== 3);
		expect(nextCheckpoint(withGap, [])).toMatchObject({ lessonsRemaining: 1 });
	});

	it('points at the next level once a level is finished', () => {
		const done = ['A1-1', 'A1-2', 'A1-3'];
		expect(nextCheckpoint(upTo(30), done)).toMatchObject({
			checkpoint: { level: 'A2', index: 1, day: 42 },
			lessonsRemaining: 12
		});
	});

	it('is null when the course is complete', () => {
		expect(nextCheckpoint(upTo(120), allCheckpoints().map(checkpointKey))).toBeNull();
	});
});

describe('levelProgress', () => {
	it('reports one entry per level', () => {
		expect(levelProgress([], []).map((l) => l.level)).toEqual(['A1', 'A2', 'B1']);
	});

	it('counts only the days inside each level', () => {
		const p = levelProgress(upTo(36), []);
		expect(p[0]).toMatchObject({ level: 'A1', daysDone: 30, daysTotal: 30, percent: 100 });
		expect(p[1]).toMatchObject({ level: 'A2', daysDone: 6, daysTotal: 35 });
		expect(p[2]).toMatchObject({ level: 'B1', daysDone: 0, daysTotal: 55, percent: 0 });
	});

	it('marks the first unfinished level as current', () => {
		expect(levelProgress(upTo(36), []).filter((l) => l.current).map((l) => l.level)).toEqual([
			'A2'
		]);
		expect(levelProgress([], []).find((l) => l.current)?.level).toBe('A1');
	});

	it('no level is current once the course is finished', () => {
		expect(levelProgress(upTo(120), []).some((l) => l.current)).toBe(false);
	});

	it('counts checkpoints taken per level', () => {
		const p = levelProgress(upTo(30), ['A1-1', 'A1-2']);
		expect(p[0]).toMatchObject({ checkpointsDone: 2, checkpointsTotal: 3 });
		expect(p[1].checkpointsDone).toBe(0);
	});
});

describe('targetSentencesForDay', () => {
	it('ramps across a level', () => {
		expect(targetSentencesForDay(1)).toBe(8);
		expect(targetSentencesForDay(30)).toBe(11);
		expect(targetSentencesForDay(31)).toBe(11);
		expect(targetSentencesForDay(65)).toBe(13);
		expect(targetSentencesForDay(66)).toBe(13);
		expect(targetSentencesForDay(120)).toBe(15);
	});

	it('never leaves the bounds a lesson is allowed to have', () => {
		// Below 8 there is no conversation; above 15 it stops being a daily
		// habit. Every day of the course has to sit inside that.
		for (let d = 1; d <= 120; d++) {
			const n = targetSentencesForDay(d)!;
			expect(n).toBeGreaterThanOrEqual(MIN_SENTENCES);
			expect(n).toBeLessThanOrEqual(MAX_SENTENCES);
		}
	});

	it('rises monotonically — a later day is never a smaller lesson', () => {
		// The old minute table had B1 shorter than A1 in practice; this is the
		// guard against writing that back in.
		let prev = 0;
		for (let d = 1; d <= 120; d++) {
			const n = targetSentencesForDay(d)!;
			expect(n).toBeGreaterThanOrEqual(prev);
			prev = n;
		}
	});

	it('has no answer for a day outside the course', () => {
		expect(targetSentencesForDay(0)).toBeNull();
		expect(targetSentencesForDay(121)).toBeNull();
	});
});
