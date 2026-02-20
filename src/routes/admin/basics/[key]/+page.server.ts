import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: category, error: catErr } = await locals.supabase
		.from('basics_categories')
		.select('id, key, icon, title_en, title_fa, description_en, description_fa, type, sort_order')
		.eq('key', params.key)
		.maybeSingle();

	if (catErr) throw error(500, catErr.message);
	if (!category) throw error(404, `Category "${params.key}" not found`);

	if (category.type === 'multi') {
		const { data: sections, error: secErr } = await locals.supabase
			.from('basics_sections')
			.select('id, heading_en, heading_fa, type, sort_order, infinitive, tenses')
			.eq('category_id', category.id)
			.order('sort_order', { ascending: true });

		if (secErr) throw error(500, secErr.message);

		// Load words for non-conjugation sections
		const sectionsWithWords = await Promise.all(
			(sections ?? []).map(async (sec) => {
				if (sec.type === 'conjugation') {
					return { ...sec, words: [] };
				}
				const { data: words } = await locals.supabase
					.from('basics_words')
					.select('id, german, en, fa, example, example_en, example_fa, sort_order')
					.eq('section_id', sec.id)
					.order('sort_order', { ascending: true });
				return { ...sec, words: words ?? [] };
			})
		);

		return { category, sections: sectionsWithWords, words: [] };
	} else {
		const { data: words, error: wordErr } = await locals.supabase
			.from('basics_words')
			.select('id, german, en, fa, example, example_en, example_fa, sort_order')
			.eq('category_id', category.id)
			.order('sort_order', { ascending: true });

		if (wordErr) throw error(500, wordErr.message);
		return { category, sections: [], words: words ?? [] };
	}
};
