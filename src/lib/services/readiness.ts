/**
 * Goethe A1 readiness — v1 estimate.
 *
 * One number (0–100) plus a per-module breakdown for Hören / Lesen /
 * Schreiben / Sprechen, computed from what the app already knows:
 *
 *   coverage — completed lesson days vs the A1 curriculum span (days 1–60)
 *   recall   — rolling SM-2 accuracy (attempts vs successes across all cards)
 *   drills   — per-module exam-format results (placement test, skill drills)
 *   practice — per-module results from ORDINARY USE: review answers,
 *              practice-mode rungs, Basics checks
 *
 * A test only produces data when someone chooses to sit one, and this app's
 * is 12 questions. Practice produces hundreds of graded answers a week from
 * work the learner is doing anyway, so it is the better progress signal;
 * the test is the better calibration. Both feed in, exam-format weighted
 * higher per point because practice is scaffolded — the sentence is in front
 * of you and you can retry.
 *
 * Modules with neither are ESTIMATES: Hören/Sprechen lean on lesson practice
 * (listening + speaking are how lessons work), Lesen/Schreiben are capped low
 * until the user actually tries those formats. Every module reports its
 * `source` so the dashboard can say which it is instead of implying they are
 * all measurements.
 *
 * Import discipline: /home renders this — keep the import graph to
 * data-layer only (see commit 83fef01 for what happens otherwise).
 */

import { loadSRData, getCompletedLessons, getCheckpointsDone } from './data-layer';
import { dueCheckpoint, nextCheckpoint, type Checkpoint } from './curriculum';

export type ReadinessModule = 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';

export const READINESS_MODULES: ReadinessModule[] = ['hoeren', 'lesen', 'schreiben', 'sprechen'];

/** Local copy of the module labels — do not import mock-exam code here. */
export const READINESS_LABELS: Record<ReadinessModule, { de: string; en: string; fa: string }> = {
	hoeren: { de: 'Hören', en: 'Listening', fa: 'شنیدن' },
	lesen: { de: 'Lesen', en: 'Reading', fa: 'خواندن' },
	schreiben: { de: 'Schreiben', en: 'Writing', fa: 'نوشتن' },
	sprechen: { de: 'Sprechen', en: 'Speaking', fa: 'صحبت' }
};

/**
 * Where a module's number came from. The learner is owed this: a guess and
 * a measurement should not look identical on the dashboard.
 *
 *   estimate — inferred from lesson coverage, nothing graded yet
 *   practice — real answers, but from everyday scaffolded practice
 *   test     — exam-format items (placement test, skill drills)
 */
export type ReadinessSource = 'estimate' | 'practice' | 'test';

export interface ModuleReadiness {
	score: number; // 0–100
	/** false = estimated from lessons only; true = backed by real answers */
	trained: boolean;
	source: ReadinessSource;
}

export interface Readiness {
	overall: number; // 0–100
	modules: Record<ReadinessModule, ModuleReadiness>;
	/** overall at or above the official 60/100 pass mark */
	onTrack: boolean;
	/** true when no module has exam-format data yet — placement test pitch */
	needsPlacement: boolean;
}

// ── Drill stats (fed by /placement + skill drills) ────────────────────────

export interface DrillAttempt {
	earned: number;
	possible: number;
	at: number;
}

interface DrillStats {
	/** Most recent FIRST. Capped, so old sittings stop counting. */
	history: DrillAttempt[];
	updatedAt: number;
}

/** The pre-recency shape, still in some browsers' localStorage. */
interface LegacyDrillStats {
	attempts: number;
	earned: number;
	possible: number;
	updatedAt: number;
}

const DRILL_LS_KEY = 'mirifer_drill_stats';
/** A module needs at least this many graded points before drills own its
 *  score. Low on purpose: the placement test only carries 2 Schreiben points,
 *  and a weak real signal beats a capped guess (coverage still blends in). */
const MIN_DRILL_POINTS = 2;
/** A1 curriculum span used for coverage (days 61+ are post-exam content). */
const A1_DAYS = 60;

/**
 * Weight of each older sitting relative to the one after it. 0.6 means the
 * latest attempt carries most of the score while earlier ones still damp the
 * noise — necessary, because a Schreiben sitting is only 2 questions and one
 * lucky answer would otherwise swing the bar 50 points.
 */
