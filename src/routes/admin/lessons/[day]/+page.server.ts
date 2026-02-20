import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const day = Number(params.day);
	if (!day || isNaN(day)) throw error(400, 'Invalid day');

	const { data: lesson, error: lessonErr } = await locals.supabase
		.from('lessons')
		.select('id, day, title, title_fa, group, sort_order')
		.eq('day', day)
		.maybeSingle();

	if (lessonErr) throw error(500, lessonErr.message);
	if (!lesson) throw error(404, `Day ${day} not found`);

	const { data: sentences, error: sentErr } = await locals.supabase
		.from('sentences')
		.select('id, sentence_order, role, audio_text, target_text, translation, translation_fa')
		.eq('lesson_id', lesson.id)
		.order('sentence_order', { ascending: true });

	if (sentErr) throw error(500, sentErr.message);

	return { lesson, sentences: sentences ?? [] };
};
