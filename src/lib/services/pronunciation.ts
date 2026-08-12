/**
 * Pronunciation diagnosis — naming the sound a learner got wrong.
 *
 * The premise, which is easy to miss: a recognizer's language model REPAIRS
 * accent. Say "Ish hi-se Afraz" and the decoder searches for the most
 * probable German sentence and hands back "Ich heiße Afraz", accent already
 * gone. Nothing downstream can recover what the decoder discarded, which is
 * why a transcript matcher can never be a pronunciation checker.
 *
 * But there is one class it CANNOT swallow. The LM snaps to the nearest
 * VALID WORD, and for a minimal pair the wrong one is also a valid word —
 * "mochte" is real German, so that is what comes back. The error survives
 * into the transcript intact. text-matching.ts was then folding it away
 * (ö→oe, then Levenshtein at 0.8) and calling it correct.
 *
 * So this module handles exactly the contrasts that reach us as real word
 * substitutions, and stays silent otherwise. A wrong diagnosis is worse than
 * none: a learner told to fix their "ö" when the ö was fine will chase a
 * sound that was never the problem.
 *
 * Everything here is chosen for PERSIAN first speakers, which is the whole
 * point — the interference set is small, specific and teachable, and a
 * generic tool will never mention any of it.
 */

import type { Language } from '$stores/preferences';

/** A sound contrast Persian speakers reliably struggle with in German. */
export type ContrastId =
	| 'ue'
	| 'oe'
	| 'ae'
	| 'ich-laut'
	| 'vowel-length'
	| 'initial-cluster';

export interface Contrast {
	id: ContrastId;
	/** Shown as the headline, e.g. "ü". */
	label: string;
	/** How to make the sound. Kept to one actionable instruction. */
	tip: string;
	tipFa: string;
	/** Two real German words separated only by this contrast. */
	pair: { wrong: string; right: string; gloss: string; glossFa: string };
}

/**
 * Why these six and not more: each one is (a) absent from Persian, (b)
 * phonemic in German — it changes which word you said, not just your accent
 * — and (c) detectable from a transcript. Dropped from the list: final
 * devoicing and word stress, both real Persian-interference problems and
 * both invisible to a transcript, so they belong to the Azure path.
 *
 * Worth telling learners explicitly: the ach-Laut in "Bach" is NOT here,
 * because Persian already has it (خ). Persian speakers arrive with that one
 * for free and are often surprised to hear it.
 */
export const CONTRASTS: Record<ContrastId, Contrast> = {
	ue: {
		id: 'ue',
		label: 'ü',
		tip: 'Say "ee" — then, holding your tongue exactly there, round your lips as if for "oo".',
		tipFa: 'اول «ای» بگو، بعد بدون اینکه زبانت تکان بخورد، لب‌هایت را مثل «او» گرد کن.',
		pair: { wrong: 'Mutter', right: 'Mütter', gloss: 'mother / mothers', glossFa: 'مادر / مادرها' }
	},
	oe: {
		id: 'oe',
		label: 'ö',
		tip: 'Say "eh" — then, holding your tongue exactly there, round your lips as if for "oh".',
		tipFa: 'اول «اِ» بگو، بعد بدون اینکه زبانت تکان بخورد، لب‌هایت را مثل «اُ» گرد کن.',
		pair: {
			wrong: 'schon',
			right: 'schön',
			gloss: 'already / beautiful',
			glossFa: 'قبلاً / زیبا'
		}
	},
	ae: {
		id: 'ae',
		label: 'ä',
		tip: 'More open than German "e" — closer to the "a" in the English "cat".',
		tipFa: 'بازتر از «e» آلمانی — نزدیک به «اَ» فارسی.',
		pair: { wrong: 'Beeren', right: 'Bären', gloss: 'berries / bears', glossFa: 'توت‌ها / خرس‌ها' }
	},
	'ich-laut': {
		id: 'ich-laut',
		label: 'ch (ich-Laut)',
		tip: 'Not "sch". Put your tongue where it goes for "y" in "yes", then breathe out without voice.',
		tipFa: 'مثل «ش» نیست. زبانت را در جای «ی» بگذار و بدون صدا هوا را بیرون بده.',
		pair: { wrong: 'mischt', right: 'micht', gloss: 'mixes / (ich-Laut)', glossFa: 'مخلوط می‌کند' }
	},
	'vowel-length': {
		id: 'vowel-length',
		label: 'long vs short vowel',
		tip: 'German vowel length changes the word. Hold the long one about twice as long.',
		tipFa: 'کشش مصوت در آلمانی معنی کلمه را عوض می‌کند. مصوت بلند را حدود دو برابر نگه دار.',
		pair: { wrong: 'Stadt', right: 'Staat', gloss: 'city / state', glossFa: 'شهر / دولت' }
	},
	'initial-cluster': {
		id: 'initial-cluster',
		label: 'consonant cluster',
		tip: 'No vowel before or inside the cluster — "shpr", not "sheper". Start the word on the consonant.',
		tipFa: 'قبل یا وسط خوشهٔ همخوانی مصوت نگذار — «شپر» نه «شِپِر». کلمه را از همان همخوان شروع کن.',
		pair: {
			wrong: 'esprechen',
			right: 'sprechen',
			gloss: 'to speak',
			glossFa: 'صحبت کردن'
		}
	}
};

