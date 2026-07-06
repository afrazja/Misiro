import { describe, it, expect } from 'vitest';
import { matchVoiceInput, bestVoiceMatch, getWordMatchStatus } from './text-matching';

describe('matchVoiceInput', () => {
	it('returns isMatch=true for an exact match', () => {
		const result = matchVoiceInput('Guten Morgen', 'Guten Morgen');
		expect(result.isMatch).toBe(true);
		expect(result.matchPercentage).toBe(1);
		expect(result.matchedWords).toBe(2);
		expect(result.totalWords).toBe(2);
	});

	it('is case-insensitive', () => {
		const result = matchVoiceInput('guten morgen', 'Guten Morgen');
		expect(result.isMatch).toBe(true);
	});

	it('strips punctuation from both sides', () => {
		const result = matchVoiceInput('Guten Morgen!', 'Guten Morgen.');
		expect(result.isMatch).toBe(true);
	});

	it('strips commas and question marks', () => {
		const result = matchVoiceInput('Wie geht es Ihnen?', 'Wie geht es Ihnen');
		expect(result.isMatch).toBe(true);
	});

	it('returns isMatch=false when below threshold', () => {
		const result = matchVoiceInput('Guten', 'Guten Morgen', 0.8);
		expect(result.isMatch).toBe(false);
		expect(result.matchPercentage).toBe(0.5);
	});

	it('respects a custom lower threshold', () => {
		const result = matchVoiceInput('Guten', 'Guten Morgen', 0.4);
		expect(result.isMatch).toBe(true);
	});

	it('handles substring matches — user word contains target word', () => {
		// 'morgens'.includes('morgen') === true
		const result = matchVoiceInput('morgens', 'morgen');
		expect(result.matchedWords).toBe(1);
		expect(result.isMatch).toBe(true);
	});

	it('rejects heavily truncated words — Levenshtein below threshold', () => {
		// 'morg' vs 'morgen': similarity 1 - 2/6 ≈ 0.67 < 0.8 — not close enough.
		// (The old substring matcher accepted any prefix; Levenshtein is stricter.)
		const result = matchVoiceInput('Guten morg', 'Guten Morgen');
		// 'guten' === 'guten' ✓, 'morg' ≉ 'morgen' ✗
		expect(result.matchedWords).toBe(1);
	});

	it('returns correct word arrays (lowercased, stripped)', () => {
		const result = matchVoiceInput('ich bin', 'Ich bin');
		expect(result.userWords).toEqual(['ich', 'bin']);
		expect(result.targetWords).toEqual(['ich', 'bin']);
	});

	it('handles empty user input — nothing matches', () => {
		// levenshteinSimilarity('', word) is 0, so an empty transcript matches
		// no target words (a silent/failed mic read must never score correct).
		const result = matchVoiceInput('', 'Guten Morgen');
		expect(result.userWords).toEqual(['']); // split artifact
		expect(result.matchedWords).toBe(0);
		expect(result.isMatch).toBe(false);
	});

	it('handles empty target — nothing to match against', () => {
		// ''.split(/\s+/) yields [''], a single empty-string "word" that no
		// real user word can be similar to. Real lesson targets are never empty.
		const result = matchVoiceInput('anything', '');
		expect(result.totalWords).toBe(1); // [''] — split artifact
		expect(result.matchedWords).toBe(0);
		expect(result.isMatch).toBe(false);
	});

	it('matches a single word exactly', () => {
		const result = matchVoiceInput('Hallo', 'Hallo');
		expect(result.isMatch).toBe(true);
		expect(result.matchedWords).toBe(1);
	});

	// ── German-aware normalization ──

	it('treats ß and ss as equal (Straße = Strasse)', () => {
		const result = matchVoiceInput('Die Strasse ist lang', 'Die Straße ist lang');
		expect(result.isMatch).toBe(true);
		expect(result.matchedWords).toBe(4);
	});

	it('treats umlauts and transliterations as equal (für = fuer)', () => {
		const result = matchVoiceInput('fuer', 'für');
		expect(result.isMatch).toBe(true);
	});

	it('matches digits against spoken German numbers (500 = fünfhundert)', () => {
		const result = matchVoiceInput(
			'Ich bezahle 500 Euro pro Monat',
			'Ich bezahle fünfhundert Euro pro Monat'
		);
		expect(result.isMatch).toBe(true);
		expect(result.matchedWords).toBe(6);
	});

	it('matches small digits too (5 = fünf, 21 = einundzwanzig)', () => {
		expect(matchVoiceInput('5', 'fünf').isMatch).toBe(true);
		expect(matchVoiceInput('21', 'einundzwanzig').isMatch).toBe(true);
	});

	it('strips German quotation marks and dashes', () => {
		const result = matchVoiceInput('Guten Morgen', '„Guten Morgen“ –');
		expect(result.isMatch).toBe(true);
	});

	it('returns isMatch=true when match is exactly at threshold (4/5 = 0.8)', () => {
		// 4 out of 5 target words match
		const result = matchVoiceInput('Ich hätte gerne einen Kaffee', 'Ich hätte gerne einen Tee', 0.8);
		expect(result.matchPercentage).toBeCloseTo(0.8);
		expect(result.isMatch).toBe(true);
	});

	it('counts each target word only once even if repeated in user input', () => {
		const result = matchVoiceInput('Hallo Hallo Hallo', 'Hallo Morgen');
		// 'hallo' matches, 'morgen' does not
		expect(result.matchedWords).toBe(1);
		expect(result.matchPercentage).toBeCloseTo(0.5);
	});

	it('reports total words based on target, not user input', () => {
		const result = matchVoiceInput('Ich bin Student und lerne Deutsch', 'Hallo');
		expect(result.totalWords).toBe(1);
	});
});

