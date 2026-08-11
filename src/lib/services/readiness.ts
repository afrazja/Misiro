/**
 * Goethe A1 readiness — v1 estimate.
 *
 * One number (0–100) plus a per-module breakdown for Hören / Lesen /
 * Schreiben / Sprechen, computed from what the app already knows:
 *
 *   coverage — completed lesson days vs the A1 curriculum span (days 1–60)
 *   recall   — rolling SM-2 accuracy (attempts vs successes across all cards)
 *   drills   — rolling per-module exam-format results (placement test +
 *              skill drills call recordDrillResult); once a module has real
 *              drill data it dominates that module's score
 *
 * Modules without drill data are ESTIMATES: Hören/Sprechen lean on lesson
 * practice (listening + speaking are how lessons work), Lesen/Schreiben are
 * capped low until the user actually tries those formats — honest "you
 * haven't practiced this yet" signaling that also sells the placement test.
 *
 * Import discipline: /home renders this — keep the import graph to
 * data-layer only (see commit 83fef01 for what happens otherwise).
 */

import { loadSRData, getCompletedLessons } from './data-layer';

export type ReadinessModule = 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';

export const READINESS_MODULES: ReadinessModule[] = ['hoeren', 'lesen', 'schreiben', 'sprechen'];

/** Local copy of the module labels — do not import mock-exam code here. */
export const READINESS_LABELS: Record<ReadinessModule, { de: string; en: string; fa: string }> = {
	hoeren: { de: 'Hören', en: 'Listening', fa: 'شنیدن' },
	lesen: { de: 'Lesen', en: 'Reading', fa: 'خواندن' },
	schreiben: { de: 'Schreiben', en: 'Writing', fa: 'نوشتن' },
	sprechen: { de: 'Sprechen', en: 'Speaking', fa: 'صحبت' }
};

export interface ModuleReadiness {
	score: number; // 0–100
	/** false = estimated from lessons only; true = backed by exam-format drills */
	trained: boolean;
}

export interface Readiness {
	overall: number; // 0–100
	modules: Record<ReadinessModule, ModuleReadiness>;
	/** overall at or above the official 60/100 pass mark */
	onTrack: boolean;
	/** true when no module has drill data yet — placement test pitch */
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

	const now = Date.now();
	const moduleScore = (m: ReadinessModule, factor: number, cap: number): ModuleReadiness => {
		const w = drills[m] ? weightedAccuracy(drills[m]!.history, now) : null;
		if (w && w.possible >= MIN_DRILL_POINTS) {
			// Drill accuracy dominates; coverage keeps early lucky streaks honest.
			return { score: Math.round(100 * (0.7 * w.accuracy + 0.3 * coverage)), trained: true };
		}
		return { score: Math.min(cap, Math.round(lessonEstimate * factor)), trained: false };
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
		needsPlacement: !READINESS_MODULES.some((m) => modules[m].trained)
	};
}
