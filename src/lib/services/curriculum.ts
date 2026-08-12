/**
 * The CEFR shape of the 100-day course, and where the checkpoints sit.
 *
 * 120 days across three levels. A2 gets the biggest share of the twenty days
 * added beyond the original hundred: at 21 days it was far too thin for a
 * whole CEFR level, while B1's span was already the longest.
 *
 * Each level also carries a minute budget that ramps across it — 10 min at
 * the start of A1 up to 30 at the end of B1. Later material is denser, but
 * the ceiling stays at 30 deliberately: a daily habit that costs 45 minutes
 * stops being daily.
 *
 * NOTE: the seeded content is still 100 days and tagged A1 1–24 / A2 25–45 /
 * B1 46–70, with 71–100 alternating incoherently. This table is the target
 * shape; twenty new days (mostly A2) and a retag are content work still to
 * come. Until then days beyond the seeded content simply do not exist yet.
 *
 * Checkpoints replace the old "every 5 lessons" rule. A rolling counter tells
 * a learner nothing about where they are; three fixed milestones per level,
 * visible from day one, are a map. They sit at roughly the thirds of each
 * level so the last one always lands on the level's final day — finishing a
 * level and proving it are the same moment.
 *
 * Pure data and pure functions: no storage, no clock, no DOM.
 */

export type CefrLevel = 'A1' | 'A2' | 'B1';

export interface LevelSpan {
	level: CefrLevel;
	firstDay: number;
	lastDay: number;
	/** Lesson days that unlock a checkpoint, in order. */
	checkpoints: number[];
	/** Minute budget at the level's first and last day; days in between ramp. */
	minutesFrom: number;
	minutesTo: number;
}

export const CURRICULUM: LevelSpan[] = [
	// minutesFrom/To describe what a lesson at each end of the level should
	// GROW to. They were 10-15 / 15-22 / 22-30, which sounded reasonable
	// until costed: at 18s a heard line and 50s a spoken one, 26 minutes is
	// a 45-turn dialogue. Nobody finishes a 45-turn dialogue. The revised
	// figures come out at roughly 13 / 18 / 25 sentences a day, which is a
	// lesson someone will actually sit through.
	//
	// Today's content averages 7.5 / 6.7 / 6.3 min, so these are still a
	// target and not a description — but a reachable one. The old table
	// implied 4,190 authored sentences against 1,082 that exist; this
	// implies 2,395.
	{ level: 'A1', firstDay: 1, lastDay: 30, checkpoints: [10, 20, 30], minutesFrom: 7, minutesTo: 9 },
	{ level: 'A2', firstDay: 31, lastDay: 65, checkpoints: [42, 54, 65], minutesFrom: 9, minutesTo: 13 },
	{ level: 'B1', firstDay: 66, lastDay: 120, checkpoints: [83, 101, 120], minutesFrom: 13, minutesTo: 17 }
];

/**
 * Where in a level a day sits. Three tiers per level, bounded by the
 * checkpoints — so a tier and the checkpoint that certifies it are the same
 * unit, and "top A2" means "working through A2's last third".
 */
export type Tier = 'beginner' | 'middle' | 'top';

export const TIER_LABELS: Record<Tier, { en: string; fa: string }> = {
	beginner: { en: 'beginner', fa: 'مقدماتی' },
	middle: { en: 'middle', fa: 'میانی' },
	top: { en: 'top', fa: 'پیشرفته' }
};

export function tierForDay(day: number): { level: CefrLevel; tier: Tier } | null {
	const span = CURRICULUM.find((l) => day >= l.firstDay && day <= l.lastDay);
	if (!span) return null;
	const [first, second] = span.checkpoints;
	const tier: Tier = day <= first ? 'beginner' : day <= second ? 'middle' : 'top';
	return { level: span.level, tier };
}

/**
 * The minute budget a given day is written to, ramping across its level.
 * Content is specced against this; the actual estimate the learner sees
 * comes from what the lesson really contains (see lesson-duration).
 *
 * NOTHING CALLS THIS YET. Left in place because it is the only executable
 * statement of the authoring target, and because its absence is what let
 * the old 22-30 minute figures sit in the table unchallenged for a day —
 * unread numbers do not get sanity-checked.
 */
