import { VISIT_IDLE_MS, type StoredEvent } from './contract';
import type { LessonContent } from './lesson-content';
import { distinct, median } from './statistics';

const at = (e: StoredEvent) => Date.parse(e.occurred_at);
const reachNames = new Set(['lesson_progress', 'sentence_practice_opened']);
const sentenceNames = new Set(['lesson_progress', 'sentence_practice_opened', 'answer_submitted', 'step_skipped',
	'hint_opened', 'answer_revealed', 'audio_replayed', 'obstacle', 'lesson_active']);
const lessonEvent = (e: StoredEvent) => e.metadata.mode === 'lesson' ||
	(e.metadata.insights_version !== 3 && e.metadata.mode === undefined && e.metadata.page === 'lesson');
const position = (e: StoredEvent): number | null => typeof e.metadata.index === 'number' &&
	Number.isInteger(e.metadata.index) && e.metadata.index >= 0 && e.metadata.index < 10_000 ? e.metadata.index : null;

interface Attempt {
	id: string; userId: string; day: number; version: string;
	opened: StoredEvent; begun: StoredEvent | null; events: StoredEvent[];
	completed: boolean; resumed: boolean; enhanced: boolean; activeSeconds: number | null;
}

/** Attempt cohorts use the first observed Start. Follow-up events are read through the snapshot. */
export function buildLessonReport(events: StoredEvent[], catalog: LessonContent[], since: number, now: number, catalogError: string | null = null) {
	const byAttempt = new Map<string, StoredEvent[]>();
	for (const e of events) {
		if (!e.attempt_id || !e.day || at(e) > now || !lessonEvent(e)) continue;
		const key = `${e.user_id}:${e.attempt_id}`;
		const rows = byAttempt.get(key) ?? []; rows.push(e); byAttempt.set(key, rows);
	}
	const attempts: Attempt[] = [];
	let missingStart = 0, inconsistentAttempts = 0;
	for (const [id, rows] of byAttempt) {
		const begunIndex = rows.findIndex(e => e.event_name === 'lesson_begun');
		const begun = begunIndex >= 0 ? rows[begunIndex] : null;
		if (!begun) { if (rows.some(e => at(e) >= since)) missingStart++; continue; }
		if (at(begun) < since) continue;
		// Bad or mixed contexts cannot become a deceptively complete lesson cohort.
		if (distinct(rows.map(e => e.day)) !== 1) { inconsistentAttempts++; continue; }
		const followup = rows.slice(begunIndex);
		const versions = [...new Set(rows.map(e => String(e.metadata.lesson_version ?? 'unknown')))];
		const version = versions.length === 1 ? versions[0] : 'mixed';
		const completedIndex = followup.findIndex(e => e.event_name === 'lesson_attempt_completed');
		// Events after a finished attempt do not turn post-lesson practice into completion evidence.
		const relevant = completedIndex >= 0 ? followup.slice(0, completedIndex + 1) : followup;
		const active = relevant.filter(e => e.event_name === 'lesson_active' && typeof e.metadata.active_ms === 'number');
		const earlierVisits = new Set<string>();
		let resumed = false;
		for (const e of relevant) {
			if (['lesson_resumed', 'lesson_progress', 'sentence_practice_opened', 'answer_submitted', 'lesson_attempt_completed'].includes(e.event_name) &&
				[...earlierVisits].some(v => v !== e.session_id)) resumed = true;
			earlierVisits.add(e.session_id);
		}
		attempts.push({ id, userId: begun.user_id, day: begun.day!, version, opened: rows[0], begun,
			events: relevant, completed: completedIndex >= 0, resumed,
			enhanced: begun.metadata.insights_version === 3 && version !== 'mixed',
			activeSeconds: active.length ? active.reduce((sum, e) => sum + Number(e.metadata.active_ms), 0) / 1000 : null });
	}
	const groups = new Map<string, { day: number; version: string; attempts: Attempt[] }>();
	for (const item of catalog) groups.set(`${item.day}:${item.version}`, { day: item.day, version: item.version, attempts: [] });
	for (const attempt of attempts) {
		const key = `${attempt.day}:${attempt.version}`;
		const group = groups.get(key) ?? { day: attempt.day, version: attempt.version, attempts: [] };
		group.attempts.push(attempt); groups.set(key, group);
	}
	const lessons = [...groups.entries()].map(([key, group]) => {
		const current = catalog.find(l => l.day === group.day);
		const content = current?.version === group.version ? current : null;
		const runs = group.attempts;
		const completed = runs.filter(a => a.completed);
		const activeSamples = completed.flatMap(a => a.enhanced && a.activeSeconds !== null ? [a.activeSeconds] : []);
		const allEvents = runs.flatMap(a => a.events);
		const indices = new Set(content?.sentences.map((_, i) => i) ?? []);
		for (const e of allEvents) { const i = position(e); if (i !== null && sentenceNames.has(e.event_name)) indices.add(i); }
		const sentences = [...indices].sort((a, b) => a - b).map(index => {
			const rows = runs.map(a => ({ attempt: a, events: a.events.filter(e => position(e) === index && sentenceNames.has(e.event_name)) }))
				.filter(row => row.events.some(e => reachNames.has(e.event_name)));
			const enhanced = rows.filter(r => r.attempt.enhanced && r.events.some(e => reachNames.has(e.event_name) && e.metadata.insights_version === 3));
			const answerRows = rows.filter(r => r.events.some(e => e.event_name === 'answer_submitted'));
			const answered = answerRows.filter(r => typeof r.events.find(e => e.event_name === 'answer_submitted')?.metadata.correct === 'boolean');
			const repeated = answerRows.filter(r => r.events.filter(e => e.event_name === 'answer_submitted').length > 1);
			const firstCorrect = answered.filter(r => r.events.find(e => e.event_name === 'answer_submitted')?.metadata.correct === true);
			const timeSamples = enhanced.flatMap(r => {
				const samples = r.events.filter(e => e.event_name === 'lesson_active' && typeof e.metadata.active_ms === 'number');
				return samples.length ? [samples.reduce((sum, e) => sum + Number(e.metadata.active_ms), 0) / 1000] : [];
			});
			const signal = (name: string, source = rows) => ({
				count: source.reduce((sum, r) => sum + r.events.filter(e => e.event_name === name).length, 0),
				learners: distinct(source.filter(r => r.events.some(e => e.event_name === name)).map(r => r.attempt.userId))
			});
			const lastObserved = rows.filter(r => !r.attempt.completed && at(r.attempt.events.at(-1)!) <= now - VISIT_IDLE_MS &&
				position(r.attempt.events.filter(e => reachNames.has(e.event_name)).at(-1) ?? r.attempt.events.at(-1)!) === index);
			const text = content?.sentences[index];
			return { index, text: text ? (text.role === 'received' ? text.audioText : text.targetText) ?? '' : null,
				translation: text?.translation ?? null, role: text?.role ?? null,
				reached: distinct(rows.map(r => r.attempt.userId)), reachedAttempts: rows.length,
				measured: distinct(enhanced.map(r => r.attempt.userId)), measuredAttempts: enhanced.length,
				answeredAttempts: answered.length, firstCorrect: firstCorrect.length,
				activeSeconds: median(timeSamples), activeSamples: timeSamples.length,
				repeated: distinct(repeated.map(r => r.attempt.userId)), repeatedAttempts: repeated.length,
				retries: answerRows.reduce((sum, r) => sum + Math.max(0, r.events.filter(e => e.event_name === 'answer_submitted').length - 1), 0),
				skips: signal('step_skipped'), hints: signal('hint_opened', enhanced), reveals: signal('answer_revealed', enhanced),
				replays: signal('audio_replayed', enhanced), obstacles: signal('obstacle'),
				lastObserved: lastObserved.length, userIds: [...new Set(rows.map(r => r.attempt.userId))],
				exampleIds: [...new Set([...lastObserved, ...repeated, ...rows.filter(r => r.events.some(e => e.event_name === 'obstacle'))].map(r => r.attempt.userId))] };
		});
		return { key, day: group.day, version: group.version, title: current?.title ?? `Day ${group.day}`,
			contentMatches: !!content, attempts: runs.length, learners: distinct(runs.map(a => a.userId)),
			completed: completed.length, resumed: runs.filter(a => a.resumed).length,
			incomplete: runs.filter(a => !a.completed).length,
			activeSeconds: median(activeSamples), activeSamples: activeSamples.length,
			enhancedAttempts: runs.filter(a => a.enhanced).length,
			skips: sentences.reduce((n, s) => n + s.skips.count, 0), retries: sentences.reduce((n, s) => n + s.retries, 0),
			obstacleLearners: distinct(runs.filter(a => a.events.some(e => e.event_name === 'obstacle')).map(a => a.userId)),
			sentences, userIds: [...new Set(runs.map(a => a.userId))] };
	}).sort((a, b) => a.day - b.day || b.attempts - a.attempts || a.version.localeCompare(b.version));
	return { lessons, missingStart, inconsistentAttempts, catalogError,
		started: attempts.length, completed: attempts.filter(a => a.completed).length,
		learners: distinct(attempts.map(a => a.userId)), resumed: attempts.filter(a => a.resumed).length,
		firstEnhancedEvent: events.find(e => e.metadata.insights_version === 3 && e.metadata.lesson_version)?.occurred_at ?? null };
}
export type LessonReport = ReturnType<typeof buildLessonReport>;
