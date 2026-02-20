import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const day = Number(params.day);
	if (!day || isNaN(day)) throw error(400, 'Invalid day');

	const body = await request.json();
	const { title, title_fa, group, sentences } = body;

	if (!title) throw error(400, 'Title is required');

	// Get lesson id
	const { data: lesson, error: lessonErr } = await locals.supabase
		.from('lessons')
		.select('id')
		.eq('day', day)
		.maybeSingle();

	if (lessonErr) throw error(500, lessonErr.message);
	if (!lesson) throw error(404, `Day ${day} not found`);

	// Update lesson metadata
	const { error: updateErr } = await locals.supabase
		.from('lessons')
		.update({ title, title_fa: title_fa || null, group })
		.eq('id', lesson.id);

	if (updateErr) throw error(500, updateErr.message);

	// Replace all sentences
	const { error: deleteErr } = await locals.supabase
		.from('sentences')
		.delete()
		.eq('lesson_id', lesson.id);

	if (deleteErr) throw error(500, deleteErr.message);

	if (sentences && sentences.length > 0) {
		const rows = sentences.map((s: any, i: number) => ({
			lesson_id: lesson.id,
			sentence_order: i,
			role: s.role,
			audio_text: s.audio_text || null,
			target_text: s.target_text || null,
			translation: s.translation,
			translation_fa: s.translation_fa || null
		}));

		const { error: insertErr } = await locals.supabase.from('sentences').insert(rows);
		if (insertErr) throw error(500, insertErr.message);
	}

	return json({ success: true });
};
