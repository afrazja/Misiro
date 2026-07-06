/**
 * Text Matching — word-based matching for voice recognition evaluation.
 * Uses Levenshtein distance for accurate character-level comparison.
 *
 * Both sides are normalized German-aware before comparison so that
 * recognizer quirks don't mark a correct answer wrong:
 *  - umlauts/ß fold to their transliterations (ä→ae, ß→ss, …)
 *  - digit tokens become German number words ("500" → "fünfhundert")
 *  - punctuation (incl. „“ ‚' quotes and dashes) is stripped
 */

/** Minimum similarity (0–1) for two words to be considered a match. */
const WORD_SIMILARITY_THRESHOLD = 0.8;

const PUNCT_RE = /[.,!?;:„“”"'’‚«»()\-–—]/g;

// Number words in already-transliterated form (matching happens post-fold).
const UNITS = [
	'null', 'ein', 'zwei', 'drei', 'vier', 'fuenf', 'sechs', 'sieben', 'acht', 'neun',
	'zehn', 'elf', 'zwoelf', 'dreizehn', 'vierzehn', 'fuenfzehn', 'sechzehn',
	'siebzehn', 'achtzehn', 'neunzehn'
];
const TENS = ['', '', 'zwanzig', 'dreissig', 'vierzig', 'fuenfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** Spell a number the way it's spoken in German (transliterated). */
function germanNumberWord(n: number): string {
	if (n === 0) return 'null';
	if (n === 1) return 'eins';
	if (n < 20) return UNITS[n];
	if (n < 100) {
		const u = n % 10;
		return (u ? (u === 1 ? 'ein' : UNITS[u]) + 'und' : '') + TENS[Math.floor(n / 10)];
	}
	if (n < 1000) {
		const rest = n % 100;
		return UNITS[Math.floor(n / 100)] + 'hundert' + (rest ? germanNumberWord(rest) : '');
	}
	if (n < 10000) {
		const rest = n % 1000;
		return UNITS[Math.floor(n / 1000)] + 'tausend' + (rest ? germanNumberWord(rest) : '');
	}
	return String(n);
}

/** Normalize a single word for comparison (lowercase, punctuation-free,
 *  umlauts folded, digits spelled out). */
function normalizeWord(word: string): string {
	let s = word.toLowerCase().replace(PUNCT_RE, '');
	if (/^\d+$/.test(s)) {
		const n = parseInt(s, 10);
		if (n <= 9999) s = germanNumberWord(n);
	}
	return s
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss');
}

/** Split text into normalized words (empty tokens removed). */
function normalizeWords(text: string): string[] {
	const words = text.split(/\s+/).map(normalizeWord).filter((w) => w.length > 0);
	return words.length > 0 ? words : [''];
}

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
	const targetWords = normalizeWords(targetText);
	const userWords = normalizeWords(userText);
	const cleanUser = userWords.join(' ');
	const cleanTarget = targetWords.join(' ');

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
	const userWords = normalizeWords(userText);
	const result = new Map<string, boolean>();

	words.forEach((word) => {
		const cleanWord = normalizeWord(word);
		result.set(word, userWords.some((uw) => isWordMatch(uw, cleanWord)));
	});

	return result;
}

/**
 * Evaluate several candidate transcripts (e.g. recognition alternatives)
 * against a target and return the best result. Reduces false negatives:
 * the recognizer's 2nd or 3rd guess is often the one the learner said.
 */
export function bestVoiceMatch(
	transcripts: string[],
	targetText: string,
	threshold: number = 0.8
): { transcript: string; result: ReturnType<typeof matchVoiceInput> } {
	const unique = [...new Set(transcripts.filter((t) => t && t.trim().length > 0))];
	if (unique.length === 0) {
		return { transcript: '', result: matchVoiceInput('', targetText, threshold) };
	}
	let best = { transcript: unique[0], result: matchVoiceInput(unique[0], targetText, threshold) };
	for (const t of unique.slice(1)) {
		const r = matchVoiceInput(t, targetText, threshold);
		if (r.matchPercentage > best.result.matchPercentage) {
			best = { transcript: t, result: r };
		}
	}
	return best;
}
