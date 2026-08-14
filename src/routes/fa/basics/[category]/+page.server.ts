import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadCategory } from '$lib/server/basics-content';

export const load: PageServerLoad = async ({ locals, params }) => {
	const content = await loadCategory(locals.supabase, params.category);
	if (!content) throw error(404, 'Category not found');
	return content;
};
