import { describe, it, expect } from 'vitest';
import { tokenizeForBuild, shuffleTiles, isBuildCorrect } from './sentence-build';

/**
 * These moved here from lesson-controller.test.ts when the automatic
 * tap-to-build step was removed from the lesson flow. The functions
 * themselves are still very much in use — practice mode's build rung, the
 * Basics word-order checks and practice-drills all build on them.
 */

describe('tokenizeForBuild', () => {
	it('splits on whitespace and keeps punctuation attached to its word', () => {
		expect(tokenizeForBuild('Ich lerne Deutsch.')).toEqual(['Ich', 'lerne', 'Deutsch.']);
	});

	it('collapses irregular spacing', () => {
		expect(tokenizeForBuild('  Wie   geht es dir?  ')).toEqual(['Wie', 'geht', 'es', 'dir?']);
	});
});

describe('shuffleTiles', () => {
	it('keeps exactly the same multiset of words', () => {
		const sol = ['Ich', 'stehe', 'um', 'sieben', 'Uhr', 'auf.'];
		const out = shuffleTiles(sol);
		expect([...out].sort()).toEqual([...sol].sort());
	});

	it('never returns the solution order — even when the shuffle keeps landing on it', () => {
		const sol = ['Ich', 'lerne', 'Deutsch.'];
		// A rand() that always yields the identity permutation: every attempt
		// reproduces the solution, so the fallback rotation has to kick in.
		const out = shuffleTiles(sol, () => 0.999999);
		expect(out).not.toEqual(sol);
		expect([...out].sort()).toEqual([...sol].sort());
	});

	it('does not hang when every word is identical', () => {
		const sol = ['ja', 'ja', 'ja'];
		expect(shuffleTiles(sol)).toEqual(sol); // no other arrangement exists
	});

	it('leaves a single-word sentence alone', () => {
		expect(shuffleTiles(['Hallo!'])).toEqual(['Hallo!']);
	});
});

describe('isBuildCorrect', () => {
	it('accepts the exact order', () => {
		expect(isBuildCorrect(['Ich', 'bin', 'müde.'], ['Ich', 'bin', 'müde.'])).toBe(true);
	});

	it('rejects a wrong order', () => {
		expect(isBuildCorrect(['Bin', 'ich', 'müde.'], ['Ich', 'bin', 'müde.'])).toBe(false);
	});

	it('rejects an incomplete attempt', () => {
		expect(isBuildCorrect(['Ich', 'bin'], ['Ich', 'bin', 'müde.'])).toBe(false);
	});

	it('grades duplicates by value, so a swapped duplicate still passes', () => {
		expect(isBuildCorrect(['sehr', 'sehr', 'gut'], ['sehr', 'sehr', 'gut'])).toBe(true);
	});
});

