import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: RequestEvent) {
	// If user is already signed in, skip the landing page
	if (locals.session) {
		const targetLang = locals.user?.user_metadata?.target_language;
		if (targetLang === 'de' || targetLang === 'fr') {
			throw redirect(303, '/home');
		}
		// Signed in but hasn't completed onboarding yet
		throw redirect(303, '/onboarding');
	}
	return {};
}
