import { describe, expect, it } from 'vitest';
import { buildReport, type ReportInput } from './report';
import { DAY_MS, type StoredEvent, type AnalyticsEvent } from './contract';
const now = Date.parse('2026-09-06T12:00:00Z');
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let index = 0;
function event(user: number, name: AnalyticsEvent, dayAgo: number, visit = 10, attempt = 20, metadata: Record<string, string | number | boolean> = {}): StoredEvent {
	const occurred = new Date(now - dayAgo * DAY_MS + index * 1000).toISOString();
	return { user_id: uuid(user), event_id: uuid(++index + 100), session_id: uuid(visit), attempt_id: uuid(attempt), event_name: name, occurred_at: occurred, created_at: occurred, schema_version: 2, day: 1, metadata: { mode: 'lesson', ...metadata } };
}
function input(): ReportInput {
	index = 0;
	return { now, days: 30, includeTests: false, selfId: uuid(9), exclusions: [uuid(8)], installedAt: new Date(now - 20 * DAY_MS).toISOString(), legacyCount: 57,
		users: [1, 2, 8, 9].map(id => ({ id: uuid(id), created_at: new Date(now - (id === 2 ? 2 : 12) * DAY_MS).toISOString(), is_admin: id === 9 })),
		events: [event(9, 'page_viewed', 19, 90), ...['visit_started', 'lesson_started', 'lesson_begun', 'mic_requested', 'obstacle', 'mic_requested', 'mic_ready', 'answer_submitted', 'page_hidden'].map(name => event(1, name as AnalyticsEvent, 10, 10, 20, name === 'obstacle' ? { code: 'mic_denied' } : name === 'answer_submitted' ? { correct: false } : {})), event(1, 'visit_started', 9, 11), event(1, 'lesson_started', 9, 11), event(1, 'lesson_resumed', 9, 11), event(1, 'answer_submitted', 9, 11, 20, { correct: true }), event(1, 'lesson_attempt_completed', 9, 11), event(2, 'visit_started', 1, 12, 22), event(2, 'answer_submitted', 1, 12, 22), event(8, 'obstacle', 1, 18, 28, { code: 'mic_denied' })]
	};
}
describe('learner insights calculations', () => {
	it('follows denial → retry → answer → leave → resume → completion → return without inflating the funnel', () => {
		const report = buildReport(input());
		expect(report.visitors).toBe(2); expect(report.visits).toBe(3);
		expect(report.funnel.map(s => s.count)).toEqual([2, 2, 1, 1, 1, 0]);
		expect(report.eventual).toBe(1);
		expect(report.eligible).toBe(1); expect(report.returned).toBe(1);
		expect(report.obstacles.find(o => o.code === 'mic_denied')?.affected).toBe(1);
		expect(report.incorrectAnswers).toBe(1);
		expect(report.learners.find(l => l.id === uuid(1))?.attempts).toBe(1);
		expect(report.quality.legacyCount).toBe(57);
	});
	it('omits duplicate IDs, excludes test users by default, and exposes both checks', () => {
		const data = input(); data.events.push(data.events[1]);
		const report = buildReport(data);
		expect(report.quality.duplicates).toBe(1); expect(report.quality.excludedUsers).toBe(2);
		expect(buildReport({ ...data, includeTests: true }).visitors).toBe(4);
	});
	it('does not count completion from another attempt or a later visit as first-visit activation', () => {
		const data = input(); data.events.push(event(1, 'lesson_attempt_completed', 10, 10, 99));
		expect(buildReport(data).funnel[5].count).toBe(0);
	});
	it('uses sequence to order events captured in the same millisecond', () => {
		const data = input();
		const names: AnalyticsEvent[] = ['lesson_started', 'lesson_begun', 'answer_submitted', 'lesson_attempt_completed'];
		const rows = names.map((name, sequence) => ({ ...event(2, name, 1, 12, 22, { sequence }), occurred_at: new Date(now - DAY_MS + 30_000).toISOString() }));
		data.events.push(...rows.toReversed());
		expect(buildReport(data).funnel[5].count).toBe(1);
	});
	it('never treats a young cohort as zero return or legacy events as complete visits', () => {
		const data = input(); data.events = data.events.filter(e => e.user_id !== uuid(1));
		const report = buildReport(data);
		expect(report.eligible).toBe(0); expect(report.returned).toBe(0);
		expect(report.visits).toBe(1);
	});
});
