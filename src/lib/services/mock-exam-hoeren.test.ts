import { describe, it, expect } from 'vitest';
import { createHoerenSession, hoerenPlayLimit } from './mock-exam-hoeren';
import { gradeObjectiveTasks, scoreMockExam } from './mock-exam-scoring';
import { MockExamTaskSchema, type MockExamTask } from '$lib/schemas';
import { a1Hoeren1 } from '$data/mock-exams/a1-hoeren-1';

describe('a1Hoeren1 content', () => {
	it('every authored task validates against the schema (proves the model holds)', () => {
		for (const task of a1Hoeren1) {
			const parsed = MockExamTaskSchema.safeParse(task);
			expect(parsed.success, `task ${task.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
		}
	});

	it('covers all three Teile and is all Hören', () => {
		expect(a1Hoeren1.every((t) => t.module === 'hoeren')).toBe(true);
		expect(new Set(a1Hoeren1.map((t) => t.teil))).toEqual(new Set([1, 2, 3]));
	});
});

describe('hoerenPlayLimit', () => {
	it('honours an explicit playLimit', () => {
		const t = a1Hoeren1.find((x) => x.id === 'h1-1')!;
		expect(hoerenPlayLimit(t)).toBe(2);
	});

	it('defaults announcements (Teil 2) to once, others to twice', () => {
		const teil2: MockExamTask = { kind: 'true_false', id: 'x', module: 'hoeren', teil: 2, points: 1, statement: 's', answer: true };
		const teil1: MockExamTask = { kind: 'true_false', id: 'y', module: 'hoeren', teil: 1, points: 1, statement: 's', answer: true };
		expect(hoerenPlayLimit(teil2)).toBe(1);
		expect(hoerenPlayLimit(teil1)).toBe(2);
	});
});

describe('createHoerenSession', () => {
	it('enforces the play-count limit per item', () => {
		const s = createHoerenSession(a1Hoeren1); // starts on h1-1 (limit 2)
		expect(s.playsLeft()).toBe(2);
		expect(s.canPlay()).toBe(true);
		s.registerPlay();
		expect(s.playsLeft()).toBe(1);
		s.registerPlay();
		expect(s.playsLeft()).toBe(0);
		expect(s.canPlay()).toBe(false);
		s.registerPlay(); // no-op past the limit
		expect(s.playsLeft()).toBe(0);
	});

	it('records answers by task id and advances, resetting plays', () => {
		const s = createHoerenSession(a1Hoeren1);
		s.registerPlay();
		s.answer({ kind: 'choice', index: 0 });
		expect(s.isLast()).toBe(false);
		expect(s.next()).toBe(true);
		expect(s.playsLeft()).toBe(hoerenPlayLimit(s.current()!)); // reset for new item
		expect(s.responses()).toEqual({ 'h1-1': { kind: 'choice', index: 0 } });
	});

	it('walks to the end and refuses to advance past it', () => {
		const s = createHoerenSession(a1Hoeren1);
		let steps = 1;
		while (s.next()) steps++;
		expect(steps).toBe(a1Hoeren1.length);
		expect(s.isLast()).toBe(true);
		expect(s.next()).toBe(false);
	});

	it('answers key straight into the scorer (full-marks run)', () => {
		const s = createHoerenSession(a1Hoeren1);
		do {
			const t = s.current()!;
			if (t.kind === 'choice') s.answer({ kind: 'choice', index: t.correctIndex });
			else if (t.kind === 'true_false') s.answer({ kind: 'true_false', value: t.answer });
		} while (s.next());

		const results = gradeObjectiveTasks(a1Hoeren1, s.responses());
		const score = scoreMockExam(results);
		expect(score.modules.hoeren.raw).toBe(a1Hoeren1.length);
		expect(score.modules.hoeren.scaled).toBe(25); // all correct → full module
	});
});
