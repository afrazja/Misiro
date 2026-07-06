import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	checkAdminCredentials,
	setAdminCookie,
	clearAdminCookie
} from '$lib/server/admin-auth';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Service-role client (bypasses RLS) for cross-user analytics, when the key
 *  is configured. Falls back to the request-scoped client otherwise. */
function serviceClient(): SupabaseClient | null {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key || url.includes('placeholder')) return null;
	return createClient(url, key, { auth: { persistSession: false } });
}

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { authorized } = await parent();
	if (!authorized) {
		return { authorized: false as const };
	}

	const svc = serviceClient();
	const db = svc ?? locals.supabase;

	// ── Content stats ────────────────────────────────────────────────
	const [lessons, sentences, categories, words, glossary] = await Promise.all([
		locals.supabase.from('lessons').select('*', { count: 'exact', head: true }),
		locals.supabase.from('sentences').select('*', { count: 'exact', head: true }),
		locals.supabase.from('basics_categories').select('*', { count: 'exact', head: true }),
		locals.supabase.from('basics_words').select('*', { count: 'exact', head: true }),
		locals.supabase.from('glossary').select('*', { count: 'exact', head: true })
	]);

	// ── Usage stats (needs service role for cross-user visibility) ──
	const since14 = new Date(Date.now() - 14 * DAY_MS).toISOString();
	const since7 = Date.now() - 7 * DAY_MS;

	const [usersRes, eventsRes] = await Promise.all([
		db.from('user_profiles').select('*', { count: 'exact', head: true }),
		db
			.from('events')
			.select('user_id, event_name, created_at')
			.gte('created_at', since14)
			.order('created_at', { ascending: false })
			.limit(10000)
	]);

	const events = (eventsRes.data ?? []) as Array<{
		user_id: string;
		event_name: string;
		created_at: string;
	}>;

	const active7 = new Set<string>();
	let lessonsCompleted7 = 0;
	let examsCompleted7 = 0;
	let conversations7 = 0;

	// Events per day for the last 14 days (oldest → newest)
	const perDay: Array<{ date: string; count: number }> = [];
	const perDayMap = new Map<string, number>();
	for (let i = 13; i >= 0; i--) {
		const d = new Date(Date.now() - i * DAY_MS);
		const key = d.toISOString().slice(0, 10);
		perDayMap.set(key, 0);
	}

	for (const e of events) {
		const t = new Date(e.created_at).getTime();
		const dayKey = e.created_at.slice(0, 10);
		if (perDayMap.has(dayKey)) perDayMap.set(dayKey, (perDayMap.get(dayKey) ?? 0) + 1);
		if (t >= since7) {
			active7.add(e.user_id);
			if (e.event_name === 'lesson_completed') lessonsCompleted7++;
			if (e.event_name === 'exam_completed') examsCompleted7++;
			if (e.event_name === 'conversation_started') conversations7++;
		}
	}
	for (const [date, count] of perDayMap) perDay.push({ date, count });

	return {
		authorized: true as const,
		serviceRole: !!svc,
		counts: {
			lessons: lessons.count ?? 0,
			sentences: sentences.count ?? 0,
			categories: categories.count ?? 0,
			words: words.count ?? 0,
			glossary: glossary.count ?? 0
		},
		usage: {
			totalUsers: usersRes.count ?? 0,
			activeUsers7d: active7.size,
			events14d: events.length,
			lessonsCompleted7d: lessonsCompleted7,
			examsCompleted7d: examsCompleted7,
			conversations7d: conversations7,
			perDay
		}
	};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		if (!checkAdminCredentials(email, password)) {
			return fail(401, { error: 'Invalid email or password.', email });
		}

		setAdminCookie(cookies);
		throw redirect(303, '/admin');
	},

	logout: async ({ cookies }) => {
		clearAdminCookie(cookies);
		throw redirect(303, '/admin');
	}
};
