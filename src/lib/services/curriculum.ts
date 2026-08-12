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
	/** Sentence budget at the level's first and last day; days between ramp. */
	sentencesFrom: number;
	sentencesTo: number;
}

/**
 * Hard bounds on a lesson, in sentences.
 *
 * Below 8 there is not enough conversation to be worth opening. Above 15 it
 * stops being a daily habit and becomes homework — which is the argument
 * against the 22-30 minute targets this file carried until today: costed
 * out, 26 minutes was a 45-turn dialogue, and nobody finishes one.
 *
 * Every lesson currently sits at 10, 12 or 14, so these bind future
 * authoring rather than describing a problem.
 */
export const MIN_SENTENCES = 8;
export const MAX_SENTENCES = 15;

export const CURRICULUM: LevelSpan[] = [
	// Budgeted in SENTENCES, not minutes, because sentences are what an
	// author controls. Minutes are downstream of how long a learner takes
	// per line — measured (lesson_completed logs actualSeconds) and currently
	// disputed: lesson-duration says a 15-line lesson is 9 minutes, and it
	// counts no retries, no audio replays and no practice mode, so it is
	// very likely low.
	//
	// Spec what you control; measure what you do not.
	// A1 starts at 10, not 8. The 8 was mine and it under-described content
	// that already works — no A1 lesson is shorter than 10. A2 starts at 12
	// so day 31 is not a step DOWN from day 30, which the monotonic test
	// would have caught anyway.
	{ level: 'A1', firstDay: 1, lastDay: 30, checkpoints: [10, 20, 30], sentencesFrom: 10, sentencesTo: 12 },
	{ level: 'A2', firstDay: 31, lastDay: 65, checkpoints: [42, 54, 65], sentencesFrom: 12, sentencesTo: 13 },
	{ level: 'B1', firstDay: 66, lastDay: 120, checkpoints: [83, 101, 120], sentencesFrom: 13, sentencesTo: 15 }
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
 * How many sentences a given day should be written to, ramping across its
 * level and always inside [MIN_SENTENCES, MAX_SENTENCES].
 *
 * Replaces targetMinutesForDay, which nobody called — and being unread is
 * exactly how a 22-30 minute target sat here unchallenged. A sentence count
 * can be checked against the data with one query; a minute estimate cannot.
 */
export function targetSentencesForDay(day: number): number | null {
	const span = CURRICULUM.find((l) => day >= l.firstDay && day <= l.lastDay);
	if (!span) return null;
	const total = span.lastDay - span.firstDay;
	const progress = total === 0 ? 1 : (day - span.firstDay) / total;
	const n = Math.round(span.sentencesFrom + progress * (span.sentencesTo - span.sentencesFrom));
	return Math.min(MAX_SENTENCES, Math.max(MIN_SENTENCES, n));
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
