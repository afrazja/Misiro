/**
 * Micro-checks for a Basics topic.
 *
 * A rule you only read is a rule you forget. After stepping through a
 * topic the learner answers a handful of quick retrieval questions — the
 * read → do loop that turns the reference pages into practice.
 *
 * The questions are DERIVED from the content already in the database
 * rather than authored per topic, so all 18 categories get them for free
 * and new categories are covered the moment their words exist.
 *
 * Pure functions on plain data: no Supabase, no DOM. That is deliberate —
 * it is the part worth unit-testing.
 */

import type { Language } from '$stores/preferences';
import { tokenizeForBuild, shuffleTiles } from '$services/sentence-build';

export interface BasicsWordLike {
	german: string;
	en?: string;
	fa?: string;
	example?: string;
}

export type CheckKind = 'article' | 'meaning' | 'order';

export interface BasicsCheck {
	kind: CheckKind;
	/** Prompt shown above the options. */
	prompt: string;
	/** The thing being asked about (German word, or a meaning). */
	subject: string;
	options: string[];
	correctIndex: number;
	/** Marks the subject as German so screen readers pronounce it properly. */
	subjectLang: 'de' | 'ui';
	/** Word-order checks only: scrambled tiles and the sentence they rebuild. */
	tiles?: string[];
	solution?: string[];
}

const ARTICLES = ['der', 'die', 'das'];

/** Deterministic shuffle when a rand is supplied; Math.random by default. */
function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function meaningOf(w: BasicsWordLike, lang: Language): string {
	const v = lang === 'fa' ? w.fa : w.en;
	return (v || w.en || w.fa || '').trim();
}

/** "der Tisch" → { article: 'der', noun: 'Tisch' }; null when not a noun entry. */
export function splitArticle(german: string): { article: string; noun: string } | null {
	const m = german.trim().match(/^(der|die|das)\s+(.+)$/i);
	if (!m) return null;
	const noun = m[2].trim();
	// Grammar topics keep worked examples in the same field vocabulary topics
	// use for single words, so "Das Kind, dem ich helfe, ist sechs." would
	// otherwise be read as the article of a noun called "Kind, dem ich…".
	// A real noun entry is one capitalised word.
	if (!/^\p{Lu}[\p{L}\p{M}-]*$/u.test(noun)) return null;
	return { article: m[1].toLowerCase(), noun };
}

/**
 * Is this entry a word/short phrase rather than a full example sentence?
 * Sentences make nonsense vocabulary questions but good word-order ones.
 */
export function isWordEntry(german: string): boolean {
	const t = german.trim();
	if (!t || /[.,;:!?]/.test(t)) return false;
	return t.split(/\s+/).length <= WORD_MAX_TOKENS;
}

/** Up to this many tokens is a word or short phrase ("es gibt"), not a sentence. */
const WORD_MAX_TOKENS = 3;
/** Below this, scrambling is trivial; above it, the tray is a wall of tiles. */
const ORDER_MAX_TOKENS = 9;

/**
 * Build up to `limit` checks for a topic.
 *
 * Article questions are only generated where the data actually carries an
 * article, and meaning questions only where at least three distinct
 * meanings exist to build options from — a two-option "quiz" is a coin
 * flip, not retrieval. If neither is possible the topic simply gets no
 * checks rather than filler.
 */
export function buildChecks(
	words: BasicsWordLike[],
	lang: Language,
	limit = 5,
	rand: () => number = Math.random
): BasicsCheck[] {
	const isFa = lang === 'fa';
	const present = words.filter((w) => w?.german?.trim());
	const usable = present.filter((w) => isWordEntry(w.german));
	const checks: BasicsCheck[] = [];

	// ── Article questions ────────────────────────────────────────────────
	const nouns = usable
		.map((w) => ({ w, parts: splitArticle(w.german) }))
		.filter((x): x is { w: BasicsWordLike; parts: { article: string; noun: string } } => !!x.parts);

	for (const { parts } of shuffle(nouns, rand)) {
		checks.push({
			kind: 'article',
			prompt: isFa ? 'کدام حرف تعریف درست است؟' : 'Which article is correct?',
			subject: parts.noun,
			subjectLang: 'de',
			options: [...ARTICLES],
			correctIndex: ARTICLES.indexOf(parts.article)
		});
	}

	// ── Meaning questions (German → meaning) ─────────────────────────────
	const withMeaning = usable.filter((w) => meaningOf(w, lang));
	const distinctMeanings = [...new Set(withMeaning.map((w) => meaningOf(w, lang)))];

	if (distinctMeanings.length >= 3) {
		for (const w of shuffle(withMeaning, rand)) {
			const answer = meaningOf(w, lang);
			const distractors = shuffle(
				distinctMeanings.filter((m) => m !== answer),
				rand
			).slice(0, 2);
			if (distractors.length < 2) continue;
			const options = shuffle([answer, ...distractors], rand);
			checks.push({
				kind: 'meaning',
				prompt: isFa ? 'معنی این کلمه چیست؟' : 'What does this mean?',
				subject: w.german,
				subjectLang: 'de',
				options,
				correctIndex: options.indexOf(answer)
			});
		}
	}

	// ── Word-order questions ─────────────────────────────────────────────
	// The grammar topics are built out of worked example SENTENCES, so they
	// have no vocabulary to quiz — but rebuilding the sentence from scrambled
	// tiles is the check those topics actually want. German word order is the
	// commonest A1/A2 error for Persian speakers, whose L1 puts the verb last.
	for (const w of shuffle(
		present.filter((x) => !isWordEntry(x.german)),
		rand
	)) {
		const solution = tokenizeForBuild(w.german);
		if (solution.length <= WORD_MAX_TOKENS || solution.length > ORDER_MAX_TOKENS) continue;
		// The prompt is the translation. Without one the only thing left to
		// show is the German itself, which is the answer.
		const meaning = meaningOf(w, lang);
		if (!meaning) continue;
		checks.push({
			kind: 'order',
			prompt: isFa ? 'جمله را بچینید' : 'Put the sentence in order',
			subject: meaning,
			subjectLang: 'ui',
			options: [],
			correctIndex: -1,
			tiles: shuffleTiles(solution, rand),
			solution
		});
	}

	// Interleave the kinds so the learner cannot settle into one pattern, then
	// trim. Whichever kinds a topic produced take turns; a topic that yields
	// only one kind simply gets that one.
	const queues = [
		checks.filter((c) => c.kind === 'article'),
		checks.filter((c) => c.kind === 'order'),
		checks.filter((c) => c.kind === 'meaning')
	];
	const mixed: BasicsCheck[] = [];
	while (mixed.length < limit && queues.some((q) => q.length)) {
		for (const q of queues) {
			if (mixed.length >= limit) break;
			if (q.length) mixed.push(q.shift()!);
		}
	}
	return mixed;
}

/** Flatten a category's words, whether it is a flat grid or has sections. */
export function collectWords(
	words: BasicsWordLike[] | null | undefined,
	sections: Array<{ words?: BasicsWordLike[] | null }> | null | undefined
): BasicsWordLike[] {
	const out: BasicsWordLike[] = [...(words ?? [])];
	for (const s of sections ?? []) out.push(...(s.words ?? []));
	return out.filter((w) => w?.german?.trim());
}
