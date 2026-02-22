/**
 * Stub for SvelteKit's $env/dynamic/public virtual module.
 * Used by vitest so that config.ts can be imported in tests.
 * Individual tests that exercise parseConfig() pass their own env objects directly.
 */
export const env: Record<string, string | undefined> = {
	PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
};
