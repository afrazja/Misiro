import { env } from '$env/dynamic/public';
import { z } from 'zod';

const EnvSchema = z.object({
	PUBLIC_SUPABASE_URL: z
		.string({ message: 'PUBLIC_SUPABASE_URL is required' })
		.url('PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://xxx.supabase.co)'),
	PUBLIC_SUPABASE_ANON_KEY: z
		.string({ message: 'PUBLIC_SUPABASE_ANON_KEY is required' })
		.min(1, 'PUBLIC_SUPABASE_ANON_KEY must not be empty')
});

/**
 * Validate an env-like object and return the typed config.
 * Throws a descriptive error listing every missing/invalid variable.
 * Exported so it can be called directly in tests with arbitrary inputs.
 */
export function parseConfig(rawEnv: Record<string, string | undefined>) {
	const result = EnvSchema.safeParse(rawEnv);

	if (!result.success) {
		const issues = result.error.issues
			.map((i) => `  • ${String(i.path[0])}: ${i.message}`)
			.join('\n');
		throw new Error(`[config] Missing or invalid environment variables:\n${issues}`);
	}

	return {
		supabaseUrl: result.data.PUBLIC_SUPABASE_URL,
		supabaseAnonKey: result.data.PUBLIC_SUPABASE_ANON_KEY
	} as const;
}

export const config = parseConfig(env as Record<string, string | undefined>);
