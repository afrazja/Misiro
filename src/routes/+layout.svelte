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
	import { getLanguage, applyDocumentLanguage } from '$services/data-layer';
	import { env } from '$env/dynamic/public';

	/**
	 * Google Search Console ownership token.
	 *
	 * Read from the environment rather than committed so the code can be set
	 * in Vercel and take effect on the next deploy without a commit — and so
	 * rotating or removing it is not a code change.
	 *
	 * $env/dynamic rather than $env/static on purpose: static would fail the
	 * build on any checkout where the variable is not declared, which is
	 * every local one.
	 */
	const googleVerification = $derived(env.PUBLIC_GOOGLE_SITE_VERIFICATION ?? '');

	inject({ mode: 'production' });
	injectSpeedInsights();

	// The inline script in app.html already painted the right theme before
	// first paint; this just syncs the stores so the toggle shows the
	// correct state and starts following the OS when 'system' is chosen.
	onMount(() => {
		initTheme();
		// The boot script set lang/dir from localStorage. For a signed-in
		// user the authoritative value lives on their profile, so re-apply
		// once it has been fetched.
		getLanguage()
			.then(applyDocumentLanguage)
			.catch(() => {
				/* boot-script value stands */
			});
	});

	let { children, data } = $props();

	// One skip link for the whole app, targeting the <main id="main-content">
	// every page renders. Keyboard users otherwise tab through the header's
	// back button, language select and speed select on every single page.
	let skipLang = $state('en');
	onMount(() => {
		getLanguage()
			.then((l) => {
				if (l === 'fa' || l === 'en') skipLang = l;
			})
			.catch(() => {
				/* stays English */
			});
	});

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

<!-- Fallback title for the routes that set none — mostly signed-in app pages,
     which robots.txt already disallows. A page's own svelte:head title
     replaces this one rather than stacking with it; the previous fallback
     lived in app.html, outside svelte:head, which is why it always won. -->
<svelte:head>
	<title>Mirifer — Learn German</title>
	{#if googleVerification}
		<meta name="google-site-verification" content={googleVerification} />
	{/if}
</svelte:head>

<a href="#main-content" class="skip-link">
	{skipLang === 'fa' ? 'رفتن به محتوا' : 'Skip to content'}
</a>

{@render children()}
