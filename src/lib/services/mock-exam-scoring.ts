/**
 * Goethe A1 mock-exam scoring.
 *
 * Official rule reproduced here: the four modules each contribute a maximum
 * of 25 points to a total of 100; a candidate passes with 60/100 (there is no
 * per-module minimum at A1). We author any number of tasks per module and
 * scale each module's raw score to 25, so the pass logic is robust regardless
 * of how many items a given mock paper contains.
 *
 * `gradeObjectiveTask` grades the deterministic + speech-matched kinds now,
 * reusing the German-aware matcher (`matchVoiceInput`) so umlaut spelling and
 * number words are handled. free_write / open speaking return `null` here —
 * they are scored by the writing (Day 4) and speaking (Day 5) graders and fed
 * in as `TaskResult`s.
 */

import { matchVoiceInput } from '$utils/text-matching';
import type { MockExamModule, MockExamTask } from '$lib/schemas';

export const MODULE_MAX = 25; // each module scales to 25
export const TOTAL_MAX = 100;
export const PASS_TOTAL = 60; // Goethe A1: 60/100 to pass
export const MODULE_ORDER: MockExamModule[] = ['hoeren', 'lesen', 'schreiben', 'sprechen'];

/** Similarity threshold for a form-fill blank to count as correct. */
const FORM_FILL_THRESHOLD = 0.85;
/** Speech is looser — recognizer noise on letter names / numbers. */
const SPEECH_THRESHOLD = 0.7;

export const MODULE_LABELS: Record<MockExamModule, { de: string; en: string; fa: string }> = {
	hoeren: { de: 'Hören', en: 'Listening', fa: 'شنیدن' },
	lesen: { de: 'Lesen', en: 'Reading', fa: 'خواندن' },
	schreiben: { de: 'Schreiben', en: 'Writing', fa: 'نوشتن' },
	sprechen: { de: 'Sprechen', en: 'Speaking', fa: 'صحبت کردن' }
};

export interface TaskResult {
	module: MockExamModule;
	earned: number;
	possible: number;
}

export interface ModuleScore {
	raw: number;
	possible: number;
	scaled: number; // 0–25
}

export interface MockExamScore {
	modules: Record<MockExamModule, ModuleScore>;
	total: number; // 0–100
	passed: boolean;
}

/** Aggregate per-task results into per-module scaled scores + pass/fail. */
export function scoreMockExam(results: TaskResult[]): MockExamScore {
	const modules = {} as Record<MockExamModule, ModuleScore>;
	for (const m of MODULE_ORDER) modules[m] = { raw: 0, possible: 0, scaled: 0 };

	for (const r of results) {
		const m = modules[r.module];
		if (!m) continue; // ignore unknown module tags defensively
		m.raw += r.earned;
		m.possible += r.possible;
	}

	let total = 0;
	for (const m of MODULE_ORDER) {
		const ms = modules[m];
		ms.scaled = ms.possible > 0 ? Math.round((ms.raw / ms.possible) * MODULE_MAX) : 0;
		total += ms.scaled;
	}

	return { modules, total, passed: total >= PASS_TOTAL };
}

/** A learner's response to a single task. */
export type TaskResponse =
	| { kind: 'choice'; index: number }
	| { kind: 'true_false'; value: boolean }
	| { kind: 'form_fill'; values: string[] } // one entry per scored blank, in order
	| { kind: 'speech'; transcript: string };

/**
 * Grade a task that can be scored without human/AI judgement.
 * Returns `null` for kinds that need the writing/speaking graders
 * (free_write, speak_intro, speak_qa, speak_request).
 */
export function gradeObjectiveTask(
	task: MockExamTask,
	response: TaskResponse | undefined
): TaskResult | null {
	const module = task.module;
	const points = task.points ?? 1;

	switch (task.kind) {
		case 'choice': {
			const earned =
				response?.kind === 'choice' && response.index === task.correctIndex ? points : 0;
			return { module, earned, possible: points };
		}

		case 'true_false': {
			const earned =
				response?.kind === 'true_false' && response.value === task.answer ? points : 0;
			return { module, earned, possible: points };
		}

		case 'form_fill': {
			// One point per blank (a field with a non-empty `answer`).
			const blanks = task.fields.filter((f) => f.answer != null && f.answer !== '');
			const possible = blanks.length;
			let earned = 0;
			if (response?.kind === 'form_fill') {
				blanks.forEach((f, i) => {
					const given = response.values[i] ?? '';
					if (matchVoiceInput(given, f.answer as string, FORM_FILL_THRESHOLD).isMatch) earned++;
				});
			}
			return { module, earned, possible };
		}

		case 'speak_spell': {
			const earned =
				response?.kind === 'speech' &&
				matchVoiceInput(response.transcript, task.expected, SPEECH_THRESHOLD).isMatch
					? points
					: 0;
			return { module, earned, possible: points };
		}

		case 'speak_number': {
			const target = task.spoken || task.digits;
			const earned =
				response?.kind === 'speech' &&
				matchVoiceInput(response.transcript, target, SPEECH_THRESHOLD).isMatch
					? points
					: 0;
			return { module, earned, possible: points };
		}

		default:
			// free_write, speak_intro, speak_qa, speak_request → graded elsewhere.
			return null;
	}
}

/** Convenience: grade a whole paper's objective tasks, keyed by `task.id`. */
export function gradeObjectiveTasks(
	tasks: MockExamTask[],
	responses: Record<string, TaskResponse>
): TaskResult[] {
	const out: TaskResult[] = [];
	for (const task of tasks) {
		const result = gradeObjectiveTask(task, responses[task.id]);
		if (result) out.push(result);
	}
	return out;
}
