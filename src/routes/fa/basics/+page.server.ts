import type { PageServerLoad } from './$types';
import { loadCategories } from '$lib/server/basics-content';

export const load: PageServerLoad = async ({ locals }) => {
	return { categories: await loadCategories(locals.supabase) };
};
