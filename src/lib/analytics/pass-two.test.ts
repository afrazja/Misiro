import { describe, it, expect } from 'vitest';
import { buildReport } from './report';
import { buildLessonReport } from './lesson-report';
import { buildReturnReport } from './return-report';
import { lessonVersion, type LessonContent } from './lesson-content';
import { DAY_MS, safeMetadata, type AnalyticsEvent, type StoredEvent } from './contract';
import { duration } from './statistics';
const now = Date.parse('2026-09-30T12:00:00Z');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ago = (days: number) => now - days * DAY_MS;
const iso = (time: number) => new Date(time).toISOString();
const sentences = [
	{ id: 1, role: 'received' as const, audioText: 'Guten Tag!', translation: 'Hello!' },
	{ id: 2, role: 'sent' as const, targetText: 'Einen Kaffee, bitte.', translation: 'A coffee, please.', hint: 'Use bitte.' }
];
const version = lessonVersion(sentences);
const catalog: LessonContent[] = [{ day: 1, title: 'At the café', sentences, version }];
let sequence = 0;
function event(name: AnalyticsEvent, time: number, opts: { user?: number; visit?: number; attempt?: number; index?: number; day?: number; metadata?: StoredEvent['metadata'] } = {}): StoredEvent {
	return { event_id: id(++sequence + 1000), user_id: id(opts.user ?? 1), session_id: id(opts.visit ?? 10),
		attempt_id: id(opts.attempt ?? 20), day: opts.day ?? 1, event_name: name, occurred_at: iso(time), created_at: iso(time), schema_version: 2,
		metadata: { mode: 'lesson', page: 'lesson', insights_version: 3, lesson_version: version, index: opts.index ?? 0, sequence, ...opts.metadata } };
}
const ordered = (events: StoredEvent[]) => events.toSorted((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at) || Number(a.metadata.sequence) - Number(b.metadata.sequence));
const lessonReport = (events: StoredEvent[], since = ago(30)) => buildLessonReport(ordered(events), catalog, since, now);
function users(...ids: number[]) { return ids.map(n => ({ id: id(n), created_at: iso(ago(40)), is_admin: false })); }
const returns = (events: StoredEvent[], people = users(1), since = ago(30)) => buildReturnReport(ordered(events), people, ago(50), since, now);

