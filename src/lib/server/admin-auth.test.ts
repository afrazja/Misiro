/**
 * Guard tests for the /admin credential gate.
 *
 * These matter more than most: `requireAdmin` is the only thing standing
 * between an anonymous POST and a service-role account deletion, because
 * SvelteKit layout `load` functions do not run for form actions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { env } from '../../test/env.private.mock';
import {
	ADMIN_COOKIE,
	adminToken,
	checkAdminCredentials,
	clearAdminCookie,
	hasValidAdminCookie,
	isAdminEmail,
	requireAdmin,
	resolveAdmin,
	setAdminCookie
} from './admin-auth';

const EMAIL = 'admin@example.com';
const PASSWORD = 'correct-horse-battery';

beforeEach(() => {
	env.ADMIN_EMAIL = EMAIL;
	env.ADMIN_PASSWORD = PASSWORD;
});

/** Minimal in-memory Cookies stand-in. */
function fakeCookies(initial: Record<string, string> = {}): Cookies {
	const jar = new Map(Object.entries(initial));
	return {
		get: (name: string) => jar.get(name),
		getAll: () => [...jar].map(([name, value]) => ({ name, value })),
		set: (name: string, value: string) => void jar.set(name, value),
		delete: (name: string) => void jar.delete(name),
		serialize: () => ''
	} as unknown as Cookies;
}

/** Fake `locals` whose supabase client returns one canned profile row. */
function fakeLocals(opts: {
	userId?: string | null;
	profile?: { is_admin: boolean; display_name: string | null } | null;
}): App.Locals {
	const { userId = null, profile = null } = opts;
	return {
		session: userId ? ({ user: { id: userId } } as never) : null,
		user: userId ? ({ id: userId } as never) : null,
		supabase: {
			auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
			from: () => ({
				select: () => ({
					eq: () => ({
						maybeSingle: async () => ({ data: profile, error: null })
					})
				})
			})
		} as never
	} as App.Locals;
}

describe('isAdminEmail', () => {
	it('matches the configured admin email case- and space-insensitively', () => {
		expect(isAdminEmail(EMAIL)).toBe(true);
		expect(isAdminEmail('  ADMIN@Example.COM  ')).toBe(true);
	});

	it('rejects anything else, including empty values', () => {
		expect(isAdminEmail('someone@example.com')).toBe(false);
		expect(isAdminEmail('')).toBe(false);
		expect(isAdminEmail(null)).toBe(false);
		expect(isAdminEmail(undefined)).toBe(false);
	});
});

describe('checkAdminCredentials', () => {
	it('disables credentials and cookies when configuration is absent', () => {
		const cookies = fakeCookies(); setAdminCookie(cookies);
		delete env.ADMIN_PASSWORD; delete env.ADMIN_EMAIL;
		expect(checkAdminCredentials(EMAIL, PASSWORD)).toBe(false);
		expect(checkAdminCredentials('', '')).toBe(false);
		expect(hasValidAdminCookie(cookies)).toBe(false);
	});

	it('accepts the configured pair', () => {
		expect(checkAdminCredentials(EMAIL, PASSWORD)).toBe(true);
	});

	it('rejects a wrong password, a wrong email, and near misses', () => {
		expect(checkAdminCredentials(EMAIL, 'nope')).toBe(false);
		expect(checkAdminCredentials('other@example.com', PASSWORD)).toBe(false);
		expect(checkAdminCredentials(EMAIL, PASSWORD + 'x')).toBe(false);
		expect(checkAdminCredentials(EMAIL, '')).toBe(false);
	});

	it('follows the env vars when they are rotated', () => {
		env.ADMIN_PASSWORD = 'a-new-password';
		expect(checkAdminCredentials(EMAIL, PASSWORD)).toBe(false);
		expect(checkAdminCredentials(EMAIL, 'a-new-password')).toBe(true);
	});
});

