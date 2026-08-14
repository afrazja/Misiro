import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/supabase/client', () => ({
	getSupabaseBrowserClient: vi.fn()
}));

import { resolveResumePoint, invalidateLessonCache } from './lesson-loader';

/**
 * resolveResumePoint decides where every single learner lands when they
 * open the app, and it had no tests at all before placement was added to
 * it. These cover the behaviour that existed as well as the new floor, so
 * the day-1 path is pinned rather than assumed.
 *
 * hasLesson/getTotalLessons read an in-memory cache that falls back to
 * localStorage, so seeding the key and invalidating is enough — no
 * Supabase involved.
 */
const LS_INDEX_KEY = 'mirifer_lesson_index';

function seedIndex(days: number[]) {
	// Invalidate FIRST. invalidateLessonCache() with no argument deletes the
	// index key from localStorage as well as clearing the in-memory cache,
	// so seeding before invalidating wipes what was just written — which is
	// exactly the mistake the first version of this file made.
	invalidateLessonCache();
	localStorage.setItem(LS_INDEX_KEY, JSON.stringify(days.map((day) => ({ day, title: `Day ${day}` }))));
}

/** Completed-set helper. */
const done = (days: number[]) => Object.fromEntries(days.map((d) => [d, { at: 1 }]));

const ALL = Array.from({ length: 100 }, (_, i) => i + 1);

beforeEach(() => {
	localStorage.clear();
	seedIndex(ALL);
});

describe('resolveResumePoint — behaviour that predates placement', () => {
	it('starts a brand new learner on day 1', () => {
		expect(resolveResumePoint(null, {})).toEqual({ day: 1, sentenceIndex: 0, allDone: false });
	});

	it('goes to the lowest uncompleted day', () => {
		expect(resolveResumePoint(null, done([1, 2, 3]))).toMatchObject({ day: 4, sentenceIndex: 0 });
	});

	it('fills a gap rather than running to the frontier', () => {
		// Completed 1,2,4 — day 3 is the next thing to do.
		expect(resolveResumePoint(null, done([1, 2, 4]))).toMatchObject({ day: 3 });
	});

	it('resumes mid-lesson over the frontier', () => {
		const r = resolveResumePoint({ currentDay: 7, currentSentenceIndex: 4 }, done([1, 2]));
		expect(r).toEqual({ day: 7, sentenceIndex: 4, allDone: false });
	});

	it('ignores saved progress for a lesson already completed', () => {
		const r = resolveResumePoint({ currentDay: 2, currentSentenceIndex: 5 }, done([1, 2]));
		expect(r).toMatchObject({ day: 3, sentenceIndex: 0 });
	});

	it('reports allDone once every lesson is finished', () => {
		const r = resolveResumePoint(null, done(ALL));
		expect(r).toEqual({ day: 100, sentenceIndex: 0, allDone: true });
	});
});

describe('resolveResumePoint — placement floor', () => {
	it('starts a placed learner at their day, not day 1', () => {
		// The whole point. Before this, an A2 learner opened "Hallo, guten
		// Morgen" no matter what the placement said.
		expect(resolveResumePoint(null, {}, 40)).toMatchObject({ day: 40, sentenceIndex: 0 });
	});

	it('does not treat the skipped days as done', () => {
		// allDone must stay false — there are 61 lessons still ahead.
		expect(resolveResumePoint(null, {}, 40).allDone).toBe(false);
	});

	it('behaves exactly as before when the floor is 1 or absent', () => {
		expect(resolveResumePoint(null, done([1, 2]), 1)).toEqual(resolveResumePoint(null, done([1, 2])));
	});

	it('advances past completed days above the floor', () => {
		expect(resolveResumePoint(null, done([40, 41]), 40)).toMatchObject({ day: 42 });
	});

	it('does not drag a placed learner back to an uncompleted early day', () => {
		// Days 1-39 are skipped, not pending. Returning day 1 here would
		// undo the placement on the very next app open.
		expect(resolveResumePoint(null, done([40]), 40)).toMatchObject({ day: 41 });
	});

	it('keeps a mid-lesson resume below the floor', () => {
		// Someone placed at 40 who deliberately opened day 5 from the day
		// dropdown and got half-way must land back in day 5, not be bounced
		// forward and lose the half they did.
		const r = resolveResumePoint({ currentDay: 5, currentSentenceIndex: 3 }, {}, 40);
		expect(r).toEqual({ day: 5, sentenceIndex: 3, allDone: false });
	});

	it('falls back to earlier material once everything above the floor is done', () => {
		// Placed at 99, finished 99 and 100. Telling them the course is over
		// while 98 lessons sit untouched would be wrong.
		const r = resolveResumePoint(null, done([99, 100]), 99);
		expect(r).toMatchObject({ day: 1, allDone: false });
	});

	it('reports allDone only when nothing anywhere is left', () => {
		expect(resolveResumePoint(null, done(ALL), 40).allDone).toBe(true);
	});

	it('survives a floor past the end of the curriculum', () => {
		// clampStartDay should prevent this, but resolveResumePoint is called
		// from more than one place and must not hand back a day that has no
		// lesson behind it.
		const r = resolveResumePoint(null, {}, 500);
		expect(r.allDone).toBe(false);
		expect(r.day).toBeLessThanOrEqual(100);
		expect(r.day).toBeGreaterThanOrEqual(1);
	});

	it('tolerates a nonsense floor', () => {
		for (const bad of [0, -3, NaN, Infinity]) {
			const r = resolveResumePoint(null, {}, bad as number);
			expect(r.day, `floor ${bad}`).toBe(1);
		}
	});

	it('skips gaps in day numbering at the floor', () => {
		seedIndex([1, 2, 3, 50, 51, 52]);
		expect(resolveResumePoint(null, {}, 40)).toMatchObject({ day: 50 });
	});
});