describe('lesson cohorts and sentence evidence', () => {
	it('counts one resumed attempt, deduplicates learner reach and keeps sentence-specific denominators', () => {
		const t = ago(10);
		const result = lessonReport([
			event('lesson_started', t), event('lesson_begun', t + 1), event('lesson_progress', t + 2),
			event('answer_submitted', t + 3, { metadata: { correct: false } }), event('answer_submitted', t + 4, { metadata: { correct: true } }),
			event('lesson_started', t + DAY_MS, { visit: 11 }), event('lesson_resumed', t + DAY_MS + 1, { visit: 11 }),
			event('lesson_progress', t + DAY_MS + 2, { visit: 11 }), event('lesson_progress', t + DAY_MS + 3, { index: 1, visit: 11 }),
			event('step_skipped', t + DAY_MS + 4, { index: 1, visit: 11 }), event('lesson_attempt_completed', t + DAY_MS + 5, { visit: 11 }),
			event('lesson_begun', t + 1, { user: 2, attempt: 21 }), event('lesson_progress', t + 2, { user: 2, attempt: 21 })
		]);
		expect(result).toMatchObject({ started: 2, completed: 1, learners: 2, resumed: 1 });
		expect(result.lessons[0].sentences[0]).toMatchObject({ reached: 2, reachedAttempts: 2, answeredAttempts: 1, firstCorrect: 0, repeated: 1, retries: 1 });
		expect(result.lessons[0].sentences[1]).toMatchObject({ reached: 1, skips: { count: 1, learners: 1 } });
	});
	it('separates current, old and unversioned content without attaching current text to old results', () => {
		const t = ago(5), older = 'd1-0123456789abcdef';
		const events = [event('lesson_begun', t), event('lesson_progress', t + 1),
			event('lesson_begun', t, { attempt: 21, metadata: { lesson_version: older } }), event('lesson_progress', t + 1, { attempt: 21, metadata: { lesson_version: older } })];
		const unknown = [event('lesson_begun', t, { attempt: 22 }), event('lesson_progress', t + 1, { attempt: 22 })];
		unknown.forEach(e => { delete e.metadata.lesson_version; delete e.metadata.insights_version; });
		const result = lessonReport([...events, ...unknown]);
		expect(result.lessons).toHaveLength(3);
		expect(result.lessons.find(l => l.version === version)?.sentences[0].text).toBe('Guten Tag!');
		expect(result.lessons.find(l => l.version === older)?.sentences[0].text).toBeNull();
		expect(result.lessons.find(l => l.version === 'unknown')?.sentences[0].measured).toBe(0);
	});
	it('does not include orphan completions or attempts started before the period in the denominator', () => {
		const result = lessonReport([event('lesson_attempt_completed', ago(1)),
			event('lesson_begun', ago(10), { attempt: 21 }), event('lesson_attempt_completed', ago(1), { attempt: 21 })], ago(7));
		expect(result).toMatchObject({ started: 0, completed: 0, missingStart: 1 });
	});
	it('uses account plus attempt ID and omits inconsistent days', () => {
		const result = lessonReport([event('lesson_begun', ago(1)), event('lesson_begun', ago(1), { user: 2 }),
			event('lesson_begun', ago(1), { attempt: 21 }), event('lesson_progress', ago(1) + 1, { attempt: 21, day: 2 })]);
		expect(result).toMatchObject({ started: 2, inconsistentAttempts: 1 });
	});
	it('excludes exam answers and only counts support actions among learners whose reach is measured', () => {
		const t = ago(1), result = lessonReport([event('lesson_begun', t), event('lesson_progress', t + 1),
			event('answer_submitted', t + 2, { metadata: { mode: 'exam', correct: false } }),
			event('hint_opened', t + 3), event('hint_opened', t + 4), event('audio_replayed', t + 5),
			event('answer_revealed', t + 6, { index: 1 })]);
		expect(result.lessons[0].sentences[0]).toMatchObject({ answeredAttempts: 0, measured: 1, hints: { count: 2, learners: 1 }, replays: { count: 1, learners: 1 } });
		expect(result.lessons[0].sentences[1]).toMatchObject({ reached: 0, reveals: { count: 0, learners: 0 } });
	});
	it('samples active time only for completed enhanced attempts; never substitutes wall-clock duration', () => {
		const t = ago(5), events = [event('lesson_begun', t), event('lesson_active', t + 15000, { metadata: { active_ms: 15000 } }),
			event('lesson_active', t + 30000, { metadata: { active_ms: 15000 } }), event('lesson_attempt_completed', t + DAY_MS),
			event('lesson_begun', t, { attempt: 21 }), event('lesson_active', t + 15000, { attempt: 21, metadata: { active_ms: 15000 } })];
		expect(lessonReport(events).lessons[0]).toMatchObject({ activeSeconds: 30, activeSamples: 1 });
	});
	it('does not turn a missing first answer result into an incorrect answer and measures sentence time separately', () => {
		const t = ago(1), result = lessonReport([event('lesson_begun', t), event('lesson_progress', t + 1),
			event('answer_submitted', t + 2), event('answer_submitted', t + 3, { metadata: { correct: true } }),
			event('lesson_active', t + 15000, { metadata: { active_ms: 12000 } })]);
		expect(result.lessons[0].sentences[0]).toMatchObject({ answeredAttempts: 0, firstCorrect: 0, retries: 1, activeSeconds: 12, activeSamples: 1 });
	});
	it('last-observed counts exclude finished and recently active attempts and use the actual last displayed sentence', () => {
		const t = ago(2), result = lessonReport([event('lesson_begun', t), event('lesson_progress', t + 1), event('lesson_progress', t + 2, { index: 1 }),
			event('lesson_begun', now - 1000, { attempt: 21 }), event('lesson_progress', now - 500, { attempt: 21 })]);
		expect(result.lessons[0].sentences.map(s => s.lastObserved)).toEqual([0, 1]);
	});
	it('preserves deduplication, exclusion, snapshot and metadata validation when composing the full report', () => {
		const t = ago(4), good = event('lesson_begun', t);
		const report = buildReport({ now, days: 30, includeTests: false, installedAt: iso(ago(50)), legacyCount: 0,
			users: users(1, 2), exclusions: [id(2)], selfId: null, catalog,
			events: [good, good, event('lesson_begun', t, { user: 2 }), event('lesson_attempt_completed', now + 1000)] });
		expect(report.lessonAnalysis).toMatchObject({ started: 1, completed: 0 });
		expect(report.quality.duplicates).toBe(1);
	});
});

