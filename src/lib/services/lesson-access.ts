/**
 * Which lesson days a learner may open.
 *
 * Day 1 is always available. Every other day unlocks by finishing the one
 * before it, so the course arrives one lesson at a time and finishing today
 * is what produces tomorrow. That is the whole incentive: no streaks, no
 * gems, just the next thing appearing because you earned it.
 *
 * The rule is `day <= highestCompleted + 1`, NOT "the previous day is
 * completed". They differ for anyone with a gap, and the difference matters
 * because gaps already exist: the day picker was ungated for the app's whole
 * life, so learners could and did jump around. Someone who completed 1, 2
 * and 4 under the old rules would find day 5 locked by the strict reading —
 * punished today for navigation the app invited yesterday. The frontier rule
 * unlocks through 5 and treats their furthest finished lesson as the proof
 * of where they are.
 *
 * Pure and side-effect free, so the picker, the guard and the tests all read
 * the same rule rather than three near-copies of it.
 */

/** Days before this are treated as earned. Day 1 needs nothing. */
export const FIRST_DAY = 1;

/**
 * The furthest day the learner has actually finished.
 *
 * Keys arrive as strings from JSON and as numbers in memory, and a falsy
 * value means "not completed" rather than "completed with no data" — the
 * completed map has carried both shapes.
 */
export function highestCompleted(
	completedLessons: Record<string | number, unknown> | null | undefined
): number {
	let max = 0;
	for (const [key, value] of Object.entries(completedLessons ?? {})) {
		if (!value) continue;
		const day = Number(key);
		if (Number.isInteger(day) && day > max) max = day;
	}
	return max;
}

/** The highest day currently open to this learner. */
export function frontierDay(
	completedLessons: Record<string | number, unknown> | null | undefined
): number {
	return Math.max(FIRST_DAY, highestCompleted(completedLessons) + 1);
}

export function isUnlocked(
	day: number,
	completedLessons: Record<string | number, unknown> | null | undefined
): boolean {
	if (!Number.isFinite(day)) return false;
	if (day <= FIRST_DAY) return true;
	return day <= frontierDay(completedLessons);
}

/**
 * The day that must be finished to open `day`.
 *
 * Used for the message on a locked row — "finish day 12 first" is actionable
 * where a bare padlock is not. Null when the day is already open.
 */
export function unlockedBy(
	day: number,
	completedLessons: Record<string | number, unknown> | null | undefined
): number | null {
	if (isUnlocked(day, completedLessons)) return null;
	return frontierDay(completedLessons);
}
