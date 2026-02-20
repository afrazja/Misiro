import { env } from '$env/dynamic/public';

export const config = {
	get supabaseUrl(): string {
		return env.PUBLIC_SUPABASE_URL || '';
	},
	get supabaseAnonKey(): string {
		return env.PUBLIC_SUPABASE_ANON_KEY || '';
	},
	get apiUrl(): string {
		return env.PUBLIC_API_URL || 'https://misiro-api.onrender.com';
	}
};
