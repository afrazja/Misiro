/**
 * Assembling a sentence from scrambled tiles.
 *
 * Pure, dependency-free, and shared: the daily lesson uses it for the
 * build step, Basics uses it for word-order checks. Kept out of
 * lesson-controller so importing it does not drag TTS, speech and the
 * SR system along with it.
 */

/** Split on whitespace; punctuation stays attached to its word. */
export function tokenizeForBuild(sentence: string): string[] {
	return sentence.trim().split(/\s+/).filter(Boolean);
}

/**
 * Shuffle tiles so the learner cannot just read them left to right.
 *
 * Two guarantees, both of which matter for the exercise to be worth doing:
 *  - the result is never the solution order (unless the sentence is so short
 *    that no other arrangement exists)
 *  - identical words are allowed to collide; comparison is by value, so a
 *    duplicate in the "wrong" slot still grades correct
 */
export function shuffleTiles(solution: string[], rand: () => number = Math.random): string[] {
	if (solution.length < 2) return [...solution];
	const distinct = new Set(solution).size;

	for (let attempt = 0; attempt < 12; attempt++) {
		const t = [...solution];
		for (let i = t.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[t[i], t[j]] = [t[j], t[i]];
		}
		// Every arrangement of a single repeated word equals the solution, so
		// only insist on a difference when one is actually reachable.
		if (distinct < 2 || t.some((w, i) => w !== solution[i])) return t;
	}
	// Fell through (astronomically unlikely): rotate by one so it is not the
	// answer sitting in order.
	return [...solution.slice(1), solution[0]];
}

/** Grade an assembled attempt. Compares by value, so duplicates are fine. */
export function isBuildCorrect(attempt: string[], solution: string[]): boolean {
	return attempt.length === solution.length && attempt.every((w, i) => w === solution[i]);
}
