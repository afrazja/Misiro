import { describe, it, expect } from 'vitest';
import {
	QUESTIONS,
	TOPICS,
	BANDS,
	bandFor,
	scoreByTopic,
	totalCorrect,
	shareText
} from './fa-placement';

const PERSIAN = /[؀-ۿ]/;

describe('question bank', () => {
	it('has no duplicate ids', () => {
		const ids = QUESTIONS.map((q) => q.id);
		expect(new Set(ids).size, `duplicate id in ${ids.join(', ')}`).toBe(ids.length);
	});

	it('points every answer at a real option', () => {
		// An out-of-range index marks a correct answer unreachable, so the
		// question can only ever be got wrong.
		for (const q of QUESTIONS) {
			expect(q.answer, `${q.id} answer out of range`).toBeGreaterThanOrEqual(0);
			expect(q.answer, `${q.id} answer out of range`).toBeLessThan(q.options.length);
		}
	});

	it('offers at least three distinct options each', () => {
		for (const q of QUESTIONS) {
			expect(q.options.length, `${q.id} has too few options`).toBeGreaterThanOrEqual(3);
			expect(new Set(q.options).size, `${q.id} repeats an option`).toBe(q.options.length);
		}
	});

	it('writes every learner-facing string in Persian', () => {
		// The whole point is that this page speaks Persian. An English prompt
		// that slipped through is invisible to me and obvious to the reader.
		for (const q of QUESTIONS) {
			expect(q.prompt, `${q.id} prompt is not Persian`).toMatch(PERSIAN);
			expect(q.why, `${q.id} explanation is not Persian`).toMatch(PERSIAN);
			if (q.note) expect(q.note, `${q.id} note is not Persian`).toMatch(PERSIAN);
		}
	});

	it('keeps the German material free of Persian', () => {
		// The German field is rendered LTR. Persian leaking into it would
		// render as mixed-direction garbage.
		for (const q of QUESTIONS) {
			expect(q.german, `${q.id} german field contains Persian`).not.toMatch(PERSIAN);
		}
	});

	it('names a known topic on every question', () => {
		for (const q of QUESTIONS) {
			expect(TOPICS[q.topic], `${q.id} has unknown topic ${q.topic}`).toBeDefined();
		}
	});

	it('exercises every topic it defines', () => {
		// A topic with no questions renders an empty breakdown row.
		const used = new Set(QUESTIONS.map((q) => q.topic));
		for (const id of Object.keys(TOPICS)) {
			expect(used.has(id as never), `topic ${id} has no questions`).toBe(true);
		}
	});
});

describe('bandFor', () => {
	it('returns a band for every reachable score', () => {
		for (let s = 0; s <= QUESTIONS.length; s++) {
			expect(bandFor(s), `no band for ${s}`).toBeDefined();
		}
	});

	it('never lowers the band as the score rises', () => {
		// A gap or an out-of-order min would let 7 outrank 8.
		let last = -1;
		for (let s = 0; s <= QUESTIONS.length; s++) {
			const i = BANDS.indexOf(bandFor(s));
			// BANDS is ordered high→low, so the index must not increase.
			if (last !== -1) expect(i, `band went backwards at ${s}`).toBeLessThanOrEqual(last);
			last = i;
		}
	});

	it('sends a zero score to day 1 and a top score further in', () => {
		expect(bandFor(0).startDay).toBe(1);
		expect(bandFor(QUESTIONS.length).startDay).toBeGreaterThan(1);
	});

	it('starts every band on a day the course actually has', () => {
		for (const b of BANDS) {
			expect(b.startDay, `${b.fa} starts before day 1`).toBeGreaterThanOrEqual(1);
			expect(b.startDay, `${b.fa} starts past the built curriculum`).toBeLessThanOrEqual(100);
		}
	});

	it('never tells the learner they failed', () => {
		// This result gets forwarded to friends or it does nothing. Copy that
		// shames the lowest scorer — the exact person the course is for —
		// makes it unshareable.
		for (const b of BANDS) {
			// The label may be a bare CEFR code ("A1.2") — those are the
			// standard names and translating them would be wrong. The blurb
			// is the prose, so that is what has to be Persian.
			expect(b.fa.trim().length, 'band label is empty').toBeGreaterThan(0);
			expect(b.blurb, `${b.fa} blurb is not Persian`).toMatch(PERSIAN);
			expect(b.blurb).not.toMatch(/ضعیف|بد|شکست|نتوانستی/);
		}
	});
});

describe('scoring', () => {
	const allRight = QUESTIONS.map((q) => q.answer);
	const allWrong = QUESTIONS.map((q) => (q.answer + 1) % q.options.length);
	const none = QUESTIONS.map(() => null);

	it('counts a perfect and an empty paper', () => {
		expect(totalCorrect(allRight)).toBe(QUESTIONS.length);
		expect(totalCorrect(allWrong)).toBe(0);
		expect(totalCorrect(none)).toBe(0);
	});

	it('does not credit an unanswered question', () => {
		// `null` must not compare equal to answer index 0.
		const zeroAnswers = QUESTIONS.filter((q) => q.answer === 0).length;
		expect(zeroAnswers, 'test is vacuous unless some answer is 0').toBeGreaterThan(0);
		expect(totalCorrect(none)).toBe(0);
	});

	it('breaks the score down over every topic', () => {
		const rows = scoreByTopic(allRight);
		expect(rows.length).toBe(new Set(QUESTIONS.map((q) => q.topic)).size);
		expect(rows.reduce((n, r) => n + r.total, 0)).toBe(QUESTIONS.length);
		expect(rows.every((r) => r.correct === r.total)).toBe(true);
	});

	it('puts the weakest topic first', () => {
		// The breakdown exists to say what to work on, so order is the feature.
		const rows = scoreByTopic(allWrong.map((a, i) => (QUESTIONS[i].topic === 'verb' ? a : QUESTIONS[i].answer)));
		expect(rows[0].topic.id).toBe('verb');
	});
});

describe('shareText', () => {
	it('carries the url, or the share is a dead end', () => {
		const t = shareText(7, 'https://www.mirifer.com/fa/test');
		expect(t).toContain('https://www.mirifer.com/fa/test');
	});

	it('states the score out of the real total', () => {
		expect(shareText(7, 'x')).toContain(`${QUESTIONS.length}`);
		expect(shareText(7, 'x')).toContain('7');
	});

	it('is written in Persian', () => {
		expect(shareText(3, 'x')).toMatch(PERSIAN);
	});
});
