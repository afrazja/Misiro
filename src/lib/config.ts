import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_API_URL } from '$env/static/public';

export const config = {
	supabaseUrl: PUBLIC_SUPABASE_URL,
	supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY,
	apiUrl: PUBLIC_API_URL || 'https://misiro-api.onrender.com'
};
