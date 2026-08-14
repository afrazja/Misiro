/**
 * Where a learner starts the course.
 *
 * Until now every account began on Day 1. `resolveResumePoint` took only
 * saved progress and the completed set — level was not an input anywhere in
 * the app — so someone who already reads A2 German was walked through
 * "Hallo, guten Morgen" for a fortnight before the material caught up.
 * Worse, /fa/test told them in writing to start on day 60 and then the app
 * put them on day 1, contradicting its own advice one click after earning
 * their trust.
 *
 * The model here rests on one distinction:
 *
 *   completed     the learner actually did this lesson
 *   assumed-known the placement skipped past it
 *
 * They are deliberately NOT the same field. Marking skipped days complete
 * would have been a two-line change and would have corrupted everything
 * downstream — the streak, the completion count, the readiness score and
 * the review queue all read `completedLessons`, and all of them would have
 * started reporting work that never happened. Progress has to stay a record
 * of what the learner did.
 *
 * Everything here is pure. Persistence lives in data-layer, the resume
 * decision in lesson-loader; this module holds the arithmetic those two
 * agree on, so it can be tested without a database or a lesson index.
 */

/** How a starting point was decided. Kept for later analysis of whether the free test places people well. */
export type PlacementSource = 'self-test' | 'placement' | 'manual' | 'onboarding';

export interface Placement {
	/** First day the learner is expected to do. 1 means no skip. */
	startDay: number;
	source: PlacementSource;
	/** ISO date (YYYY-MM-DD) the placement was set. */
	placedAt: string;
}

/** localStorage key for a placement chosen before the account exists. */
export const PENDING_KEY = 'mirifer_pending_placement';

/**
 * A start day that actually exists.
 *
 * The free test recommends day 60 from a 12-question sitting, which is a
 * guess, and days 101-120 do not exist yet. Clamping here means neither a
 * bad recommendation nor a shrinking curriculum can strand someone past the
 * end of the course with nothing to open.
 */
export function clampStartDay(day: unknown, totalLessons: number): number {
	const n = typeof day === 'number' ? Math.floor(day) : Number.NaN;
	if (!Number.isFinite(n)) return 1;
	if (n < 1) return 1;
	if (totalLessons > 0 && n > totalLessons) return totalLessons;
	return n;
}

export function parsePlacement(raw: unknown, totalLessons: number): Placement | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const sources: PlacementSource[] = ['self-test', 'placement', 'manual', 'onboarding'];
	if (!sources.includes(o.source as PlacementSource)) return null;
	if (typeof o.startDay !== 'number') return null;
	return {
		startDay: clampStartDay(o.startDay, totalLessons),
		source: o.source as PlacementSource,
		placedAt: typeof o.placedAt === 'string' ? o.placedAt : ''
	};
}

/** Days before the start day are assumed known rather than completed. */
export function isAssumedKnown(day: number, startDay: number): boolean {
	return day < startDay;
}

export interface ProgressSummary {
	/** Lessons the learner actually finished. */
	completed: number;
	/** Lessons skipped by placement. Never counted as completed. */
	assumed: number;
	/** Lessons this learner is actually expected to do. */
	scheduled: number;
	total: number;
	/**
	 * Completion of the learner's OWN course, not the whole curriculum.
	 *
	 * Denominator is `scheduled`, so someone placed at day 40 who has done
	 * five lessons reads 5/61 rather than 5/100. Counting the skipped days
	 * as progress would hand them 39% for answering twelve questions, which
	 * makes the number meaningless; ignoring the skip entirely would show
	 * 5% and imply 95 lessons of work they do not have to do.
	 */
	percent: number;
}

export function summarizeProgress(
	completedLessons: Record<string | number, unknown> | null | undefined,
	startDay: number,
	totalLessons: number
): ProgressSummary {
	const completed = Object.keys(completedLessons ?? {}).filter(
		(k) => !!(completedLessons as Record<string, unknown>)[k]
	).length;

	const assumed = Math.max(0, Math.min(startDay - 1, totalLessons));
	const scheduled = Math.max(0, totalLessons - assumed);

	// A learner placed forward can still go back and do an earlier lesson,
	// which would push completed past scheduled. Clamp rather than show
	// 104%.
	const percent = scheduled > 0 ? Math.min(100, Math.round((completed / scheduled) * 100)) : 0;

	return { completed, assumed, scheduled, total: totalLessons, percent };
}
