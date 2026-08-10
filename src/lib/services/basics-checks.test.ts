import { describe, it, expect } from 'vitest';
import { buildChecks, collectWords, isWordEntry, splitArticle } from './basics-checks';

const NOUNS = [
	{ german: 'der Tisch', en: 'the table', fa: 'میز' },
	{ german: 'die Lampe', en: 'the lamp', fa: 'لامپ' },
	{ german: 'das Fenster', en: 'the window', fa: 'پنجره' },
	{ german: 'der Hund', en: 'the dog', fa: 'سگ' }
];

const NON_NOUNS = [
	{ german: 'und', en: 'and', fa: 'و' },
	{ german: 'aber', en: 'but', fa: 'اما' },
	{ german: 'oder', en: 'or', fa: 'یا' }
];

describe('splitArticle', () => {
	it('splits an article off a noun', () => {
		expect(splitArticle('der Tisch')).toEqual({ article: 'der', noun: 'Tisch' });
	});

	it('handles compound nouns', () => {
		expect(splitArticle('die Handynummer')).toEqual({
			article: 'die',
			noun: 'Handynummer'
		});
	});

	// One capitalised word is the whole test for "this is a noun entry".
	// Anything longer is an example sentence — see the case below.
	it('rejects a multi-word phrase after the article', () => {
		expect(splitArticle('die Handynummer Pro')).toBeNull();
	});

	it('returns null for a word with no article', () => {
		expect(splitArticle('und')).toBeNull();
	});

	it('does not treat a word merely starting with "die" as an article', () => {
		expect(splitArticle('dienen')).toBeNull();
	});

	// The bug this guards: grammar topics store worked examples in the same
	// field vocabulary topics use for words, and "Das Kind, dem ich helfe,
	// ist sechs." was being read as a noun called "Kind, dem ich helfe,…".
	it('rejects an example sentence that happens to start with an article', () => {
		expect(splitArticle('Das Kind, dem ich helfe, ist sechs.')).toBeNull();
		expect(splitArticle('Der Mann kauft Brot.')).toBeNull();
	});
});

describe('isWordEntry', () => {
	it('accepts words and short phrases', () => {
		expect(isWordEntry('Tisch')).toBe(true);
		expect(isWordEntry('der Tisch')).toBe(true);
		expect(isWordEntry('es gibt')).toBe(true);
	});

	it('rejects sentences', () => {
		expect(isWordEntry('Ich gehe heute ins Kino.')).toBe(false);
		expect(isWordEntry('Weil es regnet, bleibe ich zu Hause')).toBe(false);
		expect(isWordEntry('  ')).toBe(false);
	});
});

describe('buildChecks', () => {
	it('asks for the article of nouns, with the right answer marked', () => {
		const checks = buildChecks(NOUNS, 'en', 10);
		const article = checks.filter((c) => c.kind === 'article');
		expect(article.length).toBeGreaterThan(0);
		for (const c of article) {
			expect(c.options).toEqual(['der', 'die', 'das']);
			const source = NOUNS.find((n) => n.german.endsWith(c.subject));
			expect(source).toBeTruthy();
			expect(c.options[c.correctIndex]).toBe(source!.german.split(' ')[0]);
		}
	});

	it('never leaks the article into the subject', () => {
		for (const c of buildChecks(NOUNS, 'en', 10).filter((c) => c.kind === 'article')) {
			expect(c.subject).not.toMatch(/^(der|die|das)\s/i);
		}
	});

	it('builds meaning questions whose correctIndex points at the real meaning', () => {
		const checks = buildChecks(NON_NOUNS, 'en', 10);
		const meaning = checks.filter((c) => c.kind === 'meaning');
		expect(meaning.length).toBeGreaterThan(0);
		for (const c of meaning) {
			const source = NON_NOUNS.find((w) => w.german === c.subject)!;
			expect(c.options[c.correctIndex]).toBe(source.en);
			expect(new Set(c.options).size).toBe(c.options.length); // no duplicate options
			expect(c.options.length).toBe(3);
		}
	});

	it('uses Persian meanings when the interface is fa', () => {
		const meaning = buildChecks(NON_NOUNS, 'fa', 10).filter((c) => c.kind === 'meaning');
		expect(meaning.length).toBeGreaterThan(0);
		expect(meaning[0].options.some((o) => /[؀-ۿ]/.test(o))).toBe(true);
	});

	it('produces no meaning questions when there are too few distinct meanings', () => {
		// Two words = only one possible distractor; a 2-option quiz is a coin flip.
		const checks = buildChecks(
			[
				{ german: 'und', en: 'and' },
				{ german: 'aber', en: 'but' }
			],
			'en',
			10
		);
		expect(checks.filter((c) => c.kind === 'meaning')).toHaveLength(0);
	});

	it('returns nothing rather than filler when the data cannot support a question', () => {
		expect(buildChecks([{ german: 'und' }], 'en')).toEqual([]);
		expect(buildChecks([], 'en')).toEqual([]);
	});

	it('respects the limit', () => {
		expect(buildChecks([...NOUNS, ...NON_NOUNS], 'en', 3)).toHaveLength(3);
	});

	it('interleaves the kinds so the learner cannot settle into one pattern', () => {
		const kinds = buildChecks([...NOUNS, ...NON_NOUNS], 'en', 4).map((c) => c.kind);
		expect(kinds[0]).toBe('article');
		expect(kinds[1]).toBe('meaning');
	});

	it('is deterministic when given a seeded rand', () => {
		const seeded = () => 0.42;
		const a = buildChecks([...NOUNS, ...NON_NOUNS], 'en', 5, seeded);
		const b = buildChecks([...NOUNS, ...NON_NOUNS], 'en', 5, seeded);
		expect(a).toEqual(b);
	});
});

