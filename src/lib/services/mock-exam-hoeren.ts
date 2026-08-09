/**
 * Hören (listening) module for Goethe A1 mock exams.
 *
 * Two layers, kept separate so the rules are testable without audio:
 *  1. `createHoerenSession` — a headless state machine that enforces the
 *     official play-count rule (announcements heard once, dialogues twice),
 *     tracks the current item, and collects answers.
 *  2. `playHoerenTask` — the thin IO layer that actually speaks the script,
 *     reusing the existing two-voice TTS (`a` = speaker 1, `b` = speaker 2).
 *
 * The Svelte screen drives the session: canPlay() → playHoerenTask() →
 * registerPlay(), then answer(), then next(). Grading is done afterwards by
 * `gradeObjectiveTasks` (mock-exam-scoring.ts) over `responses()`.
 */

import type { MockExamTask } from '$lib/schemas';
import type { TaskResponse } from './mock-exam-scoring';
import { playAudioPromise } from './tts';

/**
 * How many times an item may be played. Content can set `playLimit`
 * explicitly; otherwise Start Deutsch 1 defaults apply — Teil 2
 * (announcements / Durchsagen) is heard once, Teil 1 & 3 twice.
 */
export function hoerenPlayLimit(task: MockExamTask): number {
	const explicit = 'playLimit' in task ? task.playLimit : undefined;
	return explicit ?? (task.teil === 2 ? 1 : 2);
}

export interface HoerenSession {
	readonly total: number;
	index(): number;
	current(): MockExamTask | null;
	/** Plays still allowed for the current item. */
	playsLeft(): number;
	canPlay(): boolean;
	/** Consume one play of the current item (no-op once the limit is hit). */
	registerPlay(): void;
	/** Record the learner's answer to the current item (keyed by task.id). */
	answer(response: TaskResponse): void;
	/** True when the current item is the last one. */
	isLast(): boolean;
	/** Advance to the next item; returns false if already at the end. */
	next(): boolean;
	/** All answers collected so far, keyed by task.id. */
	responses(): Record<string, TaskResponse>;
}

export function createHoerenSession(tasks: MockExamTask[]): HoerenSession {
	let index = 0;
	let playsUsed = 0;
	const responses: Record<string, TaskResponse> = {};

	const current = () => tasks[index] ?? null;
	const playsLeft = () => {
		const t = current();
		return t ? Math.max(0, hoerenPlayLimit(t) - playsUsed) : 0;
	};
	const canPlay = () => playsLeft() > 0;

	return {
		total: tasks.length,
		index: () => index,
		current,
		playsLeft,
		canPlay,
		registerPlay: () => {
			if (canPlay()) playsUsed++;
		},
		answer: (response: TaskResponse) => {
			const t = current();
			if (t) responses[t.id] = response;
		},
		isLast: () => index >= tasks.length - 1,
		next: () => {
			if (index >= tasks.length - 1) return false;
			index++;
			playsUsed = 0;
			return true;
		},
		responses: () => ({ ...responses })
	};
}

/**
 * Speak a Hören item: speaker A's line, then (for dialogues) speaker B's.
 * Resolves when playback finishes. Caller gates this with `canPlay()` and
 * calls `registerPlay()` to consume the play.
 */
export async function playHoerenTask(task: MockExamTask): Promise<void> {
	const audioText = 'audioText' in task ? task.audioText : undefined;
	const audioTextB = 'audioTextB' in task ? task.audioTextB : undefined;
	if (!audioText) return;

	await playAudioPromise(audioText, 1, 'de-DE', undefined, 'a');
	if (audioTextB) await playAudioPromise(audioTextB, 1, 'de-DE', undefined, 'b');
}
