import { describe, it, expect } from 'vitest';
import {
	PROBE_BUDGET,
	MIN_SAMPLE,
	emptyProbeState,
	parseProbeState,
	shouldProbe,
	pickProbeDay,
	recordProbe,
	probeVerdict,
	type ProbeState
} from './placement-probe';

/** Every day exists, which is the normal case. */
const allDays = () => true;

/** Deterministic rng cycling through fixed values. */
function seq(...values: number[]) {
	let i = 0;
	return () => values[i++ % values.length];
}

describe('shouldProbe', () => {
	it('never probes a learner who skipped nothing', () => {
		expect(shouldProbe(1, emptyProbeState())).toBe(false);
	});

	it('probes a placed learner', () => {
		expect(shouldProbe(40, emptyProbeState())).toBe(true);
	});

	it('stops at the budget', () => {
		const spent: ProbeState = { served: PROBE_BUDGET, missedDays: [], probedDays: [] };
		expect(shouldProbe(40, spent)).toBe(false);
	});

	it('still probes on the last of the budget', () => {
		const nearly: ProbeState = { served: PROBE_BUDGET - 1, missedDays: [], probedDays: [] };
		expect(shouldProbe(40, nearly)).toBe(true);
	});
});

describe('pickProbeDay', () => {
	it('only ever returns a day inside the skipped range', () => {
		// Probing day 40+ would be testing material they have not been taught.
		for (let i = 0; i < 200; i++) {
			const d = pickProbeDay(40, emptyProbeState(), allDays);
			expect(d).not.toBeNull();
			expect(d!).toBeGreaterThanOrEqual(1);
			expect(d!).toBeLessThan(40);
		}
	});

	it('leans toward the end of the range', () => {
		// Day 38 is what day 40 builds on; day 3 is not. Linear weighting
		// should put the average comfortably above the midpoint.
		let sum = 0;
		const n = 3000;
		for (let i = 0; i < n; i++) sum += pickProbeDay(40, emptyProbeState(), allDays)!;
		const mean = sum / n;
		expect(mean).toBeGreaterThan(20); // midpoint of 1..39
		expect(mean).toBeLessThan(33);
	});

	it('does not repeat a day it already probed', () => {
		const state: ProbeState = { served: 2, missedDays: [], probedDays: [1, 2] };
		for (let i = 0; i < 100; i++) {
			expect([1, 2]).not.toContain(pickProbeDay(3, state, allDays));
		}
	});

	it('returns null when every day in the range is used up', () => {
		const state: ProbeState = { served: 2, missedDays: [], probedDays: [1, 2] };
		expect(pickProbeDay(3, state, allDays)).toBeNull();
	});

	it('returns null when nothing was skipped', () => {
		expect(pickProbeDay(1, emptyProbeState(), allDays)).toBeNull();
	});

	it('skips days with no lesson behind them', () => {
		// A sparse index must not yield a day that cannot be loaded.
		const only = new Set([2, 5]);
		for (let i = 0; i < 50; i++) {
			expect([2, 5]).toContain(pickProbeDay(10, emptyProbeState(), (d) => only.has(d)));
		}
	});

	it('picks the first candidate at the bottom of the range', () => {
		expect(pickProbeDay(4, emptyProbeState(), allDays, seq(0))).toBe(1);
	});

	it('picks the last candidate at the very top', () => {
		// Guards the floating-point fallthrough at the end of the walk.
		expect(pickProbeDay(4, emptyProbeState(), allDays, seq(0.999999))).toBe(3);
	});
});

