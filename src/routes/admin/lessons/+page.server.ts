import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: lessons, error: err } = await locals.supabase
		.from('lessons')
		.select('id, day, title, title_fa, group, sort_order')
		.order('day', { ascending: true });

	if (err) throw error(500, 'Failed to load lessons');

	return { lessons: lessons ?? [] };
};

export const actions: Actions = {
	deleteLesson: async ({ request, locals }) => {
		const form = await request.formData();
		const day = Number(form.get('day'));

		if (!day) return fail(400, { message: 'Missing day' });

		// Get lesson id first
		const { data: lesson } = await locals.supabase
			.from('lessons')
			.select('id')
			.eq('day', day)
			.maybeSingle();

		if (!lesson) return fail(404, { message: 'Lesson not found' });

		// Delete lesson (sentences cascade)
		const { error: err } = await locals.supabase
			.from('lessons')
			.delete()
			.eq('id', lesson.id);

		if (err) return fail(500, { message: err.message });

		return { success: true };
	},

	createLesson: async ({ request, locals }) => {
		const form = await request.formData();
		const day = Number(form.get('day'));
		const title = String(form.get('title') ?? '').trim();
		const title_fa = String(form.get('title_fa') ?? '').trim();
		const group = String(form.get('group') ?? 'basics').trim();

		if (!day || !title) return fail(400, { message: 'Day and title are required' });

		const { error: err } = await locals.supabase.from('lessons').insert({
			day,
			title,
			title_fa: title_fa || null,
			group,
			sort_order: day
		});

		if (err) return fail(500, { message: err.message });

		return { success: true, day };
	}
};
