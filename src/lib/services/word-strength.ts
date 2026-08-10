/**
 * Word-level strength.
 *
 * The SR system tracks whole sentences, but a sentence is six words known
 * unevenly — "Ich sehe den Mann" can be solid except for `den`, and a
 * sentence-level card cannot say so. This tracks each word separately, so
 * the mastery meter reflects the weak word rather than the average feeling.
 *
 * Strength is 0–5. Right answers add one, wrong answers take two: forgetting
 * should cost more than remembering earns, or a word coasts to mastered on
 * lucky guesses.
 *
 * Pure functions over a plain record. Persistence goes through data-layer.
 */

export const MAX_STRENGTH = 5;

export type WordStrengths = Record<string, number>;

/** Case- and punctuation-insensitive key. "Mann." and "mann" are one word. */
export function wordKey(word: string): string {
	return word
		.trim()
		.toLowerCase()
		.replace(/[.,;:!?„"»«()]/g, '')
		.trim();
}

/** Words worth tracking: skips punctuation-only tokens. */
export function contentWords(german: string): string[] {
	return german
		.trim()
		.split(/\s+/)
		.map(wordKey)
		.filter(Boolean);
}

/** Apply one attempt. Returns a new record — the caller persists it. */
export function applyAttempt(
	strengths: WordStrengths,
	german: string,
	correct: boolean
): WordStrengths {
	const next = { ...strengths };
	for (const w of contentWords(german)) {
		const cur = next[w] ?? 0;
		next[w] = correct ? Math.min(MAX_STRENGTH, cur + 1) : Math.max(0, cur - 2);
	}
	return next;
}

/**
 * A sentence is only as strong as its weakest word — that is the whole point
 * of tracking words instead of sentences. Averaging would let five solid
 * words hide the one that actually fails in the exam.
 */
export function sentenceMastery(strengths: WordStrengths, german: string): number {
	const words = contentWords(german);
	if (!words.length) return 0;
	return Math.min(...words.map((w) => strengths[w] ?? 0));
}

/** The words dragging a sentence down, weakest first. For a "focus on" hint. */
export function weakestWords(
	strengths: WordStrengths,
	german: string,
	limit = 3
): string[] {
	return contentWords(german)
		.map((w) => ({ w, s: strengths[w] ?? 0 }))
		.filter((x) => x.s < MAX_STRENGTH)
		.sort((a, b) => a.s - b.s)
		.slice(0, limit)
		.map((x) => x.w);
}
