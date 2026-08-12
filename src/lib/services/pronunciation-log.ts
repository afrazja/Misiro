/**
 * Words the learner did not get out right, collected across one lesson and
 * shown once at the end.
 *
 * Feedback during a sentence is necessarily momentary — you see it, you move
 * on, and by sentence nine you have forgotten sentence two. A list at the
 * end is the only place the pattern is visible: three of today's misses were
 * all the same ö, and that is worth knowing in a way that three separate
 * corrections never adds up to.
 *
 * Two grades of entry, because we genuinely know more about some than others:
 *
 *   diagnosed  pronunciation.ts named the contrast — "schon for schön", the
 *              ö flattened. We can say what to fix and why.
 *   unnamed    the word did not come back from the recognizer and we cannot
 *              say why. Still worth listing: the learner knows what they
 *              were trying to say even when we do not.
 *
 * Deliberately NOT a score. The lesson is already complete and credited
 * before this appears; it is a list of things to practise, not a mark.
 *
 * Pure functions over a plain array. Persistence is the caller's business —
 * this resets with the lesson.
 */

import type { Contrast, SoundNote } from './pronunciation';

/**
 * Case- and punctuation-insensitive key, so "Kaffee." and "kaffee" are one
 * entry. Local rather than shared: this went with word-strength.ts when the
 * mastery meter was removed, and one four-line function is cheaper than a
 * module two callers import for one thing.
 */
function wordKey(word: string): string {
	const key = word
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}ß-]/gu, '')
		.replace(/^-+|-+$/g, '');
	// Must contain an actual letter. Enumerating punctuation missed the em
	// dash, and a lone "—" was logged as a word to practise — stripping
	// everything that is not a letter or digit is the check that does not
	// need a longer list next time.
	return /\p{L}/u.test(key) ? key : '';
}

export interface PronunciationMiss {
	/** The word as written in the lesson, for display. */
	word: string;
	/** Named sound problem, when pronunciation.ts could identify one. */
	contrast: Contrast | null;
	/** What the recognizer heard instead, when we have it. */
	heard: string | null;
	/** How many times across the lesson. */
	times: number;
}

/**
 * How close an attempt must be before its unmatched words count.
 *
 * Below this the learner said something else entirely — a different
 * sentence, or the recognizer produced noise — and every word in the target
 * comes back unmatched. Logging those would bury the real misses under a
 * transcript's worth of words nobody actually got wrong.
 */
export const ATTEMPT_FLOOR = 0.4;

/**
 * Fold one wrong attempt into the log.
 *
 * Diagnosed notes always count. Unmatched words only count when the attempt
 * was recognisably an attempt at THIS sentence — see ATTEMPT_FLOOR.
 */
export function recordMiss(
	log: PronunciationMiss[],
	opts: {
		notes: SoundNote[];
		missedWords: string[];
		matchPercentage: number;
	}
): PronunciationMiss[] {
	const next = log.map((m) => ({ ...m }));

	const bump = (word: string, contrast: Contrast | null, heard: string | null) => {
		const key = wordKey(word);
		if (!key) return;
		const found = next.find((m) => wordKey(m.word) === key);
		if (found) {
			found.times += 1;
			// A later attempt that names the sound beats an earlier one that
			// could not — knowing WHY is the whole value of the entry.
			if (!found.contrast && contrast) {
				found.contrast = contrast;
				found.heard = heard;
			}
			return;
		}
		next.push({ word, contrast, heard, times: 1 });
	};

	for (const n of opts.notes) bump(n.target, n.contrast, n.heard);

	if (opts.matchPercentage >= ATTEMPT_FLOOR) {
		const named = new Set(opts.notes.map((n) => wordKey(n.target)));
		for (const w of opts.missedWords) {
			if (!named.has(wordKey(w))) bump(w, null, null);
		}
	}

	return next;
}

/**
 * The list to show, worst first.
 *
 * Diagnosed entries lead: they come with something to actually do. Within
 * each group, the words missed most often come first.
 */
export function rankMisses(log: PronunciationMiss[]): PronunciationMiss[] {
	return [...log].sort((a, b) => {
		if (!!a.contrast !== !!b.contrast) return a.contrast ? -1 : 1;
		if (a.times !== b.times) return b.times - a.times;
		return a.word.localeCompare(b.word);
	});
}

/**
 * Cap for display. A list of fifteen words is a wall, not a study plan, and
 * the tail is the least reliable part of it anyway.
 */
export const MAX_SHOWN = 6;
