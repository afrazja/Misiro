import type { LayoutServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(303, '/?error=auth_required');
	}

	const { data: profile } = await locals.supabase
		.from('user_profiles')
		.select('is_admin, display_name')
		.eq('id', locals.user!.id)
		.maybeSingle();

	if (!profile?.is_admin) {
		throw error(403, 'Admin access required');
	}

	return { adminUser: { displayName: profile.display_name } };
};
