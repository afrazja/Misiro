import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: entries, error: err } = await locals.supabase
		.from('glossary')
		.select('id, word, en, fa')
		.order('word', { ascending: true });

	if (err) throw error(500, err.message);

	return { entries: entries ?? [] };
};