/** One diagnosed sound error on one word. */
export interface SoundNote {
	contrast: Contrast;
	/** The word as it should have been said. */
	target: string;
	/** The word the recognizer actually heard. */
	heard: string;
}

const UMLAUTS: Array<{ accented: string; plain: string; id: ContrastId }> = [
	{ accented: 'ü', plain: 'u', id: 'ue' },
	{ accented: 'ö', plain: 'o', id: 'oe' },
	{ accented: 'ä', plain: 'a', id: 'ae' }
];

const PUNCT_RE = /[.,!?;:„“”"'’‚«»()\-–—]/g;

function clean(word: string): string {
	// Soft hyphens and zero-width characters are invisible in an editor and
	// break every comparison below. Authored lesson content is hand-typed, so
	// assume they are in there somewhere.
	return word
		.toLowerCase()
		.replace(/[­​-‍﻿]/g, '')
		.replace(PUNCT_RE, '');
}

/**
 * Strip the umlaut DOTS, keeping the base letter: ö→o, not ö→oe.
 *
 * This is the distinction that makes detection work at all. Transliterating
 * (the ö→oe that text-matching does) changes the letter count, so "möchte"
 * becomes "moechte" and no longer lines up with the heard "mochte". Stripping
 * the dots leaves both as "mochte" — equal skeletons, different originals,
 * which is precisely the signature of an umlaut error.
 */
function deaccent(word: string): string {
	let s = word;
	for (const u of UMLAUTS) s = s.split(u.accented).join(u.plain);
	return s.replace(/ß/g, 'ss');
}

/** Also accept the "ue"/"oe"/"ae" spellings some recognizers emit. */
function detransliterate(word: string): string {
	return word.replace(/ue/g, 'u').replace(/oe/g, 'o').replace(/ae/g, 'a').replace(/ß/g, 'ss');
}

/**
 * "über" → "ueber": the digraph spelling of the SAME word.
 *
 * Needed to tell a spelling variant apart from a real error. A recognizer
 * that writes "ueber" heard a correct ü; one that writes "uber" heard a
 * flattened one. Deaccenting alone collapses both to "uber" and would fail
 * the learner for the recognizer's choice of orthography.
 */
function expandUmlauts(word: string): string {
	let s = word;
	for (const u of UMLAUTS) s = s.split(u.accented).join(u.plain + 'e');
	return s.replace(/ß/g, 'ss');
}

/**
 * Collapse the three things German uses to mark a long vowel — doubling,
 * a silent lengthening-h, and the "dt" that marks the short one in Stadt —
 * so that Staat and Stadt reduce to the same skeleton and the only
 * difference left is length.
 *
 * "dt" is a one-off rather than a rule, carried because Stadt is A1
 * vocabulary and Stadt/Staat is the canonical pair every textbook uses.
 */
function lengthSkeleton(word: string): string {
	return deaccent(word)
		.replace(/([aeiou])h/g, '$1')
		.replace(/dt/g, 't')
		.replace(/(.)\1+/g, '$1');
}

function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const curr = [i];
		for (let j = 1; j <= b.length; j++) {
			curr[j] = Math.min(
				prev[j] + 1,
				curr[j - 1] + 1,
				prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
		}
		prev = curr;
	}
	return prev[b.length];
}

