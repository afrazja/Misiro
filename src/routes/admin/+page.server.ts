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

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { authorized } = await parent();
	if (!authorized) return { authorized: false as const, insights: null, tab: 'overview' };
	const days = [7, 14, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
	const includeTests = url.searchParams.get('tests') === '1';
	const tab = ['overview', 'journeys', 'lessons', 'returns', 'obstacles', 'quality'].includes(url.searchParams.get('tab') ?? '') ? url.searchParams.get('tab')! : 'overview';
	return { authorized: true as const, tab, preview: env.INSIGHTS_PREVIEW === '1', insights: await loadInsights(serviceClient(), { days, includeTests, selfId: locals.user?.id ?? null }) };
};

export const actions: Actions = {
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
