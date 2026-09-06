/**
 * Admin credential gate for /admin.
 *
 * Two ways in:
 *  1. A Supabase-authenticated user whose profile has is_admin = true.
 *  2. Explicitly configured admin email + password (ADMIN_EMAIL /
 *     ADMIN_PASSWORD env vars), which sets a httpOnly cookie.
 *
 * The password check and the cookie token both live server-side only —
 * nothing is exposed in the client bundle.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { error, type Cookies } from '@sveltejs/kit';

const ADMIN_EMAIL = () => env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = () => env.ADMIN_PASSWORD || '';

export const ADMIN_COOKIE = 'mirifer_admin';

/** Opaque session token derived from the current credentials — rotating the
 *  password in env invalidates all existing admin cookies automatically. */
export function adminToken(): string {
	return createHash('sha256')
		.update(`mirifer-admin-v1:${ADMIN_EMAIL()}:${ADMIN_PASSWORD()}`)
		.digest('hex');
}

/** Length-independent, constant-time string compare. Plain `===` leaks how
 *  many leading characters matched, which is worth avoiding now that these
 *  checks gate user deletion and password resets. */
function safeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/** True when `email` is the configured admin account. */
export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email || !ADMIN_EMAIL()) return false;
	return email.trim().toLowerCase() === ADMIN_EMAIL().toLowerCase();
}

export function checkAdminCredentials(email: string, password: string): boolean {
	return !!ADMIN_PASSWORD() && isAdminEmail(email) && safeEqual(password, ADMIN_PASSWORD());
}

export function hasValidAdminCookie(cookies: Cookies): boolean {
	const cookie = cookies.get(ADMIN_COOKIE);
	return !!ADMIN_EMAIL() && !!ADMIN_PASSWORD() && !!cookie && safeEqual(cookie, adminToken());
}

export function setAdminCookie(cookies: Cookies): void {
	cookies.set(ADMIN_COOKIE, adminToken(), {
		path: '/admin',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 7 // one week
	});
}

export function clearAdminCookie(cookies: Cookies): void {
	cookies.delete(ADMIN_COOKIE, { path: '/admin' });
}

export type AdminIdentity = {
	authorized: boolean;
	displayName: string;
	/** The Supabase user id of the signed-in admin, or null when they got in
	 *  via the password gate (which has no Supabase session). */
	selfId: string | null;
};

/** Resolves admin rights the same two ways the docs describe: a valid admin
 *  cookie, or a signed-in Supabase user whose profile has is_admin = true. */
export async function resolveAdmin(
	locals: App.Locals,
	cookies: Cookies
): Promise<AdminIdentity> {
	const selfId = locals.user?.id ?? null;

	if (hasValidAdminCookie(cookies)) {
		return { authorized: true, displayName: 'Admin', selfId };
	}

	if (locals.session && selfId) {
		const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
		if (authError || user?.id !== selfId) return { authorized: false, displayName: 'Admin', selfId: null };
		const { data: profile } = await locals.supabase
			.from('user_profiles')
			.select('is_admin, display_name')
			.eq('id', selfId)
			.maybeSingle();

		if (profile?.is_admin) {
			return {
				authorized: true,
				displayName: profile.display_name ?? 'Admin',
				selfId
			};
		}
	}

	return { authorized: false, displayName: 'Admin', selfId };
}

/**
 * Throws 403 unless the request carries admin rights.
 *
 * Use this in EVERY form action and endpoint under /admin that touches the
 * service-role client. The `/admin` layout `load` only guards page loads — it
 * does not run for form actions or `+server.ts` handlers, and the service role
 * bypasses RLS, so without this an unauthenticated POST would go through.
 */
export async function requireAdmin(
	locals: App.Locals,
	cookies: Cookies
): Promise<AdminIdentity> {
	const admin = await resolveAdmin(locals, cookies);
	if (!admin.authorized) throw error(403, 'Not authorized.');
	return admin;
}
