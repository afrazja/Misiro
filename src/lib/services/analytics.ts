import { safeMetadata, SCHEMA_VERSION, VISIT_IDLE_MS, DAY_MS, type AnalyticsEvent, type AnalyticsRecord, type ObstacleCode } from '$lib/analytics/contract';
import { lessonVersion } from '$lib/analytics/lesson-content';
import type { Sentence } from '$stores/lesson';
export type { AnalyticsEvent } from '$lib/analytics/contract';

interface TrackOptions { day?: number; metadata?: Record<string, unknown>; }
interface Visit { id: string; touched: number; sequence: number; }
interface Attempt { id: string; day: number; begun: boolean; completed: boolean; version?: string; }
let identity: string | null = null;
let attempt: Attempt | null = null;
let step: number | undefined;
let visit: Visit | null = null;
let pending = new Map<string, AnalyticsRecord>();
let inFlight: Promise<void> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 10_000;
const PREFIX = 'mirifer_insights_v2:';
let activityAt = 0, sampledAt = 0;
let lessonPaused = true;

/** Only observed foreground dialogue time; hidden, idle and suspended intervals are excluded. */
function sampleActivity() {
	const now = Date.now(), elapsed = now - sampledAt;
	const activeMs = Math.max(0, Math.min(now, activityAt + 60_000) - sampledAt);
	sampledAt = now;
	if (!sampledAt || elapsed <= 0 || elapsed > 20_000 || !canTrack() || lessonPaused ||
		!attempt?.begun || attempt.completed || document.hidden || !document.hasFocus() || activeMs <= 0) return;
	void trackEvent('lesson_active', { metadata: { active_ms: Math.min(15_000, activeMs), mode: 'lesson' } });
}
function noteActivity() {
	const now = Date.now();
	if (now > activityAt + 60_000) { sampleActivity(); sampledAt = now; }
	activityAt = now;
}
export function pauseLessonAnalytics(paused = true) {
	sampleActivity();
	lessonPaused = paused;
	activityAt = sampledAt = Date.now();
}

function read<T>(key: string): T | null {
	try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch { return null; }
}
function write(key: string, value: unknown) {
	try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* memory fallback */ }
}
function eventKey(user: string, id: string) { return `${PREFIX}event:${user}:${id}`; }
function pageName(): string {
	const part = window.location.pathname.split('/')[1] || 'home';
	return typeof safeMetadata({ page: part }).page === 'string' ? part : 'other';
}
function environment() {
	const ua = navigator.userAgent;
	return {
		page: pageName(),
		device: /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android/i.test(ua) ? 'mobile' : 'desktop',
		browser: /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other',
		language: ['en', 'fa'].includes(document.documentElement.lang) ? document.documentElement.lang : 'other'
	};
}
function canTrack() {
	return typeof window !== 'undefined' && !!identity && !window.location.pathname.startsWith('/admin');
}
function persistEvent(event: AnalyticsRecord) {
	pending.set(event.event_id, event);
	try { localStorage.setItem(eventKey(identity!, event.event_id), JSON.stringify(event)); } catch { /* memory fallback */ }
	// Bounded offline storage. Old unsent events are explicitly best effort, never invented later.
	while (pending.size > 500) {
		const oldest = pending.keys().next().value!;
		pending.delete(oldest);
		try { localStorage.removeItem(eventKey(identity!, oldest)); } catch { /* unavailable */ }
	}
}
function record(event: AnalyticsEvent, opts: TrackOptions = {}) {
	const lessonContext = pageName() === 'lesson' && attempt && (opts.day === undefined || opts.day === attempt.day)
		&& (!lessonPaused || opts.metadata?.mode === 'lesson' || ['lesson_started', 'lesson_resumed', 'lesson_begun', 'lesson_attempt_completed'].includes(event));
	visit!.sequence = (visit!.sequence || 0) + 1;
	write(`visit:${identity}`, visit);
	persistEvent({
		event_id: crypto.randomUUID(), session_id: visit!.id,
		attempt_id: lessonContext ? attempt!.id : null,
		event_name: event, day: opts.day ?? (lessonContext ? attempt!.day : null),
		occurred_at: new Date().toISOString(), schema_version: SCHEMA_VERSION,
		metadata: safeMetadata({ ...environment(), insights_version: 3, sequence: visit!.sequence,
			...(lessonContext ? { mode: 'lesson', lesson_version: attempt!.version, ...(step !== undefined ? { index: step } : {}) } : {}), ...opts.metadata })
	});
}
function touchVisit() {
	const now = Date.now();
	const stored = read<Visit>(`visit:${identity}`);
	if (stored?.id && now - stored.touched < VISIT_IDLE_MS && now >= stored.touched) visit = stored;
	const fresh = !visit || now - visit.touched >= VISIT_IDLE_MS || now < visit.touched;
	if (fresh) visit = { id: crypto.randomUUID(), touched: now, sequence: 0 };
	visit!.touched = now;
	write(`visit:${identity}`, visit);
	if (fresh) record('visit_started');
}

