import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const body = await request.json();
	const { category, words, sections } = body;

	// Get category id
	const { data: cat, error: catErr } = await locals.supabase
		.from('basics_categories')
		.select('id, type')
		.eq('key', params.key)
		.maybeSingle();

	if (catErr) throw error(500, catErr.message);
	if (!cat) throw error(404, 'Category not found');

	// Update category metadata
	const { error: updateErr } = await locals.supabase
		.from('basics_categories')
		.update({
			icon: category.icon,
			title_en: category.title_en,
			title_fa: category.title_fa,
			description_en: category.description_en,
			description_fa: category.description_fa
		})
		.eq('id', cat.id);

	if (updateErr) throw error(500, updateErr.message);

	if (cat.type === 'multi' && sections) {
		// Handle sections and their words
		for (let i = 0; i < sections.length; i++) {
			const sec = sections[i];

			if (sec.id) {
				// Update existing section
				const updateData: any = {
					heading_en: sec.heading_en,
					heading_fa: sec.heading_fa,
					sort_order: i
				};
				if (sec.type === 'conjugation') {
					updateData.infinitive = sec.infinitive;
					updateData.tenses = sec.tenses;
				}
				await locals.supabase.from('basics_sections').update(updateData).eq('id', sec.id);

				// Replace words for non-conjugation sections
				if (sec.type !== 'conjugation' && sec.words) {
					await locals.supabase.from('basics_words').delete().eq('section_id', sec.id);
					if (sec.words.length > 0) {
						await locals.supabase.from('basics_words').insert(
							sec.words.map((w: any, j: number) => ({
								section_id: sec.id,
								german: w.german,
								en: w.en,
								fa: w.fa,
								example: w.example || null,
								example_en: w.example_en || null,
								example_fa: w.example_fa || null,
								sort_order: j
							}))
						);
					}
				}
			} else {
				// Insert new section
				const insertData: any = {
					category_id: cat.id,
					heading_en: sec.heading_en,
					heading_fa: sec.heading_fa,
					type: sec.type ?? 'grid',
					sort_order: i
				};
				if (sec.type === 'conjugation') {
					insertData.infinitive = sec.infinitive;
					insertData.tenses = sec.tenses;
				}
				const { data: newSec } = await locals.supabase
					.from('basics_sections')
					.insert(insertData)
					.select('id')
					.single();

				if (newSec && sec.words && sec.type !== 'conjugation') {
					await locals.supabase.from('basics_words').insert(
						sec.words.map((w: any, j: number) => ({
							section_id: newSec.id,
							german: w.german,
							en: w.en,
							fa: w.fa,
							example: w.example || null,
							example_en: w.example_en || null,
							example_fa: w.example_fa || null,
							sort_order: j
						}))
					);
				}
			}
		}
	} else if (words) {
		// Replace all words for flat categories
		await locals.supabase.from('basics_words').delete().eq('category_id', cat.id);
		if (words.length > 0) {
			await locals.supabase.from('basics_words').insert(
				words.map((w: any, i: number) => ({
					category_id: cat.id,
					german: w.german,
					en: w.en,
					fa: w.fa,
					example: w.example || null,
					example_en: w.example_en || null,
					example_fa: w.example_fa || null,
					sort_order: i
				}))
			);
		}
	}

	return json({ success: true });
};
