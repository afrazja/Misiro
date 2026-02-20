<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { getSupabaseBrowserClient } from '$lib/supabase/client';
	import { authStore } from '$stores/auth';

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