const RECENCY_DECAY = 0.6;
/** Weight given to exam-format evidence when a module has both kinds. */
const DRILL_SHARE = 0.6;
/** Beyond this, older sittings contribute nothing worth storing. */
const MAX_HISTORY = 8;
/** Months-old evidence does not describe today's German. */
const MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000;

/**
 * Collapse a module's sittings into one accuracy, recent work weighted
 * heaviest.
 *
 * The old version summed lifetime earned/possible, which meant a retake could
 * never say what you can do NOW: score 1/2 then a perfect 2/2 and the module
 * showed 75%, permanently anchored to the first attempt. Pure "latest only"
 * overcorrects at these sample sizes, hence the decay.
 *
 * `now` is a parameter so this stays testable without mocking the clock.
 */
export function weightedAccuracy(
	history: DrillAttempt[],
	now: number
): { accuracy: number; possible: number } | null {
	let num = 0;
	let den = 0;
	let possible = 0;
	let i = 0;
	for (const a of history) {
		if (!a || a.possible <= 0) continue;
		if (now - a.at > MAX_AGE_MS) continue;
		const w = RECENCY_DECAY ** i;
		num += w * a.earned;
		den += w * a.possible;
		possible += a.possible;
		i += 1;
	}
	if (den <= 0) return null;
	return { accuracy: clamp01(num / den), possible };
}

function readDrillStats(): Partial<Record<ReadinessModule, DrillStats>> {
	try {
		const raw = JSON.parse(localStorage.getItem(DRILL_LS_KEY) || '{}');
		if (!raw || typeof raw !== 'object') return {};
		const out: Partial<Record<ReadinessModule, DrillStats>> = {};
		for (const m of READINESS_MODULES) {
			const v = raw[m];
			if (!v || typeof v !== 'object') continue;
			if (Array.isArray(v.history)) {
				out[m] = { history: v.history, updatedAt: v.updatedAt || 0 };
			} else {
				// Migrate the lifetime-totals shape into a single sitting, so
				// existing users keep their score instead of dropping to
				// "not placed yet".
				const legacy = v as LegacyDrillStats;
				if (legacy.possible > 0) {
					out[m] = {
						history: [
							{
								earned: legacy.earned,
								possible: legacy.possible,
								at: legacy.updatedAt || Date.now()
							}
						],
						updatedAt: legacy.updatedAt || 0
					};
				}
			}
		}
		return out;
	} catch {
		return {};
	}
}

/**
 * Record an exam-format drill result (placement test, Sprechen drill, …).
 * Newest first, capped — retaking a module moves its score toward what you
 * just scored rather than nudging a lifetime average.
 */
export function recordDrillResult(module: ReadinessModule, earned: number, possible: number): void {
	if (possible <= 0) return;
	const stats = readDrillStats();
	const cur = stats[module]?.history ?? [];
	stats[module] = {
		history: [{ earned, possible, at: Date.now() }, ...cur].slice(0, MAX_HISTORY),
		updatedAt: Date.now()
	};
	try {
		localStorage.setItem(DRILL_LS_KEY, JSON.stringify(stats));
	} catch {
		// Storage full/unavailable — readiness just stays estimate-based.
	}
}

/**
 * Has any module ever been graded by an exam-format sitting? Cheap and
 * synchronous — the placement route uses it to decide whether this is a
 * first sitting (authored items) or a retake (a fresh generated set).
 */
export function hasBeenTested(): boolean {
	const stats = readDrillStats();
	return READINESS_MODULES.some((m) => (stats[m]?.history?.length ?? 0) > 0);
}

// ── When the next check is allowed ────────────────────────────────────────
//
// A learner who studies nothing and retakes twice in a day gets two samples
// of the same ability, and the gap between them is noise on twelve
// questions. Worse, checking your level FEELS like studying, so an app whose
// problem is unfinished lessons should not hand out a frictionless way to
// feel productive without learning.
//
// The gate is the curriculum's own checkpoints: three per CEFR level, the
// last of which is the level's final day. A rolling "every 5 lessons"
// counter told the learner nothing about where they were; fixed milestones
// are a map they can see from day one, and the lock becomes a countdown to
// the next one rather than a refusal.

