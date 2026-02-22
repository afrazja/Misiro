<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$stores/auth';
	import { preferencesStore } from '$stores/preferences';
	import type { Language } from '$stores/preferences';
	import * as auth from '$services/auth';
	import * as dataLayer from '$services/data-layer';
	import { initSyncListeners } from '$services/sync-queue';

	// Auth modal state
	let showAuthModal = $state(false);
	let authMode = $state<'signin' | 'signup'>('signin');
	let authEmail = $state('');
	let authPassword = $state('');
	let authName = $state('');
	let authError = $state('');
	let authLoading = $state(false);

	// Confirmation toast
	let showConfirmToast = $state(false);

	// Language
	let language = $state<Language>('en');

	// Profile
	let displayName = $state('Learner');
	let avatarUrl = $state<string | null>(null);
	let isAuthenticated = $state(false);

	// Navbar scroll effect
	let scrolled = $state(false);

	// Refs for focus trap
	let modalEl: HTMLDivElement | undefined = $state();
	let emailInput: HTMLInputElement | undefined = $state();

	// i18n content for the app-section cards
	const content = $derived({
		langLabel: language === 'fa' ? 'زبان اول شما چیست؟' : 'What is your first language?',
		lessonsTitle: language === 'fa' ? 'درس‌های روزانه' : 'Daily Lessons',
		lessonsDesc:
			language === 'fa'
				? 'مکالمات واقعی آلمانی را تمرین کنید. هر روز سناریوهای جدید مثل سفارش در کافه، پرسیدن مسیر و موارد دیگر.'
				: 'Practice real-world conversations in German. Each day brings new scenarios like ordering at a café, asking for directions, and more.',
		basicsTitle: language === 'fa' ? 'مبانی آلمانی' : 'German Basics',
		basicsDesc:
			language === 'fa'
				? 'یادگیری اصول اولیه: ضمایر، حروف تعریف، قیدها، اعداد، رنگ‌ها و روزهای هفته. ابتدا پایه‌ها را محکم کنید!'
				: 'Learn essential building blocks: pronouns, articles, adverbs, numbers, colors, and days of the week. Master the fundamentals first!'
	});

	function openSignUp() {
		authMode = 'signup';
		showAuthModal = true;
		authError = '';
		setTimeout(() => emailInput?.focus(), 100);
	}

	function openSignIn() {
		authMode = 'signin';
		showAuthModal = true;
		authError = '';
		setTimeout(() => emailInput?.focus(), 100);
	}

	function toggleAuthModal() {
		showAuthModal = !showAuthModal;
		authError = '';
		if (showAuthModal) setTimeout(() => emailInput?.focus(), 100);
	}

	function toggleAuthMode() {
		authMode = authMode === 'signin' ? 'signup' : 'signin';
		authError = '';
	}

	async function submitAuth() {
		authError = '';
		if (!authEmail.trim() || !authPassword) {
			authError = 'Please enter email and password.';
			return;
		}
		authLoading = true;
		try {
			let result;
			if (authMode === 'signup') {
				result = await auth.signUp(authEmail.trim(), authPassword, authName.trim() || 'Learner');
			} else {
				result = await auth.signIn(authEmail.trim(), authPassword);
			}
			if (result.error) {
				authError = result.error;
			} else {
				showAuthModal = false;
				authEmail = '';
				authPassword = '';
				authName = '';
				const user = await auth.getUser();
				if (user) await auth.ensureProfile(user);
				await updateProfileUI();
				await dataLayer.syncOnLogin();
			}
		} catch (e: any) {
			authError = e.message || 'An error occurred.';
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
			displayName = 'Learner';
			avatarUrl = null;
		}
	}

	async function onLanguageChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		language = select.value as Language;
		preferencesStore.update((s) => ({ ...s, language }));
		await dataLayer.setLanguage(language);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showAuthModal) toggleAuthModal();
		if (e.key === 'Tab' && showAuthModal && modalEl) {
			const focusable = modalEl.querySelectorAll<HTMLElement>(
				'input:not([style*="display:none"]), button, a[href], [tabindex]:not([tabindex="-1"])'
			);
			const visible = Array.from(focusable).filter((el) => {
				let p: HTMLElement | null = el;
				while (p && p !== modalEl) {
					if (p.style && p.style.display === 'none') return false;
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
		if (e.key === 'Enter') submitAuth();
	}

	function handleScroll() {
		scrolled = window.scrollY > 60;
	}

	onMount(async () => {
		initSyncListeners();
		const params = $page.url.searchParams;
		if (params.get('confirmed') === 'true') {
			showConfirmToast = true;
			setTimeout(() => (showConfirmToast = false), 5000);
			goto('/', { replaceState: true });
		}
		const savedLang = await dataLayer.getLanguage();
		if (savedLang) {
			language = savedLang as Language;
		} else {
			const browserLang = navigator.language || 'en';
			language = browserLang.startsWith('fa') ? 'fa' : 'en';
		}
		preferencesStore.update((s) => ({ ...s, language }));
		await updateProfileUI();
	});
</script>

<svelte:window onkeydown={handleKeydown} onscroll={handleScroll} />

<svelte:head>
	<title>Misiro – Learn German the Natural Way</title>
	<meta
		name="description"
		content="Master German through real conversations. Voice recognition, spaced repetition, and 60 progressive lessons — built for English and Persian speakers."
	/>
</svelte:head>

<!-- ── Email Confirmation Toast ─────────────────────────── -->
<div class="confirm-toast" class:show={showConfirmToast}>✅ Email confirmed! You can now sign in.</div>

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
			<button class="auth-close" onclick={toggleAuthModal} aria-label="Close dialog">×</button>
			<div class="auth-logo">🌍</div>
			<h2 id="auth-title">{authMode === 'signin' ? 'Welcome Back' : 'Start Your Journey'}</h2>
			<p class="auth-subtitle">
				{authMode === 'signin'
					? 'Sign in to continue learning German'
					: 'Create your free account — no card required'}
			</p>

			{#if authError}
				<div class="auth-error">{authError}</div>
			{/if}

			{#if authMode === 'signup'}
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

			<button class="auth-submit" onclick={submitAuth} disabled={authLoading}>
				{authLoading
					? '···'
					: authMode === 'signin'
						? 'Sign In'
						: 'Create Free Account'}
			</button>

			<p class="auth-toggle">
				<span>{authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}</span>
				<!-- svelte-ignore a11y_invalid_attribute -->
				<a
					href="#"
					onclick={(e) => {
						e.preventDefault();
						toggleAuthMode();
					}}>{authMode === 'signin' ? ' Sign Up Free' : ' Sign In'}</a
				>
			</p>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  NAVBAR                                                  -->
<!-- ════════════════════════════════════════════════════════ -->
<nav class="navbar" class:scrolled>
	<a href="/" class="brand">
		<span class="brand-icon">🌍</span>
		<span class="brand-name">Misiro</span>
	</a>

	<div class="navbar-right">
		{#if isAuthenticated}
			<span class="nav-greeting">Hi, {displayName.split(' ')[0]} 👋</span>
			<a href="/lesson" class="btn btn-primary">Continue Learning</a>
			<button class="btn btn-ghost" onclick={handleSignOut}>Sign Out</button>
			<a href="/settings" class="nav-avatar-link" title="Settings">
				<div class="nav-avatar">
					{#if avatarUrl}
						<img src={avatarUrl} alt="Avatar" />
					{:else}
						{(displayName || 'L').charAt(0).toUpperCase()}
					{/if}
				</div>
			</a>
		{:else}
			<button class="btn btn-ghost" onclick={openSignIn}>Sign In</button>
			<button class="btn btn-primary" onclick={openSignUp}>Get Started Free</button>
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
			Learn German the Way<br />
			<span class="grad-text">You'd Learn It on the Street</span>
		</h1>
		<p class="hero-sub">
			Real conversations. Real scenarios. Real progress — one day at a time.<br />
			Speak from day one, not after months of grammar drills.
		</p>
		<div class="hero-actions">
			{#if isAuthenticated}
				<a href="/lesson" class="cta-btn primary">Continue Your Journey →</a>
				<a href="/basics" class="cta-btn ghost">Review Basics</a>
			{:else}
				<button class="cta-btn primary" onclick={openSignUp}>Start Learning Free</button>
				<button class="cta-btn ghost" onclick={openSignIn}>I Have an Account</button>
			{/if}
		</div>
		<div class="hero-trust">
			<span>✅ No credit card</span>
			<span>✅ Works on any device</span>
			<span>✅ English &amp; Persian</span>
		</div>
	</div>

	<!-- Chat preview mockup -->
	<div class="hero-visual">
		<div class="phone-frame">
			<div class="phone-notch"></div>
			<div class="chat-window">
				<div class="cw-header">
					<div class="cw-avatar">🇩🇪</div>
					<div class="cw-meta">
						<span class="cw-name">German Tutor</span>
						<span class="cw-online">● online</span>
					</div>
				</div>

				<div class="cw-messages">
					<div class="cmsg received">
						<p class="de">Wie heißen Sie?</p>
						<p class="tr">What is your name?</p>
					</div>
					<div class="cmsg sent">
						<p class="de">Ich heiße Sara.</p>
						<p class="tr">My name is Sara.</p>
						<span class="tick">✓✓</span>
					</div>
					<div class="cmsg received">
						<p class="de">Sehr gut! Woher kommen Sie?</p>
						<p class="tr">Very good! Where are you from?</p>
					</div>
					<div class="cmsg sent typing">
						<span class="mic-dot">🎙️</span>
						<span>Listening…</span>
					</div>
				</div>

				<div class="cw-bar">
					<div class="cw-mic-btn">🎙️</div>
					<div class="cw-wave">
						<span></span><span></span><span></span><span></span><span></span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  STATS                                                   -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="stats-strip">
	<div class="stats-inner">
		<div class="stat-item">
			<span class="stat-num">60</span>
			<span class="stat-lbl">Daily Lessons</span>
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
<!--  HOW IT WORKS                                            -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section dark-section">
	<div class="lp-inner">
		<p class="eyebrow">The Method</p>
		<h2 class="section-h2">
			Built Around How <span class="grad-text">Humans Actually Learn</span>
		</h2>
		<p class="section-lead">
			Forget memorising verb tables. Misiro puts you in real conversations from day one.
		</p>

		<div class="steps-row">
			<div class="step-card">
				<span class="step-num">01</span>
				<span class="step-emoji">🎧</span>
				<h3>Hear Native Audio</h3>
				<p>
					Every sentence is read aloud at a natural pace — so you hear how German actually sounds,
					not exaggerated slow speech.
				</p>
			</div>
			<div class="step-arrow">→</div>
			<div class="step-card">
				<span class="step-num">02</span>
				<span class="step-emoji">🎙️</span>
				<h3>Say It Out Loud</h3>
				<p>
					Your mic captures what you say and checks it against the target. Get instant, word-level
					pronunciation feedback.
				</p>
			</div>
			<div class="step-arrow">→</div>
			<div class="step-card">
				<span class="step-num">03</span>
				<span class="step-emoji">🔄</span>
				<h3>Review at the Right Time</h3>
				<p>
					Spaced repetition (SM-2) surfaces words you're about to forget — exactly when you need to
					see them again.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  FEATURES                                                -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section">
	<div class="lp-inner">
		<p class="eyebrow">Features</p>
		<h2 class="section-h2">
			Everything to <span class="grad-text">Actually Speak German</span>
		</h2>
		<p class="section-lead">No gimmicks. Just the tools that actually build fluency.</p>

		<div class="feat-grid">
			<div class="feat-card">
				<span class="feat-icon">💬</span>
				<h3>Real-Life Scenarios</h3>
				<p>
					Order coffee, ask for directions, introduce yourself. Every lesson is a situation you'll
					face in Germany.
				</p>
			</div>
			<div class="feat-card featured">
				<span class="feat-icon">🎙️</span>
				<h3>Voice Recognition</h3>
				<p>
					Speak into your mic and get instant feedback on every word — know exactly what to fix
					before moving on.
				</p>
				<span class="feat-badge">⭐ Core Feature</span>
			</div>
			<div class="feat-card">
				<span class="feat-icon">📅</span>
				<h3>60-Day Curriculum</h3>
				<p>
					From "Hallo" on day 1 to full conversations by day 60. Carefully structured A1 → B1+
					progression.
				</p>
			</div>
			<div class="feat-card">
				<span class="feat-icon">🔁</span>
				<h3>Spaced Repetition</h3>
				<p>
					The SM-2 algorithm used by the world's top learning apps — built directly into your daily
					lesson flow.
				</p>
			</div>
			<div class="feat-card">
				<span class="feat-icon">📖</span>
				<h3>Word-by-Word Meanings</h3>
				<p>
					Tap any word in a sentence to see its meaning instantly. Build vocabulary in context, not
					in isolation.
				</p>
			</div>
			<div class="feat-card">
				<span class="feat-icon">🌐</span>
				<h3>English &amp; Persian</h3>
				<p>
					All hints and translations in both English and Persian (فارسی). Switch languages any time,
					even mid-lesson.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  THE 60-DAY JOURNEY                                      -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section dark-section">
	<div class="lp-inner">
		<div class="journey-layout">
			<!-- Text side -->
			<div class="journey-text">
				<p class="eyebrow" style="text-align:left">The 60-Day Plan</p>
				<h2 class="section-h2" style="text-align:left">
					A Clear Path from <span class="grad-text">Zero to Fluent</span>
				</h2>
				<p class="section-lead" style="text-align:left;margin-left:0;max-width:100%">
					No more wondering "what should I study today?" Each day has a theme, a scenario, and five
					carefully crafted sentences that build on everything you've learned before.
				</p>

				<ul class="journey-list">
					<li>
						<span class="j-dot green"></span>
						<div>
							<strong>Days 1–20 · A1</strong>
							<span>Greetings, numbers, colours, essential daily phrases</span>
						</div>
					</li>
					<li>
						<span class="j-dot blue"></span>
						<div>
							<strong>Days 21–40 · A2</strong>
							<span>Shopping, travel, work, and social situations</span>
						</div>
					</li>
					<li>
						<span class="j-dot purple"></span>
						<div>
							<strong>Days 41–60 · B1+</strong>
							<span>Opinions, storytelling, and complex conversations</span>
						</div>
					</li>
				</ul>

				{#if isAuthenticated}
					<a href="/lesson" class="cta-btn primary inline">Jump Into Today's Lesson →</a>
				{:else}
					<button class="cta-btn primary inline" onclick={openSignUp}
						>Begin Day 1 — It's Free</button
					>
				{/if}
			</div>

			<!-- Progress card mockup -->
			<div class="journey-visual">
				<div class="progress-card">
					<div class="pc-header">
						<span class="pc-title">🗓️ Your 60-Day Journey</span>
						<span class="pc-badge">Day 1</span>
					</div>
					<div class="pc-grid">
						{#each { length: 60 } as _, i}
							<div class="pc-day" class:active={i === 0}>{i === 0 ? '★' : i + 1}</div>
						{/each}
					</div>
					<div class="pc-levels">
						<span class="plvl a1">A1</span>
						<span class="plvl a2">A2</span>
						<span class="plvl b1">B1+</span>
					</div>
					<div class="pc-stats">
						<div class="pc-stat"><strong>0/60</strong><span>Days Done</span></div>
						<div class="pc-stat"><strong>0</strong><span>Words Learned</span></div>
						<div class="pc-stat"><strong>0</strong><span>Day Streak 🔥</span></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ════════════════════════════════════════════════════════ -->
<!--  APP SECTION  (jump into the app)                        -->
<!-- ════════════════════════════════════════════════════════ -->
<section class="lp-section app-section">
	<div class="lp-inner">
		<p class="eyebrow">Start Now</p>
		<h2 class="section-h2">
			Where Do You Want to <span class="grad-text">Begin?</span>
		</h2>

		<!-- Language selector -->
		<div class="lang-row">
			<span class="lang-lbl">{content.langLabel}</span>
			<select aria-label="Select your first language" value={language} onchange={onLanguageChange}>
				<option value="fa">فارسی</option>
				<option value="en">English</option>
			</select>
		</div>

		<div class="nav-cards">
			<a href="/lesson" class="nav-card lessons">
				<div class="nc-icon">📚</div>
				<h3>{content.lessonsTitle}</h3>
				<p>{content.lessonsDesc}</p>
				<div class="nc-arrow">→</div>
			</a>
			<a href="/basics" class="nav-card basics">
				<div class="nc-icon">🔤</div>
				<h3>{content.basicsTitle}</h3>
				<p>{content.basicsDesc}</p>
				<div class="nc-arrow">→</div>
			</a>
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
				<p>Join learners building real German skills — one conversation at a time.</p>
				<button class="cta-btn primary large" onclick={openSignUp}
					>Create Your Free Account</button
				>
				<p class="cta-fine">No credit card &nbsp;·&nbsp; No spam &nbsp;·&nbsp; Just German</p>
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
			<span>🌍</span>
			<strong>Misiro</strong>
		</div>
		<p>Learn German the Natural Way</p>
		<p class="footer-sub">Made with ❤️ for language learners</p>
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
		transition: opacity 0.2s, transform 0.2s;
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

	.nav-greeting {
		color: #a0a0a0;
		font-size: 0.9rem;
	}

	.nav-avatar-link {
		text-decoration: none;
	}

	.nav-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #e94560, #ff6b6b);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		font-weight: 700;
		border: 2px solid rgba(255, 255, 255, 0.18);
		overflow: hidden;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.nav-avatar:hover {
		transform: scale(1.08);
		box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.4);
	}

	.nav-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
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
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
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

	.chat-window {
		display: flex;
		flex-direction: column;
		height: 480px;
	}

	.cw-header {
		background: #075e54;
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.cw-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
	}

	.cw-name {
		font-size: 0.92rem;
		font-weight: 700;
		color: #fff;
		display: block;
	}

	.cw-online {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.cw-messages {
		flex: 1;
		background: #e5ddd5;
		padding: 14px 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow: hidden;
	}

	.cmsg {
		max-width: 88%;
		padding: 9px 12px;
		border-radius: 12px;
		position: relative;
	}

	.cmsg.received {
		background: #fff;
		align-self: flex-start;
		border-bottom-left-radius: 3px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		animation: msgIn 0.4s ease both;
	}

	.cmsg.sent {
		background: #dcf8c6;
		align-self: flex-end;
		border-bottom-right-radius: 3px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		animation: msgIn 0.4s 0.15s ease both;
	}

	@keyframes msgIn {
		from {
			opacity: 0;
			transform: translateY(6px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.cmsg .de {
		font-size: 0.88rem;
		font-weight: 700;
		color: #1a1a2e;
		margin: 0 0 3px;
	}

	.cmsg .tr {
		font-size: 0.73rem;
		color: #888;
		margin: 0;
	}

	.tick {
		font-size: 0.68rem;
		color: #4caf50;
		float: right;
		margin-top: 3px;
	}

	.cmsg.typing {
		background: #dcf8c6;
		align-self: flex-end;
		border-bottom-right-radius: 3px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.83rem;
		color: #555;
		animation:
			msgIn 0.4s 0.3s ease both,
			typingPulse 1.6s ease-in-out infinite;
	}

	@keyframes typingPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	.mic-dot {
		animation: micBounce 0.8s ease-in-out infinite alternate;
	}

	@keyframes micBounce {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.25);
		}
	}

	.cw-bar {
		background: #f0f0f0;
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.cw-mic-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #e94560, #ff6b6b);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		flex-shrink: 0;
		animation: micPulse 1.8s ease-in-out infinite;
	}

	@keyframes micPulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.45);
		}
		50% {
			box-shadow: 0 0 0 9px rgba(233, 69, 96, 0);
		}
	}

	.cw-wave {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
	}

	.cw-wave span {
		display: block;
		width: 4px;
		background: #e94560;
		border-radius: 2px;
		animation: waveBar 1.3s ease-in-out infinite;
	}

	.cw-wave span:nth-child(1) {
		height: 8px;
		animation-delay: 0s;
	}
	.cw-wave span:nth-child(2) {
		height: 20px;
		animation-delay: 0.1s;
	}
	.cw-wave span:nth-child(3) {
		height: 30px;
		animation-delay: 0.2s;
	}
	.cw-wave span:nth-child(4) {
		height: 20px;
		animation-delay: 0.3s;
	}
	.cw-wave span:nth-child(5) {
		height: 8px;
		animation-delay: 0.4s;
	}

	@keyframes waveBar {
		0%,
		100% {
			transform: scaleY(0.45);
		}
		50% {
			transform: scaleY(1);
		}
	}

	/* ── Stats strip ──────────────────────────────────── */
	.stats-strip {
		background: rgba(255, 255, 255, 0.035);
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		padding: 44px 20px;
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
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(233, 69, 96, 0.08), transparent);
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

	.feat-card.featured {
		border-color: rgba(233, 69, 96, 0.4);
		background: rgba(233, 69, 96, 0.07);
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

	.feat-badge {
		display: inline-block;
		margin-top: 14px;
		padding: 4px 12px;
		background: rgba(233, 69, 96, 0.2);
		color: #ffaabb;
		border-radius: 20px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	/* ── Journey section ──────────────────────────────── */
	.journey-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 80px;
		align-items: center;
		text-align: left;
	}

	.journey-text .section-lead {
		text-align: left;
		margin-left: 0;
		max-width: 100%;
		margin-bottom: 28px;
	}

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

	/* ── Progress preview card ────────────────────────── */
	.journey-visual {
		display: flex;
		justify-content: center;
	}

	.progress-card {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
		border: 1px solid rgba(255, 255, 255, 0.11);
		border-radius: 24px;
		padding: 28px;
		width: 100%;
		max-width: 370px;
	}

	.pc-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 22px;
	}

	.pc-title {
		font-weight: 700;
		color: #fff;
		font-size: 0.93rem;
	}

	.pc-badge {
		background: rgba(233, 69, 96, 0.2);
		color: #ffaabb;
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pc-grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 5px;
		margin-bottom: 18px;
	}

	.pc-day {
		aspect-ratio: 1;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.52rem;
		color: #444;
		font-weight: 600;
		transition: all 0.2s;
	}

	.pc-day.active {
		background: linear-gradient(135deg, #e94560, #ff6b6b);
		color: #fff;
		font-size: 0.68rem;
		box-shadow: 0 4px 14px rgba(233, 69, 96, 0.45);
	}

	.pc-levels {
		display: flex;
		gap: 8px;
		margin-bottom: 20px;
	}

	.plvl {
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 0.76rem;
		font-weight: 700;
	}

	.plvl.a1 {
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
	}

	.plvl.a2 {
		background: rgba(52, 152, 219, 0.2);
		color: #3498db;
	}

	.plvl.b1 {
		background: rgba(155, 89, 182, 0.2);
		color: #9b59b6;
	}

	.pc-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}

	.pc-stat {
		text-align: center;
	}

	.pc-stat strong {
		display: block;
		font-size: 1.2rem;
		color: #fff;
		font-weight: 900;
	}

	.pc-stat span {
		font-size: 0.7rem;
		color: #555;
	}

	/* ── App section (nav cards) ──────────────────────── */
	.app-section {
		padding-top: 80px;
	}

	.lang-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 14px;
		margin: 28px 0 50px;
	}

	.lang-lbl {
		color: #a0a0a0;
		font-size: 0.95rem;
	}

	.lang-row select {
		padding: 10px 22px;
		border-radius: 25px;
		border: 2px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.07);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		font-family: inherit;
	}

	.lang-row select:hover {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.12);
	}

	.lang-row select option {
		background: #1a1a2e;
	}

	.nav-cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 28px;
		max-width: 800px;
		margin: 0 auto;
	}

	.nav-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		padding: 44px 36px;
		text-decoration: none;
		color: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.nav-card.lessons {
		background: linear-gradient(145deg, rgba(52, 152, 219, 0.15), rgba(52, 152, 219, 0.04));
	}

	.nav-card.basics {
		background: linear-gradient(145deg, rgba(46, 204, 113, 0.15), rgba(46, 204, 113, 0.04));
	}

	.nav-card:hover {
		transform: translateY(-12px) scale(1.02);
	}

	.nav-card.lessons:hover {
		border-color: #3498db;
		box-shadow: 0 24px 64px rgba(52, 152, 219, 0.3);
	}

	.nav-card.basics:hover {
		border-color: #2ecc71;
		box-shadow: 0 24px 64px rgba(46, 204, 113, 0.3);
	}

	.nc-icon {
		font-size: 3.6rem;
		margin-bottom: 18px;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
	}

	.nav-card h3 {
		font-size: 1.5rem;
		font-weight: 800;
		margin-bottom: 12px;
	}

	.nav-card p {
		color: #a0a0a0;
		line-height: 1.65;
		font-size: 0.93rem;
	}

	.nc-arrow {
		margin-top: 22px;
		font-size: 1.5rem;
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
	}

	.nav-card:hover .nc-arrow {
		opacity: 1;
		transform: translateX(0);
	}

	/* ── Final CTA box ────────────────────────────────── */
	.cta-section {
		padding: 60px 20px 100px;
	}

	.cta-box {
		background: linear-gradient(145deg, rgba(233, 69, 96, 0.1), rgba(255, 107, 107, 0.05));
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

	.footer-sub {
		font-size: 0.82rem !important;
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

		.journey-layout {
			grid-template-columns: 1fr;
			gap: 50px;
			text-align: center;
		}

		.journey-text .section-h2,
		.journey-text .section-lead {
			text-align: center;
			margin-left: auto;
			margin-right: auto;
		}

		.journey-list li {
			justify-content: center;
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
		.feat-grid {
			grid-template-columns: 1fr;
		}

		.nav-cards {
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

		.chat-window {
			height: 420px;
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
