import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const key = params.category;

	// Load category metadata. The explanation columns are requested
	// opportunistically: on a database where they have not been added yet the
	// whole select would fail, so fall back to the always-present column set
	// rather than 404-ing a working page.
	const BASE_COLS = 'id, key, icon, title_en, title_fa, description_en, description_fa, type';
	const EXPLAIN_COLS = 'explanation_en, explanation_fa, pitfall_en, pitfall_fa';
	let { data: cat, error: catErr } = await locals.supabase
		.from('basics_categories')
		.select(`${BASE_COLS}, ${EXPLAIN_COLS}`)
		.eq('key', key)
		.maybeSingle();

	if (catErr) {
		({ data: cat, error: catErr } = await locals.supabase
			.from('basics_categories')
			.select(BASE_COLS)
			.eq('key', key)
			.maybeSingle());
	}

	if (catErr || !cat) {
		throw error(404, 'Category not found');
	}

	let words = null;
	let sections = null;

	if (cat.type === 'multi') {
		// Load sections for this category
		const SEC_BASE =
			'id, heading_en, heading_fa, type, sort_order, infinitive, tenses, declension';
		// Widened: the fallback select returns a narrower row shape than the
		// first, so the two results need a common type to share a variable.
		let sectionRows: Array<Record<string, any>> | null = null;
		let secErr: { message: string } | null = null;
		({ data: sectionRows, error: secErr } = await locals.supabase
			.from('basics_sections')
			.select(`${SEC_BASE}, explanation_en, explanation_fa`)
			.eq('category_id', cat.id)
			.order('sort_order', { ascending: true }));

		if (secErr) {
			// Same opportunistic pattern as the category select above.
			({ data: sectionRows, error: secErr } = await locals.supabase
				.from('basics_sections')
				.select(SEC_BASE)
				.eq('category_id', cat.id)
				.order('sort_order', { ascending: true }));
		}

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
					if (typeof sec.declension === 'string') {
						try { sec.declension = JSON.parse(sec.declension); } catch { /* leave as-is */ }
					}
					if (sec.type === 'conjugation' || sec.type === 'declension') {
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
