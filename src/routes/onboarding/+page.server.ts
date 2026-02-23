import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: RequestEvent) {
	// Must be signed in to access onboarding
	if (!locals.session) {
		throw redirect(303, '/');
	}

	// If user has already selected a target language, skip onboarding
	const targetLang = locals.user?.user_metadata?.target_language;
	if (targetLang === 'de' || targetLang === 'fr') {
		throw redirect(303, '/home');
	}

	return {};
}
