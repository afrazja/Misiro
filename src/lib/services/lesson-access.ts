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

/** Days per week block, matching how the week exams are numbered. */
export const WEEK_LENGTH = 7;

/** The day numbers week `n` covers, existing or not. */
export function weekDays(week: number): number[] {
	if (!Number.isInteger(week) || week < 1) return [];
	const first = (week - 1) * WEEK_LENGTH + 1;
	return Array.from({ length: WEEK_LENGTH }, (_, i) => first + i);
}

/**
 * Whether a week's exam and Week Talk are open.
 *
 * The rule is every day in the week that actually exists, completed. An exam
 * unlocked on arrival rather than on completion would test material the
 * learner has not met — the opposite of what it is for — so this waits for
 * the week to be finished rather than merely reached.
 *
 * `hasLesson` is passed in rather than imported so this module stays pure
 * and the last, partial week works: week 15 spans days 99-105 but only two
 * of those exist, and requiring the missing five would lock it forever.
 *
 * A week with no lessons at all is LOCKED, not open. `[].every()` is true,
 * which would have quietly unlocked every week past the end of the course.
 */
export function isWeekUnlocked(
	week: number,
	completedLessons: Record<string | number, unknown> | null | undefined,
	hasLesson: (day: number) => boolean
): boolean {
	const existing = weekDays(week).filter(hasLesson);
	if (existing.length === 0) return false;
	const completed = completedLessons ?? {};
	return existing.every((d) => !!completed[d] || !!completed[String(d)]);
}
