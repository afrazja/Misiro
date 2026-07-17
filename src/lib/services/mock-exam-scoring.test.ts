import { describe, it, expect } from 'vitest';
import {
	scoreMockExam,
	gradeObjectiveTask,
	gradeObjectiveTasks,
	PASS_TOTAL,
	type TaskResult
} from './mock-exam-scoring';
import type { MockExamTask } from '$lib/schemas';

describe('scoreMockExam', () => {
	it('scales each module to 25 and sums to a 100-point total', () => {
		const results: TaskResult[] = [
			{ module: 'hoeren', earned: 6, possible: 6 },
			{ module: 'lesen', earned: 6, possible: 6 },
			{ module: 'schreiben', earned: 4, possible: 4 },
			{ module: 'sprechen', earned: 3, possible: 3 }
		];
		const score = scoreMockExam(results);
		expect(score.modules.hoeren.scaled).toBe(25);
		expect(score.total).toBe(100);
		expect(score.passed).toBe(true);
	});

	it('scales a partial module proportionally (half → ~13/25)', () => {
		const score = scoreMockExam([{ module: 'hoeren', earned: 3, possible: 6 }]);
		expect(score.modules.hoeren.scaled).toBe(13); // round(0.5 * 25)
		expect(score.modules.lesen.scaled).toBe(0);
	});

	it('passes exactly at the 60-point threshold', () => {
		// Three full modules (75) + empty fourth = 75 ≥ 60.
		const results: TaskResult[] = [
			{ module: 'hoeren', earned: 5, possible: 5 },
			{ module: 'lesen', earned: 5, possible: 5 },
			{ module: 'schreiben', earned: 5, possible: 5 }
		];
		const score = scoreMockExam(results);
		expect(score.total).toBe(75);
		expect(score.total).toBeGreaterThanOrEqual(PASS_TOTAL);
		expect(score.passed).toBe(true);
	});

	it('fails below threshold and never divides by zero on empty modules', () => {
		const score = scoreMockExam([{ module: 'hoeren', earned: 1, possible: 5 }]);
		expect(score.total).toBe(5); // round(0.2*25)=5
		expect(score.passed).toBe(false);
		expect(score.modules.sprechen.scaled).toBe(0);
	});
});

describe('gradeObjectiveTask', () => {
	const choice: MockExamTask = {
		kind: 'choice',
		id: 'h1-1',
		module: 'hoeren',
		teil: 1,
		points: 1,
		question: 'Wohin geht die Frau?',
		options: ['zum Arzt', 'zum Supermarkt', 'nach Hause'],
		correctIndex: 1
	};

	it('grades multiple choice', () => {
		expect(gradeObjectiveTask(choice, { kind: 'choice', index: 1 })).toEqual({
			module: 'hoeren',
			earned: 1,
			possible: 1
		});
		expect(gradeObjectiveTask(choice, { kind: 'choice', index: 0 })?.earned).toBe(0);
		expect(gradeObjectiveTask(choice, undefined)?.earned).toBe(0); // no answer
	});

	it('grades true/false', () => {
		const tf: MockExamTask = {
			kind: 'true_false',
			id: 'l1-1',
			module: 'lesen',
			teil: 1,
			points: 1,
			statement: 'Der Kurs beginnt um 9 Uhr.',
			answer: true
		};
		expect(gradeObjectiveTask(tf, { kind: 'true_false', value: true })?.earned).toBe(1);
		expect(gradeObjectiveTask(tf, { kind: 'true_false', value: false })?.earned).toBe(0);
	});

	it('grades a form (one point per blank) with German-aware fuzzy matching', () => {
		const form: MockExamTask = {
			kind: 'form_fill',
			id: 's1-1',
			module: 'schreiben',
			teil: 1,
			points: 1,
			sourceText: '…',
			fields: [
				{ label: 'Familienname', answer: 'Müller' },
				{ label: 'Wohnort', answer: 'Köln' },
				{ label: 'Land', given: 'Deutschland' } // pre-given → not scored
			]
		};
		// ü/ö folded by the matcher, so ASCII input still matches.
		const result = gradeObjectiveTask(form, {
			kind: 'form_fill',
			values: ['Mueller', 'Koeln']
		});
		expect(result).toEqual({ module: 'schreiben', earned: 2, possible: 2 });

		const partial = gradeObjectiveTask(form, { kind: 'form_fill', values: ['Mueller', 'Berlin'] });
		expect(partial?.earned).toBe(1);
	});

	it('grades spoken spelling and numbers via speech transcript', () => {
		const spell: MockExamTask = {
			kind: 'speak_spell',
			id: 'sp1-1',
			module: 'sprechen',
			teil: 1,
			points: 1,
			word: 'Sara',
			expected: 'Es A Er A'
		};
		expect(
			gradeObjectiveTask(spell, { kind: 'speech', transcript: 'Es A Er A' })?.earned
		).toBe(1);

		const num: MockExamTask = {
			kind: 'speak_number',
			id: 'sp1-2',
			module: 'sprechen',
			teil: 1,
			points: 1,
			digits: '0176'
		};
		expect(gradeObjectiveTask(num, { kind: 'speech', transcript: '0176' })?.earned).toBe(1);
	});

	it('returns null for kinds needing AI / examiner judgement', () => {
		const write: MockExamTask = {
			kind: 'free_write',
			id: 's2-1',
			module: 'schreiben',
			teil: 2,
			points: 6,
			situation: 'Schreiben Sie eine Nachricht.',
			contentPoints: ['Grund', 'Zeit', 'Frage'],
			minWords: 30
		};
		expect(gradeObjectiveTask(write, undefined)).toBeNull();
	});
});

describe('gradeObjectiveTasks', () => {
	it('grades a mixed paper and skips subjective tasks', () => {
		const tasks: MockExamTask[] = [
			{
				kind: 'choice',
				id: 'h1-1',
				module: 'hoeren',
				teil: 1,
				points: 1,
				question: '?',
				options: ['a', 'b'],
				correctIndex: 0
			},
			{
				kind: 'free_write',
				id: 's2-1',
				module: 'schreiben',
				teil: 2,
				points: 6,
				situation: '…',
				contentPoints: ['a', 'b', 'c'],
				minWords: 30
			}
		];
		const results = gradeObjectiveTasks(tasks, { 'h1-1': { kind: 'choice', index: 0 } });
		expect(results).toHaveLength(1); // free_write skipped
		expect(results[0]).toEqual({ module: 'hoeren', earned: 1, possible: 1 });
	});
});
