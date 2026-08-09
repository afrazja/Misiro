<script lang="ts">
	// Self-hosted brand fonts (no external font CDN — PWA/offline friendly):
	// Fraunces = display serif; Vazirmatn = Latin+Persian harmonized body.
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/vazirmatn';
	import '../app.css';
	import { onMount } from 'svelte';
	import { getSupabaseBrowserClient } from '$lib/supabase/client';
	import { authStore } from '$stores/auth';
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import { initTheme } from '$services/theme';

	inject({ mode: 'production' });
	injectSpeedInsights();

	// The inline script in app.html already painted the right theme before
	// first paint; this just syncs the stores so the toggle shows the
	// correct state and starts following the OS when 'system' is chosen.
	onMount(initTheme);

	let { children, data } = $props();

	// Initialize auth store reactively from server-provided data
	$effect(() => {
		if (data.session) {
			authStore.set({
				user: data.user,
				session: data.session,
				isAuthenticated: true,
				displayName: data.user?.user_metadata?.display_name || 'Learner',
				avatarUrl: null,
				isLoading: false
			});
		}
	});

	onMount(() => {
		const supabase = getSupabaseBrowserClient();

		// Subscribe to auth state changes on the client
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			authStore.set({
				user: session?.user ?? null,
				session,
				isAuthenticated: !!session,
				displayName: session?.user?.user_metadata?.display_name || 'Learner',
				avatarUrl: null,
				isLoading: false
			});
		});

		return () => subscription.unsubscribe();
	});
</script>

{@render children()}
