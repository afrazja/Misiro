/**
 * The retrieval ladder for a single sentence.
 *
 * The daily lesson shows the German while the learner says it, which is
 * reading aloud, not recall. Practice mode climbs three rungs instead:
 *
 *   build  — assemble it from scrambled tiles      (word order)
 *   gap    — one article or verb removed           (the grammar)
 *   speak  — from the translation only, German hidden  (production)
 *
 * Pure functions on plain data — no DOM, no stores. A sentence that cannot
 * support a rung simply does not get it rather than getting a filler one.
 */

import type { Language } from '$stores/preferences';
import { tokenizeForBuild, shuffleTiles } from '$services/sentence-build';

export type DrillKind = 'build' | 'gap' | 'speak';

export interface Drill {
	kind: DrillKind;
	/** Instruction, in the interface language. */
	prompt: string;
	/** The full German sentence this rung is about. */
	german: string;

	/** build */
	tiles?: string[];
	solution?: string[];

	/** gap — tokens with the blank left as null */
	masked?: (string | null)[];
	options?: string[];
	correctIndex?: number;
	/** What kind of word was removed, for the feedback line. */
	gapOf?: 'article' | 'verb';

	/** speak — the prompt the learner produces German from */
	meaning?: string;
}

/** Every article form an A1 learner meets. Case is the point of the drill. */
const ARTICLES = [
	'der', 'die', 'das', 'den', 'dem', 'des',
	'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
	'kein', 'keine', 'keinen', 'keinem', 'keiner'
];

/** Present-tense personal endings, longest first so -en beats -e. */
const ENDINGS = ['est', 'et', 'en', 'st', 't', 'e'];

/** The two verbs every A1 sentence leans on, which no ending rule describes. */
const IRREGULAR: Record<string, string[]> = {
	bin: ['bin', 'bist', 'ist', 'sind'],
	bist: ['bin', 'bist', 'ist', 'sind'],
	ist: ['bin', 'bist', 'ist', 'sind'],
	sind: ['bin', 'bist', 'ist', 'sind'],
	seid: ['seid', 'sind', 'ist', 'bist'],
	habe: ['habe', 'hast', 'hat', 'haben'],
	hast: ['habe', 'hast', 'hat', 'haben'],
	hat: ['habe', 'hast', 'hat', 'haben'],
	haben: ['habe', 'hast', 'hat', 'haben'],
	habt: ['habt', 'haben', 'hat', 'hast']
};

const strip = (t: string) => t.replace(/[.,;:!?„"»«]/g, '');

function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Plausible alternatives for a conjugated verb: the same stem with the other
 * personal endings. Wrong answers a learner would actually consider — a
 * random other word would make the question free.
 */
export function verbAlternatives(word: string): string[] {
	const w = strip(word).toLowerCase();
	if (IRREGULAR[w]) return IRREGULAR[w];

	for (const end of ENDINGS) {
		if (!w.endsWith(end)) continue;
		const stem = w.slice(0, -end.length);
		if (stem.length < 2) continue;
		const forms = ['e', 'st', 't', 'en'].map((e) => stem + e);
		return [...new Set(forms)];
	}
	return [];
}

/**
 * Pick the word to blank out. Articles first — Persian has no grammatical
 * gender and marks objects with «را» instead of changing the article, so
 * this is the single most common error in the audience's German. Otherwise
 * the finite verb, which in a main clause sits in position 2.
 */
export function chooseGap(
	tokens: string[]
): { index: number; kind: 'article' | 'verb'; options: string[] } | null {
	for (let i = 0; i < tokens.length; i++) {
		const bare = strip(tokens[i]).toLowerCase();
		if (ARTICLES.includes(bare)) {
			// Same-gender-set distractors: the case contrast is the lesson.
			const pool = bare.startsWith('k')
				? ['kein', 'keine', 'keinen', 'keinem']
				: bare.startsWith('e')
					? ['ein', 'eine', 'einen', 'einem']
					: ['der', 'die', 'das', 'den', 'dem'];
			const options = [bare, ...pool.filter((a) => a !== bare)].slice(0, 4);
			if (options.length >= 3) return { index: i, kind: 'article', options };
		}
	}

	if (tokens.length >= 2) {
		const raw = strip(tokens[1]);
		const bare = raw.toLowerCase();
		const alts = verbAlternatives(raw);
		// German capitalises nouns, so a finite verb is lowercase. Without
		// this the ending rule reads "Guten Morgen" as a conjugated Morg-.
		const looksLikeVerb =
			raw === bare && !NOT_VERBS.has(bare) && alts.length >= 3 && alts.includes(bare);
		if (looksLikeVerb) return { index: 1, kind: 'verb', options: alts.slice(0, 4) };
	}
	return null;
}

/** Lowercase words that end like a conjugation but never are one. */
const NOT_VERBS = new Set([
	'nicht', 'seit', 'mit', 'dort', 'jetzt', 'oft', 'gut', 'auch',
	'schon', 'noch', 'sehr', 'heute', 'bitte', 'danke', 'gerne', 'alle', 'viele'
]);

export interface PracticeSentence {
	german: string;
	/** Translation in the learner's interface language. */
	meaning: string;
}

/**
 * Build the ladder for one sentence. Rungs the data cannot support are
 * dropped, so a one-word sentence gets speaking only rather than a
 * "scramble" of a single tile.
 */
export function buildDrills(
	sentence: PracticeSentence,
	lang: Language,
	rand: () => number = Math.random
): Drill[] {
	const isFa = lang === 'fa';
	const german = sentence.german.trim();
	if (!german) return [];
	const tokens = tokenizeForBuild(german);
	const drills: Drill[] = [];

	if (tokens.length >= 2) {
		drills.push({
			kind: 'build',
			prompt: isFa ? 'جمله را بچینید' : 'Put the sentence in order',
			german,
			solution: tokens,
			tiles: shuffleTiles(tokens, rand)
		});
	}

	const gap = chooseGap(tokens);
	if (gap) {
		const answer = strip(tokens[gap.index]).toLowerCase();
		const options = shuffle(gap.options, rand);
		drills.push({
			kind: 'gap',
			prompt:
				gap.kind === 'article'
					? isFa
						? 'کدام حرف تعریف درست است؟'
						: 'Which article is correct?'
					: isFa
						? 'کدام صرف فعل درست است؟'
						: 'Which verb form is correct?',
			german,
			masked: tokens.map((t, i) => (i === gap.index ? null : t)),
			options,
			correctIndex: options.indexOf(answer),
			gapOf: gap.kind
		});
	}

	// The top rung, and the only one that is real production. Needs a
	// translation to aim at — without one the only prompt left is the German
	// itself, which is the answer.
	if (sentence.meaning?.trim()) {
		drills.push({
			kind: 'speak',
			prompt: isFa ? 'این را به آلمانی بگو' : 'Say this in German',
			german,
			meaning: sentence.meaning.trim()
		});
	}

	return drills;
}