export interface CheckAvailability {
	unlocked: boolean;
	/** Nothing tested yet — placement is calibration and always open. */
	isFirstSitting: boolean;
	/** Lessons still to finish before the next checkpoint opens. */
	lessonsNeeded: number;
	/** The checkpoint being counted down to, or waited on. */
	checkpoint: Checkpoint | null;
	/** Whole hours left on the 24h floor; 0 when that is not the blocker. */
	hoursNeeded: number;
}

/** Floor, so finishing several days at once cannot farm checkpoints. */
const MIN_CHECK_GAP_MS = 24 * 60 * 60 * 1000;

/**
 * Pure so the rule is testable without a clock or storage.
 *
 * @param completedDays lesson days finished
 * @param checkpointsDone keys of checkpoints already sat
 * @param lastSittingAt the most recent scored sitting, or null for never
 */
export function checkAvailability(
	completedDays: number[],
	checkpointsDone: string[],
	lastSittingAt: number | null,
	now: number
): CheckAvailability {
	if (lastSittingAt == null && !checkpointsDone.length) {
		return {
			unlocked: true,
			isFirstSitting: true,
			lessonsNeeded: 0,
			checkpoint: null,
			hoursNeeded: 0
		};
	}

	const due = dueCheckpoint(completedDays, checkpointsDone);
	const next = nextCheckpoint(completedDays, checkpointsDone);
	const hoursNeeded =
		lastSittingAt == null
			? 0
			: Math.max(0, Math.ceil((MIN_CHECK_GAP_MS - (now - lastSittingAt)) / (60 * 60 * 1000)));

	return {
		unlocked: !!due && hoursNeeded === 0,
		isFirstSitting: false,
		lessonsNeeded: next?.lessonsRemaining ?? 0,
		checkpoint: due ?? next?.checkpoint ?? null,
		hoursNeeded
	};
}

/** Most recent scored sitting across all modules, or null. */
export function lastSittingAt(): number | null {
	const stats = readDrillStats();
	const times = READINESS_MODULES.flatMap((m) => (stats[m]?.history ?? []).map((h) => h.at)).filter(
		(t) => typeof t === 'number'
	);
	return times.length ? Math.max(...times) : null;
}

/** The rule applied to real data. */
export async function getCheckAvailability(): Promise<CheckAvailability> {
	const completed = await getCompletedLessons();
	const days = Object.keys(completed || {})
		.map((k) => Number(k))
		.filter((n) => Number.isFinite(n));
	return checkAvailability(days, getCheckpointsDone(), lastSittingAt(), Date.now());
}

// ── Practice signal (fed by ordinary use) ─────────────────────────────────
//
// A test gives 12 answers when someone chooses to sit it. Reviews, practice
// rungs and Basics checks give hundreds a week from work already happening,
// and cost the learner nothing. That is the better instrument for tracking
// progress; the test is better for calibration.
//
// Practice arrives one graded answer at a time, so it is bucketed BY DAY —
// otherwise an 8-entry history would cover the last eight answers rather
// than the last eight sessions. Same recency weighting either way.

const PRACTICE_LS_KEY = 'mirifer_practice_signal';
/** Practice answers needed before a module stops being a guess. Higher than
 *  the drill gate: practice is scaffolded, so any single answer proves less. */
const MIN_PRACTICE_POINTS = 12;

const dayStamp = (t: number) => Math.floor(t / (24 * 60 * 60 * 1000));

function readPracticeStats(): Partial<Record<ReadinessModule, DrillStats>> {
	try {
		const raw = JSON.parse(localStorage.getItem(PRACTICE_LS_KEY) || '{}');
		if (!raw || typeof raw !== 'object') return {};
		const out: Partial<Record<ReadinessModule, DrillStats>> = {};
		for (const m of READINESS_MODULES) {
			const v = raw[m];
			if (v && Array.isArray(v.history)) {
				out[m] = { history: v.history, updatedAt: v.updatedAt || 0 };
			}
		}
		return out;
	} catch {
		return {};
	}
}

