import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [lessons, sentences, categories, words, glossary] = await Promise.all([
		locals.supabase.from('lessons').select('*', { count: 'exact', head: true }),
		locals.supabase.from('sentences').select('*', { count: 'exact', head: true }),
		locals.supabase.from('basics_categories').select('*', { count: 'exact', head: true }),
		locals.supabase.from('basics_words').select('*', { count: 'exact', head: true }),
		locals.supabase.from('glossary').select('*', { count: 'exact', head: true }),
	]);

	return {
		counts: {
			lessons: lessons.count ?? 0,
			sentences: sentences.count ?? 0,
			categories: categories.count ?? 0,
			words: words.count ?? 0,
			glossary: glossary.count ?? 0,
		}
	};
};
