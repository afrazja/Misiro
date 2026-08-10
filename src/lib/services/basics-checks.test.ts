import { describe, it, expect } from 'vitest';
import {
	buildChecks,
	buildConjugationChecks,
	buildTopicChecks,
	collectForms,
	collectWords,
	isWordEntry,
	splitArticle
} from './basics-checks';

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

describe('conjugation checks', () => {
	const GEHEN = {
		infinitive: { german: 'gehen' },
		tenses: [
			{
				forms: [
					{ pronoun: 'ich', verb: 'gehe' },
					{ pronoun: 'du', verb: 'gehst' },
					{ pronoun: 'er/sie/es', verb: 'geht' },
					{ pronoun: 'wir', verb: 'gehen' }
				]
			}
		]
	};
	const FAHREN = {
		infinitive: { german: 'fahren' },
		tenses: [
			{
				forms: [
					{ pronoun: 'ich', verb: 'fahre' },
					{ pronoun: 'du', verb: 'fährst' },
					{ pronoun: 'wir', verb: 'fahren' }
				]
			}
		]
	};
	const SECTIONS = [GEHEN];

	it('pulls forms out of the tables the verb topics are made of', () => {
		const groups = collectForms(SECTIONS);
		expect(groups).toHaveLength(1);
		expect(groups[0].infinitive).toBe('gehen');
		expect(groups[0].forms).toHaveLength(4);
		expect(collectForms(null)).toEqual([]);
		expect(collectForms([{ tenses: null }])).toEqual([]);
	});

	it('blanks the verb and names the pronoun being asked about', () => {
		const checks = buildConjugationChecks(collectForms(SECTIONS), 'en');
		expect(checks).toHaveLength(4);
		for (const c of checks) {
			expect(c.kind).toBe('conjugation');
			expect(c.subject).toMatch(/^gehen — .+ ___$/);
			expect(c.subjectLang).toBe('de');
			expect(c.options).toHaveLength(3);
			expect(new Set(c.options).size).toBe(3);
			const pronoun = c.subject.replace('gehen — ', '').replace(' ___', '');
			const source = GEHEN.tenses[0].forms.find((f) => f.pronoun === pronoun)!;
			expect(c.options[c.correctIndex]).toBe(source.verb);
		}
	});

	// The bug this guards: with forms flattened across every verb in the
	// topic, "wir ___" was offered siehst / sprechen / fahren — two of which
	// are correct answers for wir.
	it('never draws a distractor from a different verb', () => {
		const own = new Set(GEHEN.tenses[0].forms.map((f) => f.verb));
		const checks = buildConjugationChecks(collectForms([GEHEN, FAHREN]), 'en');
		const gehenChecks = checks.filter((c) => c.subject.startsWith('gehen'));
		expect(gehenChecks.length).toBeGreaterThan(0);
		for (const c of gehenChecks) {
			for (const o of c.options) expect(own.has(o)).toBe(true);
		}
	});

	it('takes turns between verbs instead of drilling only the first', () => {
		const subjects = buildConjugationChecks(collectForms([GEHEN, FAHREN]), 'en')
			.slice(0, 2)
			.map((c) => c.subject.split(' — ')[0]);
		expect(new Set(subjects).size).toBe(2);
	});

	it('emits nothing when there are too few forms to build options', () => {
		expect(
			buildConjugationChecks([{ forms: [{ pronoun: 'ich', verb: 'bin' }] }], 'en')
		).toEqual([]);
	});

	it('mixes table checks in with word checks', () => {
		const kinds = buildTopicChecks(NOUNS, collectForms(SECTIONS), 'en', 4).map((c) => c.kind);
		expect(kinds[0]).toBe('conjugation');
		expect(kinds[1]).toBe('article');
		expect(kinds).toHaveLength(4);
	});

	it('falls back to word checks alone when a topic has no tables', () => {
		const kinds = buildTopicChecks(NOUNS, [], 'en', 3).map((c) => c.kind);
		expect(kinds).toHaveLength(3);
		expect(kinds).not.toContain('conjugation');
	});

	it('gives a table-only topic checks it would otherwise have none of', () => {
		// verbConjugation and friends carry no `words` at all — this is the
		// case that used to render a stepped flow with nothing to practise.
		const checks = buildTopicChecks([], collectForms(SECTIONS), 'en', 5);
		expect(checks.length).toBeGreaterThan(0);
		expect(checks.every((c) => c.kind === 'conjugation')).toBe(true);
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