describe('getWordMatchStatus', () => {
	it('marks all words as matched for a perfect input', () => {
		const status = getWordMatchStatus('Guten Morgen', ['Guten', 'Morgen']);
		expect(status.get('Guten')).toBe(true);
		expect(status.get('Morgen')).toBe(true);
	});

	it('marks unmatched words as false', () => {
		const status = getWordMatchStatus('Guten Tag', ['Guten', 'Morgen']);
		expect(status.get('Guten')).toBe(true);
		expect(status.get('Morgen')).toBe(false);
	});

	it('is case-insensitive', () => {
		const status = getWordMatchStatus('guten morgen', ['Guten', 'Morgen']);
		expect(status.get('Guten')).toBe(true);
		expect(status.get('Morgen')).toBe(true);
	});

	it('strips punctuation from word keys', () => {
		const status = getWordMatchStatus('Guten Morgen', ['Guten', 'Morgen.']);
		expect(status.get('Morgen.')).toBe(true);
	});

	it('strips punctuation from user input', () => {
		const status = getWordMatchStatus('Guten Morgen!', ['Guten', 'Morgen']);
		expect(status.get('Morgen')).toBe(true);
	});

	it('returns false for all words when user input is empty', () => {
		const status = getWordMatchStatus('', ['Guten', 'Morgen']);
		expect(status.get('Guten')).toBe(false);
		expect(status.get('Morgen')).toBe(false);
	});

	it('returns a Map with the original word strings as keys', () => {
		const words = ['Ich', 'bin', 'hier'];
		const status = getWordMatchStatus('Ich bin', words);
		expect(status.size).toBe(3);
		expect(status.has('Ich')).toBe(true);
		expect(status.has('bin')).toBe(true);
		expect(status.has('hier')).toBe(true);
	});

	it('uses substring matching — partial word in user input matches full target word', () => {
		// 'guten morgen'.includes('morgen') === true
		const status = getWordMatchStatus('gut morgen', ['morgen']);
		expect(status.get('morgen')).toBe(true);
	});

	it('handles an empty words array', () => {
		const status = getWordMatchStatus('Guten Morgen', []);
		expect(status.size).toBe(0);
	});
});

// ── bestVoiceMatch ────────────────────────────────────────────────────────────

describe('bestVoiceMatch', () => {
	it('picks the alternative that best matches the target', () => {
		const { transcript, result } = bestVoiceMatch(
			['gut und morgen', 'Guten Morgen', 'guten margen'],
			'Guten Morgen'
		);
		expect(transcript).toBe('Guten Morgen');
		expect(result.isMatch).toBe(true);
	});

	it('falls back to the primary transcript when nothing matches', () => {
		const { result } = bestVoiceMatch(['völlig falsch'], 'Guten Morgen');
		expect(result.isMatch).toBe(false);
	});

	it('handles an empty candidate list safely', () => {
		const { transcript, result } = bestVoiceMatch([], 'Guten Morgen');
		expect(transcript).toBe('');
		expect(result.isMatch).toBe(false);
	});

	it('dedupes and ignores blank candidates', () => {
		const { result } = bestVoiceMatch(['', '  ', 'Guten Morgen', 'Guten Morgen'], 'Guten Morgen');
		expect(result.isMatch).toBe(true);
	});
});