function similarity(a: string, b: string): number {
	if (a === b) return 1;
	if (!a.length || !b.length) return 0;
	return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/**
 * Classify a single target/heard word pair, or return null.
 *
 * Null is the common and correct answer. Only substitutions with an
 * unambiguous signature are named; anything else is just "not quite", which
 * is honest.
 */
export function classify(targetWord: string, heardWord: string): ContrastId | null {
	const t = clean(targetWord);
	const h = clean(heardWord);
	if (!t || !h || t === h) return null;

	// Digraph spelling of the same word — "ueber" for "über". The sound was
	// right; only the transcription differs.
	if (h === expandUmlauts(t) || t === expandUmlauts(h)) return null;

	// ── Umlaut: same skeleton, different diacritics ──
	const tPlain = deaccent(t);
	const hPlain = detransliterate(deaccent(h));
	if (tPlain === hPlain || tPlain === deaccent(h)) {
		// Which one? Report the first umlaut in the target that the learner
		// did not reproduce. Multiple umlauts in one word are rare enough
		// that the first is the one to work on.
		for (let i = 0; i < t.length; i++) {
			const u = UMLAUTS.find((x) => x.accented === t[i]);
			if (u && !h.includes(u.accented)) return u.id;
		}
		// The reverse: an umlaut added where the target had none
		// ("schön" said for "schon"). Same contrast, same drill.
		for (let i = 0; i < h.length; i++) {
			const u = UMLAUTS.find((x) => x.accented === h[i]);
			if (u && !t.includes(u.accented)) return u.id;
		}
		return null;
	}

	// ── ich-Laut: the target's "ch" came back as "sch", or vice versa ──
	if (t.includes('ch') && (h.includes('sch') || t.includes('sch') !== h.includes('sch'))) {
		if (t.replace(/sch/g, 'ch') === h.replace(/sch/g, 'ch')) return 'ich-laut';
	}

	// ── Vowel length: identical once doubling and lengthening-h collapse ──
	if (lengthSkeleton(t) === lengthSkeleton(h)) return 'vowel-length';

	// ── Initial cluster: the heard word has an extra vowel up front or
	//    wedged into the opening cluster ("esprechen", "seprechen"). ──
	if (/^[bcdfghjklmnpqrstvwxyzß]{2}/.test(t) && similarity(t, h) >= 0.7) {
		if (h.replace(/^[aeiou]/, '') === t) return 'initial-cluster';
		const wedged = h.replace(/^([bcdfghjklmnpqrstvwxyz])[aeiou]/, '$1');
		if (wedged === t) return 'initial-cluster';
	}

	return null;
}

/**
 * Align two word sequences and diagnose every substitution.
 *
 * Alignment is a word-level edit distance where substitution costs less when
 * the words are similar, so "möchte"→"mochte" aligns as a substitution
 * rather than a delete-plus-insert. Without that, a single dropped word
 * shifts everything after it and every remaining pair looks wrong.
 */
export function diagnose(targetText: string, heardText: string): SoundNote[] {
	const target = targetText.split(/\s+/).filter(Boolean);
	const heard = heardText.split(/\s+/).filter(Boolean);
	if (!target.length || !heard.length) return [];

	const n = target.length;
	const m = heard.length;

	// cost[i][j] = cheapest alignment of target[0..i) with heard[0..j)
	const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = 0; i <= n; i++) cost[i][0] = i;
	for (let j = 0; j <= m; j++) cost[0][j] = j;

	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			const sub = 1 - similarity(clean(target[i - 1]), clean(heard[j - 1]));
			cost[i][j] = Math.min(cost[i - 1][j] + 1, cost[i][j - 1] + 1, cost[i - 1][j - 1] + sub);
		}
	}

	// Walk back, collecting substitutions.
	const notes: SoundNote[] = [];
	let i = n;
	let j = m;
	while (i > 0 && j > 0) {
		const sub = 1 - similarity(clean(target[i - 1]), clean(heard[j - 1]));
		if (cost[i][j] === cost[i - 1][j - 1] + sub) {
			const id = classify(target[i - 1], heard[j - 1]);
			if (id) notes.unshift({ contrast: CONTRASTS[id], target: target[i - 1], heard: heard[j - 1] });
			i--;
			j--;
		} else if (cost[i][j] === cost[i - 1][j] + 1) {
			i--;
		} else {
			j--;
		}
	}

	// One contrast per attempt. Six notes at once is a wall of text and the
	// learner fixes none of them; the first is the one to work on.
	const seen = new Set<ContrastId>();
	return notes.filter((note) => {
		if (seen.has(note.contrast.id)) return false;
		seen.add(note.contrast.id);
		return true;
	});
}

/**
 * The instruction for a contrast, in the learner's language.
 *
 * Takes the contrast itself rather than a SoundNote: the end-of-lesson list
 * holds a different shape around the same contrast, and a nullable field
 * inside a wrapper does not narrow through an {#if} in a Svelte each-block.
 */
export function tipFor(contrast: Contrast, lang: Language): string {
	return lang === 'fa' ? contrast.tipFa : contrast.tip;
}
