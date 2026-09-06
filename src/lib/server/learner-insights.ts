import type { SupabaseClient } from '@supabase/supabase-js';
import { buildReport, type AnalyticsUser } from '$lib/analytics/report';
import type { StoredEvent } from '$lib/analytics/contract';
import { isAdminEmail } from './admin-auth';
import { lessonVersion, type LessonContent } from '$lib/analytics/lesson-content';
import { SentenceRowSchema } from '$lib/schemas/lesson.schema';
import type { Sentence } from '$stores/lesson';
import { AssessmentSchema, AcquisitionSchema, ChangeSchema, unavailablePhaseThree, type PhaseThreeData } from '$lib/analytics/phase-three';

/** Advance by rows actually received: Supabase projects can have a smaller API row cap. */
export async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, cap = 100_000): Promise<T[]> {
	const rows: T[] = [];
	for (;;) {
		const response = await query(rows.length, rows.length + 999);
		if (response.error || !response.data) throw new Error('A database query failed. Check table permissions and the insights migration.');
		if (!response.data.length) return rows;
		rows.push(...response.data);
		if (rows.length >= cap) throw new Error('The report exceeds its safe query limit. Add database aggregation before using these totals.');
	}
}

export async function loadLessonCatalog(db: SupabaseClient): Promise<{ catalog: LessonContent[]; catalogError: string | null }> {
	try {
		const [lessons, rows] = await Promise.all([
			readAll<{ id: string; day: number; title: string }>((from, to) => db.from('lessons').select('id,day,title').order('id').range(from, to)),
			readAll<Record<string, unknown>>((from, to) => db.from('sentences')
				.select('id,lesson_id,sentence_order,role,audio_text,target_text,translation,translation_fa,hint,hint_fa,difficulty').order('id').range(from, to))
		]);
		const sentences = new Map<string, Sentence[]>();
		for (const row of rows) {
			const parsed = SentenceRowSchema.safeParse(row);
			if (!parsed.success || typeof row.lesson_id !== 'string') throw new Error('Invalid lesson content');
			const s = parsed.data, list = sentences.get(row.lesson_id) ?? [];
			list.push({ id: s.sentence_order + 1, role: s.role, audioText: s.audio_text ?? undefined,
				targetText: s.target_text ?? undefined, translation: s.translation, translationFa: s.translation_fa ?? undefined,
				hint: s.hint ?? undefined, hintFa: s.hint_fa ?? undefined, difficulty: s.difficulty ?? undefined });
			sentences.set(row.lesson_id, list);
		}
		return { catalog: lessons.map(l => {
			if (!Number.isInteger(l.day) || typeof l.title !== 'string') throw new Error('Invalid lesson metadata');
			const ordered = (sentences.get(l.id) ?? []).sort((a, b) => a.id - b.id);
			return { day: l.day, title: l.title, version: lessonVersion(ordered), sentences: ordered };
		}), catalogError: null };
	} catch {
		return { catalog: [], catalogError: 'Current lesson content could not be loaded completely. Event counts remain available; no sentence text has been matched.' };
	}
}
export async function loadPhaseThree(db: SupabaseClient): Promise<PhaseThreeData> {
	try {
		const [assessments, acquisition, changes] = await Promise.all([
			readAll<Record<string, unknown>>((from, to) => db.from('analytics_assessments').select('*').order('id').range(from, to)),
			readAll<Record<string, unknown>>((from, to) => db.from('analytics_acquisition').select('*').order('user_id').range(from, to)),
			readAll<Record<string, unknown>>((from, to) => db.from('analytics_changes').select('*').order('id').range(from, to))
		]);
		return { assessments: assessments.map(a => AssessmentSchema.parse(a)), acquisition: acquisition.map(a => AcquisitionSchema.parse(a)), changes: changes.map(c => ChangeSchema.parse(c)), error: null };
	} catch { return unavailablePhaseThree(); }
}
export async function loadInsights(db: SupabaseClient | null, opts: { days: number; includeTests: boolean; selfId: string | null }) {
	if (!db) return { status: 'unavailable' as const, reason: 'Set SUPABASE_SERVICE_ROLE_KEY in the server environment to enable private, complete reports.', report: null };
	const now = Date.now();
	const snapshot = new Date(now).toISOString();
	try {
		const settings = await db.from('analytics_settings').select('installed_at, schema_version').eq('id', true).single();
		if (settings.error || settings.data?.schema_version !== 2) throw new Error('Apply supabase-learner-insights.sql to enable version 2 collection and reports.');
		const [profiles, exclusions, events, legacy, content, phaseThree] = await Promise.all([
			readAll<{ id: string; is_admin: boolean }>((from, to) => db.from('user_profiles').select('id, is_admin').order('id').range(from, to)),
			readAll<{ user_id: string }>((from, to) => db.from('analytics_exclusions').select('user_id').order('user_id').range(from, to)),
			readAll<StoredEvent>((from, to) => db.from('events').select('event_id,user_id,session_id,attempt_id,event_name,day,occurred_at,created_at,schema_version,metadata').eq('schema_version', 2).lte('created_at', snapshot).order('id').range(from, to)),
			db.from('events').select('id', { count: 'exact', head: true }).or('schema_version.is.null,schema_version.neq.2').lte('created_at', snapshot),
			loadLessonCatalog(db), loadPhaseThree(db)
		]);
		if (legacy.error || legacy.count === null) throw new Error('Historical event coverage could not be checked.');
		const users: AnalyticsUser[] = [];
		for (let page = 1; ; page++) {
			const result = await db.auth.admin.listUsers({ page, perPage: 1000 });
			if (result.error) throw new Error('Account list unavailable. Check the server service role key.');
			for (const u of result.data.users) {
				if (Date.parse(u.created_at) <= now) users.push({ id: u.id, created_at: u.created_at, is_admin: isAdminEmail(u.email) || !!profiles.find(p => p.id === u.id)?.is_admin });
			}
			if (!result.data.nextPage || !result.data.users.length) break;
			if (page >= 100) throw new Error('The account query is incomplete; totals are unavailable.');
		}
		return { status: 'ready' as const, reason: null, report: buildReport({ ...opts, ...content, phaseThree, now, users, events, exclusions: exclusions.map(e => e.user_id), installedAt: settings.data.installed_at, legacyCount: legacy.count }) };
	} catch (error) {
		return { status: 'unavailable' as const, reason: error instanceof Error ? error.message : 'Insights could not load. No partial totals are shown.', report: null };
	}
}
