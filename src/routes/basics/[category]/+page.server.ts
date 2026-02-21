import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const key = params.category;

	// Load category metadata
	const { data: cat, error: catErr } = await locals.supabase
		.from('basics_categories')
		.select('id, key, icon, title_en, title_fa, description_en, description_fa, type')
		.eq('key', key)
		.maybeSingle();

	if (catErr || !cat) {
		throw error(404, 'Category not found');
	}

	let words = null;
	let sections = null;

	if (cat.type === 'multi') {
		// Load sections for this category
		const { data: sectionRows, error: secErr } = await locals.supabase
			.from('basics_sections')
			.select('id, heading_en, heading_fa, type, sort_order, infinitive, tenses')
			.eq('category_id', cat.id)
			.order('sort_order', { ascending: true });

		if (secErr) {
			console.error('Failed to load sections:', secErr.message);
			sections = [];
		} else {
			// For each section, load its words (skip conjugation — uses tenses JSONB)
			const sectionsWithWords = await Promise.all(
				(sectionRows ?? []).map(async (sec) => {
					// Parse JSONB fields if stored as strings
					if (typeof sec.infinitive === 'string') {
						try { sec.infinitive = JSON.parse(sec.infinitive); } catch { /* leave as-is */ }
					}
					if (typeof sec.tenses === 'string') {
						try { sec.tenses = JSON.parse(sec.tenses); } catch { /* leave as-is */ }
					}
					if (sec.type === 'conjugation') {
						return { ...sec, words: [] };
					}
					const { data: wordRows } = await locals.supabase
						.from('basics_words')
						.select('german, en, fa, example, example_en, example_fa, sort_order')
						.eq('section_id', sec.id)
						.order('sort_order', { ascending: true });
					return { ...sec, words: wordRows ?? [] };
				})
			);
			sections = sectionsWithWords;
		}
	} else {
		// Grid/table: load words directly on the category
		const { data: wordRows, error: wordErr } = await locals.supabase
			.from('basics_words')
			.select('german, en, fa, example, example_en, example_fa, sort_order')
			.eq('category_id', cat.id)
			.order('sort_order', { ascending: true });

		if (wordErr) {
			console.error('Failed to load words:', wordErr.message);
			words = [];
		} else {
			words = wordRows ?? [];
		}
	}

	return { category: cat, words, sections };
};
