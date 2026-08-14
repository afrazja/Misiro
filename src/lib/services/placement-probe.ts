/**
 * Checking whether a placement was right.
 *
 * A learner placed at day 40 has ~440 sentences behind them that the app
 * declared known on the strength of twelve multiple-choice questions. No SR
 * card exists for any of it — getDueReviewItems filters on `attempts > 0`,
 * and nothing was ever attempted — so if that guess was too generous the
 * gap is permanent and silent. The learner discovers it at day 55, when
 * something leans on a day-22 structure they never actually had.
 *
 * This is a detector, not a review system. One probe per lesson for twenty
 * lessons samples 20 of ~440 sentences, which is nowhere near coverage and
 * is not trying to be: exhaustive checking would take 440 lessons. Twenty
 * samples is plenty to tell a good placement from a bad one, and a learner
 * who is genuinely at that level passes them without noticing.
 *
 * A missed probe is handed to recordSRAttempt like any other wrong answer,
 * so the day enters normal rotation through machinery that already exists.
 * Nothing here changes the review queue or the card schema.
 *
 * Pure by design — the caller supplies the lesson lookup and the random
 * source, so every branch is testable.
 */

/** Probes served before the detector stops. Twenty samples, one per lesson. */
export const PROBE_BUDGET = 20;

/** Warm-up slots a probe may take. The other two stay for real reviews. */
export const PROBE_WARMUP_SLOTS = 1;

/** Probes needed before a verdict means anything. */
export const MIN_SAMPLE = 8;

/** Miss rate above which the placement looks too aggressive. */
export const MISS_THRESHOLD = 0.4;

export interface ProbeState {
	/** How many probes have been served. */
	served: number;
	/** Days probed and missed, so a verdict can point at the earliest. */
	missedDays: number[];
	/** Every day probed, so the sampler does not repeat itself. */
	probedDays: number[];
	/**
	 * The learner has answered the "shall we move you back?" offer, either
	 * way. Asking twice about the same evidence is nagging, and someone who
	 * declined has told us they are content where they are.
	 */
	resolved?: boolean;
}

export function emptyProbeState(): ProbeState {
	return { served: 0, missedDays: [], probedDays: [], resolved: false };
}

export function parseProbeState(raw: unknown): ProbeState {
	if (!raw || typeof raw !== 'object') return emptyProbeState();
	const o = raw as Record<string, unknown>;
	const nums = (v: unknown): number[] =>
		Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && n > 0) : [];
	return {
		served: typeof o.served === 'number' && o.served >= 0 ? Math.floor(o.served) : 0,
		missedDays: nums(o.missedDays),
		probedDays: nums(o.probedDays),
		resolved: o.resolved === true
	};
}

/** Whether this lesson should carry a probe. */
export function shouldProbe(startDay: number, state: ProbeState): boolean {
	if (startDay <= 1) return false; // nothing was skipped
	return state.served < PROBE_BUDGET;
}

/**
 * Choose a day from the skipped range.
 *
 * Weighted linearly toward the end of the range: day 38 is 38× as likely as
 * day 1. What sits immediately behind the placement is what the next
 * lessons actually build on, and it is also where a slightly-too-generous
 * placement goes wrong first. Day 3 matters far less to someone at day 40.
 */
export function pickProbeDay(
	startDay: number,
	state: ProbeState,
	hasLesson: (day: number) => boolean,
	rnd: () => number = Math.random
): number | null {
	const probed = new Set(state.probedDays);
	const candidates: number[] = [];
	for (let d = 1; d < startDay; d++) {
		if (probed.has(d)) continue;
		if (!hasLesson(d)) continue;
		candidates.push(d);
	}
	if (candidates.length === 0) return null;

	const total = candidates.reduce((sum, d) => sum + d, 0);
	let r = rnd() * total;
	for (const d of candidates) {
		r -= d;
		if (r <= 0) return d;
	}
	// Only reachable through floating-point drift at the very top of the
	// range; the last candidate is the correct answer there.
	return candidates[candidates.length - 1];
}

export function recordProbe(state: ProbeState, day: number, correct: boolean): ProbeState {
	return {
		// Spread first so nothing added to ProbeState later is silently
		// dropped here — `resolved` was, until a test caught it.
		...state,
		served: state.served + 1,
		probedDays: state.probedDays.includes(day) ? state.probedDays : [...state.probedDays, day],
		missedDays: correct || state.missedDays.includes(day) ? state.missedDays : [...state.missedDays, day]
	};
}

export interface ProbeVerdict {
	/** True when the sample says the learner was placed too far forward. */
	tooAggressive: boolean;
	/** Earliest day they missed — where the real gap starts. */
	suggestedDay: number | null;
	missRate: number;
}

/**
 * Read the sample.
 *
 * Never acts on its own. A wrong suggestion that silently moved someone
 * back thirty days would be worse than the gap it was correcting, so the
 * caller offers this once and the learner decides.
 */
export function probeVerdict(state: ProbeState): ProbeVerdict {
	const missRate = state.served > 0 ? state.missedDays.length / state.served : 0;
	if (state.resolved || state.served < MIN_SAMPLE || missRate < MISS_THRESHOLD) {
		return { tooAggressive: false, suggestedDay: null, missRate };
	}
	return {
		tooAggressive: true,
		suggestedDay: Math.min(...state.missedDays),
		missRate
	};
}
