import { describe, it, expect } from 'vitest';
import { stitchAlternatives } from './speech';

/**
 * A sentence spoken with pauses comes back as several final results. These
 * cover the stitching, which is what turns them back into one sentence.
 */
describe('stitchAlternatives', () => {
	it('joins a sentence that arrived in two pieces', () => {
		const out = stitchAlternatives([['Ich möchte'], ['einen Kaffee']]);
		expect(out).toEqual(['Ich möchte einen Kaffee']);
	});

	it('keeps each hypothesis internally coherent', () => {
		// Alternative 2 must be chunk1[1] + chunk2[1], never chunk1[0] with
		// chunk2[1] — mixing ranks invents a sentence nobody said.
		const out = stitchAlternatives([
			['Ich möchte', 'Ich mochte'],
			['einen Kaffee', 'einen Kaffe']
		]);
		expect(out).toEqual(['Ich möchte einen Kaffee', 'Ich mochte einen Kaffe']);
	});

	it('falls back to a chunk’s primary when it has fewer alternatives', () => {
		// Without the fallback, chunk 2 contributes undefined and the second
		// hypothesis loses the end of the sentence entirely.
		const out = stitchAlternatives([['Ich möchte', 'Ich mochte'], ['einen Kaffee']]);
		expect(out).toEqual(['Ich möchte einen Kaffee', 'Ich mochte einen Kaffee']);
	});

	it('passes a single chunk through with its alternatives intact', () => {
		const out = stitchAlternatives([['Guten Morgen', 'Guten Mordend', 'Guten morgen']]);
		expect(out).toEqual(['Guten Morgen', 'Guten Mordend', 'Guten morgen']);
	});

	it('drops duplicates produced by the fallback', () => {
		// Both hypotheses stitch to the same string; offering it twice would
		// make bestVoiceMatch look like it had two opinions.
		const out = stitchAlternatives([['Hallo'], ['Welt', 'Welt']]);
		expect(out).toEqual(['Hallo Welt']);
	});

	it('ignores empty chunks instead of inserting gaps', () => {
		const out = stitchAlternatives([['Ich'], [], ['bin', 'been'], []]);
		expect(out).toEqual(['Ich bin', 'Ich been']);
	});

	it('caps how many hypotheses it returns', () => {
		const many = [['a', 'b', 'c', 'd', 'e', 'f', 'g']];
		expect(stitchAlternatives(many)).toHaveLength(5);
		expect(stitchAlternatives(many, 2)).toEqual(['a', 'b']);
	});

	it('collapses whitespace from chunk boundaries', () => {
		expect(stitchAlternatives([['Ich  '], ['  bin']])).toEqual(['Ich bin']);
	});

	it('returns nothing when there is nothing', () => {
		expect(stitchAlternatives([])).toEqual([]);
		expect(stitchAlternatives([[], []])).toEqual([]);
		expect(stitchAlternatives([['']])).toEqual([]);
	});
});

// ── Endpointing ──────────────────────────────────────────────────────────
//
// The reported bug: "it doesn't wait until I finish speaking the sentence."
// Chrome ends recognition at the first pause it hears, which for a learner
// reading German is somewhere in the middle. These drive a fake recognizer
// through that exact sequence.

import { vi, beforeEach, afterEach } from 'vitest';
import { initSpeechRecognition, setVoiceInputHandler, destroySpeechRecognition } from './speech';

/** Build a final SpeechRecognitionResult the way Chrome shapes it. */
function finalResult(...alternatives: string[]) {
	return Object.assign(
		alternatives.map((transcript) => ({ transcript })),
		{ isFinal: true }
	);
}

function interimResult(transcript: string) {
	return Object.assign([{ transcript }], { isFinal: false });
}