/**
 * Record graded practice — a review answer, a practice rung, a Basics check.
 * Merges into today's bucket for that module.
 */
export function recordPracticeResult(
	module: ReadinessModule,
	earned: number,
	possible: number
): void {
	if (possible <= 0) return;
	const now = Date.now();
	const stats = readPracticeStats();
	const history = [...(stats[module]?.history ?? [])];

	if (history[0] && dayStamp(history[0].at) === dayStamp(now)) {
		history[0] = {
			earned: history[0].earned + earned,
			possible: history[0].possible + possible,
			at: now
		};
	} else {
		history.unshift({ earned, possible, at: now });
	}

	stats[module] = { history: history.slice(0, MAX_HISTORY), updatedAt: now };
	try {
		localStorage.setItem(PRACTICE_LS_KEY, JSON.stringify(stats));
	} catch {
		// Storage full/unavailable — readiness just stays estimate-based.
	}
}

// ── Computation ───────────────────────────────────────────────────────────

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export async function computeReadiness(
	/** Pass a completed-lessons map to compute against a known state (e.g.
	 *  before/after deltas on lesson completion) instead of re-fetching. */
	completedOverride?: Record<string | number, unknown>
): Promise<Readiness> {
	const [completed, srData] = await Promise.all([
		completedOverride !== undefined ? Promise.resolve(completedOverride) : getCompletedLessons(),
		loadSRData()
	]);

	const daysDone = Object.keys(completed || {}).length;
	const coverage = clamp01(daysDone / A1_DAYS);

	let attempts = 0;
	let successes = 0;
	for (const card of Object.values(srData || {})) {
		attempts += card.attempts || 0;
		successes += card.successes || 0;
	}
	// Neutral prior until there's enough recall data to mean anything.
	const recall = attempts >= 10 ? successes / attempts : 0.7;

	// Lesson-based estimate: curriculum progress modulated by recall quality.
	const lessonEstimate = 100 * coverage * (0.45 + 0.55 * recall);

	const drills = readDrillStats();

	const practice = readPracticeStats();
	const now = Date.now();

	const moduleScore = (m: ReadinessModule, factor: number, cap: number): ModuleReadiness => {
		const d = drills[m] ? weightedAccuracy(drills[m]!.history, now) : null;
		const p = practice[m] ? weightedAccuracy(practice[m]!.history, now) : null;
		const hasDrill = !!d && d.possible >= MIN_DRILL_POINTS;
		const hasPractice = !!p && p.possible >= MIN_PRACTICE_POINTS;

		if (hasDrill || hasPractice) {
			// Both count, but a point of exam-format evidence is worth more
			// than a point of scaffolded practice — practice has the sentence
			// in front of you and lets you retry.
			const acc =
				hasDrill && hasPractice
					? DRILL_SHARE * d!.accuracy + (1 - DRILL_SHARE) * p!.accuracy
					: hasDrill
						? d!.accuracy
						: p!.accuracy;
			return {
				// Coverage keeps an early lucky streak from claiming the exam.
				score: Math.round(100 * (0.7 * acc + 0.3 * coverage)),
				trained: true,
				source: hasDrill ? 'test' : 'practice'
			};
		}
		return {
			score: Math.min(cap, Math.round(lessonEstimate * factor)),
			trained: false,
			source: 'estimate'
		};
	};

	const modules: Record<ReadinessModule, ModuleReadiness> = {
		// Listening & speaking are what lessons train — estimates track lessons.
		hoeren: moduleScore('hoeren', 0.9, 100),
		sprechen: moduleScore('sprechen', 1.0, 100),
		// Reading & writing formats are untrained until drilled — capped.
		lesen: moduleScore('lesen', 0.55, 45),
		schreiben: moduleScore('schreiben', 0.45, 40)
	};

	const overall = Math.round(
		(modules.hoeren.score + modules.lesen.score + modules.schreiben.score + modules.sprechen.score) / 4
	);

	return {
		overall,
		modules,
		onTrack: overall >= 60,
		// Practice makes a bar real, but it is not exam-format — the
		// placement pitch stays until something has actually been tested.
		needsPlacement: !READINESS_MODULES.some((m) => modules[m].source === 'test')
	};
}