export function targetMinutesForDay(day: number): number | null {
	const span = CURRICULUM.find((l) => day >= l.firstDay && day <= l.lastDay);
	if (!span) return null;
	const total = span.lastDay - span.firstDay;
	const progress = total === 0 ? 1 : (day - span.firstDay) / total;
	return Math.round(span.minutesFrom + progress * (span.minutesTo - span.minutesFrom));
}

export const TOTAL_DAYS = CURRICULUM[CURRICULUM.length - 1].lastDay;

export interface Checkpoint {
	level: CefrLevel;
	/** 1-based within its level. */
	index: number;
	/** The lesson day that unlocks it. */
	day: number;
}

/** Stable id for remembering which checkpoints are already done. */
export function checkpointKey(cp: Checkpoint): string {
	return `${cp.level}-${cp.index}`;
}

export function allCheckpoints(): Checkpoint[] {
	return CURRICULUM.flatMap((l) =>
		l.checkpoints.map((day, i) => ({ level: l.level, index: i + 1, day }))
	);
}

/** Which level a lesson day belongs to; null outside the course. */
export function levelForDay(day: number): CefrLevel | null {
	return CURRICULUM.find((l) => day >= l.firstDay && day <= l.lastDay)?.level ?? null;
}

/**
 * The checkpoint the learner has earned and not yet taken, if any.
 * Earliest first, so skipping ahead is impossible.
 */
export function dueCheckpoint(completedDays: number[], done: string[]): Checkpoint | null {
	const finished = new Set(completedDays);
	const taken = new Set(done);
	return (
		allCheckpoints().find((cp) => finished.has(cp.day) && !taken.has(checkpointKey(cp))) ?? null
	);
}

/**
 * The next checkpoint not yet taken, and how many more lesson days stand
 * between the learner and it. 0 remaining means it is available now.
 */
export function nextCheckpoint(
	completedDays: number[],
	done: string[]
): { checkpoint: Checkpoint; lessonsRemaining: number } | null {
	const taken = new Set(done);
	const cp = allCheckpoints().find((c) => !taken.has(checkpointKey(c)));
	if (!cp) return null;

	const finished = new Set(completedDays);
	// Count the days up to the checkpoint that are still outstanding, rather
	// than subtracting a max — a learner who skipped a day should see the
	// real number of lessons left, not an optimistic one.
	let remaining = 0;
	for (let d = 1; d <= cp.day; d++) if (!finished.has(d)) remaining += 1;
	return { checkpoint: cp, lessonsRemaining: remaining };
}

export interface LevelProgress {
	level: CefrLevel;
	firstDay: number;
	lastDay: number;
	daysDone: number;
	daysTotal: number;
	percent: number;
	/** Checkpoints in this level already taken. */
	checkpointsDone: number;
	checkpointsTotal: number;
	/** True for the level the learner is currently working through. */
	current: boolean;
}

/** The whole map, for the roadmap on the dashboard. */
export function levelProgress(completedDays: number[], done: string[]): LevelProgress[] {
	const finished = new Set(completedDays);
	const taken = new Set(done);
	// The current level is the first that is not fully finished.
	const currentLevel = CURRICULUM.find((l) => {
		for (let d = l.firstDay; d <= l.lastDay; d++) if (!finished.has(d)) return true;
		return false;
	})?.level;

	return CURRICULUM.map((l) => {
		let daysDone = 0;
		for (let d = l.firstDay; d <= l.lastDay; d++) if (finished.has(d)) daysDone += 1;
		const daysTotal = l.lastDay - l.firstDay + 1;
		return {
			level: l.level,
			firstDay: l.firstDay,
			lastDay: l.lastDay,
			daysDone,
			daysTotal,
			percent: Math.round((daysDone / daysTotal) * 100),
			checkpointsDone: l.checkpoints.filter((_, i) =>
				taken.has(checkpointKey({ level: l.level, index: i + 1, day: l.checkpoints[i] }))
			).length,
			checkpointsTotal: l.checkpoints.length,
			current: l.level === currentLevel
		};
	});
}
