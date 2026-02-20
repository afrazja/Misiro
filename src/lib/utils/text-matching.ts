/**
 * Text Matching — word-based matching for voice recognition evaluation.
 * Extracted from app.js handleVoiceInput() matching logic.
 */

/**
 * Compare user's spoken text against the target German text.
 * Uses word-based matching: checks what percentage of target words
 * appear in the user's input (with fuzzy substring matching).
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

	let matchedWords = 0;
	targetWords.forEach((targetWord) => {
		if (
			userWords.some(
				(userWord) =>
					userWord === targetWord ||
					userWord.includes(targetWord) ||
					targetWord.includes(userWord)
			)
		) {
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
	const result = new Map<string, boolean>();

	words.forEach((word) => {
		const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '').trim();
		result.set(word, cleanUser.includes(cleanWord));
	});

	return result;
}