describe('admin cookie', () => {
	it('accepts a cookie holding the current token', () => {
		const cookies = fakeCookies();
		setAdminCookie(cookies);
		expect(hasValidAdminCookie(cookies)).toBe(true);
	});

	it('rejects a missing, empty or forged cookie', () => {
		expect(hasValidAdminCookie(fakeCookies())).toBe(false);
		expect(hasValidAdminCookie(fakeCookies({ [ADMIN_COOKIE]: '' }))).toBe(false);
		expect(hasValidAdminCookie(fakeCookies({ [ADMIN_COOKIE]: 'forged' }))).toBe(false);
	});

	it('is invalidated by rotating the password — the documented behaviour', () => {
		const cookies = fakeCookies();
		setAdminCookie(cookies);
		const before = adminToken();

		env.ADMIN_PASSWORD = 'rotated';

		expect(adminToken()).not.toBe(before);
		expect(hasValidAdminCookie(cookies)).toBe(false);
	});

	it('is httpOnly and scoped to /admin', () => {
		const set = vi.fn();
		setAdminCookie({ set } as unknown as Cookies);

		expect(set).toHaveBeenCalledWith(
			ADMIN_COOKIE,
			adminToken(),
			expect.objectContaining({ httpOnly: true, path: '/admin', secure: true })
		);
	});

	it('clears on sign-out', () => {
		const cookies = fakeCookies();
		setAdminCookie(cookies);
		clearAdminCookie(cookies);
		expect(hasValidAdminCookie(cookies)).toBe(false);
	});
});

describe('resolveAdmin', () => {
	it('authorizes a valid admin cookie with no Supabase session', async () => {
		const cookies = fakeCookies();
		setAdminCookie(cookies);

		const result = await resolveAdmin(fakeLocals({}), cookies);

		expect(result.authorized).toBe(true);
		expect(result.selfId).toBeNull();
	});

	it('authorizes a signed-in user whose profile has is_admin', async () => {
		const locals = fakeLocals({
			userId: 'user-1',
			profile: { is_admin: true, display_name: 'Afraz' }
		});

		const result = await resolveAdmin(locals, fakeCookies());

		expect(result.authorized).toBe(true);
		expect(result.displayName).toBe('Afraz');
		expect(result.selfId).toBe('user-1');
	});

	it('refuses a signed-in user without the flag', async () => {
		const locals = fakeLocals({
			userId: 'user-2',
			profile: { is_admin: false, display_name: 'Learner' }
		});

		expect((await resolveAdmin(locals, fakeCookies())).authorized).toBe(false);
	});

	it('refuses a signed-in user with no profile row at all', async () => {
		const locals = fakeLocals({ userId: 'user-3', profile: null });

		expect((await resolveAdmin(locals, fakeCookies())).authorized).toBe(false);
	});

	it('rejects an unverified session even if its profile claims admin', async () => {
		const locals = fakeLocals({ userId: 'forged', profile: { is_admin: true, display_name: null } });
		locals.supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });
		expect((await resolveAdmin(locals, fakeCookies())).authorized).toBe(false);
	});

	it('refuses an anonymous visitor', async () => {
		expect((await resolveAdmin(fakeLocals({}), fakeCookies())).authorized).toBe(false);
	});
});

describe('requireAdmin', () => {
	it('returns the identity when authorized', async () => {
		const cookies = fakeCookies();
		setAdminCookie(cookies);

		await expect(requireAdmin(fakeLocals({}), cookies)).resolves.toMatchObject({
			authorized: true
		});
	});

	it('throws 403 for an anonymous caller — the form-action guard', async () => {
		await expect(requireAdmin(fakeLocals({}), fakeCookies())).rejects.toMatchObject({
			status: 403
		});
	});

	it('throws 403 for a signed-in non-admin', async () => {
		const locals = fakeLocals({
			userId: 'user-4',
			profile: { is_admin: false, display_name: 'Learner' }
		});

		await expect(requireAdmin(locals, fakeCookies())).rejects.toMatchObject({ status: 403 });
	});
});
