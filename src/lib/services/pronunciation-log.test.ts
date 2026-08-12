import { describe, it, expect } from 'vitest';
import { recordMiss, rankMisses, ATTEMPT_FLOOR, type PronunciationMiss } from './pronunciation-log';
import { CONTRASTS } from './pronunciation';

const note = (target: string, heard: string, id: keyof typeof CONTRASTS) => ({
	contrast: CONTRASTS[id],
	target,
	heard
});

describe('recordMiss', () => {
	it('logs a diagnosed word with the sound that was wrong', () => {
		const log = recordMiss([], {
			notes: [note('möchte', 'mochte', 'oe')],
			missedWords: [],
			matchPercentage: 0.8
		});
		expect(log).toHaveLength(1);
		expect(log[0].word).toBe('möchte');
		expect(log[0].contrast?.id).toBe('oe');
		expect(log[0].heard).toBe('mochte');
		expect(log[0].times).toBe(1);
	});

	it('counts a word missed twice as one entry', () => {
		let log = recordMiss([], { notes: [note('möchte', 'mochte', 'oe')], missedWords: [], matchPercentage: 0.8 });
		log = recordMiss(log, { notes: [note('möchte', 'mochte', 'oe')], missedWords: [], matchPercentage: 0.8 });
		expect(log).toHaveLength(1);
		expect(log[0].times).toBe(2);
	});

	it('treats punctuation and case as the same word', () => {
		let log = recordMiss([], { notes: [], missedWords: ['Kaffee.'], matchPercentage: 0.8 });
		log = recordMiss(log, { notes: [], missedWords: ['kaffee'], matchPercentage: 0.8 });
		expect(log).toHaveLength(1);
		expect(log[0].times).toBe(2);
	});

	it('upgrades an unnamed entry once a later attempt names the sound', () => {
		// Knowing WHY is the value of the entry, so a diagnosis arriving late
		// must still land on the word already logged.
		let log = recordMiss([], { notes: [], missedWords: ['schön'], matchPercentage: 0.8 });
		expect(log[0].contrast).toBeNull();
		log = recordMiss(log, { notes: [note('schön', 'schon', 'oe')], missedWords: [], matchPercentage: 0.8 });
		expect(log).toHaveLength(1);
		expect(log[0].contrast?.id).toBe('oe');
		expect(log[0].heard).toBe('schon');
	});

	it('never double-counts a word that is both diagnosed and unmatched', () => {
		const log = recordMiss([], {
			notes: [note('möchte', 'mochte', 'oe')],
			missedWords: ['möchte', 'Kaffee'],
			matchPercentage: 0.8
		});
		expect(log).toHaveLength(2);
		expect(log.find((m) => m.word === 'möchte')!.times).toBe(1);
	});

	it('ignores unmatched words when the learner said something else entirely', () => {
		// Below the floor every target word comes back unmatched, and logging
		// them buries the real misses under a whole sentence.
		const log = recordMiss([], {
			notes: [],
			missedWords: ['Ich', 'möchte', 'einen', 'Kaffee'],
			matchPercentage: ATTEMPT_FLOOR - 0.01
		});
		expect(log).toEqual([]);
	});

	it('still logs a diagnosed sound below the floor', () => {
		// A named contrast is evidence regardless of how the rest scored.
		const log = recordMiss([], {
			notes: [note('möchte', 'mochte', 'oe')],
			missedWords: ['Ich', 'einen'],
			matchPercentage: 0.1
		});
		expect(log.map((m) => m.word)).toEqual(['möchte']);
	});

	it('does not mutate the log it was given', () => {
		const before: PronunciationMiss[] = [];
		const after = recordMiss(before, { notes: [], missedWords: ['Kaffee'], matchPercentage: 0.9 });
		expect(before).toEqual([]);
		expect(after).toHaveLength(1);
	});

	it('skips empty and punctuation-only tokens', () => {
		const log = recordMiss([], { notes: [], missedWords: ['', '  ', '?', '—'], matchPercentage: 0.9 });
		expect(log).toEqual([]);
	});
});

describe('rankMisses', () => {
	it('puts words we can explain above words we cannot', () => {
		const log = recordMiss(
			recordMiss([], { notes: [], missedWords: ['Kaffee'], matchPercentage: 0.9 }),
			{ notes: [note('schön', 'schon', 'oe')], missedWords: [], matchPercentage: 0.9 }
		);
		expect(rankMisses(log).map((m) => m.word)).toEqual(['schön', 'Kaffee']);
	});

	it('orders by how often within a group', () => {
		let log = recordMiss([], { notes: [], missedWords: ['Brot'], matchPercentage: 0.9 });
		log = recordMiss(log, { notes: [], missedWords: ['Milch'], matchPercentage: 0.9 });
		log = recordMiss(log, { notes: [], missedWords: ['Milch'], matchPercentage: 0.9 });
		expect(rankMisses(log).map((m) => m.word)).toEqual(['Milch', 'Brot']);
	});

	it('does not mutate its input', () => {
		const log = recordMiss([], { notes: [], missedWords: ['a', 'b'], matchPercentage: 0.9 });
		const order = log.map((m) => m.word);
		rankMisses(log);
		expect(log.map((m) => m.word)).toEqual(order);
	});
});
