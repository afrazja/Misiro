import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { hasValidAdminCookie } from '$lib/server/admin-auth';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	let authorized = hasValidAdminCookie(cookies);
	let displayName = 'Admin';

	// A signed-in Supabase user flagged is_admin gets in without the password.
	if (!authorized && locals.session) {
		const { data: profile } = await locals.supabase
			.from('user_profiles')
			.select('is_admin, display_name')
			.eq('id', locals.user!.id)
			.maybeSingle();

		if (profile?.is_admin) {
			authorized = true;
			displayName = profile.display_name ?? 'Admin';
		}
	}

	// Unauthorized visitors only ever see the login screen at /admin.
	if (!authorized && url.pathname !== '/admin') {
		throw redirect(303, '/admin');
	}

	return { authorized, adminUser: { displayName } };
};
