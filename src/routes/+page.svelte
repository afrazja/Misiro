<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import * as auth from "$services/auth";
	import * as dataLayer from "$services/data-layer";
	import { initSyncListeners } from "$services/sync-queue";
	import { getLessonIndex, getTotalLessons } from "$services/lesson-loader";

	// Auth modal state
	let showAuthModal = $state(false);
	let authMode = $state<"signin" | "signup">("signin");
	let authEmail = $state("");
	let authPassword = $state("");
	let authName = $state("");
	let authError = $state("");
	let authLoading = $state(false);

	// Confirmation toast
	let showConfirmToast = $state(false);

	// After signup with email confirmation on: show a "check your email" view
	let signupEmailSent = $state(false);

	// Profile
	let displayName = $state("Learner");
	let avatarUrl = $state<string | null>(null);
	let isAuthenticated = $state(false);

	// Navbar scroll effect
	let scrolled = $state(false);

	// Dynamic lesson count
	let totalLessons = $state(0);
	let stageOneEnd = $derived(Math.round(totalLessons / 3));
	let stageTwoEnd = $derived(Math.round((totalLessons * 2) / 3));
	let stageThreeEnd = $derived(totalLessons);

	// Refs for focus trap
	let modalEl: HTMLDivElement | undefined = $state();
	let emailInput: HTMLInputElement | undefined = $state();

	// No i18n needed on landing page — content is English only

	function openSignUp() {
		authMode = "signup";
		showAuthModal = true;
		authError = "";
		signupEmailSent = false;
		setTimeout(() => emailInput?.focus(), 100);
	}

	function openSignIn() {
		authMode = "signin";
		showAuthModal = true;
		authError = "";
		signupEmailSent = false;
		setTimeout(() => emailInput?.focus(), 100);
	}

	function toggleAuthModal() {
		showAuthModal = !showAuthModal;
		authError = "";
		signupEmailSent = false;
		if (showAuthModal) setTimeout(() => emailInput?.focus(), 100);
	}

	function toggleAuthMode() {
		authMode = authMode === "signin" ? "signup" : "signin";
		authError = "";
		signupEmailSent = false;
	}

	async function submitAuth() {
		authError = "";
		if (!authEmail.trim() || !authPassword) {
			authError = "Please enter email and password.";
			return;
		}
		authLoading = true;
		try {
			let result;
			if (authMode === "signup") {
				result = await auth.signUp(
					authEmail.trim(),
					authPassword,
					authName.trim() || "Learner",
				);
			} else {
				result = await auth.signIn(authEmail.trim(), authPassword);
			}
			if (result.error) {
				authError = result.error;
			} else if (
				authMode === "signup" &&
				!(await auth.getSession())
			) {
				// Email confirmation is required: signUp returns a user but no
				// active session. Don't redirect — tell them to check their inbox.
				signupEmailSent = true;
			} else {
				showAuthModal = false;
				authEmail = "";
				authPassword = "";
				authName = "";
				// Navigate immediately — server guards handle the exact destination.
				// Heavy background work (profile sync, UI refresh) runs after navigation.
				const targetLang = result.user?.user_metadata?.target_language;
				goto(
					targetLang === "de" || targetLang === "fr"
						? "/home"
						: "/onboarding",
				);
				// Fire-and-forget: don't await these before navigating
				if (result.user) auth.ensureProfile(result.user);
				dataLayer.syncOnLogin();
				updateProfileUI();
			}
		} catch (e: any) {
			authError = e.message || "An error occurred.";
		} finally {
			authLoading = false;
		}
	}

	async function handleSignOut() {
		await auth.signOut();
		await updateProfileUI();
	}

	async function updateProfileUI() {
		const authed = await auth.isAuthenticated();
		isAuthenticated = authed;
		if (authed) {
			displayName = await auth.getDisplayName();
			const url = dataLayer.getAvatarUrl() || (await auth.getAvatarUrl());
			if (url) dataLayer.setAvatarUrl(url);
			avatarUrl = url;
		} else {
			displayName = "Learner";
			avatarUrl = null;
		}
	}

	function scrollToMethod() {
		document
			.getElementById("method-section")
			?.scrollIntoView({ behavior: "smooth" });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showAuthModal) toggleAuthModal();
		if (e.key === "Tab" && showAuthModal && modalEl) {
			const focusable = modalEl.querySelectorAll<HTMLElement>(
				'input:not([style*="display:none"]), button, a[href], [tabindex]:not([tabindex="-1"])',
			);
			const visible = Array.from(focusable).filter((el) => {
				let p: HTMLElement | null = el;
				while (p && p !== modalEl) {
					if (p.style && p.style.display === "none") return false;
					p = p.parentElement as HTMLElement;
				}
				return true;
			});
			if (!visible.length) return;
			const first = visible[0];
			const last = visible[visible.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function handleAuthKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submitAuth();
	}

	function handleScroll() {
		scrolled = window.scrollY > 60;
	}

	onMount(async () => {
		initSyncListeners();
		const params = $page.url.searchParams;
		if (params.get("confirmed") === "true") {
			showConfirmToast = true;
			setTimeout(() => (showConfirmToast = false), 5000);
			goto("/", { replaceState: true });
		}
		await updateProfileUI();

		// Fetch lesson count for dynamic stats
		await getLessonIndex();
		totalLessons = getTotalLessons();
	});
</script>

<svelte:window onkeydown={handleKeydown} onscroll={handleScroll} />

<svelte:head>
	<title
		>Learn German Online Free – Voice Practice & Daily Lessons | Mirifer</title
	>
	<meta
		name="description"
		content="Learn German free with 90+ daily lessons, natural audio, and voice practice. No grammar drills — just real conversations. Start today, no credit card needed."
	/>
	<link rel="canonical" href="https://www.mirifer.com/" />

	<!-- Open Graph -->
	<meta
		property="og:title"
		content="Mirifer – Learn German Through Real Conversations"
	/>
	<meta
		property="og:description"
		content="Master German with voice recognition, spaced repetition, and 90+ real-life daily lessons. Free to start — no grammar drills."
	/>
	<meta property="og:image" content="https://www.mirifer.com/og-image.jpg" />
	<meta property="og:url" content="https://www.mirifer.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Mirifer" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta
		name="twitter:title"
		content="Mirifer – Learn German Through Real Conversations"
	/>
	<meta
		name="twitter:description"
		content="90+ daily lessons. Voice practice. Spaced repetition. Free access."
	/>
	<meta name="twitter:image" content="https://www.mirifer.com/og-image.jpg" />

	<!-- Structured Data -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "Mirifer",
		applicationCategory: "EducationApplication",
		description:
			"Learn German through real-life conversations with voice recognition and spaced repetition.",
		operatingSystem: "Web",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		url: "https://www.mirifer.com",
	})}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: [
			{
				"@type": "Question",
				name: "How long does it take to learn German with Mirifer?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Mirifer's 90+ lessons take you from complete beginner (A1) to intermediate (B1+). Spending 15–20 minutes a day, most learners complete the full path in about 3 months. Because every lesson uses real conversations, you'll start speaking from day one.",
				},
			},
			{
				"@type": "Question",
				name: "Can I learn German for free?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Yes. Mirifer is completely free during early access — no credit card, no trial period, no hidden fees. You get full access to all 90+ lessons, voice practice, and spaced repetition flashcards.",
				},
			},
			{
				"@type": "Question",
				name: "How is Mirifer different from Duolingo?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "While Duolingo uses gamified drills with isolated words, Mirifer teaches through real-life conversations. Every lesson is a scenario you'd actually face in Germany — ordering food, asking for directions, making small talk. Mirifer also includes voice recognition so you practise speaking out loud, with instant word-by-word feedback on what you said.",
				},
			},
			{
				"@type": "Question",
				name: "What level of German does Mirifer teach?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Mirifer covers A1 (complete beginner) through B1+ (intermediate). You'll progress from basic greetings and numbers through shopping and travel scenarios to complex conversations and expressing opinions.",
				},
			},
		],
	})}</script>`}
</svelte:head>

<!-- ── Email Confirmation Toast ─────────────────────────── -->
<div class="confirm-toast" class:show={showConfirmToast}>
	✅ Email confirmed! You can now sign in.
</div>

<!-- ── Auth Modal ──────────────────────────────────────── -->
{#if showAuthModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="auth-overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) toggleAuthModal();
		}}
	>
		<div class="auth-modal" bind:this={modalEl}>
			<button
				class="auth-close"
				onclick={toggleAuthModal}
				aria-label="Close dialog">×</button
			>
			<div class="auth-logo">
				<img
					src="/android-chrome-192x192.png"
					alt="Mirifer Logo"
					style="width: 44px; height: 44px; border-radius: 8px;"
				/>
			</div>

			{#if signupEmailSent}
				<div class="auth-check-email">
					<div class="auth-check-icon">✉️</div>
					<h2 id="auth-title">Check your email</h2>
					<p class="auth-subtitle">
						We sent a confirmation link to <strong
							>{authEmail}</strong
						>. Click it to activate your account, then come back and
						sign in.
					</p>
					<button
						class="auth-submit"
						onclick={() => {
							signupEmailSent = false;
							authMode = "signin";
							authPassword = "";
						}}>Back to sign in</button
					>
				</div>
			{:else}
			<h2 id="auth-title">
				{authMode === "signin" ? "Welcome Back" : "Start Your Journey"}
			</h2>
			<p class="auth-subtitle">
				{authMode === "signin"
					? "Sign in to continue learning German"
					: "Create your free account — no card required"}
			</p>

			{#if authError}
				<div class="auth-error">{authError}</div>
			{/if}

			{#if authMode === "signup"}
				<div class="auth-field">
					<input
						type="text"
						placeholder="Your Name"
						aria-label="Display Name"
						bind:value={authName}
						onkeydown={handleAuthKeydown}
					/>
				</div>
			{/if}

			<div class="auth-field">
				<input
					type="email"
					placeholder="Email address"
					aria-label="Email address"
					bind:this={emailInput}
					bind:value={authEmail}
					onkeydown={handleAuthKeydown}
				/>
			</div>
			<div class="auth-field">
				<input
					type="password"
					placeholder="Password"
					aria-label="Password"
					bind:value={authPassword}
					onkeydown={handleAuthKeydown}
				/>
			</div>

			<button
				class="auth-submit"
				onclick={submitAuth}
				disabled={authLoading}
			>
				{authLoading
					? "···"
					: authMode === "signin"
						? "Sign In"
						: "Create Free Account"}
			</button>

			<p class="auth-toggle">
				<span
					>{authMode === "signin"
						? "Don't have an account?"
						: "Already have an account?"}</span
				>
				<!-- svelte-ignore a11y_invalid_attribute -->
				<a
					href="#"
					onclick={(e) => {
						e.preventDefault();
						toggleAuthMode();
					}}>{authMode === "signin" ? " Sign Up Free" : " Sign In"}</a
				>
			</p>
			{/if}
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  NAVBAR                                                  -->
<!-- ════════════════════════════════════════════════════════ -->
<nav class="navbar" class:scrolled>
	<a href="/" class="brand">
		<img
			src="/android-chrome-192x192.png"
			alt="Mirifer Logo"
			class="brand-icon"
			style="width: 32px; height: 32px; border-radius: 6px;"
		/>
		<span class="brand-name">Mirifer</span>
	</a>

	<div class="navbar-right">
		{#if isAuthenticated}
			<a href="/home" class="btn btn-primary">Open App &rarr;</a>
		{:else}
			<button class="btn btn-ghost" onclick={openSignIn}>Sign In</button>
			<button class="btn btn-primary" onclick={openSignUp}
				>Get Started Free</button
			>
		{/if}
	</div>
</nav>

<!-- ════════════════════════════════════════════════════════ -->
<!--  HERO                                                    -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="hero">
	<!-- Ambient blobs -->
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>

	<div class="hero-content">
		<div class="hero-badge">🇩🇪 &nbsp;German Made for Real Life</div>
		<h1 class="hero-h1">
			Learn German Online —<br />
			<span class="grad-text">The Way You'd Learn It on the Street</span>
		</h1>
		<p class="hero-sub">
			Speak German from day one — not after months of grammar drills.
		</p>
		<div class="hero-actions">
			{#if isAuthenticated}
				<a href="/home" class="cta-btn primary">Go to My Lessons →</a>
			{:else}
				<button class="cta-btn primary" onclick={openSignUp}
					>Start for Free</button
				>
				<button class="cta-btn ghost" onclick={scrollToMethod}
					>See how it works &darr;</button
				>
			{/if}
		</div>
		<div class="hero-trust">
			<span>✅ No credit card</span>
			<span>✅ Works on any device</span>
			<span>✅ Free during early access</span>
		</div>
	</div>

	<!-- App preview mockup -->
	<div class="hero-visual">
		<div class="phone-frame">
			<div class="phone-notch"></div>
			<img
				src="/phone-preview.jpg"
				alt="Mirifer lesson interface"
				class="phone-screenshot"
			/>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  STATS                                                   -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="stats-strip">
	<h2 class="stats-header">What's Inside Mirifer</h2>
	<div class="stats-inner">
		<div class="stat-item">
			<span class="stat-num">{totalLessons || 90}+</span>
			<span class="stat-lbl">Lessons</span>
		</div>
		<div class="stat-sep"></div>
		<div class="stat-item">
			<span class="stat-num">300+</span>
			<span class="stat-lbl">Real Scenarios</span>
		</div>
		<div class="stat-sep"></div>
		<div class="stat-item">
			<span class="stat-num">1,500+</span>
			<span class="stat-lbl">Practice Sentences</span>
		</div>
		<div class="stat-sep"></div>
		<div class="stat-item">
			<span class="stat-num">A1→B1+</span>
			<span class="stat-lbl">Proficiency Range</span>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  METHOD + FEATURES (merged)                               -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section dark-section" id="method-section">
	<div class="lp-inner">
		<p class="eyebrow">The Method</p>
		<h2 class="section-h2">
			How Mirifer <span class="grad-text">Teaches You German</span>
		</h2>
		<p class="section-lead">
			Forget memorising verb tables. Mirifer puts you in real
			conversations from day one.<br />
			<em class="diff-line"
				>Unlike gamified apps, Mirifer focuses entirely on real
				conversation.</em
			>
		</p>

		<div class="steps-row">
			<div class="step-card">
				<span class="step-num">01</span>
				<span class="step-emoji">🎧</span>
				<h3>Hear Natural Audio</h3>
				<p>
					Every sentence is read aloud by a lifelike AI voice at a
					natural pace — so you hear how German actually sounds, not
					exaggerated slow speech.
				</p>
			</div>
			<div class="step-arrow">→</div>
			<div class="step-card">
				<span class="step-num">02</span>
				<span class="step-emoji">🎙️</span>
				<h3>Say It Out Loud</h3>
				<p>
					Your mic captures what you say and checks it against the
					target. Get instant feedback on which words you nailed —
					and which to try again.
				</p>
			</div>
			<div class="step-arrow">→</div>
			<div class="step-card">
				<span class="step-num">03</span>
				<span class="step-emoji">🔄</span>
				<h3>Review at the Right Time</h3>
				<p>
					Spaced repetition (SM-2) surfaces words you're about to
					forget — exactly when you need to see them again.
				</p>
			</div>
		</div>

		<!-- Feature highlights -->
		<div class="feat-grid" style="margin-top: 80px;">
			<div class="feat-card">
				<span class="feat-icon">💬</span>
				<h3>Real-Life Scenarios</h3>
				<p>
					Order coffee, ask for directions, introduce yourself. Every
					lesson is a situation you'll face in Germany.
				</p>
			</div>
			<div class="feat-card">
				<span class="feat-icon">📖</span>
				<h3>Word-by-Word Meanings</h3>
				<p>
					Tap any word in a sentence to see its meaning instantly.
					Build vocabulary in context, not in isolation.
				</p>
			</div>
			<div class="feat-card">
				<span class="feat-icon">📊</span>
				<h3>Progress Tracking</h3>
				<p>
					See your streak, completed lessons, and review stats. Know
					exactly how far you've come and what's next.
				</p>
			</div>
			<div class="feat-card">
				<span class="feat-icon">🌐</span>
				<h3>English &amp; Persian</h3>
				<p>
					All hints and translations in both English and Persian
					(فارسی). Switch languages any time, even mid-lesson.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  YOUR LEARNING PATH                                       -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section dark-section">
	<div class="lp-inner">
		<p class="eyebrow">Your Learning Path</p>
		<h2 class="section-h2">
			Your 90-Day Path from <span class="grad-text">Zero to Fluent</span>
		</h2>
		<p class="section-lead">
			No more wondering "what should I study today?" Each day has a theme,
			a scenario, and carefully crafted sentences that build on everything
			before.
		</p>

		<ul class="journey-list centered">
			<li>
				<span class="j-dot green"></span>
				<div>
					<strong>Days 1–{stageOneEnd || 30} · A1</strong>
					<span
						>Greetings, numbers, colours, essential daily phrases</span
					>
				</div>
			</li>
			<li>
				<span class="j-dot blue"></span>
				<div>
					<strong
						>Days {(stageOneEnd || 30) + 1}–{stageTwoEnd || 60} · A2</strong
					>
					<span>Shopping, travel, work, and social situations</span>
				</div>
			</li>
			<li>
				<span class="j-dot purple"></span>
				<div>
					<strong
						>Days {(stageTwoEnd || 60) + 1}–{stageThreeEnd || 90} · B1+</strong
					>
					<span
						>Opinions, storytelling, and complex conversations</span
					>
				</div>
			</li>
		</ul>

		{#if isAuthenticated}
			<a href="/home" class="cta-btn primary inline"
				>Go to My Lessons &rarr;</a
			>
		{:else}
			<button class="cta-btn primary inline" onclick={openSignUp}
				>Begin Day 1 — It's Free</button
			>
		{/if}
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  WHY LEARN GERMAN                                         -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section">
	<div class="lp-inner">
		<p class="eyebrow">Why German?</p>
		<h2 class="section-h2">
			Why Learn German <span class="grad-text">in 2025?</span>
		</h2>
		<p class="section-lead">
			German is the most spoken native language in Europe and opens doors
			to careers, culture, and travel across Germany, Austria, and
			Switzerland.
		</p>

		<div class="reasons-grid">
			<div class="reason-card">
				<span class="reason-icon">💼</span>
				<h3>Career Opportunities</h3>
				<p>
					Germany has Europe's largest economy. Speaking German gives
					you access to top employers like Siemens, BMW, SAP, and
					thousands of companies actively hiring international talent.
				</p>
			</div>
			<div class="reason-card">
				<span class="reason-icon">🎓</span>
				<h3>Free University Education</h3>
				<p>
					Most German public universities charge zero tuition — even
					for international students. Learning German unlocks access
					to world-class education without the debt.
				</p>
			</div>
			<div class="reason-card">
				<span class="reason-icon">🌍</span>
				<h3>100+ Million Speakers</h3>
				<p>
					German is spoken natively by over 100 million people across
					Europe. It's an official language in Germany, Austria,
					Switzerland, Luxembourg, Belgium, and Liechtenstein.
				</p>
			</div>
			<div class="reason-card">
				<span class="reason-icon">🏠</span>
				<h3>Life in Germany</h3>
				<p>
					Moving to Germany for work or study? Daily life — from
					finding an apartment to visiting the doctor — becomes
					dramatically easier when you speak the language.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  WHO IS MIRIFER FOR                                       -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section dark-section">
	<div class="lp-inner">
		<p class="eyebrow">Who It's For</p>
		<h2 class="section-h2">
			Built for People Who <span class="grad-text"
				>Actually Want to Speak</span
			>
		</h2>
		<p class="section-lead">
			Mirifer is designed for anyone who wants to have real German
			conversations — not just pass grammar quizzes.
		</p>

		<div class="audience-grid">
			<div class="audience-card">
				<span class="audience-emoji">🔰</span>
				<h3>Complete Beginners</h3>
				<p>
					Never spoken a word of German? Start from zero with day-one
					basics — greetings, numbers, and simple phrases you'll use
					immediately.
				</p>
			</div>
			<div class="audience-card">
				<span class="audience-emoji">✈️</span>
				<h3>Travellers to Germany</h3>
				<p>
					Planning a trip to Berlin, Munich, or Vienna? Learn exactly
					the phrases you'll need — ordering food, asking directions,
					and making small talk.
				</p>
			</div>
			<div class="audience-card">
				<span class="audience-emoji">🏢</span>
				<h3>Expats &amp; New Residents</h3>
				<p>
					Moving to a German-speaking country? Master daily situations
					like finding an apartment, opening a bank account, and
					navigating bureaucracy.
				</p>
			</div>
			<div class="audience-card">
				<span class="audience-emoji">🇮🇷</span>
				<h3>Persian Speakers</h3>
				<p>
					Mirifer is one of the few German learning apps with full
					Persian (فارسی) translation support. Switch between English
					and Persian anytime.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  FAQ                                                      -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section" id="faq-section">
	<div class="lp-inner">
		<p class="eyebrow">Common Questions</p>
		<h2 class="section-h2">
			Frequently Asked <span class="grad-text">Questions</span>
		</h2>

		<div class="faq-list">
			<details class="faq-item">
				<summary
					>How long does it take to learn German with Mirifer?</summary
				>
				<p>
					Mirifer's 90+ lessons take you from complete beginner (A1)
					to intermediate (B1+). Spending 15–20 minutes a day, most
					learners complete the full path in about 3 months. Because
					every lesson uses real conversations, you'll start speaking
					from day one.
				</p>
			</details>
			<details class="faq-item">
				<summary>Can I learn German for free?</summary>
				<p>
					Yes! Mirifer is completely free during early access — no
					credit card, no trial period, no hidden fees. You get full
					access to all 90+ lessons, voice practice, and spaced
					repetition flashcards.
				</p>
			</details>
			<details class="faq-item">
				<summary>How is Mirifer different from Duolingo?</summary>
				<p>
					While Duolingo uses gamified drills with isolated words,
					Mirifer teaches through real-life conversations. Every
					lesson is a scenario you'd actually face in Germany —
					ordering food, asking for directions, making small talk.
					Mirifer also includes voice recognition so you practise
					speaking out loud, with instant word-by-word feedback on
					what you said.
				</p>
			</details>
			<details class="faq-item">
				<summary>What level of German does Mirifer teach?</summary>
				<p>
					Mirifer covers A1 (complete beginner) through B1+
					(intermediate). You'll progress from basic greetings and
					numbers through shopping and travel scenarios to complex
					conversations and expressing opinions.
				</p>
			</details>
			<details class="faq-item">
				<summary>Do I need a microphone?</summary>
				<p>
					A microphone helps you practise speaking, but it's not
					required. You can complete all lessons without voice input —
					though we highly recommend using it to build pronunciation
					confidence from the start.
				</p>
			</details>
			<details class="faq-item">
				<summary
					>What's the best app to learn German as a beginner?</summary
				>
				<p>
					The best app depends on your goal. If you want to speak
					German in real situations — not just translate isolated
					words — Mirifer is built exactly for that. It combines
					conversation-based lessons, voice practice, and spaced
					repetition to build speaking skills from day one.
				</p>
			</details>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  FINAL CTA  (only for guests)                            -->
<!-- ════════════════════════════════════════════════════════ -->
{#if !isAuthenticated}
	<section class="lp-section cta-section">
		<div class="lp-inner">
			<div class="cta-box">
				<span class="cta-icon">🚀</span>
				<h2>Ready to Speak German?</h2>
				<p>
					Join learners building real German skills — one conversation
					at a time.
				</p>
				<button class="cta-btn primary large" onclick={openSignUp}
					>Create Your Free Account</button
				>
				<p class="cta-fine">
					No credit card &nbsp;·&nbsp; No spam &nbsp;·&nbsp; Just
					German
				</p>
			</div>
		</div>
	</section>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  FOOTER                                                  -->
<!-- ════════════════════════════════════════════════════════ -->
<footer class="site-footer">
	<div class="footer-inner">
		<div class="footer-brand">
			<img
				src="/android-chrome-192x192.png"
				alt="Mirifer Logo"
				style="width: 32px; height: 32px; border-radius: 6px; margin-right: 8px;"
			/>
			<strong>Mirifer</strong>
		</div>
		<p>Learn German Through Real Conversations</p>

		<nav class="footer-nav" aria-label="Footer navigation">
			<a href="#method-section">How It Works</a>
			<a href="#faq-section">FAQ</a>
			<a href="/privacy">Privacy Policy</a>
			<a href="/terms">Terms of Service</a>
		</nav>

		<p class="footer-sub">
			Free during early access &nbsp;·&nbsp; Made with ❤️ for language
			learners
		</p>
	</div>
</footer>

<style>
	/* ── Global overrides ────────────────────────────── */
	:global(body) {
		margin: 0;
		padding: 0;
		background: #0d0d1a;
		overflow-x: hidden;
	}

	/* ── Shared typography helpers ───────────────────── */
	.grad-text {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.eyebrow {
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #e94560;
		margin-bottom: 14px;
		text-align: center;
	}

	.section-h2 {
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		font-weight: 900;
		line-height: 1.15;
		color: #fff;
		margin-bottom: 16px;
		text-align: center;
		letter-spacing: -0.02em;
	}

	.section-lead {
		font-size: 1.05rem;
		color: #a0a0a0;
		max-width: 620px;
		margin: 0 auto 60px;
		line-height: 1.7;
		text-align: center;
	}

	/* ── CTA buttons ─────────────────────────────────── */
	.cta-btn {
		display: inline-block;
		padding: 16px 36px;
		border-radius: 50px;
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
		border: none;
		text-decoration: none;
		font-family: inherit;
		transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.cta-btn.primary {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: #fff;
		box-shadow: 0 8px 32px rgba(233, 69, 96, 0.4);
	}

	.cta-btn.primary:hover {
		transform: translateY(-3px) scale(1.03);
		box-shadow: 0 16px 48px rgba(233, 69, 96, 0.55);
	}

	.cta-btn.ghost {
		background: transparent;
		color: rgba(255, 255, 255, 0.8);
		border: 2px solid rgba(255, 255, 255, 0.25);
	}

	.cta-btn.ghost:hover {
		border-color: rgba(255, 255, 255, 0.6);
		color: #fff;
		background: rgba(255, 255, 255, 0.06);
	}

	.cta-btn.large {
		padding: 20px 52px;
		font-size: 1.15rem;
	}

	.cta-btn.inline {
		margin-top: 32px;
	}

	/* ── Small nav buttons ───────────────────────────── */
	.btn {
		padding: 9px 20px;
		border-radius: 24px;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.25s ease;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: inherit;
	}

	.btn.btn-primary {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: #fff;
		box-shadow: 0 4px 14px rgba(233, 69, 96, 0.35);
	}

	.btn.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(233, 69, 96, 0.5);
	}

	.btn.btn-ghost {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.22);
		color: #fff;
	}

	.btn.btn-ghost:hover {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.12);
	}

	/* ── Toast ───────────────────────────────────────── */
	.confirm-toast {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%) translateY(-120px);
		background: linear-gradient(135deg, #2ecc71, #27ae60);
		color: #fff;
		padding: 16px 32px;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		box-shadow: 0 10px 40px rgba(46, 204, 113, 0.4);
		z-index: 2000;
		transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.confirm-toast.show {
		transform: translateX(-50%) translateY(0);
	}

	/* ── Auth modal ──────────────────────────────────── */
	.auth-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.82);
		backdrop-filter: blur(6px);
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	.auth-modal {
		background: linear-gradient(145deg, #1a1a2e, #16213e);
		border-radius: 24px;
		padding: 48px 40px 40px;
		max-width: 420px;
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
		box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
	}

	.auth-close {
		position: absolute;
		top: 16px;
		right: 20px;
		background: none;
		border: none;
		color: #888;
		font-size: 1.6rem;
		cursor: pointer;
		line-height: 1;
		padding: 4px;
		transition: color 0.2s;
	}

	.auth-close:hover {
		color: #fff;
	}

	.auth-logo {
		text-align: center;
		font-size: 2.5rem;
		margin-bottom: 14px;
	}

	.auth-modal h2 {
		text-align: center;
		color: #fff;
		font-size: 1.6rem;
		margin-bottom: 8px;
	}

	.auth-subtitle {
		text-align: center;
		color: #888;
		font-size: 0.92rem;
		margin-bottom: 24px;
	}

	.auth-check-email {
		text-align: center;
	}

	.auth-check-icon {
		font-size: 48px;
		margin-bottom: 8px;
	}

	.auth-error {
		background: rgba(233, 69, 96, 0.15);
		color: #ff6b6b;
		border: 1px solid rgba(233, 69, 96, 0.3);
		padding: 12px;
		border-radius: 10px;
		margin-bottom: 16px;
		font-size: 0.9rem;
		text-align: center;
	}

	.auth-field {
		margin-bottom: 14px;
	}

	.auth-field input {
		width: 100%;
		padding: 14px 16px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.auth-field input:focus {
		outline: none;
		border-color: #e94560;
	}

	.auth-field input::placeholder {
		color: #555;
	}

	.auth-submit {
		width: 100%;
		padding: 14px;
		border-radius: 12px;
		border: none;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: #fff;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		margin-top: 8px;
		transition:
			opacity 0.2s,
			transform 0.2s;
		font-family: inherit;
	}

	.auth-submit:hover:not(:disabled) {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	.auth-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auth-toggle {
		text-align: center;
		margin-top: 18px;
		color: #777;
		font-size: 0.9rem;
	}

	.auth-toggle a {
		color: #e94560;
		text-decoration: none;
		font-weight: 700;
	}

	/* ── Navbar ──────────────────────────────────────── */
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 48px;
		transition: all 0.35s ease;
	}

	.navbar.scrolled {
		background: rgba(10, 10, 22, 0.96);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		padding: 13px 48px;
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
	}

	.brand-icon {
		font-size: 1.9rem;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	.brand-name {
		font-size: 1.55rem;
		font-weight: 900;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.navbar-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* ── Hero ─────────────────────────────────────────── */
	.hero {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 60px;
		padding: 110px 80px 80px;
		position: relative;
		background: linear-gradient(
			135deg,
			#1a1a2e 0%,
			#16213e 55%,
			#0f3460 100%
		);
		overflow: hidden;
	}

	/* Ambient blobs */
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(90px);
		opacity: 0.14;
		pointer-events: none;
	}

	.blob-1 {
		width: 520px;
		height: 520px;
		background: #e94560;
		top: -120px;
		right: -60px;
		animation: blobDrift 9s ease-in-out infinite;
	}

	.blob-2 {
		width: 420px;
		height: 420px;
		background: #3498db;
		bottom: -80px;
		left: 35%;
		animation: blobDrift 11s ease-in-out infinite reverse;
	}

	.blob-3 {
		width: 320px;
		height: 320px;
		background: #2ecc71;
		top: 35%;
		left: -80px;
		animation: blobDrift 14s ease-in-out infinite;
	}

	@keyframes blobDrift {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(22px, -18px) scale(1.04);
		}
		66% {
			transform: translate(-12px, 14px) scale(0.97);
		}
	}

	.hero-content {
		position: relative;
		z-index: 2;
	}

	.hero-badge {
		display: inline-block;
		padding: 8px 18px;
		background: rgba(233, 69, 96, 0.14);
		border: 1px solid rgba(233, 69, 96, 0.38);
		border-radius: 50px;
		font-size: 0.88rem;
		font-weight: 600;
		color: #ffaabb;
		margin-bottom: 26px;
	}

	.hero-h1 {
		font-size: clamp(2rem, 4.5vw, 3.4rem);
		font-weight: 900;
		line-height: 1.15;
		color: #fff;
		margin-bottom: 22px;
		letter-spacing: -0.025em;
	}

	.hero-sub {
		font-size: 1.12rem;
		color: #a0a0a0;
		line-height: 1.75;
		margin-bottom: 36px;
		max-width: 520px;
	}

	.hero-actions {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 28px;
	}

	.hero-trust {
		display: flex;
		gap: 22px;
		flex-wrap: wrap;
		color: #777;
		font-size: 0.84rem;
	}

	/* ── Phone / Chat mockup ──────────────────────────── */
	.hero-visual {
		position: relative;
		z-index: 2;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.phone-frame {
		width: 310px;
		background: #1a2035;
		border-radius: 40px;
		border: 8px solid rgba(255, 255, 255, 0.09);
		box-shadow:
			0 50px 100px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(255, 255, 255, 0.04);
		overflow: hidden;
		animation: phoneFloat 4.5s ease-in-out infinite;
	}

	@keyframes phoneFloat {
		0%,
		100% {
			transform: translateY(0) rotate(-1deg);
		}
		50% {
			transform: translateY(-14px) rotate(1deg);
		}
	}

	.phone-notch {
		width: 100px;
		height: 24px;
		background: #0d0d1a;
		border-radius: 0 0 18px 18px;
		margin: 0 auto;
	}

	.phone-screenshot {
		width: 100%;
		display: block;
		border-radius: 0 0 32px 32px;
	}

	/* ── Stats strip ──────────────────────────────────── */
	.stats-strip {
		background: rgba(255, 255, 255, 0.035);
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		padding: 44px 20px;
	}

	.stats-header {
		text-align: center;
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #e94560;
		margin: 0 0 24px;
		line-height: 1;
	}

	.stats-inner {
		max-width: 860px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 52px;
		flex: 1;
	}

	.stat-num {
		font-size: 2.3rem;
		font-weight: 900;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1;
		margin-bottom: 7px;
	}

	.stat-lbl {
		font-size: 0.82rem;
		color: #777;
		font-weight: 500;
		text-align: center;
	}

	.stat-sep {
		width: 1px;
		height: 52px;
		background: rgba(255, 255, 255, 0.09);
	}

	/* ── Section shell ────────────────────────────────── */
	.lp-section {
		padding: 100px 20px;
		text-align: center;
	}

	.dark-section {
		background: rgba(0, 0, 0, 0.28);
	}

	.lp-inner {
		max-width: 1200px;
		margin: 0 auto;
	}

	/* ── How It Works steps ───────────────────────────── */
	.steps-row {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0;
		margin-top: 60px;
	}

	.step-card {
		flex: 1;
		max-width: 300px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 22px;
		padding: 36px 26px;
		text-align: center;
		transition:
			transform 0.35s ease,
			border-color 0.35s ease,
			box-shadow 0.35s ease;
	}

	.step-card:hover {
		transform: translateY(-10px);
		border-color: rgba(233, 69, 96, 0.4);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}

	.step-num {
		display: block;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #e94560;
		margin-bottom: 14px;
	}

	.step-emoji {
		display: block;
		font-size: 3rem;
		margin-bottom: 16px;
	}

	.step-card h3 {
		font-size: 1.12rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 12px;
	}

	.step-card p {
		color: #a0a0a0;
		line-height: 1.65;
		font-size: 0.93rem;
	}

	.step-arrow {
		font-size: 2rem;
		color: rgba(255, 255, 255, 0.18);
		padding: 0 18px;
		margin-top: 76px;
		flex-shrink: 0;
	}

	/* ── Features grid ────────────────────────────────── */
	.feat-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 22px;
		margin-top: 60px;
		text-align: left;
	}

	.feat-card {
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: 30px 26px;
		transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		position: relative;
		overflow: hidden;
	}

	.feat-card::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			rgba(233, 69, 96, 0.08),
			transparent
		);
		opacity: 0;
		transition: opacity 0.3s;
		border-radius: inherit;
	}

	.feat-card:hover {
		transform: translateY(-7px);
		border-color: rgba(233, 69, 96, 0.3);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}

	.feat-card:hover::after {
		opacity: 1;
	}

	.feat-icon {
		display: block;
		font-size: 2.2rem;
		margin-bottom: 16px;
	}

	.feat-card h3 {
		font-size: 1.08rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 10px;
	}

	.feat-card p {
		color: #a0a0a0;
		line-height: 1.65;
		font-size: 0.9rem;
	}

	.diff-line {
		font-style: italic;
		color: #888;
		font-size: 0.95rem;
	}

	/* ── Journey section ──────────────────────────────── */
	.journey-list {
		list-style: none;
		padding: 0;
		margin: 0 0 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.journey-list li {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.j-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 5px;
	}

	.j-dot.green {
		background: #2ecc71;
		box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
	}

	.j-dot.blue {
		background: #3498db;
		box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
	}

	.j-dot.purple {
		background: #9b59b6;
		box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
	}

	.journey-list li strong {
		display: block;
		color: #fff;
		font-size: 1rem;
		margin-bottom: 3px;
	}

	.journey-list li span {
		color: #a0a0a0;
		font-size: 0.9rem;
	}

	.journey-list.centered {
		max-width: 480px;
		margin: 0 auto 32px;
	}

	/* ── Final CTA box ────────────────────────────────── */
	.cta-section {
		padding: 60px 20px 100px;
	}

	.cta-box {
		background: linear-gradient(
			145deg,
			rgba(233, 69, 96, 0.1),
			rgba(255, 107, 107, 0.05)
		);
		border: 1px solid rgba(233, 69, 96, 0.22);
		border-radius: 32px;
		padding: 80px 40px;
		max-width: 680px;
		margin: 0 auto;
	}

	.cta-icon {
		display: block;
		font-size: 3.5rem;
		margin-bottom: 20px;
	}

	.cta-box h2 {
		font-size: clamp(1.6rem, 3.5vw, 2.4rem);
		font-weight: 900;
		color: #fff;
		margin-bottom: 14px;
	}

	.cta-box > p {
		color: #a0a0a0;
		font-size: 1.05rem;
		margin-bottom: 36px;
		line-height: 1.65;
	}

	.cta-fine {
		margin-top: 18px !important;
		font-size: 0.84rem !important;
		color: #555 !important;
		margin-bottom: 0 !important;
	}

	/* ── Footer ───────────────────────────────────────── */
	.site-footer {
		padding: 52px 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		text-align: center;
	}

	.footer-inner {
		max-width: 600px;
		margin: 0 auto;
	}

	.footer-brand {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 1.4rem;
		margin-bottom: 10px;
	}

	.footer-brand span {
		font-size: 1.9rem;
	}

	.footer-brand strong {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-weight: 900;
	}

	.footer-inner > p {
		color: #555;
		font-size: 0.9rem;
		margin-bottom: 6px;
	}

	.footer-nav {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 8px 24px;
		margin: 18px 0 14px;
	}

	.footer-nav a {
		color: #777;
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
	}

	.footer-nav a:hover {
		color: #e94560;
	}

	.footer-sub {
		font-size: 0.82rem !important;
	}

	/* ── Why Learn German grid ───────────────────────── */
	.reasons-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 22px;
		margin-top: 48px;
		text-align: left;
	}

	.reason-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: 30px 26px;
		transition: all 0.35s ease;
	}

	.reason-card:hover {
		transform: translateY(-6px);
		border-color: rgba(233, 69, 96, 0.3);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
	}

	.reason-icon {
		display: block;
		font-size: 2rem;
		margin-bottom: 14px;
	}

	.reason-card h3 {
		font-size: 1.08rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 10px;
	}

	.reason-card p {
		color: #a0a0a0;
		line-height: 1.65;
		font-size: 0.9rem;
	}

	/* ── Who is Mirifer for grid ─────────────────────── */
	.audience-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 22px;
		margin-top: 48px;
		text-align: left;
	}

	.audience-card {
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: 30px 26px;
		transition: all 0.35s ease;
	}

	.audience-card:hover {
		transform: translateY(-6px);
		border-color: rgba(52, 152, 219, 0.35);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
	}

	.audience-emoji {
		display: block;
		font-size: 2rem;
		margin-bottom: 14px;
	}

	.audience-card h3 {
		font-size: 1.08rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 10px;
	}

	.audience-card p {
		color: #a0a0a0;
		line-height: 1.65;
		font-size: 0.9rem;
	}

	/* ── FAQ ──────────────────────────────────────────── */
	.faq-list {
		max-width: 720px;
		margin: 48px auto 0;
		text-align: left;
	}

	.faq-item {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		margin-bottom: 12px;
		overflow: hidden;
		transition: border-color 0.3s;
	}

	.faq-item[open] {
		border-color: rgba(233, 69, 96, 0.3);
	}

	.faq-item summary {
		padding: 20px 24px;
		font-size: 1.02rem;
		font-weight: 600;
		color: #fff;
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.faq-item summary::-webkit-details-marker {
		display: none;
	}

	.faq-item summary::after {
		content: "+";
		font-size: 1.3rem;
		font-weight: 300;
		color: #e94560;
		flex-shrink: 0;
		transition: transform 0.3s;
	}

	.faq-item[open] summary::after {
		transform: rotate(45deg);
	}

	.faq-item p {
		padding: 0 24px 20px;
		color: #a0a0a0;
		line-height: 1.7;
		font-size: 0.94rem;
		margin: 0;
	}

	/* ── Responsive ───────────────────────────────────── */
	@media (max-width: 960px) {
		.hero {
			grid-template-columns: 1fr;
			padding: 100px 36px 70px;
			text-align: center;
			gap: 60px;
		}

		.hero-sub {
			margin: 0 auto 36px;
		}

		.hero-actions {
			justify-content: center;
		}

		.hero-trust {
			justify-content: center;
		}

		.feat-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.steps-row {
			flex-direction: column;
			align-items: center;
		}

		.step-arrow {
			transform: rotate(90deg);
			margin-top: 0;
			padding: 10px 0;
		}

		.navbar {
			padding: 16px 24px;
		}

		.navbar.scrolled {
			padding: 12px 24px;
		}
	}

	@media (max-width: 640px) {
		.feat-grid,
		.reasons-grid,
		.audience-grid {
			grid-template-columns: 1fr;
		}

		.stats-inner {
			flex-wrap: wrap;
			gap: 0;
		}

		.stat-item {
			padding: 18px 28px;
			flex: 0 0 50%;
		}

		.stat-sep {
			display: none;
		}

		.phone-frame {
			width: 270px;
		}

		.navbar-right .btn-primary {
			display: none;
		}

		.hero-actions {
			flex-direction: column;
			align-items: center;
		}

		.hero-badge {
			font-size: 0.78rem;
		}
	}
</style>
