/**
 * Complete erasure of one user, shared by the admin panel and self-service
 * deletion in /settings so the two can never disagree about what "delete
 * everything" means.
 *
 * Deleting the auth row cascades to every user-owned table — they all declare
 * `REFERENCES auth.users(id) ON DELETE CASCADE`. Storage is NOT covered by
 * that: avatars live at `avatars/<uid>/avatar.<ext>` and would survive as
 * orphaned files, still reachable by public URL. So they are removed first,
 * and explicitly.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const AVATAR_BUCKET = 'avatars';

export type PurgeResult = {
	/** Set when the account itself could not be deleted — nothing was lost. */
	error: string | null;
	/** Set when the account went but avatar files may remain behind. */
	orphanedStorage: string | null;
};

/** Requires a service-role client: `auth.admin` is not reachable otherwise. */
export async function purgeUser(svc: SupabaseClient, userId: string): Promise<PurgeResult> {
	let orphanedStorage: string | null = null;

	try {
		const { data: files, error: listError } = await svc.storage
			.from(AVATAR_BUCKET)
			.list(userId);

		if (listError) {
			orphanedStorage = listError.message;
		} else if (files && files.length > 0) {
			const { error: removeError } = await svc.storage
				.from(AVATAR_BUCKET)
				.remove(files.map((f) => `${userId}/${f.name}`));
			if (removeError) orphanedStorage = removeError.message;
		}
	} catch (e) {
		orphanedStorage = e instanceof Error ? e.message : String(e);
	}

	if (orphanedStorage) {
		// Log the id before the auth row goes: afterwards this line is the only
		// remaining pointer to the leftover file. A storage hiccup must not
		// block a deletion request, so this reports rather than aborts.
		console.error(
			`[purgeUser] avatar cleanup failed for ${userId} — objects may remain in ` +
				`"${AVATAR_BUCKET}/${userId}/": ${orphanedStorage}`
		);
	}

	const { error } = await svc.auth.admin.deleteUser(userId);
	if (error) return { error: error.message, orphanedStorage };

	return { error: null, orphanedStorage };
}
