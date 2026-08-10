import { describe, it, expect } from 'vitest';
import { buildDrills, chooseGap, verbAlternatives } from './practice-drills';
import { tokenizeForBuild } from './sentence-build';

const S = { german: 'Ich sehe den Mann.', meaning: 'من مرد را می‌بینم.' };

describe('verbAlternatives', () => {
	it('swaps the personal ending on a regular verb', () => {
		expect(verbAlternatives('wohne').sort()).toEqual(['wohne', 'wohnen', 'wohnst', 'wohnt']);
	});

	it('knows sein and haben, which no ending rule describes', () => {
		expect(verbAlternatives('ist')).toContain('bin');
		expect(verbAlternatives('hat')).toContain('haben');
	});

	it('ignores punctuation and case', () => {
		expect(verbAlternatives('Wohnt.')).toContain('wohne');
	});

	it('gives nothing for a word with no recognisable ending', () => {
		expect(verbAlternatives('Mann')).toEqual([]);
		// Stem too short to be a real verb — "ge" is not a stem.
		expect(verbAlternatives('ge')).toEqual([]);
	});
});

describe('chooseGap', () => {
	it('prefers the article — the audience\'s commonest error', () => {
		const gap = chooseGap(tokenizeForBuild('Ich sehe den Mann.'))!;
		expect(gap.kind).toBe('article');
		expect(gap.index).toBe(2);
		expect(gap.options).toContain('den');
	});

	it('keeps distractors inside the same article family', () => {
		const gap = chooseGap(tokenizeForBuild('Ich habe eine Frage.'))!;
		expect(gap.options.every((o) => o.startsWith('ein'))).toBe(true);
	});

	it('falls back to the position-2 verb when there is no article', () => {
		const gap = chooseGap(tokenizeForBuild('Ich wohne in Berlin'))!;
		expect(gap.kind).toBe('verb');
		expect(gap.index).toBe(1);
		expect(gap.options).toContain('wohne');
	});

	// German capitalises nouns, so the ending rule alone reads "Morgen" as a
	// conjugated Morg- and "Guten Morgen" grows a verb it does not have.
	it('does not mistake a capitalised noun for a verb', () => {
		expect(chooseGap(tokenizeForBuild('Guten Morgen'))).toBeNull();
		expect(chooseGap(tokenizeForBuild('Schönen Abend'))).toBeNull();
	});

	it('does not mistake a lowercase particle for a verb', () => {
		expect(chooseGap(['Er', 'nicht', 'da'])).toBeNull();
		expect(chooseGap(['Es', 'heute', 'kalt'])).toBeNull();
	});

	it('returns null rather than inventing a gap', () => {
		expect(chooseGap([])).toBeNull();
		expect(chooseGap(['Hallo'])).toBeNull();
	});
});

describe('buildDrills', () => {
	it('climbs build → gap → speak', () => {
		expect(buildDrills(S, 'fa').map((d) => d.kind)).toEqual(['build', 'gap', 'speak']);
	});

	it('scrambles the build rung without handing over the answer', () => {
		const build = buildDrills(S, 'en')[0];
		expect(build.solution).toEqual(['Ich', 'sehe', 'den', 'Mann.']);
		expect([...build.tiles!].sort()).toEqual([...build.solution!].sort());
		expect(build.tiles).not.toEqual(build.solution);
	});

	it('blanks exactly one token and marks the right option', () => {
		const gap = buildDrills(S, 'en').find((d) => d.kind === 'gap')!;
		expect(gap.masked!.filter((t) => t === null)).toHaveLength(1);
		expect(gap.masked).toEqual(['Ich', 'sehe', null, 'Mann.']);
		expect(gap.options![gap.correctIndex!]).toBe('den');
		expect(new Set(gap.options).size).toBe(gap.options!.length);
		expect(gap.gapOf).toBe('article');
	});

	it('prompts the speaking rung with the translation, never the German', () => {
		const speak = buildDrills(S, 'fa').find((d) => d.kind === 'speak')!;
		expect(speak.meaning).toBe('من مرد را می‌بینم.');
		expect(speak.meaning).not.toContain('Ich sehe');
	});

	it('drops the rungs a sentence cannot support instead of faking them', () => {
		// One word: nothing to scramble, no article, no position-2 verb.
		expect(buildDrills({ german: 'Hallo', meaning: 'سلام' }, 'fa').map((d) => d.kind)).toEqual([
			'speak'
		]);
		// No translation: the only prompt left would be the answer itself.
		expect(buildDrills({ german: 'Ich sehe den Mann.', meaning: '' }, 'en').map((d) => d.kind))
			.toEqual(['build', 'gap']);
		expect(buildDrills({ german: '   ', meaning: 'x' }, 'en')).toEqual([]);
	});

	it('localizes the prompts', () => {
		expect(buildDrills(S, 'en')[0].prompt).toBe('Put the sentence in order');
		expect(buildDrills(S, 'fa')[0].prompt).toBe('جمله را بچینید');
	});

	it('is deterministic under a seeded rand', () => {
		const seeded = () => 0.37;
		expect(buildDrills(S, 'en', seeded)).toEqual(buildDrills(S, 'en', seeded));
	});
});
