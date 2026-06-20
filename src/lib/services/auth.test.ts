import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/supabase/client', () => ({
	getSupabaseBrowserClient: vi.fn()
}));
// signOut dynamically imports data-layer for clearAllLocal — mock it.
const clearAllLocal = vi.fn();
vi.mock('./data-layer', () => ({ clearAllLocal }));

import {
	isConfigured,
	getUser,
	getSession,
	isAuthenticated,
	signIn,
	signUp,
	signOut
} from './auth';
import { getSupabaseBrowserClient } from '$lib/supabase/client';

/** Build a mock Supabase client with overridable auth methods. */
function mockClient(authMethods: Record<string, any> = {}) {
	const client = {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
			signInWithPassword: vi.fn(),
			signUp: vi.fn(),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			...authMethods
		}
	};
	vi.mocked(getSupabaseBrowserClient).mockReturnValue(client as any);
	return client;
}

/** Simulate Supabase not being configured (client constructor throws). */
function mockUnconfigured() {
	vi.mocked(getSupabaseBrowserClient).mockImplementation(() => {
		throw new Error('not configured');
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('isConfigured', () => {
	it('is true when the client is available', () => {
		mockClient();
		expect(isConfigured()).toBe(true);
	});

	it('is false when the client throws', () => {
		mockUnconfigured();
		expect(isConfigured()).toBe(false);
	});
});

describe('getUser', () => {
	it('returns the current user', async () => {
		mockClient({ getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) });
		expect(await getUser()).toEqual({ id: 'u1' });
	});

	it('returns null when not configured', async () => {
		mockUnconfigured();
		expect(await getUser()).toBeNull();
	});

	it('returns null if the auth call throws', async () => {
		mockClient({ getUser: vi.fn().mockRejectedValue(new Error('boom')) });
		expect(await getUser()).toBeNull();
	});
});

describe('getSession / isAuthenticated', () => {
	it('returns the session when present', async () => {
		mockClient({ getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'x' } } }) });
		expect(await getSession()).toEqual({ access_token: 'x' });
	});

	it('isAuthenticated is true with a session', async () => {
		mockClient({ getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'x' } } }) });
		expect(await isAuthenticated()).toBe(true);
	});

	it('isAuthenticated is false without a session', async () => {
		mockClient({ getSession: vi.fn().mockResolvedValue({ data: { session: null } }) });
		expect(await isAuthenticated()).toBe(false);
	});

	it('isAuthenticated is false when not configured', async () => {
		mockUnconfigured();
		expect(await isAuthenticated()).toBe(false);
	});
});

describe('signIn', () => {
	it('returns the user on success', async () => {
		const signInWithPassword = vi
			.fn()
			.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
		mockClient({ signInWithPassword });

		const result = await signIn('a@b.com', 'pw');
		expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
		expect(result).toEqual({ user: { id: 'u1' }, error: null });
	});

	it('surfaces the error message on failure', async () => {
		mockClient({
			signInWithPassword: vi
				.fn()
				.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } })
		});

		const result = await signIn('a@b.com', 'wrong');
		expect(result).toEqual({ user: null, error: 'Invalid login credentials' });
	});

	it('returns a configured-error when Supabase is unavailable', async () => {
		mockUnconfigured();
		const result = await signIn('a@b.com', 'pw');
		expect(result.user).toBeNull();
		expect(result.error).toBe('Supabase not configured');
	});
});

describe('signUp', () => {
	it('returns the user on success', async () => {
		const signUpFn = vi.fn().mockResolvedValue({ data: { user: { id: 'new' } }, error: null });
		mockClient({ signUp: signUpFn });

		const result = await signUp('a@b.com', 'pw', 'Ada');
		expect(result).toEqual({ user: { id: 'new' }, error: null });
		// display name passed through to options.data
		expect(signUpFn.mock.calls[0][0].options.data.display_name).toBe('Ada');
	});

	it('defaults the display name to "Learner"', async () => {
		const signUpFn = vi.fn().mockResolvedValue({ data: { user: { id: 'new' } }, error: null });
		mockClient({ signUp: signUpFn });

		await signUp('a@b.com', 'pw');
		expect(signUpFn.mock.calls[0][0].options.data.display_name).toBe('Learner');
	});

	it('surfaces the error message on failure', async () => {
		mockClient({
			signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
		});

		const result = await signUp('a@b.com', 'pw');
		expect(result).toEqual({ user: null, error: 'User already registered' });
	});
});

describe('signOut', () => {
	it('clears local data and revokes the session', async () => {
		const signOutFn = vi.fn().mockResolvedValue({ error: null });
		mockClient({ signOut: signOutFn });

		const result = await signOut();
		expect(clearAllLocal).toHaveBeenCalledOnce();
		expect(signOutFn).toHaveBeenCalledOnce();
		expect(result).toEqual({ error: null });
	});

	it('returns the error message if Supabase signOut fails', async () => {
		mockClient({ signOut: vi.fn().mockResolvedValue({ error: { message: 'network' } }) });

		const result = await signOut();
		expect(result).toEqual({ error: 'network' });
	});

	it('is a no-op (no error) when not configured', async () => {
		mockUnconfigured();
		const result = await signOut();
		expect(result).toEqual({ error: null });
		expect(clearAllLocal).not.toHaveBeenCalled();
	});
});
