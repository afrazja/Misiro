import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GrammarNoteSchema } from '$lib/schemas';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const day = Number(params.day);
	if (!day || isNaN(day)) throw error(400, 'Invalid day');

	const body = await request.json();
	const { title, title_fa, group, sentences, grammar_note } = body;

	if (!title) throw error(400, 'Title is required');

	// Grammar note: validated with the same schema the app reads it back
	// through, so a malformed note can never reach a learner. Empty title +
	// empty explanation means "no note" and clears the column.
	let grammarNoteValue: unknown = null;
	if (grammar_note && (grammar_note.title?.trim() || grammar_note.explanation?.trim())) {
		const cleaned = {
			title: (grammar_note.title ?? '').trim(),
			title_fa: (grammar_note.title_fa ?? '').trim() || undefined,
			explanation: (grammar_note.explanation ?? '').trim(),
			explanation_fa: (grammar_note.explanation_fa ?? '').trim() || undefined,
			examples: (grammar_note.examples ?? [])
				.filter((ex: any) => ex?.de?.trim())
				.map((ex: any) => ({
					de: ex.de.trim(),
					en: (ex.en ?? '').trim() || undefined,
					fa: (ex.fa ?? '').trim() || undefined
				})),
			basics_key: (grammar_note.basics_key ?? '').trim() || undefined
		};
		const parsed = GrammarNoteSchema.safeParse(cleaned);
		if (!parsed.success) throw error(400, `Grammar note invalid: ${parsed.error.message}`);
		grammarNoteValue = parsed.data;
	}

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
		.update({ title, title_fa: title_fa || null, group, grammar_note: grammarNoteValue })
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
