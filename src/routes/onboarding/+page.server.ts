import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getCourse, isAvailableCourse } from '$lib/courses';

export async function load({ locals, url }: RequestEvent) {
	// Must be signed in to access onboarding
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	// If user has already selected a target language, skip onboarding
	const targetLang = locals.user?.user_metadata?.target_language;
	if (getCourse(targetLang)) {
		throw redirect(303, isAvailableCourse(targetLang) ? '/home' : '/languages');
	}
	const language = url.searchParams.get('language');
	if (!isAvailableCourse(language)) redirect(303, '/languages');
	// The English pilot starts directly from the chooser, without Goethe setup.
	if (language === 'en') redirect(303, '/languages');
	return { targetLanguage: language };
}
