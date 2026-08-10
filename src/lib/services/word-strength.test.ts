import { describe, it, expect } from 'vitest';
import {
	applyAttempt,
	contentWords,
	MAX_STRENGTH,
	sentenceMastery,
	weakestWords,
	wordKey
} from './word-strength';

describe('wordKey', () => {
	it('folds case and punctuation together', () => {
		expect(wordKey('Mann.')).toBe('mann');
		expect(wordKey('  „Guten!  ')).toBe('guten');
	});
});

describe('contentWords', () => {
	it('splits a sentence into trackable words', () => {
		expect(contentWords('Ich sehe den Mann.')).toEqual(['ich', 'sehe', 'den', 'mann']);
	});

	it('drops tokens that are only punctuation', () => {
		expect(contentWords('Ja , nein')).toEqual(['ja', 'nein']);
		expect(contentWords('   ')).toEqual([]);
	});
});

describe('applyAttempt', () => {
	it('adds one for a correct attempt', () => {
		expect(applyAttempt({}, 'Ich sehe', true)).toEqual({ ich: 1, sehe: 1 });
	});

	// Forgetting has to cost more than remembering earns, or a word coasts to
	// mastered on lucky guesses.
	it('takes two for a wrong one', () => {
		expect(applyAttempt({ ich: 3, sehe: 3 }, 'Ich sehe', false)).toEqual({ ich: 1, sehe: 1 });
	});

	it('clamps to 0..5', () => {
		expect(applyAttempt({ ja: 5 }, 'ja', true)).toEqual({ ja: MAX_STRENGTH });
		expect(applyAttempt({ ja: 1 }, 'ja', false)).toEqual({ ja: 0 });
	});

	it('does not mutate the record it is given', () => {
		const before = { ich: 2 };
		applyAttempt(before, 'Ich', true);
		expect(before).toEqual({ ich: 2 });
	});

	it('treats the same word in different forms of punctuation as one', () => {
		const after = applyAttempt(applyAttempt({}, 'Mann', true), 'Mann.', true);
		expect(after).toEqual({ mann: 2 });
	});
});

describe('sentenceMastery', () => {
	// The reason word-level tracking exists: five solid words must not hide
	// the one that actually fails.
	it('is the weakest word, not the average', () => {
		expect(sentenceMastery({ ich: 5, sehe: 5, den: 0, mann: 5 }, 'Ich sehe den Mann')).toBe(0);
	});

	it('counts an unseen word as zero', () => {
		expect(sentenceMastery({ ich: 5 }, 'Ich sehe')).toBe(0);
	});

	it('reaches full only when every word does', () => {
		expect(sentenceMastery({ ich: 5, sehe: 5 }, 'Ich sehe')).toBe(MAX_STRENGTH);
	});

	it('is 0 for an empty sentence rather than Infinity', () => {
		expect(sentenceMastery({}, '   ')).toBe(0);
	});
});

describe('weakestWords', () => {
	it('lists the words dragging the sentence down, weakest first', () => {
		expect(weakestWords({ ich: 5, sehe: 1, den: 0, mann: 3 }, 'Ich sehe den Mann')).toEqual([
			'den',
			'sehe',
			'mann'
		]);
	});

	it('leaves out words already mastered', () => {
		expect(weakestWords({ ich: 5, sehe: 5 }, 'Ich sehe')).toEqual([]);
	});

	it('respects the limit', () => {
		expect(weakestWords({}, 'a b c d e', 2)).toHaveLength(2);
	});
});