/** Set from the existing auth subscription, without making an auth request inside its callback. */
export function setAnalyticsUser(userId: string | null) {
	if (identity === userId) return;
	sampleActivity();
	identity = userId;
	attempt = null; step = undefined; visit = null; pending = new Map();
	lessonPaused = true; activityAt = sampledAt = 0;
	if (retry) clearTimeout(retry);
	retry = null;
	if (!userId || typeof window === 'undefined') return;
	try {
		const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
		for (const key of keys) {
			if (!key.startsWith(`${PREFIX}event:`)) continue;
			try {
				const e = JSON.parse(localStorage.getItem(key)!);
				if (!Number.isFinite(Date.parse(e.occurred_at)) || Date.parse(e.occurred_at) < Date.now() - 7 * DAY_MS) localStorage.removeItem(key);
				else if (key.startsWith(`${PREFIX}event:${userId}:`)) pending.set(e.event_id, e);
			} catch { localStorage.removeItem(key); }
		}
	} catch { /* storage unavailable */ }
	// Defer network work until Supabase's auth callback has returned.
	queueMicrotask(() => { void trackEvent('page_viewed'); });
}

/** Events are queued synchronously before any asynchronous work can change their context. */
export async function trackEvent(event: AnalyticsEvent, opts: TrackOptions = {}): Promise<void> {
	if (!canTrack()) return;
	try {
		if (event === 'page_hidden' && (!visit || Date.now() - visit.touched >= VISIT_IDLE_MS)) return;
		touchVisit();
		if (event === 'lesson_begun' && attempt) {
			activityAt = sampledAt = Date.now();
			attempt.begun = true;
			write(`attempt:${identity}:${attempt.day}`, attempt);
		}
		if (['answer_submitted', 'step_skipped', 'hint_opened', 'answer_revealed', 'audio_replayed'].includes(event)) noteActivity();
		record(event, opts);
		await flushAnalytics();
	} catch { /* tracking must never stop practice */ }
}
export function openLessonAttempt(day: number, index: number, restart = false, sentences?: Sentence[]) {
	if (!canTrack()) return;
	sampleActivity();
	const saved = read<Attempt>(`attempt:${identity}:${day}`);
	const version = sentences ? lessonVersion(sentences) : undefined;
	const resume = !restart && saved && !saved.completed && saved.version === version;
	attempt = resume ? saved : { id: crypto.randomUUID(), day, begun: false, completed: false, version };
	lessonPaused = true; activityAt = sampledAt = Date.now();
	step = index;
	write(`attempt:${identity}:${day}`, attempt);
	void trackEvent('lesson_started', { day, metadata: { index, resumed: !!resume || index > 0 } });
	if (resume || index > 0) void trackEvent('lesson_resumed', { day, metadata: { index } });
}
export function setAnalyticsStep(index: number) {
	sampleActivity(); step = index; lessonPaused = false; activityAt = sampledAt = Date.now();
}
export function completeLessonAttempt(day: number, sentenceCount: number, replay: boolean) {
	if (!attempt || attempt.day !== day || attempt.completed) return;
	sampleActivity();
	attempt.completed = true;
	write(`attempt:${identity}:${day}`, attempt);
	void trackEvent('lesson_attempt_completed', { day, metadata: { sentenceCount, replay } });
}
export function clearLessonContext() { sampleActivity(); attempt = null; step = undefined; lessonPaused = true; }
export function trackObstacle(code: ObstacleCode, metadata: Record<string, unknown> = {}) {
	void trackEvent('obstacle', { metadata: { ...metadata, code } });
}

/** Retry the same UUIDs; the database ignores duplicates even after a lost response. */
export function flushAnalytics(): Promise<void> {
	if (inFlight) return inFlight;
	if (!identity || !pending.size || !navigator.onLine) return Promise.resolve();
	const owner = identity;
	const queue = pending;
	inFlight = (async () => {
		try {
			while (queue.size && identity === owner) {
				const batch = [...queue.values()].filter(e => Date.parse(e.occurred_at) >= Date.now() - 7 * DAY_MS).slice(0, 40);
				if (!batch.length) break;
				const response = await fetch('/api/analytics', {
					method: 'POST', credentials: 'same-origin', keepalive: true,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ user_id: owner, events: batch })
				});
				if (!response.ok) throw new Error('Collection unavailable');
				for (const e of batch) {
					queue.delete(e.event_id);
					try { localStorage.removeItem(eventKey(owner, e.event_id)); } catch { /* memory fallback */ }
				}
				retryDelay = 10_000;
			}
		} catch {
			// Resolved HTTP errors are failures too; keep data until a later successful delivery.
		} finally {
			inFlight = null;
			if (pending.size && identity && !retry) {
				retry = setTimeout(() => { retry = null; void flushAnalytics(); }, retryDelay);
				retryDelay = Math.min(60_000, retryDelay * 2);
			}
		}
	})();
	return inFlight;
}
export function startAnalyticsListeners() {
	const online = () => { void flushAnalytics(); };
	const visibility = () => { sampleActivity(); sampledAt = Date.now(); void trackEvent(document.hidden ? 'page_hidden' : 'page_returned'); };
	const heartbeat = setInterval(sampleActivity, 15_000);
	window.addEventListener('online', online);
	window.addEventListener('pointerdown', noteActivity, { passive: true });
	window.addEventListener('keydown', noteActivity);
	window.addEventListener('focus', noteActivity);
	document.addEventListener('visibilitychange', visibility);
	return () => {
		sampleActivity(); clearInterval(heartbeat);
		window.removeEventListener('online', online);
		window.removeEventListener('pointerdown', noteActivity);
		window.removeEventListener('keydown', noteActivity);
		window.removeEventListener('focus', noteActivity);
		document.removeEventListener('visibilitychange', visibility);
		if (retry) clearTimeout(retry);
		retry = null;
	};
}
