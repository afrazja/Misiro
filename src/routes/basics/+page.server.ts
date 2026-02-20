import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: categories, error } = await locals.supabase
		.from('basics_categories')
		.select('key, icon, title_en, title_fa, description_en, description_fa, type, sort_order')
		.order('sort_order', { ascending: true });

	if (error) {
		console.error('Failed to load basics categories:', error.message);
		return { categories: [] };
	}

	return { categories: categories ?? [] };
};
