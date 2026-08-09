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

interface DrillStats {
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

function readDrillStats(): Partial<Record<ReadinessModule, DrillStats>> {
	try {
		const raw = JSON.parse(localStorage.getItem(DRILL_LS_KEY) || '{}');
		return raw && typeof raw === 'object' ? raw : {};
	} catch {
		return {};
	}
}

/**
 * Record an exam-format drill result (placement test, Sprechen drill, …).
 * Rolling totals per module; recent work counts the same as old work in v1.
 */
export function recordDrillResult(module: ReadinessModule, earned: number, possible: number): void {
	if (possible <= 0) return;
	const stats = readDrillStats();
	const cur = stats[module] || { attempts: 0, earned: 0, possible: 0, updatedAt: 0 };
	stats[module] = {
		attempts: cur.attempts + 1,
		earned: cur.earned + earned,
		possible: cur.possible + possible,
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

	const moduleScore = (m: ReadinessModule, factor: number, cap: number): ModuleReadiness => {
		const d = drills[m];
		if (d && d.possible >= MIN_DRILL_POINTS) {
			const acc = clamp01(d.earned / d.possible);
			// Drill accuracy dominates; coverage keeps early lucky streaks honest.
			return { score: Math.round(100 * (0.7 * acc + 0.3 * coverage)), trained: true };
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
