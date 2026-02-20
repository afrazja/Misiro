/**
 * Auth Callback — handles Supabase email confirmation redirect.
 * Exchanges the auth code for a session and redirects to home.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');

	if (code) {
		try {
			const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
			if (error) {
				console.error('Auth callback error:', error.message);
				throw redirect(303, '/?error=auth');
			}
		} catch (err) {
			if ((err as any)?.status === 303) throw err; // re-throw redirects
			console.error('Auth callback exception:', err);
			throw redirect(303, '/?error=auth');
		}
	}

	throw redirect(303, '/?confirmed=true');
};