describe('recordProbe', () => {
	it('counts a pass without recording a miss', () => {
		const s = recordProbe(emptyProbeState(), 12, true);
		expect(s).toMatchObject({ served: 1, missedDays: [], probedDays: [12] });
	});

	it('records a miss', () => {
		const s = recordProbe(emptyProbeState(), 12, false);
		expect(s).toMatchObject({ served: 1, missedDays: [12], probedDays: [12] });
	});

	it('does not mutate the state it was given', () => {
		const before = emptyProbeState();
		recordProbe(before, 5, false);
		expect(before).toEqual(emptyProbeState());
	});

	it('carries `resolved` through rather than dropping it', () => {
		// recordProbe used to rebuild the object field by field, so any
		// field added to ProbeState later was silently erased on the next
		// probe. `resolved` was the first casualty.
		const s = recordProbe({ ...emptyProbeState(), resolved: true }, 5, true);
		expect(s.resolved).toBe(true);
	});

	it('never double-lists a day', () => {
		let s = recordProbe(emptyProbeState(), 7, false);
		s = recordProbe(s, 7, false);
		expect(s.missedDays).toEqual([7]);
		expect(s.probedDays).toEqual([7]);
		expect(s.served).toBe(2);
	});
});

describe('probeVerdict', () => {
	const build = (results: boolean[], startDay = 40): ProbeState => {
		let s = emptyProbeState();
		results.forEach((ok, i) => {
			s = recordProbe(s, startDay - 1 - i, ok);
		});
		return s;
	};

	it('says nothing before the sample is big enough', () => {
		// Three misses out of three is alarming and still not evidence.
		const v = probeVerdict(build([false, false, false]));
		expect(v.tooAggressive).toBe(false);
		expect(v.suggestedDay).toBeNull();
	});

	it('clears a learner who passes', () => {
		const v = probeVerdict(build(Array(MIN_SAMPLE).fill(true)));
		expect(v.tooAggressive).toBe(false);
		expect(v.missRate).toBe(0);
	});

	it('tolerates the occasional miss', () => {
		// 2 of 10 is normal forgetting, not a bad placement.
		const v = probeVerdict(build([false, false, true, true, true, true, true, true, true, true]));
		expect(v.tooAggressive).toBe(false);
	});

	it('flags a placement that is clearly too far forward', () => {
		const v = probeVerdict(build([false, false, false, false, false, true, true, true]));
		expect(v.tooAggressive).toBe(true);
		expect(v.missRate).toBeGreaterThan(0.4);
	});

	it('points at the earliest day they missed', () => {
		// Misses at 39, 38, 37, 36, 35 → the gap starts at 35, so that is
		// where they should restart, not at the most recent failure.
		const v = probeVerdict(build([false, false, false, false, false, true, true, true]));
		expect(v.suggestedDay).toBe(35);
	});

	it('handles an empty state without dividing by zero', () => {
		const v = probeVerdict(emptyProbeState());
		expect(v.missRate).toBe(0);
		expect(v.tooAggressive).toBe(false);
	});

	it('stays quiet once the learner has answered the offer', () => {
		// Someone who declined has said they are content where they are.
		// Re-asking on the same evidence is nagging.
		const failing = build([false, false, false, false, false, true, true, true]);
		expect(probeVerdict(failing).tooAggressive).toBe(true);
		expect(probeVerdict({ ...failing, resolved: true }).tooAggressive).toBe(false);
	});
});

describe('parseProbeState', () => {
	it('round-trips a real state', () => {
		const s: ProbeState = {
			served: 5,
			missedDays: [3, 9],
			probedDays: [3, 9, 12],
			resolved: true
		};
		expect(parseProbeState(JSON.parse(JSON.stringify(s)))).toEqual(s);
	});

	it('falls back to empty on junk', () => {
		for (const bad of [null, undefined, 'x', 7, []]) {
			expect(parseProbeState(bad)).toEqual(emptyProbeState());
		}
	});

	it('drops non-numeric and non-positive day entries', () => {
		const s = parseProbeState({ served: 2, missedDays: ['x', 0, -1, 4], probedDays: [4, null] });
		expect(s.missedDays).toEqual([4]);
		expect(s.probedDays).toEqual([4]);
	});

	it('refuses a negative served count', () => {
		expect(parseProbeState({ served: -5 }).served).toBe(0);
	});
});
