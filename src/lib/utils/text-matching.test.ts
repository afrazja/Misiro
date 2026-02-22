import { describe, it, expect } from 'vitest';
import { matchVoiceInput, getWordMatchStatus } from './text-matching';

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

	it('handles substring matches — target word contains user word', () => {
		// 'morgen'.includes('org') would be true, but user said 'morg' which is a prefix
		const result = matchVoiceInput('Guten morg', 'Guten Morgen');
		// 'guten' === 'guten' ✓, 'morgen'.includes('morg') ✓
		expect(result.matchedWords).toBe(2);
	});

	it('returns correct word arrays (lowercased, stripped)', () => {
		const result = matchVoiceInput('ich bin', 'Ich bin');
		expect(result.userWords).toEqual(['ich', 'bin']);
		expect(result.targetWords).toEqual(['ich', 'bin']);
	});

	it('handles empty user input — empty string is a substring of every word', () => {
		// ''.split(/\s+/) yields [''] not [], so the empty "word" matches every
		// target word via the substring check (every string includes '').
		// Real voice input is never truly empty; this documents the edge-case behaviour.
		const result = matchVoiceInput('', 'Guten Morgen');
		expect(result.userWords).toEqual(['']); // split artifact
		expect(result.matchedWords).toBe(2); // '' is a substring of every target word
	});

	it('handles empty target — splits to a single empty-string word', () => {
		// ''.split(/\s+/) yields [''], not []. The lone empty-string target word
		// is matched by any user word via substring, so totalWords=1, matchedWords=1.
		// Real lesson targets are never empty; this documents the edge-case behaviour.
		const result = matchVoiceInput('anything', '');
		expect(result.totalWords).toBe(1); // [''] — split artifact
		expect(result.matchedWords).toBe(1);
	});

	it('matches a single word exactly', () => {
		const result = matchVoiceInput('Hallo', 'Hallo');
		expect(result.isMatch).toBe(true);
		expect(result.matchedWords).toBe(1);
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
