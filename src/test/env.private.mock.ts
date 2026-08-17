/**
 * Stub for SvelteKit's $env/dynamic/private virtual module.
 * Mutable so tests can rotate credentials and assert on the effect —
 * `admin-auth.ts` reads these lazily, per call, exactly for that reason.
 */
export const env: Record<string, string | undefined> = {
	ADMIN_EMAIL: 'admin@example.com',
	ADMIN_PASSWORD: 'correct-horse-battery'
};
