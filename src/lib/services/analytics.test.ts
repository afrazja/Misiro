import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DAY_MS, VISIT_IDLE_MS } from '$lib/analytics/contract';
vi.mock('./acquisition', () => ({ collectAcquisition: vi.fn() }));
let analytics: typeof import('./analytics');
let sent: any[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
	vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-06T10:00:00Z'));
	vi.resetModules(); localStorage.clear();
	window.history.replaceState(null, '', '/lesson');
	sent = [];
	fetchMock = vi.fn(async (_url, init) => {
		sent.push(JSON.parse(init.body));
		return { ok: true };
	});
	vi.stubGlobal('fetch', fetchMock);
	analytics = await import('./analytics');
});
afterEach(() => { analytics.setAnalyticsUser(null); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function signIn(id = 'learner-1') {
	analytics.setAnalyticsUser(id);
	await Promise.resolve(); await analytics.flushAnalytics();
}
const events = () => sent.flatMap(batch => batch.events);

describe('versioned event collection', () => {
	it('starts a separate attempt when the authored dialogue changes', async () => {
		await signIn();
		const sentences = [{ id: 1, role: 'sent' as const, targetText: 'Hallo.', translation: 'Hello.' }];
		analytics.openLessonAttempt(1, 0, false, sentences);
		await analytics.trackEvent('lesson_begun');
		analytics.openLessonAttempt(1, 0, false, sentences); await analytics.flushAnalytics();
		analytics.openLessonAttempt(1, 0, false, [{ ...sentences[0], targetText: 'Guten Tag.' }]); await analytics.flushAnalytics();
		const starts = events().filter(e => e.event_name === 'lesson_started');
		expect(starts[0].attempt_id).toBe(starts[1].attempt_id);
		expect(starts[2].attempt_id).not.toBe(starts[0].attempt_id);
		expect(starts[2].metadata.lesson_version).not.toBe(starts[0].metadata.lesson_version);
		expect(JSON.stringify(events())).not.toContain('Guten Tag.');
	});
	it('caps foreground active time at the inactivity threshold without manufacturing new visits', async () => {
		vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
		vi.spyOn(document, 'hasFocus').mockReturnValue(true);
		await signIn(); analytics.openLessonAttempt(1, 0); await analytics.trackEvent('lesson_begun'); analytics.setAnalyticsStep(0);
		const stop = analytics.startAnalyticsListeners();
		await vi.advanceTimersByTimeAsync(120_000);
		const active = events().filter(e => e.event_name === 'lesson_active');
		expect(active.reduce((sum, e) => sum + e.metadata.active_ms, 0)).toBe(60_000);
		expect(active.every(e => e.metadata.active_ms <= 15_000 && e.metadata.index === 0)).toBe(true);
		expect(events().filter(e => e.event_name === 'visit_started')).toHaveLength(1);
		stop();
	});
	it('does not attribute background, paused, exam or post-completion time to the dialogue', async () => {
		let hidden = false;
		vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
		vi.spyOn(document, 'hasFocus').mockReturnValue(true);
		await signIn(); analytics.openLessonAttempt(1, 0); await analytics.trackEvent('lesson_begun'); analytics.setAnalyticsStep(0);
		const stop = analytics.startAnalyticsListeners();
		await vi.advanceTimersByTimeAsync(15_000);
		hidden = true; document.dispatchEvent(new Event('visibilitychange'));
		await vi.advanceTimersByTimeAsync(30_000);
		hidden = false; analytics.pauseLessonAnalytics();
		await analytics.trackEvent('answer_submitted', { metadata: { mode: 'exam', correct: true } });
		await vi.advanceTimersByTimeAsync(15_000);
		expect(events().find(e => e.event_name === 'answer_submitted').attempt_id).toBeNull();
		analytics.setAnalyticsStep(1); await vi.advanceTimersByTimeAsync(15_000);
		analytics.completeLessonAttempt(1, 2, false); await vi.advanceTimersByTimeAsync(30_000);
		expect(events().filter(e => e.event_name === 'lesson_active').reduce((n, e) => n + e.metadata.active_ms, 0)).toBe(30_000);
		stop();
	});
	it('counts one visit across navigation and renewals, then a new visit after inactivity', async () => {
		await signIn();
		await analytics.trackEvent('page_viewed');
		analytics.setAnalyticsUser('learner-1');
		expect(events().filter(e => e.event_name === 'visit_started')).toHaveLength(1);
		vi.setSystemTime(Date.now() + VISIT_IDLE_MS);
		await analytics.trackEvent('page_hidden');
		expect(events().filter(e => e.event_name === 'visit_started')).toHaveLength(1);
		await analytics.trackEvent('page_returned');
		expect(events().filter(e => e.event_name === 'visit_started')).toHaveLength(2);
	});
	it('preserves an attempt on resume, completes once, and separates a restart', async () => {
		await signIn(); analytics.openLessonAttempt(1, 0);
		await analytics.trackEvent('lesson_begun');
		analytics.openLessonAttempt(1, 3);
		await analytics.trackEvent('answer_submitted', { metadata: { correct: true, mode: 'lesson' } });
		analytics.completeLessonAttempt(1, 9, false); analytics.completeLessonAttempt(1, 9, false);
		await analytics.flushAnalytics();
		const opened = events().filter(e => e.event_name === 'lesson_started');
		expect(opened[1].attempt_id).toBe(opened[0].attempt_id);
		expect(events().filter(e => e.event_name === 'lesson_attempt_completed')).toHaveLength(1);
		analytics.openLessonAttempt(1, 0, true); await analytics.flushAnalytics();
		expect(events().filter(e => e.event_name === 'lesson_started').at(-1).attempt_id).not.toBe(opened[0].attempt_id);
	});
	it('retains HTTP failures and retries identical IDs without copying learner text', async () => {
		await signIn(); sent = [];
		fetchMock.mockImplementationOnce(async (_url, init) => { sent.push(JSON.parse(init.body)); return { ok: false }; });
		await analytics.trackEvent('answer_submitted', { day: 1, metadata: { index: 2, correct: false, transcript: 'private sentence', url: '/?secret=x', language: 'email@example.com' } });
		expect([...Array(localStorage.length)].map((_, i) => localStorage.key(i)).some(k => k?.includes('event:learner-1:'))).toBe(true);
		await analytics.flushAnalytics();
		expect(sent[0].events[0].event_id).toBe(sent[1].events[0].event_id);
		expect(JSON.stringify(sent)).not.toContain('private sentence');
		expect(JSON.stringify(sent)).not.toContain('secret');
		expect(sent[0].events[0].metadata).not.toHaveProperty('transcript');
	});
	it('never records anonymous or admin-page activity', async () => {
		await analytics.trackEvent('lesson_started'); expect(fetchMock).not.toHaveBeenCalled();
		window.history.replaceState(null, '', '/admin'); await signIn();
		await analytics.trackEvent('lesson_started'); expect(fetchMock).not.toHaveBeenCalled();
	});
	it('isolates pending events when the signed-in account changes', async () => {
		await signIn(); fetchMock.mockResolvedValue({ ok: false });
		await analytics.trackEvent('lesson_begun');
		sent = []; fetchMock.mockImplementation(async (_url, init) => { sent.push(JSON.parse(init.body)); return { ok: true }; });
		await signIn('learner-2');
		expect(sent.every(batch => batch.user_id === 'learner-2')).toBe(true);
		expect(events().some(e => e.event_name === 'lesson_begun')).toBe(false);
	});
	it('recovers pending events and the visit across a module reload', async () => {
		await signIn(); fetchMock.mockResolvedValue({ ok: false });
		await analytics.trackEvent('lesson_begun');
		const priorId = events().find(e => e.event_name === 'visit_started').session_id;
		analytics.setAnalyticsUser(null); vi.resetModules();
		analytics = await import('./analytics');
		sent = []; fetchMock.mockImplementation(async (_url, init) => { sent.push(JSON.parse(init.body)); return { ok: true }; });
		await signIn();
		expect(events().find(e => e.event_name === 'lesson_begun').session_id).toBe(priorId);
		expect(events().filter(e => e.event_name === 'visit_started')).toHaveLength(0);
	});
});
