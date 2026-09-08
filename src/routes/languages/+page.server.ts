import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getCourse, isAvailableCourse } from '$lib/courses';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session || !locals.user) redirect(303, '/login');
	return { currentLanguage: getCourse(locals.user.user_metadata?.target_language)?.code ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Verify the account before changing a preference; never trust a form user ID.
		const { data: { user }, error } = await locals.supabase.auth.getUser();
		if (error || !user) redirect(303, '/login');
		const language = (await request.formData()).get('language');
		if (!isAvailableCourse(language)) return fail(400, { error: 'unavailable' });

		// New German learners finish the remaining onboarding questions before we save.
		// A refresh or a back button must not mark partial onboarding complete.
		if (language !== 'en' && !getCourse(user.user_metadata?.target_language)) {
			redirect(303, `/onboarding?language=${language}`);
		}

		if (user.user_metadata?.target_language !== language) {
			try {
				const { error: saveError } = await locals.supabase.auth.updateUser({
					data: { target_language: language }
				});
				if (saveError) return fail(503, { error: 'save_failed' });
			} catch { return fail(503, { error: 'save_failed' }); }
		}
		// Selecting a course never resets lessons, reviews, XP or account settings.
		redirect(303, language === 'en' ? '/practice/english' : '/home');
	}
};
