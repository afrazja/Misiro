/**
 * Self-service account deletion for /settings.
 *
 * A user cannot delete their own auth row with the anon key, so this has to
 * run server-side with the service role. The one rule that makes that safe:
 * the account deleted is ALWAYS the one in the request's own session. No id
 * is ever read from the body — otherwise this endpoint would delete any
 * account whose id a caller could supply.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serviceClient } from '$lib/server/supabase-admin';
import { purgeUser } from '$lib/server/delete-account';
import { isAdminEmail } from '$lib/server/admin-auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!locals.session || !user) {
		throw error(401, 'You must be signed in to delete your account.');
	}

	const email = (user.email ?? '').trim().toLowerCase();
	if (!email) {
		throw error(400, 'This account has no email address to confirm against.');
	}

	// Typing the address is the deliberate act. It is checked here and not only
	// in the browser, so a stray POST cannot delete an account on its own.
	const body = await request.json().catch(() => null);
	const confirmEmail = String((body as { confirmEmail?: unknown } | null)?.confirmEmail ?? '')
		.trim()
		.toLowerCase();

	if (confirmEmail !== email) {
		throw error(400, 'The email you typed does not match your account. Nothing was deleted.');
	}

	// Losing this account would lock the owner out of /admin's is_admin route.
	if (isAdminEmail(email)) {
		throw error(403, 'The site admin account cannot be deleted from here.');
	}

	const svc = serviceClient();
	if (!svc) {
		throw error(
			503,
			'Account deletion is temporarily unavailable. Please contact support and we will remove your account.'
		);
	}

	const { error: purgeError } = await purgeUser(svc, user.id);
	if (purgeError) {
		throw error(500, `Your account could not be deleted: ${purgeError}`);
	}

	// The cookies now point at a user that no longer exists. Clearing them is
	// cleanup, not the deletion — a failure here must not report failure for an
	// account that is already gone.
	try {
		await locals.supabase.auth.signOut();
	} catch {
		/* session already unusable; the browser drops it on next load */
	}

	return json({ success: true });
};
