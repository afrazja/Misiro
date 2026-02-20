import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const { action, entry } = body;

	if (action === 'add') {
		const { word, en, fa } = entry;
		if (!word || !en) throw error(400, 'word and en are required');

		const { data, error: err } = await locals.supabase
			.from('glossary')
			.insert({ word, en, fa: fa || null })
			.select('id, word, en, fa')
			.single();

		if (err) throw error(500, err.message);
		return json({ success: true, entry: data });
	}

	if (action === 'update') {
		const { id, word, en, fa } = entry;
		if (!id) throw error(400, 'id is required');

		const { error: err } = await locals.supabase
			.from('glossary')
			.update({ word, en, fa: fa || null })
			.eq('id', id);

		if (err) throw error(500, err.message);
		return json({ success: true });
	}

	if (action === 'delete') {
		const { id } = entry;
		if (!id) throw error(400, 'id is required');

		const { error: err } = await locals.supabase
			.from('glossary')
			.delete()
			.eq('id', id);

		if (err) throw error(500, err.message);
		return json({ success: true });
	}

	throw error(400, 'Unknown action');
};
