import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	checkAdminCredentials,
	setAdminCookie,
	requireAdmin,
	clearAdminCookie
} from '$lib/server/admin-auth';
import { loadInsights } from '$lib/server/learner-insights';
import { UUID } from '$lib/analytics/contract';
import { serviceClient } from '$lib/server/supabase-admin';
import { ChangeInputSchema } from '$lib/analytics/phase-three';

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { authorized } = await parent();
	if (!authorized) return { authorized: false as const, insights: null, tab: 'overview' };
	const days = [7, 14, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
	const includeTests = url.searchParams.get('tests') === '1';
	const tab = ['overview', 'journeys', 'lessons', 'returns', 'assessments', 'sources', 'changes', 'obstacles', 'quality'].includes(url.searchParams.get('tab') ?? '') ? url.searchParams.get('tab')! : 'overview';
	return { authorized: true as const, tab, preview: env.INSIGHTS_PREVIEW === '1', insights: await loadInsights(serviceClient(), { days, includeTests, selfId: locals.user?.id ?? null }) };
};

export const actions: Actions = {
	saveChange: async ({ request, cookies, locals }) => {
		await requireAdmin(locals, cookies);
		const db = serviceClient();
		if (!db) return fail(503, { error: 'Reporting database is unavailable.' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const rawTime = String(form.get('shipped_at') ?? '');
		const input = ChangeInputSchema.safeParse({ title: form.get('title'), hypothesis: form.get('hypothesis'),
			shipped_at: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawTime) ? rawTime + ':00Z' : rawTime,
			window_days: form.get('window_days'), metric: form.get('metric') });
		if ((id && !UUID.test(id)) || !input.success || Date.parse(input.data.shipped_at) > Date.now()) return fail(400, { error: 'Enter a title, hypothesis, valid metric and an actual rollout date in UTC, no later than now.' });
		const fields = { ...input.data, shipped_at: new Date(input.data.shipped_at).toISOString(), updated_at: new Date().toISOString() };
		const result = id ? await db.from('analytics_changes').update(fields).eq('id', id).select('id').maybeSingle()
			: await db.from('analytics_changes').insert(fields).select('id').single();
		if (result.error || !result.data) return fail(503, { error: 'Change could not be saved. Check that the phase three migration is installed and try again.' });
		return { success: 'Product change saved. The comparison follows the selected signup windows.' };
	},
	archiveChange: async ({ request, cookies, locals }) => {
		await requireAdmin(locals, cookies);
		const db = serviceClient();
		if (!db) return fail(503, { error: 'Reporting database is unavailable.' });
		const form = await request.formData(), id = String(form.get('id') ?? ''), archived = String(form.get('archived'));
		if (!UUID.test(id) || !['0','1'].includes(archived)) return fail(400, { error: 'Invalid change entry.' });
		const result = await db.from('analytics_changes').update({ archived: archived === '1', updated_at: new Date().toISOString() }).eq('id',id).select('id').maybeSingle();
		if (result.error || !result.data) return fail(503, { error: 'Change entry could not be updated.' });
		return { success: archived === '1' ? 'Entry archived. It remains available under Show archived entries.' : 'Entry restored.' };
	},
	exclude: async ({ request, cookies, locals }) => {
		await requireAdmin(locals, cookies);
		const db = serviceClient();
		if (!db) return fail(503, { error: 'Reporting database is unavailable.' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '');
		if (!UUID.test(userId)) return fail(400, { error: 'Invalid learner ID.' });
		const result = form.get('exclude') === '1'
			? await db.from('analytics_exclusions').upsert({ user_id: userId }, { onConflict: 'user_id' })
			: await db.from('analytics_exclusions').delete().eq('user_id', userId);
		if (result.error) return fail(503, { error: 'Test account setting could not be saved.' });
		return { success: 'Test account setting saved.' };
	},
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
