/**
 * Auth Callback — exchanges an auth code for a session.
 *
 * Serves two flows that happen to be identical underneath: email
 * confirmation and Google sign-in. Both return here with a PKCE `code`, and
 * exchangeCodeForSession handles either.
 *
 * They differ in where the learner should land, which is what `next` is
 * for. Without it a Google user was shown "Email confirmed!" — an event
 * that never happened to them.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Where email confirmation goes when nothing says otherwise. */
const DEFAULT_NEXT = '/?confirmed=true';

/**
 * Only same-origin paths. `next` arrives in a URL the user can edit, and an
 * open redirect on an auth callback is the classic way to hand someone's
 * freshly minted session to another site.
 */
export function safeNext(raw: string | null): string | null {
	if (!raw) return null;
	if (!raw.startsWith('/')) return null;
	// "//evil.com" is protocol-relative and leaves the origin.
	if (raw.startsWith('//')) return null;
	return raw;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = safeNext(url.searchParams.get('next'));

	// Google reports a refusal here rather than by omitting the code —
	// someone who closes the consent screen should land back on the app,
	// not on an error page for a thing they chose not to do.
	const providerError = url.searchParams.get('error');
	if (providerError) {
		if (providerError === 'access_denied') throw redirect(303, next ?? '/');
		console.error(`Auth provider error: ${providerError}`);
		throw redirect(303, '/?error=auth');
	}

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

	throw redirect(303, next ?? DEFAULT_NEXT);
};