describe('Web Speech endpointing', () => {
	let rec: any;
	let heard: string[];

	beforeEach(() => {
		vi.useFakeTimers();
		heard = [];
		(globalThis as any).SpeechRecognition.mockClear();
		initSpeechRecognition();
		rec = (globalThis as any).SpeechRecognition.mock.instances[0];
		rec.stop = vi.fn();
		setVoiceInputHandler((t) => heard.push(t));
		rec.onstart();
	});

	afterEach(() => {
		destroySpeechRecognition();
		vi.useRealTimers();
	});

	it('keeps the stream open instead of letting the browser end it', () => {
		// continuous=false is what caused the cut-off; the browser stops at
		// its own first end-of-speech and we never get the rest.
		expect(rec.continuous).toBe(true);
		expect(rec.interimResults).toBe(true);
	});

	it('does NOT end on a 1.5s pause in the middle of a sentence', () => {
		rec.onresult({ resultIndex: 0, results: [finalResult('Ich möchte')] });
		vi.advanceTimersByTime(1500);

		// THE regression assertion. The old onresult called the handler
		// synchronously with whatever the browser had, so at this point
		// "Ich möchte" had already been submitted, scored, and marked wrong
		// — while the learner was still saying the rest of the sentence.
		expect(heard).toEqual([]);
		expect(rec.stop).not.toHaveBeenCalled();

		// They carry on, and the rest still lands in the same utterance.
		rec.onresult({ resultIndex: 1, results: [finalResult('Ich möchte'), finalResult('einen Kaffee')] });
		vi.advanceTimersByTime(1500);
		expect(rec.stop).not.toHaveBeenCalled();

		vi.advanceTimersByTime(600);
		expect(rec.stop).toHaveBeenCalled();

		rec.onend();
		expect(heard).toEqual(['Ich möchte einen Kaffee']);
	});

	it('ends after a real 2s pause once they have finished', () => {
		rec.onresult({ resultIndex: 0, results: [finalResult('Guten Morgen')] });
		vi.advanceTimersByTime(1999);
		expect(rec.stop).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2);
		expect(rec.stop).toHaveBeenCalled();
	});

	it('treats interim results as "still talking"', () => {
		// Chrome emits interims continuously while speech is in progress. A
		// long word with no final result yet must not look like silence.
		for (let i = 0; i < 5; i++) {
			rec.onresult({ resultIndex: 0, results: [interimResult('Entschuldig')] });
			vi.advanceTimersByTime(1500);
		}
		expect(rec.stop).not.toHaveBeenCalled();
	});

	it('waits much longer before they start than between their words', () => {
		// Reading the prompt and working out how to say it takes longer than
		// a mid-sentence breath, so the lead-in gets its own budget.
		vi.advanceTimersByTime(2500);
		expect(rec.stop).not.toHaveBeenCalled();
		vi.advanceTimersByTime(4600);
		expect(rec.stop).toHaveBeenCalled();
	});

	it('emits nothing when the learner said nothing', () => {
		vi.advanceTimersByTime(7100);
		rec.onend();
		expect(heard).toEqual([]);
	});

	it('emits once, not once per chunk', () => {
		rec.onresult({ resultIndex: 0, results: [finalResult('Hallo')] });
		vi.advanceTimersByTime(2100);
		rec.onend();
		rec.onend();
		expect(heard).toEqual(['Hallo']);
	});

	it('stops at the hard cap even if speech never pauses', () => {
		for (let t = 0; t < 25000; t += 1000) {
			rec.onresult({ resultIndex: 0, results: [interimResult('lang')] });
			vi.advanceTimersByTime(1000);
		}
		expect(rec.stop).toHaveBeenCalled();
	});

	it('does not raise an error state when the mic heard no speech', () => {
		// 'no-speech' is someone tapping the mic and changing their mind. It
		// used to play the error tone and flash a red state at them.
		const states: string[] = [];
		destroySpeechRecognition();
		(globalThis as any).SpeechRecognition.mockClear();
		initSpeechRecognition();
		const r2 = (globalThis as any).SpeechRecognition.mock.instances[0];
		r2.stop = vi.fn();
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return import('./speech').then(({ setMicStateChangeHandler }) => {
			setMicStateChangeHandler((s) => states.push(s));
			r2.onerror({ error: 'no-speech' });
			expect(states).not.toContain('error');
		});
	});
});
