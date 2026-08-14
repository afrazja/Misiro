/**
 * Shared loaders for the Basics reference content.
 *
 * Extracted so the English routes under /basics and the Persian ones under
 * /fa/basics read the same rows through the same queries. The content is
 * already fully bilingual in the database — every row carries both an `_en`
 * and an `_fa` column — so the two language trees differ only in which
 * column they render and what they put in the head.
 *
 * The opportunistic column selects are load-bearing, not defensive noise:
 * the explanation and pitfall columns were added later, and on a database
 * that has not had that migration applied yet a select naming them fails
 * outright. Falling back to the always-present set keeps a working page
 * working instead of 404-ing it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const CAT_BASE = 'id, key, icon, title_en, title_fa, description_en, description_fa, type';
const CAT_EXPLAIN = 'explanation_en, explanation_fa, pitfall_en, pitfall_fa';
const SEC_BASE = 'id, heading_en, heading_fa, type, sort_order, infinitive, tenses, declension';
const WORD_COLS = 'german, en, fa, example, example_en, example_fa, sort_order';

export interface CategorySummary {
	key: string;
	icon: string | null;
	title_en: string | null;
	title_fa: string | null;
	description_en: string | null;
	description_fa: string | null;
	type: string;
	sort_order: number | null;
}

/** Every category, for the index pages. */
export async function loadCategories(
	supabase: SupabaseClient
): Promise<CategorySummary[]> {
	const { data, error } = await supabase
		.from('basics_categories')
		.select('key, icon, title_en, title_fa, description_en, description_fa, type, sort_order')
		.order('sort_order', { ascending: true });

	if (error) {
		console.error('Failed to load basics categories:', error.message);
		return [];
	}
	return (data ?? []) as CategorySummary[];
}

export interface CategoryContent {
	category: Record<string, any>;
	words: Array<Record<string, any>> | null;
	sections: Array<Record<string, any>> | null;
}

/** One category with its words or sections. Null when the key is unknown. */
export async function loadCategory(
	supabase: SupabaseClient,
	key: string
): Promise<CategoryContent | null> {
	let { data: cat, error: catErr } = await supabase
		.from('basics_categories')
		.select(`${CAT_BASE}, ${CAT_EXPLAIN}`)
		.eq('key', key)
		.maybeSingle();

	if (catErr) {
		({ data: cat, error: catErr } = await supabase
			.from('basics_categories')
			.select(CAT_BASE)
			.eq('key', key)
			.maybeSingle());
	}

	if (catErr || !cat) return null;

	if (cat.type !== 'multi') {
		const { data: wordRows, error: wordErr } = await supabase
			.from('basics_words')
			.select(WORD_COLS)
			.eq('category_id', cat.id)
			.order('sort_order', { ascending: true });

		if (wordErr) console.error('Failed to load words:', wordErr.message);
		return { category: cat, words: wordRows ?? [], sections: null };
	}

	let sectionRows: Array<Record<string, any>> | null = null;
	let secErr: { message: string } | null = null;
	({ data: sectionRows, error: secErr } = await supabase
		.from('basics_sections')
		.select(`${SEC_BASE}, explanation_en, explanation_fa`)
		.eq('category_id', cat.id)
		.order('sort_order', { ascending: true }));

	if (secErr) {
		({ data: sectionRows, error: secErr } = await supabase
			.from('basics_sections')
			.select(SEC_BASE)
			.eq('category_id', cat.id)
			.order('sort_order', { ascending: true }));
	}

	if (secErr) {
		console.error('Failed to load sections:', secErr.message);
		return { category: cat, words: null, sections: [] };
	}

	const sections = await Promise.all(
		(sectionRows ?? []).map(async (sec) => {
			// These columns are JSONB but arrive as strings from some client
			// versions; parsing here keeps every consumer from re-checking.
			for (const f of ['infinitive', 'tenses', 'declension'] as const) {
				if (typeof sec[f] === 'string') {
					try {
						sec[f] = JSON.parse(sec[f]);
					} catch {
						/* leave as-is */
					}
				}
			}
			if (sec.type === 'conjugation' || sec.type === 'declension') {
				return { ...sec, words: [] };
			}
			const { data: wordRows } = await supabase
				.from('basics_words')
				.select(WORD_COLS)
				.eq('section_id', sec.id)
				.order('sort_order', { ascending: true });
			return { ...sec, words: wordRows ?? [] };
		})
	);

	return { category: cat, words: null, sections };
}