describe('word-order checks', () => {
	// Grammar topics have no vocabulary — they are lists of worked sentences.
	// Rebuilding the sentence is the check they actually want.
	const SENTENCES = [
		{ german: 'Heute gehe ich ins Kino.', en: 'Today I go to the cinema.', fa: 'امروز به سینما می‌روم.' },
		{ german: 'Ich bleibe zu Hause, weil es regnet.', en: 'I stay home because it is raining.' }
	];

	it('scrambles the sentence and keeps the solution', () => {
		const checks = buildChecks(SENTENCES, 'en', 5);
		expect(checks).toHaveLength(2);
		expect(checks.every((c) => c.kind === 'order')).toBe(true);
		for (const check of checks) {
			expect([...check.tiles!].sort()).toEqual([...check.solution!].sort());
			expect(check.tiles).not.toEqual(check.solution);
		}
		const kino = checks.find((c) => c.solution![0] === 'Heute')!;
		expect(kino.solution).toEqual(['Heute', 'gehe', 'ich', 'ins', 'Kino.']);
	});

	it('prompts with the translation, never the German being rebuilt', () => {
		for (const check of buildChecks(SENTENCES, 'en', 5)) {
			expect(check.subjectLang).toBe('ui');
			expect(check.subject).toBe(
				SENTENCES.find((s) => s.german.startsWith(check.solution![0]))!.en
			);
			expect(check.subject).not.toContain(check.solution!.join(' '));
		}
	});

	it('uses the Persian translation when the interface is Persian', () => {
		const [check] = buildChecks([SENTENCES[0]], 'fa', 5);
		expect(check.subject).toBe('امروز به سینما می‌روم.');
	});

	it('skips a sentence with no translation — the German would be the answer', () => {
		expect(buildChecks([{ german: 'Heute gehe ich ins Kino.' }], 'en')).toEqual([]);
	});

	it('skips sentences too short to scramble or too long to be worth it', () => {
		const out = buildChecks(
			[
				{ german: 'Es regnet.', en: 'It is raining.' }, // 2 tokens
				{ german: 'Heute gehe ich hin.', en: 'I go there today.' }, // 4 — kept
				{ german: 'a b c d e f g h i j k.', en: 'long' } // 11
			],
			'en',
			5
		);
		expect(out.map((c) => c.solution?.length)).toEqual([4]);
	});
});

describe('collectWords', () => {
	it('merges flat words and section words, dropping empties', () => {
		const out = collectWords([{ german: 'und' }, { german: '  ' }], [
			{ words: [{ german: 'der Tisch' }] },
			{ words: null }
		]);
		expect(out.map((w) => w.german)).toEqual(['und', 'der Tisch']);
	});

	it('handles a category with neither', () => {
		expect(collectWords(null, null)).toEqual([]);
	});
});
