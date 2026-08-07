<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import * as auth from "$services/auth";
	import * as dataLayer from "$services/data-layer";

	let mode = $state<"signin" | "signup">("signin");

	// Deep link from the guest demo win screen: /login?mode=signup
	onMount(() => {
		if (new URLSearchParams(location.search).get("mode") === "signup") {
			mode = "signup";
		}
	});
	let email = $state("");
	let password = $state("");
	let name = $state("");
	let error = $state("");
	let loading = $state(false);
	let emailSent = $state(false);

	function toggleMode() {
		mode = mode === "signin" ? "signup" : "signin";
		error = "";
		emailSent = false;
	}

	async function submit() {
		error = "";
		if (!email.trim() || !password) {
			error = "Please enter email and password.";
			return;
		}
		loading = true;
		try {
			let result;
			if (mode === "signup") {
				result = await auth.signUp(
					email.trim(),
					password,
					name.trim() || "Learner",
				);
			} else {
				result = await auth.signIn(email.trim(), password);
			}
			if (result.error) {
				error = result.error;
			} else if (mode === "signup" && !(await auth.getSession())) {
				// Email confirmation required — no active session yet
				emailSent = true;
			} else {
				const targetLang = result.user?.user_metadata?.target_language;
				goto(
					targetLang === "de" || targetLang === "fr"
						? "/home"
						: "/onboarding",
				);
				// Fire-and-forget after navigation
				if (result.user) auth.ensureProfile(result.user);
				dataLayer.syncOnLogin();
			}
		} catch (e: any) {
			error = e.message || "An error occurred.";
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submit();
	}
</script>

<svelte:head>
	<title>Sign In – Mirifer</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="login-page">
	<div class="login-card">
		<div class="brand">
			<img src="/android-chrome-192x192.png" alt="" class="brand-icon" />
			<span class="brand-name">Mirifer</span>
		</div>

		{#if emailSent}
			<div class="email-sent">
				<div class="email-sent-icon">📬</div>
				<h1>Check your email</h1>
				<p>
					We sent a confirmation link to <b>{email}</b>. Tap it to
					activate your account, then come back and sign in.
				</p>
				<button class="ghost-btn" onclick={toggleMode}>
					← Back to sign in
				</button>
			</div>
		{:else}
			<h1>
				{mode === "signin" ? "Welcome back" : "Create your account"}
			</h1>
			<p class="subtitle">
				{mode === "signin"
					? "Sign in to continue learning German."
					: "Free during early access — no credit card."}
			</p>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			{#if mode === "signup"}
				<label for="login-name">Name</label>
				<input
					id="login-name"
					type="text"
					bind:value={name}
					placeholder="Your name"
					autocomplete="name"
					onkeydown={handleKeydown}
				/>
			{/if}

			<label for="login-email">Email</label>
			<input
				id="login-email"
				type="email"
				bind:value={email}
				placeholder="you@example.com"
				autocomplete="username"
				onkeydown={handleKeydown}
			/>

			<label for="login-password">Password</label>
			<input
				id="login-password"
				type="password"
				bind:value={password}
				placeholder={mode === "signup" ? "Min. 6 characters" : "Password"}
				autocomplete={mode === "signup"
					? "new-password"
					: "current-password"}
				onkeydown={handleKeydown}
			/>

			<button class="submit-btn" onclick={submit} disabled={loading}>
				{loading
					? "…"
					: mode === "signin"
						? "Sign In"
						: "Create Account"}
			</button>

			<button class="ghost-btn" onclick={toggleMode}>
				{mode === "signin"
					? "New here? Create a free account"
					: "Already have an account? Sign in"}
			</button>
		{/if}
	</div>

	<a href="/" class="site-link">About Mirifer →</a>
</div>

<style>
	:global(body) {
		margin: 0;
	}

	.login-page {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 18px;
		padding: 24px 16px;
		box-sizing: border-box;
		background: var(--paper);
		font-family: var(--font-body);
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 20px;
		box-shadow: var(--paper-shadow);
		padding: 34px 30px;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 22px;
	}

	.brand-icon {
		width: 36px;
		height: 36px;
		border-radius: 9px;
	}

	.brand-name {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--accent-deep);
	}

	h1 {
		font-family: var(--font-display);
		margin: 0 0 6px;
		font-size: 1.55rem;
		color: var(--ink);
	}

	.subtitle {
		margin: 0 0 20px;
		color: var(--ink-soft);
		font-size: 0.92rem;
	}

	.error {
		background: rgba(233, 69, 96, 0.15);
		border: 1px solid rgba(233, 69, 96, 0.5);
		color: #ff8a9b;
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 0.87rem;
		margin-bottom: 14px;
	}

	label {
		font-size: 0.78rem;
		color: var(--ink-soft);
		margin: 10px 0 6px;
	}

	input {
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 13px 15px;
		color: var(--ink);
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.submit-btn {
		margin-top: 22px;
		background: var(--accent);
		color: #fff8f0;
		border: none;
		border-radius: 12px;
		padding: 14px;
		font-size: 1.02rem;
		font-weight: 700;
		cursor: pointer;
		transition: filter 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.ghost-btn {
		margin-top: 14px;
		background: none;
		border: none;
		color: var(--ink-soft);
		font-size: 0.88rem;
		cursor: pointer;
		text-decoration: underline;
	}

	.ghost-btn:hover {
		color: var(--accent-deep);
	}

	.email-sent {
		text-align: center;
	}

	.email-sent-icon {
		font-size: 2.6rem;
		margin-bottom: 8px;
	}

	.email-sent p {
		color: var(--ink-soft);
		line-height: 1.6;
		font-size: 0.92rem;
	}

	.site-link {
		color: var(--ink-faint);
		font-size: 0.85rem;
		text-decoration: none;
	}

	.site-link:hover {
		color: var(--ink);
	}
</style>
