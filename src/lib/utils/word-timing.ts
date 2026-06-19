/**
 * Word timing — estimates when each word in a sentence is spoken, so the UI can
 * highlight the current word in sync with TTS audio (karaoke style).
 *
 * We don't have true per-word timestamps from the audio (the German voice may be
 * ElevenLabs or the Google fallback), so we estimate: each word gets a slice of
 * the total duration proportional to its length, with a little extra weight for
 * trailing punctuation (commas/periods introduce natural pauses). On the short
 * sentences used in lessons, played slowly, this tracks the audio closely.
 */

export interface WordSpan {
	/** Fraction of total duration where this word starts (0–1). */
	start: number;
	/** Fraction of total duration where this word ends (0–1). */
	end: number;
}

/**
 * Split `text` on spaces (matching the lesson UI's word rendering) and return a
 * start/end fraction for each word, weighted by length + punctuation pauses.
 */
export function computeWordTimings(text: string): WordSpan[] {
	const words = text.split(' ');
	if (words.length === 0) return [];

	const weights = words.map((w) => {
		const clean = w.replace(/[.,!?;:—–-]/g, '');
		let weight = Math.max(clean.length, 1); // never zero-width
		if (/[.!?]$/.test(w)) weight += 3; // sentence-ending pause
		else if (/[,;:]$/.test(w)) weight += 1.5; // mid-sentence pause
		return weight;
	});

	const total = weights.reduce((a, b) => a + b, 0) || 1;
	const spans: WordSpan[] = [];
	let acc = 0;
	for (const w of weights) {
		const start = acc / total;
		acc += w;
		spans.push({ start, end: acc / total });
	}
	return spans;
}

/**
 * Given precomputed spans and the audio's current/total time, return the index
 * of the word being spoken, or -1 if timing isn't available yet.
 */
export function wordIndexAtTime(spans: WordSpan[], currentTime: number, duration: number): number {
	if (!spans.length || !duration || duration <= 0) return -1;
	const frac = Math.min(Math.max(currentTime / duration, 0), 1);
	for (let i = 0; i < spans.length; i++) {
		if (frac >= spans[i].start && frac < spans[i].end) return i;
	}
	return spans.length - 1; // at/after the end → last word
}

/**
 * Build a playback-progress callback that invokes `onIndex` only when the
 * highlighted word changes. Pass the returned function as `onTime` to
 * playAudioPromise. Call onIndex(-1) yourself when playback stops.
 */
export function makeWordHighlighter(
	text: string,
	onIndex: (index: number) => void
): (currentTime: number, duration: number) => void {
	const spans = computeWordTimings(text);
	let last = -1;
	return (currentTime: number, duration: number) => {
		const i = wordIndexAtTime(spans, currentTime, duration);
		if (i !== last) {
			last = i;
			onIndex(i);
		}
	};
}
