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
import { TOTAL_DAYS } from '$services/curriculum';

/** Where email confirmation goes when nothing says otherwise. */
const DEFAULT_NEXT = '/?confirmed=true';

/**
 * A start day carried through the confirmation link.
 *
 * The free level test runs signed out and parks its result in
 * localStorage, which the first authenticated lesson then adopts. That
 * breaks the moment someone takes the test on a laptop and opens the
 * confirmation mail on their phone: different browser, no localStorage, and
 * the placement is silently lost — they start at day 1 with no sign that
 * anything went missing. Carrying it in the link makes it survive the hop.
 *
 * Untrusted: this arrives in a URL the learner can edit. Editing it only
 * lets them skip ahead in their own course, which the day dropdown already
 * allows outright, so it is self-service rather than escalation — but it
 * still has to be a real day before it is written to their profile.
 *
 * Underscore-prefixed: SvelteKit rejects any other named export from a
 * +server module, and only at postbuild.
 */
export function _safeStartDay(raw: string | null): number | null {
	if (!raw) return null;
	if (!/^\d{1,4}$/.test(raw)) return null; // no signs, spaces, decimals
	const n = Number(raw);
	if (!Number.isInteger(n) || n < 1 || n > TOTAL_DAYS) return null;
	return n;
}

/**
 * Only same-origin paths. `next` arrives in a URL the user can edit, and an
 * open redirect on an auth callback is the classic way to hand someone's
 * freshly minted session to another site.
 *
 * Underscore-prefixed because SvelteKit rejects any other named export from
 * a +server module — the build fails with "Invalid export", and only at
 * postbuild, so neither svelte-check nor vitest sees it. The prefix is the
 * sanctioned way to expose a helper for tests.
 */
export function _safeNext(raw: string | null): string | null {
	if (!raw) return null;
	if (!raw.startsWith('/')) return null;
	// "//evil.com" is protocol-relative and leaves the origin.
	if (raw.startsWith('//')) return null;
	return raw;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = _safeNext(url.searchParams.get('next'));

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
			const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
			if (error) {
				console.error('Auth callback error:', error.message);
				throw redirect(303, '/?error=auth');
			}

			// Only now is there a session to write against. An existing
			// placement always wins — a link is weaker evidence than a
			// choice the learner has already made in the app.
			const startDay = _safeStartDay(url.searchParams.get('place'));
			if (startDay !== null && !data.user?.user_metadata?.placement) {
				try {
					await locals.supabase.auth.updateUser({
						data: {
							placement: {
								startDay,
								source: 'self-test',
								placedAt: new Date().toISOString().slice(0, 10)
							}
						}
					});
				} catch (e) {
					// Losing the placement is a worse first lesson, not a
					// broken sign-up. Never block the redirect on it.
					console.error('Auth callback: could not apply placement:', e);
				}
			}
		} catch (err) {
			if ((err as any)?.status === 303) throw err; // re-throw redirects
			console.error('Auth callback exception:', err);
			throw redirect(303, '/?error=auth');
		}
	}

	throw redirect(303, next ?? DEFAULT_NEXT);
};
