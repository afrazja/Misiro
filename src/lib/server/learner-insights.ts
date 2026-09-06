import type { SupabaseClient } from '@supabase/supabase-js';
import { buildReport, type AnalyticsUser } from '$lib/analytics/report';
import type { StoredEvent } from '$lib/analytics/contract';
import { isAdminEmail } from './admin-auth';

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
export async function loadInsights(db: SupabaseClient | null, opts: { days: number; includeTests: boolean; selfId: string | null }) {
	if (!db) return { status: 'unavailable' as const, reason: 'Set SUPABASE_SERVICE_ROLE_KEY in the server environment to enable private, complete reports.', report: null };
	const now = Date.now();
	const snapshot = new Date(now).toISOString();
	try {
		const settings = await db.from('analytics_settings').select('installed_at, schema_version').eq('id', true).single();
		if (settings.error || settings.data?.schema_version !== 2) throw new Error('Apply supabase-learner-insights.sql to enable version 2 collection and reports.');
		const [profiles, exclusions, events, legacy] = await Promise.all([
			readAll<{ id: string; is_admin: boolean }>((from, to) => db.from('user_profiles').select('id, is_admin').order('id').range(from, to)),
			readAll<{ user_id: string }>((from, to) => db.from('analytics_exclusions').select('user_id').order('user_id').range(from, to)),
			readAll<StoredEvent>((from, to) => db.from('events').select('event_id,user_id,session_id,attempt_id,event_name,day,occurred_at,created_at,schema_version,metadata').eq('schema_version', 2).lte('created_at', snapshot).order('id').range(from, to)),
			db.from('events').select('id', { count: 'exact', head: true }).or('schema_version.is.null,schema_version.neq.2').lte('created_at', snapshot)
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
		return { status: 'ready' as const, reason: null, report: buildReport({ ...opts, now, users, events, exclusions: exclusions.map(e => e.user_id), installedAt: settings.data.installed_at, legacyCount: legacy.count }) };
	} catch (error) {
		return { status: 'unavailable' as const, reason: error instanceof Error ? error.message : 'Insights could not load. No partial totals are shown.', report: null };
	}
}
