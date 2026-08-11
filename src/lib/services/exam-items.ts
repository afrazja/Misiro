/**
 * A rotating bank of exam-format items, generated from the lesson corpus.
 *
 * The placement test is 12 hard-coded items. Sat once, to pick a starting
 * level, that is fine. Sat repeatedly it stops measuring German and starts
 * measuring whether you remember last time's answers.
 *
 * So retakes draw from here instead: ~1,200 lesson sentences, each with a
 * translation, turned into items in the four Goethe formats. The bank grows
 * by itself whenever a lesson is added, and no one has to author anything.
 *
 * The trade-off is honest and worth stating: these items come from the
 * curriculum, so they measure how well the learner has learned THIS course,
 * not general A1 ability. That is right for a progress check and wrong for
 * placement — which is exactly why the authored 12 stay where they are for
 * the first sitting.
 *
 * Pure functions on plain data. No Supabase, no DOM, no clock.
 */

import type { Language } from '$stores/preferences';
import type { ReadinessModule } from '$services/readiness';

export type ExamItemKind = 'tf' | 'choice' | 'fill' | 'speak';

export interface GeneratedItem {
	/** Stable across sittings, so recently-seen items can be skipped. */
	id: string;
	module: ReadinessModule;
	kind: ExamItemKind;
	/** German the learner hears or reads. */
	german: string;
	/** The sentence's meaning, for prompts that need a cue. */
	meaning: string;
	/** Task instruction in the interface language — never the answer. */
	prompt: string;
	/** tf/choice */
	options?: string[];
	correctIndex?: number;
	/** fill — the word the learner types */
	answer?: string;
	/** speak — what they must say */
	target?: string;
}

export interface SourceSentence {
	day: number;
	id: number;
	german: string;
	/** Meaning in the learner's interface language. */
	meaning: string;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const strip = (s: string) => s.replace(/[.,;:!?„"»«]/g, '');

/**
 * Build every item a set of sentences can support.
 *
 * A sentence yields different formats depending on what it has: all of them
 * give a Sprechen item, only ones with a distinct partner give a true/false
 * or a multiple choice, only long enough ones give a gap to type.
 */
export function buildExamBank(
	sentences: SourceSentence[],
	lang: Language,
	rand: () => number = Math.random
): GeneratedItem[] {
	const isFa = lang === 'fa';
	const usable = sentences.filter((s) => s?.german?.trim() && s?.meaning?.trim());
	if (usable.length < 3) return [];

	const out: GeneratedItem[] = [];
	const meanings = [...new Set(usable.map((s) => s.meaning.trim()))];

	for (const s of usable) {
		const key = `${s.day}:${s.id}`;
		const german = s.german.trim();
		const meaning = s.meaning.trim();
		const toks = words(german);

		// ── Sprechen: say it from the meaning alone ──
		out.push({
			id: `sp:${key}`,
			module: 'sprechen',
			kind: 'speak',
			german,
			meaning,
			target: german,
			prompt: isFa ? 'این را به آلمانی بگو' : 'Say this in German'
		});

		// ── Hören: hear it, judge a claim about it ──
		// Half the items pair the sentence with someone else's meaning, so
		// "true" is not always the answer.
		const decoy = meanings.find((m) => m !== meaning);
		if (decoy) {
			const claimIsTrue = rand() < 0.5;
			out.push({
				id: `ho:${key}`,
				module: 'hoeren',
				kind: 'tf',
				german,
				meaning,
				prompt: isFa
					? `گوش کن — آیا یعنی «${claimIsTrue ? meaning : decoy}»؟`
					: `Listen — does it mean "${claimIsTrue ? meaning : decoy}"?`,
				options: isFa ? ['درست', 'غلط'] : ['True', 'False'],
				correctIndex: claimIsTrue ? 0 : 1
			});
		}

		// ── Lesen: read it, pick the meaning ──
		const distractors = shuffle(
			meanings.filter((m) => m !== meaning),
			rand
		).slice(0, 2);
		if (distractors.length === 2) {
			const options = shuffle([meaning, ...distractors], rand);
			out.push({
				id: `le:${key}`,
				module: 'lesen',
				kind: 'choice',
				german,
				meaning,
				prompt: isFa ? 'این جمله یعنی چه؟' : 'What does this sentence mean?',
				options,
				correctIndex: options.indexOf(meaning)
			});
		}

		// ── Schreiben: type the missing word ──
		// Needs a word worth removing: short filler proves nothing, and a
		// one-word sentence has no context left once you blank it.
		if (toks.length >= 4) {
			const candidates = toks
				.map((t, i) => ({ t: strip(t), i }))
				.filter((x) => x.t.length >= 3);
			if (candidates.length) {
				const pick = candidates[Math.floor(rand() * candidates.length)];
				out.push({
					id: `sc:${key}`,
					module: 'schreiben',
					kind: 'fill',
					german: toks.map((t, i) => (i === pick.i ? '_____' : t)).join(' '),
					meaning,
					answer: pick.t,
					prompt: isFa
						? `کلمهٔ جاافتاده را بنویس — «${meaning}»`
						: `Type the missing word — "${meaning}"`
				});
			}
		}
	}

	return out;
}

/**
 * Draw one sitting from the bank.
 *
 * Items the learner has seen recently are skipped, and the modules with the
 * least evidence go first — a retake should spend its questions where the
 * score is least certain, not re-confirm what is already known. Falls back to
 * seen items only if the bank cannot fill the sitting otherwise, because a
 * repeated question still beats a short test.
 */
export function selectSitting(
	bank: GeneratedItem[],
	opts: {
		count?: number;
		/** Item ids from recent sittings. */
		seenIds?: string[];
		/** Modules ordered by need — earliest gets the most questions. */
		priority?: ReadinessModule[];
		rand?: () => number;
	} = {}
): GeneratedItem[] {
	const { count = 12, seenIds = [], priority = [], rand = Math.random } = opts;
	if (!bank.length) return [];

	const seen = new Set(seenIds);
	const byModule = new Map<ReadinessModule, GeneratedItem[]>();
	for (const item of shuffle(bank, rand)) {
		const list = byModule.get(item.module) ?? [];
		list.push(item);
		byModule.set(item.module, list);
	}
	// Unseen first within each module, seen kept as backfill.
	for (const [m, list] of byModule) {
		byModule.set(m, [...list.filter((i) => !seen.has(i.id)), ...list.filter((i) => seen.has(i.id))]);
	}

	const order = [
		...priority.filter((m) => byModule.has(m)),
		...[...byModule.keys()].filter((m) => !priority.includes(m))
	];

	const picked: GeneratedItem[] = [];
	let progressed = true;
	while (picked.length < count && progressed) {
		progressed = false;
		for (const m of order) {
			if (picked.length >= count) break;
			const next = byModule.get(m)?.shift();
			if (next) {
				picked.push(next);
				progressed = true;
			}
		}
	}
	return picked;
}
