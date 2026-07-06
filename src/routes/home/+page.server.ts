import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: RequestEvent) {
	// Must be signed in. Send to the app login screen — NOT the marketing
	// landing page — so the installed PWA (start_url /home) never opens on
	// marketing content.
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	// Must have completed language onboarding
	const targetLang = locals.user?.user_metadata?.target_language;
	if (!targetLang || (targetLang !== 'de' && targetLang !== 'fr')) {
		throw redirect(303, '/onboarding');
	}

	return {};
}
