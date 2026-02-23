import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: RequestEvent) {
	// Must be signed in
	if (!locals.session) {
		throw redirect(303, '/');
	}

	// Must have completed language onboarding
	const targetLang = locals.user?.user_metadata?.target_language;
	if (!targetLang || (targetLang !== 'de' && targetLang !== 'fr')) {
		throw redirect(303, '/onboarding');
	}

	return {};
}
