/**
 * Admin credential gate for /admin.
 *
 * Two ways in:
 *  1. A Supabase-authenticated user whose profile has is_admin = true.
 *  2. The admin email + password below (overridable via ADMIN_EMAIL /
 *     ADMIN_PASSWORD env vars), which sets a httpOnly cookie.
 *
 * The password check and the cookie token both live server-side only —
 * nothing is exposed in the client bundle.
 */

import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const ADMIN_EMAIL = () => env.ADMIN_EMAIL || 'afz.javan@gmail.com';
const ADMIN_PASSWORD = () => env.ADMIN_PASSWORD || '1234';

export const ADMIN_COOKIE = 'mirifer_admin';

/** Opaque session token derived from the current credentials — rotating the
 *  password in env invalidates all existing admin cookies automatically. */
export function adminToken(): string {
	return createHash('sha256')
		.update(`mirifer-admin-v1:${ADMIN_EMAIL()}:${ADMIN_PASSWORD()}`)
		.digest('hex');
}

export function checkAdminCredentials(email: string, password: string): boolean {
	return (
		email.trim().toLowerCase() === ADMIN_EMAIL().toLowerCase() &&
		password === ADMIN_PASSWORD()
	);
}

export function hasValidAdminCookie(cookies: Cookies): boolean {
	return cookies.get(ADMIN_COOKIE) === adminToken();
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
