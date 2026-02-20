import { createBrowserClient } from '@supabase/ssr';
import { config } from '$lib/config';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
	if (!browserClient) {
		browserClient = createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
	}
	return browserClient;
}
