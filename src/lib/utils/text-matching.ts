/**
 * Text Matching — word-based matching for voice recognition evaluation.
 * Uses Levenshtein distance for accurate character-level comparison.
 */

/** Minimum similarity (0–1) for two words to be considered a match. */
const WORD_SIMILARITY_THRESHOLD = 0.8;

/**
 * Compute Levenshtein-based similarity between two strings.
 * @returns 0.0 (completely different) to 1.0 (identical)
 */
function levenshteinSimilarity(a: string, b: string): number {
	if (a === b) return 1;
	if (!a.length || !b.length) return 0;

	const matrix: number[][] = [];
	for (let i = 0; i <= a.length; i++) matrix[i] = [i];
	for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1,
				matrix[i][j - 1] + 1,
				matrix[i - 1][j - 1] + cost
			);
		}
	}

	return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
}

/**
 * Check if a user word is similar enough to a target word.
 */
function isWordMatch(userWord: string, targetWord: string): boolean {
	return levenshteinSimilarity(userWord, targetWord) >= WORD_SIMILARITY_THRESHOLD;
}

/**
 * Compare user's spoken text against the target German text.
 * Uses word-based matching with Levenshtein distance: checks what
 * percentage of target words appear in the user's input.
 *
 * @param userText - What the user said (from speech recognition)
 * @param targetText - The expected German text
 * @param threshold - Minimum match percentage (default 0.8 = 80%)
 * @returns Object with match result and details
 */
export function matchVoiceInput(
	userText: string,
	targetText: string,
	threshold: number = 0.8
): {
	isMatch: boolean;
	matchPercentage: number;
	matchedWords: number;
	totalWords: number;
	userWords: string[];
	targetWords: string[];
} {
	const cleanUser = userText.toLowerCase().replace(/[.,!?]/g, '').trim();
	const cleanTarget = targetText.toLowerCase().replace(/[.,!?]/g, '').trim();

	const targetWords = cleanTarget.split(/\s+/);
	const userWords = cleanUser.split(/\s+/);

	// ── Single-word targets (flashcards): stricter full-string comparison ──
	if (targetWords.length === 1) {
		const fullSimilarity = levenshteinSimilarity(cleanUser, cleanTarget);
		const bestWordSimilarity = Math.max(
			...userWords.map((uw) => levenshteinSimilarity(uw, targetWords[0]))
		);
		const bestScore = Math.max(fullSimilarity, bestWordSimilarity);

		return {
			isMatch: bestScore >= threshold,
			matchPercentage: bestScore,
			matchedWords: bestScore >= WORD_SIMILARITY_THRESHOLD ? 1 : 0,
			totalWords: 1,
			userWords,
			targetWords
		};
	}

	// ── Multi-word targets (sentences): word-by-word matching ──
	let matchedWords = 0;
	targetWords.forEach((targetWord) => {
		if (userWords.some((userWord) => isWordMatch(userWord, targetWord))) {
			matchedWords++;
		}
	});

	const matchPercentage = targetWords.length > 0 ? matchedWords / targetWords.length : 0;

	return {
		isMatch: matchPercentage >= threshold,
		matchPercentage,
		matchedWords,
		totalWords: targetWords.length,
		userWords,
		targetWords
	};
}

/**
 * Check which individual words in the target were matched by the user.
 * Used for visual feedback (green = matched, red = missed).
 *
 * @param userText - What the user said
 * @param words - Array of individual target words to check
 * @returns Map of word → matched status
 */
export function getWordMatchStatus(
	userText: string,
	words: string[]
): Map<string, boolean> {
	const cleanUser = userText.toLowerCase().replace(/[.,!?]/g, '').trim();
	const userWords = cleanUser.split(/\s+/);
	const result = new Map<string, boolean>();

	words.forEach((word) => {
		const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '').trim();
		result.set(word, userWords.some((uw) => isWordMatch(uw, cleanWord)));
	});

	return result;
}
