import { describe, it, expect } from 'vitest';
import { buildExamBank, selectSitting, type SourceSentence } from './exam-items';

const S: SourceSentence[] = [
	{ day: 1, id: 1, german: 'Ich komme aus dem Iran.', meaning: 'من اهل ایران هستم.' },
	{ day: 1, id: 2, german: 'Wie geht es dir?', meaning: 'حالت چطور است؟' },
	{ day: 2, id: 1, german: 'Heute gehe ich ins Kino.', meaning: 'امروز به سینما می‌روم.' },
	{ day: 2, id: 2, german: 'Danke', meaning: 'ممنون' }
];

const seeded = (seq: number[]) => {
	let i = 0;
	return () => seq[i++ % seq.length];
};

describe('buildExamBank', () => {
	it('covers all four exam modules', () => {
		const mods = new Set(buildExamBank(S, 'fa').map((i) => i.module));
		expect([...mods].sort()).toEqual(['hoeren', 'lesen', 'schreiben', 'sprechen']);
	});

	it('gives every sentence a Sprechen item', () => {
		const speak = buildExamBank(S, 'fa').filter((i) => i.module === 'sprechen');
		expect(speak).toHaveLength(S.length);
		expect(speak.every((i) => i.target && i.kind === 'speak')).toBe(true);
	});

	it('ids are stable and unique, so seen items can be skipped', () => {
		const a = buildExamBank(S, 'fa').map((i) => i.id);
		const b = buildExamBank(S, 'fa').map((i) => i.id);
		expect(new Set(a).size).toBe(a.length);
		expect(a.sort()).toEqual(b.sort());
	});

	it('marks the right option on a reading item', () => {
		for (const i of buildExamBank(S, 'fa').filter((x) => x.module === 'lesen')) {
			const src = S.find((s) => s.german === i.german)!;
			expect(i.options![i.correctIndex!]).toBe(src.meaning);
			expect(new Set(i.options).size).toBe(3);
		}
	});

	// A listening item where the claim is always true is answerable without
	// listening — you just press True every time.
	it('makes the listening claim false roughly half the time', () => {
		const alwaysTrue = buildExamBank(S, 'fa', seeded([0.1]))
			.filter((i) => i.module === 'hoeren')
			.every((i) => i.correctIndex === 0);
		const alwaysFalse = buildExamBank(S, 'fa', seeded([0.9]))
			.filter((i) => i.module === 'hoeren')
			.every((i) => i.correctIndex === 1);
		expect(alwaysTrue).toBe(true);
		expect(alwaysFalse).toBe(true);
	});

	it('blanks a real word for the writing item and keeps the answer', () => {
		for (const i of buildExamBank(S, 'fa').filter((x) => x.module === 'schreiben')) {
			expect(i.german).toContain('_____');
			expect(i.answer!.length).toBeGreaterThanOrEqual(3);
			expect(i.german).not.toContain(i.answer!);
		}
	});

	it('skips sentences too short to blank a word out of', () => {
		const short = buildExamBank([S[3]], 'fa').filter((i) => i.module === 'schreiben');
		expect(short).toHaveLength(0);
	});

	it('never puts the answer in the prompt of a speaking item', () => {
		for (const i of buildExamBank(S, 'fa').filter((x) => x.module === 'sprechen')) {
			expect(i.prompt).not.toContain(i.target!);
		}
	});

	it('needs a few sentences before it will build anything', () => {
		expect(buildExamBank([S[0]], 'fa')).toEqual([]);
		expect(buildExamBank([], 'fa')).toEqual([]);
	});
});

describe('selectSitting', () => {
	const bank = buildExamBank(S, 'fa');

	it('draws the requested number', () => {
		expect(selectSitting(bank, { count: 8 })).toHaveLength(8);
	});

	it('spreads across modules rather than stacking one', () => {
		const mods = new Set(selectSitting(bank, { count: 4 }).map((i) => i.module));
		expect(mods.size).toBe(4);
	});

	// The whole point of the bank: a retake must not be the same sitting.
	it('prefers items the learner has not seen', () => {
		const first = selectSitting(bank, { count: 6 });
		const second = selectSitting(bank, { count: 6, seenIds: first.map((i) => i.id) });
		const overlap = second.filter((i) => first.some((f) => f.id === i.id));
		expect(overlap).toHaveLength(0);
	});

	it('spends the first questions on the modules that need them most', () => {
		const picked = selectSitting(bank, { count: 2, priority: ['schreiben', 'hoeren'] });
		expect(picked[0].module).toBe('schreiben');
		expect(picked[1].module).toBe('hoeren');
	});

	// A short test is worse than a repeated question.
	it('reuses seen items rather than returning a stunted sitting', () => {
		const all = bank.map((i) => i.id);
		expect(selectSitting(bank, { count: 6, seenIds: all })).toHaveLength(6);
	});

	it('never invents items from an empty bank', () => {
		expect(selectSitting([], { count: 5 })).toEqual([]);
	});

	it('returns everything it has when the bank is smaller than the sitting', () => {
		expect(selectSitting(bank, { count: 999 })).toHaveLength(bank.length);
	});
});
