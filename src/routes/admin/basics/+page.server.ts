import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: categories, error: err } = await locals.supabase
		.from('basics_categories')
		.select('id, key, icon, title_en, title_fa, description_en, description_fa, type, sort_order')
		.order('sort_order', { ascending: true });

	if (err) throw error(500, err.message);

	return { categories: categories ?? [] };
};
