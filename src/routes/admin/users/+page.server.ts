/**
 * User management for /admin/users — list, reset password, delete.
 *
 * Everything here needs the service role: `auth.users` is not reachable with
 * the anon key at all, and the `auth.admin` API is service-role only. Because
 * the service role bypasses RLS, every action calls `requireAdmin()` first —
 * the `/admin` layout `load` guards page loads but never runs for actions.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireAdmin, isAdminEmail } from '$lib/server/admin-auth';
import { serviceClient } from '$lib/server/supabase-admin';
import { purgeUser } from '$lib/server/delete-account';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Matches the 6-character floor the signup and settings screens enforce. */
const MIN_PASSWORD_LENGTH = 6;

/** listUsers() is paginated; walk it so search covers everyone rather than
 *  just the first page. Capped so a runaway account count cannot hang the
 *  request — `truncated` tells the UI to say so out loud. */
const PER_PAGE = 200;
const MAX_PAGES = 25;

type AuthUser = {
	id: string;
	email: string;
	created_at: string;
	last_sign_in_at: string | null;
	email_confirmed_at: string | null;
};

async function listAllUsers(
	svc: SupabaseClient
): Promise<{ users: AuthUser[]; truncated: boolean; error: string | null }> {
	const users: AuthUser[] = [];

	for (let page = 1; page <= MAX_PAGES; page++) {
		const { data, error } = await svc.auth.admin.listUsers({ page, perPage: PER_PAGE });
		if (error) return { users, truncated: false, error: error.message };

		const batch = (data?.users ?? []) as User[];
		for (const u of batch) {
			users.push({
				id: u.id,
				email: u.email ?? '(no email)',
				created_at: u.created_at,
				last_sign_in_at: u.last_sign_in_at ?? null,
				email_confirmed_at: u.email_confirmed_at ?? null
			});
		}

		// A short page means we reached the end.
		if (batch.length < PER_PAGE) return { users, truncated: false, error: null };
	}

	return { users, truncated: true, error: null };
}

export const load: PageServerLoad = async ({ parent, locals, cookies }) => {
	const { authorized } = await parent();
	if (!authorized) return { authorized: false as const };

	const { selfId } = await requireAdmin(locals, cookies);
	const svc = serviceClient();

	if (!svc) {
		return {
			authorized: true as const,
			serviceRole: false as const,
			users: [],
			truncated: false,
			loadError: null,
			selfId
		};
	}

	const [{ users: authUsers, truncated, error: listError }, profilesRes, progressRes] =
		await Promise.all([
			listAllUsers(svc),
			svc.from('user_profiles').select('id, display_name, is_admin, language'),
			svc.from('user_progress').select('user_id, current_day, updated_at')
		]);

	const profiles = new Map(
		(profilesRes.data ?? []).map((p: Record<string, unknown>) => [p.id as string, p])
	);
	const progress = new Map(
		(progressRes.data ?? []).map((p: Record<string, unknown>) => [p.user_id as string, p])
	);

	const users = authUsers
		.map((u) => {
			const profile = profiles.get(u.id);
			const prog = progress.get(u.id);
			return {
				...u,
				displayName: (profile?.display_name as string) ?? null,
				isAdmin: (profile?.is_admin as boolean) ?? false,
				language: (profile?.language as string) ?? null,
				currentDay: (prog?.current_day as number) ?? null,
				lastActiveAt: (prog?.updated_at as string) ?? null,
				/** Protected accounts cannot be deleted — see the delete action. */
				protected: u.id === selfId || isAdminEmail(u.email)
			};
		})
		.sort((a, b) => b.created_at.localeCompare(a.created_at));

	return {
		authorized: true as const,
		serviceRole: true as const,
		users,
		truncated,
		loadError: listError,
		selfId
	};
};

export const actions: Actions = {
	/**
	 * Set a new password for a user. Supabase hashes it and — because this goes
	 * through the admin API rather than a recovery link — the user is not
	 * notified, so tell them out of band.
	 */
	setPassword: async ({ request, locals, cookies }) => {
		await requireAdmin(locals, cookies);

		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (!userId) return fail(400, { userId, error: 'Missing user id.' });
		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				userId,
				error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
			});
		}
		if (password !== confirm) {
			return fail(400, { userId, error: 'Passwords do not match.' });
		}

		const svc = serviceClient();
		if (!svc) {
			return fail(503, { userId, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
		}

		const { data, error } = await svc.auth.admin.updateUserById(userId, { password });
		if (error) return fail(500, { userId, error: error.message });

		return { success: `Password updated for ${data.user?.email ?? 'user'}.` };
	},

	/**
	 * Permanently delete a user, via the same purge the user's own /settings
	 * deletion uses: avatar files, then the auth row, whose cascade takes the
	 * profile, progress, spaced-repetition cards, exam results and events.
	 * There is no undo, hence the typed-email confirmation.
	 */
	deleteUser: async ({ request, locals, cookies }) => {
		const { selfId } = await requireAdmin(locals, cookies);

		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const confirmEmail = String(form.get('confirmEmail') ?? '');

		if (!userId) return fail(400, { userId, error: 'Missing user id.' });

		const svc = serviceClient();
		if (!svc) {
			return fail(503, { userId, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
		}

		// Re-read the account server-side: the email to confirm against must come
		// from the database, never from the submitted form.
		const { data: target, error: lookupError } = await svc.auth.admin.getUserById(userId);
		if (lookupError || !target?.user) {
			return fail(404, { userId, error: lookupError?.message ?? 'User not found.' });
		}

		const email = target.user.email ?? '';

		if (userId === selfId) {
			return fail(400, { userId, error: 'You cannot delete the account you are signed in as.' });
		}
		if (isAdminEmail(email)) {
			return fail(400, {
				userId,
				error: 'This is the configured admin account — deleting it would lock you out.'
			});
		}
		if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
			return fail(400, {
				userId,
				error: 'Typed email does not match this account. Nothing was deleted.'
			});
		}

		const { error, orphanedStorage } = await purgeUser(svc, userId);
		if (error) return fail(500, { userId, error });

		return {
			success:
				`Deleted ${email} and all of their data.` +
				(orphanedStorage ? ' Their avatar file could not be removed — see the server log.' : '')
		};
	}
};
