import { describe, it, expect } from 'vitest';
import { GROUPS, KNOWN_KEYS, groupFor, matchesQuery } from './basics-groups';

/**
 * The eighteen keys live in Supabase, so this list is the contract between
 * the database and the shelf. If a category is added there and not here it
 * still renders — groupFor falls back rather than dropping it — but it
 * lands under the wrong heading, and this list is where that gets noticed.
 */
const LIVE_KEYS = [
	'pronounsAndSein', 'articles', 'conjunctions', 'numbers', 'colors', 'days',
	'months', 'prepositions', 'cases', 'verbConjugation', 'questionWords',
	'modalVerbs', 'wordOrder', 'verbTenses', 'verbTypes', 'adjectives',
	'passiveKonjunktiv', 'negationImpersonal'
];

describe('grouping', () => {
	it('assigns every live category explicitly', () => {
		for (const k of LIVE_KEYS) {
			expect(KNOWN_KEYS, `${k} has no group — it would fall back silently`).toContain(k);
		}
	});

	it('covers all eighteen and invents none', () => {
		expect(KNOWN_KEYS.length).toBe(LIVE_KEYS.length);
		for (const k of KNOWN_KEYS) {
			expect(LIVE_KEYS, `${k} is grouped but does not exist`).toContain(k);
		}
	});

	it('files an unknown key rather than losing it', () => {
		// A dropped topic is invisible content loss. A mis-filed one is
		// merely untidy, so the fallback is a real group, not null.
		expect(groupFor('somethingAddedLater')).toBe('words');
		expect(GROUPS.map((g) => g.id)).toContain(groupFor('somethingAddedLater'));
	});

	it('puts each topic in exactly one group that exists', () => {
		const ids = GROUPS.map((g) => g.id);
		for (const k of LIVE_KEYS) expect(ids).toContain(groupFor(k));
	});

	it('leaves no group empty', () => {
		// An empty heading renders as a bare label with nothing under it.
		for (const g of GROUPS) {
			expect(LIVE_KEYS.some((k) => groupFor(k) === g.id), `${g.id} is empty`).toBe(true);
		}
	});

	it('labels every group in both languages', () => {
		for (const g of GROUPS) {
			expect(g.en.trim()).not.toBe('');
			expect(g.fa, `${g.id} label is not Persian`).toMatch(/[؀-ۿ]/);
			expect(g.noteFa, `${g.id} note is not Persian`).toMatch(/[؀-ۿ]/);
		}
	});
});

describe('matchesQuery', () => {
	const topic = { key: 'wordOrder', title: 'Word order', description: 'Verb second, and what that costs.' };

	it('matches nothing typed by showing everything', () => {
		expect(matchesQuery(topic, '')).toBe(true);
		expect(matchesQuery(topic, '   ')).toBe(true);
	});

	it('matches the title regardless of case', () => {
		expect(matchesQuery(topic, 'WORD')).toBe(true);
		expect(matchesQuery(topic, 'order')).toBe(true);
	});

	it('matches the description', () => {
		expect(matchesQuery(topic, 'verb second')).toBe(true);
	});

	it('matches the key even when the visible title is Persian', () => {
		// A Persian shelf shares no characters with "wordOrder", so without
		// the key an English speaker searching it would get nothing.
		const fa = { key: 'wordOrder', title: 'ترتیب کلمات', description: 'فعل در جایگاه دوم.' };
		expect(matchesQuery(fa, 'wordorder')).toBe(true);
	});

	it('ignores surrounding whitespace', () => {
		expect(matchesQuery(topic, '  order  ')).toBe(true);
	});

	it('says no when it genuinely does not match', () => {
		expect(matchesQuery(topic, 'passive')).toBe(false);
	});
});
