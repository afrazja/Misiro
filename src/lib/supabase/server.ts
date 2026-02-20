import { createServerClient } from '@supabase/ssr';
import { config } from '$lib/config';
import type { Cookies } from '@sveltejs/kit';

export function getSupabaseServerClient(cookies: Cookies) {
	return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, any> }>) {
				cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: Record<string, any> }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}
