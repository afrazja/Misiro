import { describe, it, expect } from 'vitest';
import { openerForDay, daysWithOpener, DEFAULT_OPENER } from './conversation-openers';

describe('openerForDay', () => {
	it('gives a day its own question', () => {
		expect(openerForDay(3).de).toBe('Was möchten Sie bestellen?');
	});

	it('falls back to one that works on any day', () => {
		// A day without an entry must still get a usable turn — the feature
		// cannot be gated on having authored 120 openers.
		expect(openerForDay(77)).toEqual(DEFAULT_OPENER);
		expect(openerForDay(120)).toEqual(DEFAULT_OPENER);
		expect(openerForDay(0)).toEqual(DEFAULT_OPENER);
	});

	it('never returns an empty question in any language', () => {
		for (const d of [...daysWithOpener(), 999]) {
			const o = openerForDay(d);
			expect(o.de.length).toBeGreaterThan(4);
			expect(o.en.length).toBeGreaterThan(4);
			expect(o.fa.length).toBeGreaterThan(4);
		}
	});

	it('asks a question or invites one — never a statement to nod at', () => {
		// An opener that is not answerable leaves the learner with nothing to
		// say, which defeats the entire card.
		for (const d of daysWithOpener()) {
			const de = openerForDay(d).de;
			expect(de.endsWith('?') || de.startsWith('Erzählen')).toBe(true);
		}
	});

	it('stays short enough for an A1 learner to parse', () => {
		for (const d of daysWithOpener()) {
			expect(openerForDay(d).de.split(/\s+/).length).toBeLessThanOrEqual(7);
		}
	});

	it('covers the days the rollout starts on', () => {
		// Day 1 first: it is where 77% of learners leave, so a reason to
		// continue is worth the most there.
		expect(daysWithOpener()).toContain(1);
		expect(daysWithOpener()[0]).toBe(1);
	});
});
