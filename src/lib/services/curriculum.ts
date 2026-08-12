/**
 * The CEFR shape of the 100-day course, and where the checkpoints sit.
 *
 * The content is tagged A1 (days 1–24), A2 (25–45) and B1 (46–70), with
 * 71–100 tagged inconsistently — A2 and B1 alternating, which looks like
 * drift rather than design. Treated here as B1 consolidation so "which level
 * am I in" has an answer on every day of the course; retag the data and this
 * table is the only thing that needs to change.
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
}

export const CURRICULUM: LevelSpan[] = [
	{ level: 'A1', firstDay: 1, lastDay: 24, checkpoints: [8, 16, 24] },
	{ level: 'A2', firstDay: 25, lastDay: 45, checkpoints: [32, 39, 45] },
	{ level: 'B1', firstDay: 46, lastDay: 100, checkpoints: [64, 82, 100] }
];

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
