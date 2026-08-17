/**
 * Service-role Supabase client.
 *
 * The service role bypasses RLS and unlocks the `auth.admin` API — listing
 * users, resetting passwords, deleting accounts. It is therefore server-only:
 * the key is read from a non-PUBLIC env var so it can never reach the client
 * bundle, and this module lives under `$lib/server` (which SvelteKit refuses
 * to import from client code).
 *
 * Returns null when the key is not configured, so callers can degrade to a
 * read-only view instead of crashing.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function serviceClient(): SupabaseClient | null {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key || url.includes('placeholder')) return null;

	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
