/**
 * Word-level strength.
 *
 * The SR system tracks whole sentences, but a sentence is six words known
 * unevenly — "Ich sehe den Mann" can be solid except for `den`, and a
 * sentence-level card cannot say so. This tracks each word separately, so
 * the mastery meter reflects the weak word rather than the average feeling.
 *
 * Strength is 0–5, and what a mistake costs depends on how it was made:
 *
 *   correct   +1
 *   wrong     −2 when the learner could have guessed (multiple choice),
 *             −1 when they had to produce it from nothing
 *   revealed   0 — asking for the answer is honest. Charging for it just
 *             teaches people to guess wildly instead of pressing "Show me".
 *
 * The extra penalty exists to stop a word coasting to mastered on lucky
 * guesses, so it only applies where guessing is possible. Without that
 * split, one "Show me" on the speaking rung zeroed every word in a
 * sentence the learner had just built and gapped correctly.
 *
 * Pure functions over a plain record. Persistence goes through data-layer.
 */

export const MAX_STRENGTH = 5;

export type WordStrengths = Record<string, number>;

export type Outcome = 'correct' | 'wrong' | 'revealed';

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

/**
 * Apply one attempt. Returns a new record — the caller persists it.
 *
 * `guessable` marks a rung where the answer was one of a handful of options,
 * so a wrong pick may have been a coin flip and costs more.
 */
export function applyAttempt(
	strengths: WordStrengths,
	german: string,
	outcome: Outcome,
	guessable = false
): WordStrengths {
	if (outcome === 'revealed') return { ...strengths };

	const delta = outcome === 'correct' ? 1 : guessable ? -2 : -1;
	const next = { ...strengths };
	for (const w of contentWords(german)) {
		const cur = next[w] ?? 0;
		next[w] = Math.max(0, Math.min(MAX_STRENGTH, cur + delta));
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
