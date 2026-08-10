import { describe, it, expect } from 'vitest';
import { buildChecks, collectWords, splitArticle } from './basics-checks';

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

	it('handles multi-word nouns', () => {
		expect(splitArticle('die Handynummer Pro')).toEqual({
			article: 'die',
			noun: 'Handynummer Pro'
		});
	});

	it('returns null for a word with no article', () => {
		expect(splitArticle('und')).toBeNull();
	});

	it('does not treat a word merely starting with "die" as an article', () => {
		expect(splitArticle('dienen')).toBeNull();
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

	it('interleaves the two kinds so the learner cannot settle into one pattern', () => {
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