describe('return windows and observation eligibility', () => {
	it('holds recent learners out of the denominator even if they already returned', () => {
		const result = returns([event('answer_submitted', ago(2)), event('answer_submitted', ago(1), { visit: 11 })]);
		expect(result).toMatchObject({ learners: 1, pending: 1, eligible: 0, returned: 0, secondSamples: 1 });
	});
	it('requires a different visit and a 24-hour delay for seven-day return', () => {
		const t = ago(10);
		expect(returns([event('answer_submitted', t), event('answer_submitted', t + DAY_MS)]).returned).toBe(0);
		const early = returns([event('answer_submitted', t), event('answer_submitted', t + 3600000, { visit: 11 })]);
		expect(early).toMatchObject({ returned: 0, secondSamples: 1, secondSeconds: 3600 });
		expect(returns([event('answer_submitted', t), event('answer_submitted', t + DAY_MS, { visit: 11 })]).returned).toBe(1);
	});
	it('uses inclusive end boundaries with no overlap between weekly windows', () => {
		const t = ago(29), result = returns([event('answer_submitted', t), event('answer_submitted', t + 7 * DAY_MS, { visit: 11 }),
			event('answer_submitted', t + 14 * DAY_MS, { visit: 12 }), event('answer_submitted', t + 28 * DAY_MS, { visit: 13 })]);
		expect(result.cohorts[0].windows.map(w => w.returned)).toEqual([1, 1, 0, 1]);
		expect(result.cohorts[0].windows.map(w => w.eligible)).toEqual([1, 1, 1, 1]);
	});
	it('uses each learner’s elapsed window, not the age of their cohort week', () => {
		const result = returns([event('answer_submitted', ago(7)), event('answer_submitted', ago(6), { user: 2 })], users(1, 2));
		expect(result).toMatchObject({ learners: 2, eligible: 1, pending: 1 });
	});
	it('excludes pre-tracking accounts from new cohorts while retaining their current practice counts', () => {
		const people = users(1); people[0].created_at = iso(ago(60));
		const result = returns([event('answer_submitted', ago(3))], people);
		expect(result).toMatchObject({ learners: 0, activeLearners: 1, outsideCohort: 1 });
	});
	it('does not count browsing, replays, or timer events as learning', () => {
		const result = returns([event('page_viewed', ago(10)), event('audio_replayed', ago(10)), event('lesson_active', ago(10), { metadata: { active_ms: 15000 } })]);
		expect(result).toMatchObject({ learners: 0, activeLearners: 0, secondSeconds: null });
	});
	it('keeps cohort history across the period boundary and counts UTC active days', () => {
		const result = returns([event('answer_submitted', ago(20)), event('answer_submitted', ago(1), { visit: 11 }), event('answer_submitted', ago(1) + 1000, { visit: 11 })], users(1), ago(7));
		expect(result).toMatchObject({ learners: 0, activeLearners: 1, medianVisits: 1, medianDays: 1 });
		expect(result.people[0].secondSeconds).toBe(19 * DAY_MS / 1000);
	});
	it('only counts an unfinished-attempt resume after an earlier distinct visit', () => {
		const t = ago(10), result = returns([event('lesson_started', t), event('lesson_resumed', t + 1), event('answer_submitted', t + 2),
			event('lesson_started', t + DAY_MS, { visit: 11 }), event('lesson_resumed', t + DAY_MS + 1, { visit: 11 }), event('answer_submitted', t + DAY_MS + 2, { visit: 11 })]);
		expect(result.resumedVisits).toBe(1);
	});
	it('recognizes continuing an open tab in a new visit without counting post-completion activity as a resume', () => {
		const t = ago(10), events = [event('lesson_begun', t), event('answer_submitted', t + 1),
			event('answer_submitted', t + DAY_MS, { visit: 11 }), event('lesson_attempt_completed', t + DAY_MS + 1, { visit: 11 }),
			event('answer_submitted', t + 2 * DAY_MS, { visit: 12 })];
		expect(returns(events).resumedVisits).toBe(1);
		expect(lessonReport(events).resumed).toBe(1);
	});
});

describe('content identification and privacy', () => {
	it('keeps unavailable durations distinct from measured zero', () => {
		expect(duration(undefined)).toBe('Not available'); expect(duration(NaN)).toBe('Not available');
		expect(duration(null)).toBe('Not available'); expect(duration(0)).toBe('0s');
	});
	it('changes for order, text, translation or hint changes and is stable across object property order', () => {
		expect(lessonVersion(JSON.parse(JSON.stringify(sentences)))).toBe(version);
		expect(lessonVersion([...sentences].reverse())).not.toBe(version);
		expect(lessonVersion([{ ...sentences[0], translation: 'Hi!' }, sentences[1]])).not.toBe(version);
		expect(lessonVersion([sentences[0], { ...sentences[1], hint: 'Different hint' }])).not.toBe(version);
	});
	it('allows bounded measurements and fingerprints, never arbitrary text masquerading as a version', () => {
		expect(safeMetadata({ lesson_version: version, insights_version: 3, active_ms: 15000 })).toEqual({ lesson_version: version, insights_version: 3, active_ms: 15000 });
		expect(safeMetadata({ lesson_version: 'private learner text', active_ms: 999999, transcript: 'secret' })).toEqual({});
	});
});
