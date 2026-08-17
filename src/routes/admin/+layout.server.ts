import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { resolveAdmin } from '$lib/server/admin-auth';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	const { authorized, displayName } = await resolveAdmin(locals, cookies);

	// Unauthorized visitors only ever see the login screen at /admin.
	if (!authorized && url.pathname !== '/admin') {
		throw redirect(303, '/admin');
	}

	return { authorized, adminUser: { displayName } };
};
