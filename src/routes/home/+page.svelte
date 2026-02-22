<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { preferencesStore } from '$stores/preferences';
	import type { Language } from '$stores/preferences';
	import * as auth from '$services/auth';
	import * as dataLayer from '$services/data-layer';
	import { getDueCount } from '$services/spaced-repetition';
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

	// Progress stats
	let daysCompleted = $state(0);
	let currentDay = $state(1);
	let streakCount = $state(0);
	let dueReviews = $state(0);

	// Refs for focus trap
	let modalEl: HTMLDivElement | undefined = $state();
	let emailInput: HTMLInputElement | undefined = $state();

	// Derived: current level label + progress %
	const currentLevel = $derived(
		currentDay <= 20 ? 'A1' : currentDay <= 40 ? 'A2' : 'B1+'
	);

	const progressPercent = $derived(Math.round((daysCompleted / 60) * 100));

	const levelPercent = $derived(() => {
		if (currentDay <= 20) return Math.round((Math.min(daysCompleted, 20) / 20) * 100);
		if (currentDay <= 40) return Math.round(((Math.min(daysCompleted, 40) - 20) / 20) * 100);
		return Math.round(((Math.min(daysCompleted, 60) - 40) / 20) * 100);
	});

	// i18n content
	const content = $derived({
		langLabel: language === 'fa' ? 'زبان:' : 'Language:',
		lessonsTitle: language === 'fa' ? 'درس‌های روزانه' : 'Daily Lessons',
		lessonsDesc:
			language === 'fa'
				? 'مکالمات واقعی آلمانی را تمرین کنید. هر روز سناریوهای جدید مثل سفارش در کافه، پرسیدن مسیر و موارد دیگر.'
				: 'Practice real-world conversations. Each day brings new scenarios like ordering at a café, asking for directions, and more.',
		basicsTitle: language === 'fa' ? 'مبانی آلمانی' : 'German Basics',
		basicsDesc:
			language === 'fa'
				? 'یادگیری اصول اولیه: ضمایر، حروف تعریف، قیدها، اعداد، رنگ‌ها و روزهای هفته.'
				: 'Essential building blocks: pronouns, articles, adverbs, numbers, colors, and days of the week.'
	});

	// Compute streak from completedLessons timestamps
	function computeStreak(completedLessons: Record<number, { completedAt: number; sentenceCount: number }>): number {
		const entries = Object.values(completedLessons);
		if (!entries.length) return 0;

		// Group by calendar date (YYYY-MM-DD)
		const days = new Set(
			entries.map((e) => new Date(e.completedAt).toDateString())
		);

		let streak = 0;
		const today = new Date();
		const check = new Date(today);

		// Allow today or yesterday as the start (don't break streak if not done yet today)
		if (!days.has(check.toDateString())) {
			check.setDate(check.getDate() - 1);
		}

		while (days.has(check.toDateString())) {
			streak++;
			check.setDate(check.getDate() - 1);
		}
		return streak;
	}

	async function loadProgress() {
		const completed = await dataLayer.getCompletedLessons();
		daysCompleted = Object.keys(completed).length;
		streakCount = computeStreak(completed);

		const progress = await dataLayer.getProgress();
		currentDay = progress?.current_day ?? 1;

		try {
			dueReviews = await getDueCount();
		} catch {
			dueReviews = 0;
		}
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
				await loadProgress();
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

	onMount(async () => {
		initSyncListeners();

		const params = $page.url.searchParams;
		if (params.get('confirmed') === 'true') {
			showConfirmToast = true;
			setTimeout(() => (showConfirmToast = false), 5000);
			goto('/home', { replaceState: true });
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
		await loadProgress();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Misiro – My Dashboard</title>
</svelte:head>

<!-- Confirmation Toast -->
<div class="confirm-toast" class:show={showConfirmToast}>
	✅ Email confirmed! You can now sign in.
</div>

<!-- Auth Modal -->
{#if showAuthModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="auth-overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-title"
		onclick={(e) => { if (e.target === e.currentTarget) toggleAuthModal(); }}
	>
		<div class="auth-modal" bind:this={modalEl}>
			<button class="auth-close" onclick={toggleAuthModal} aria-label="Close dialog">×</button>
			<h2 id="auth-title">{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
			{#if authError}
				<div class="auth-error">{authError}</div>
			{/if}
			{#if authMode === 'signup'}
				<div class="auth-field">
					<input type="text" placeholder="Display Name" aria-label="Display Name"
						bind:value={authName} onkeydown={handleAuthKeydown} />
				</div>
			{/if}
			<div class="auth-field">
				<input type="email" placeholder="Email" aria-label="Email address"
					bind:this={emailInput} bind:value={authEmail} onkeydown={handleAuthKeydown} />
			</div>
			<div class="auth-field">
				<input type="password" placeholder="Password" aria-label="Password"
					bind:value={authPassword} onkeydown={handleAuthKeydown} />
			</div>
			<button class="auth-submit" onclick={submitAuth} disabled={authLoading}>
				{authLoading ? '...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
			</button>
			<p class="auth-toggle">
				<span>{authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}</span>
				<!-- svelte-ignore a11y_invalid_attribute -->
				<a href="#" onclick={(e) => { e.preventDefault(); toggleAuthMode(); }}>
					{authMode === 'signin' ? ' Sign Up' : ' Sign In'}
				</a>
			</p>
		</div>
	</div>
{/if}

<div class="home-container">

	<!-- ── Top Nav ─────────────────────────────────────── -->
	<nav class="top-nav">
		<a href="/" class="nav-brand" title="Back to home">
			<span>🌍</span>
			<span class="brand-text">Misiro</span>
		</a>

		<div class="nav-right">
			<!-- Language selector — compact, in nav -->
			<div class="lang-compact">
				<span class="lang-lbl">{content.langLabel}</span>
				<select aria-label="Select language" value={language} onchange={onLanguageChange}>
					<option value="en">English</option>
					<option value="fa">فارسی</option>
				</select>
			</div>

			{#if isAuthenticated}
				<a href="/settings" class="nav-icon-btn" title="Settings">⚙️</a>
				<button class="nav-text-btn" onclick={handleSignOut}>Sign Out</button>
				<a href="/settings" class="avatar-link" title="Profile">
					<div class="avatar">
						{#if avatarUrl}
							<img src={avatarUrl} alt="Avatar" />
						{:else}
							{(displayName || 'L').charAt(0).toUpperCase()}
						{/if}
					</div>
				</a>
			{:else}
				<button class="nav-text-btn" onclick={toggleAuthModal}>Sign In</button>
			{/if}
		</div>
	</nav>

	<!-- ── Welcome Banner ──────────────────────────────── -->
	<div class="welcome-banner">
		<div class="welcome-left">
			<div class="logo-anim">🌍</div>
			<div>
				{#if isAuthenticated}
					<h1>Welcome back, {displayName.split(' ')[0]}! 👋</h1>
					<p>
						{streakCount > 0
							? `You're on a ${streakCount}-day streak — keep it going!`
							: 'Pick up where you left off.'}
					</p>
				{:else}
					<h1>Misiro</h1>
					<p>Learn German the Natural Way</p>
				{/if}
			</div>
		</div>
		{#if isAuthenticated && dueReviews > 0}
			<a href="/lesson" class="review-chip">
				🔄 {dueReviews} review{dueReviews === 1 ? '' : 's'} due
			</a>
		{/if}
	</div>

	<!-- ── Progress Stats ──────────────────────────────── -->
	{#if isAuthenticated}
		<div class="stats-row">
			<div class="stat-card">
				<span class="stat-icon">📅</span>
				<span class="stat-value">{daysCompleted}<span class="stat-total">/60</span></span>
				<span class="stat-label">Days Done</span>
			</div>
			<div class="stat-card">
				<span class="stat-icon">🎯</span>
				<span class="stat-value">{currentLevel}</span>
				<span class="stat-label">Current Level</span>
			</div>
			<div class="stat-card">
				<span class="stat-icon">🔥</span>
				<span class="stat-value">{streakCount}</span>
				<span class="stat-label">Day Streak</span>
			</div>
			<div class="stat-card">
				<span class="stat-icon">🔄</span>
				<span class="stat-value">{dueReviews}</span>
				<span class="stat-label">Due Reviews</span>
			</div>
		</div>

		<!-- ── Learning Path Progress ──────────────────── -->
		<div class="path-card">
			<div class="path-header">
				<span class="path-title">Your 60-Day Journey</span>
				<span class="path-pct">{progressPercent}% complete</span>
			</div>
			<div class="path-track">
				<div class="path-segment">
					<div class="seg-bar">
						<div
							class="seg-fill a1"
							style="width: {Math.min(100, (Math.min(daysCompleted, 20) / 20) * 100)}%"
						></div>
					</div>
					<span class="seg-label a1-lbl">A1 <small>Days 1–20</small></span>
				</div>
				<div class="path-divider">→</div>
				<div class="path-segment">
					<div class="seg-bar">
						<div
							class="seg-fill a2"
							style="width: {Math.min(100, (Math.max(0, Math.min(daysCompleted, 40) - 20) / 20) * 100)}%"
						></div>
					</div>
					<span class="seg-label a2-lbl">A2 <small>Days 21–40</small></span>
				</div>
				<div class="path-divider">→</div>
				<div class="path-segment">
					<div class="seg-bar">
						<div
							class="seg-fill b1"
							style="width: {Math.min(100, (Math.max(0, Math.min(daysCompleted, 60) - 40) / 20) * 100)}%"
						></div>
					</div>
					<span class="seg-label b1-lbl">B1+ <small>Days 41–60</small></span>
				</div>
			</div>
			<div class="path-day-hint">
				{#if daysCompleted < 60}
					Next up: Day {daysCompleted + 1}
					{daysCompleted + 1 <= 20 ? '· A1' : daysCompleted + 1 <= 40 ? '· A2' : '· B1+'}
				{:else}
					🎉 All 60 days complete!
				{/if}
			</div>
		</div>
	{/if}

	<!-- ── Nav Cards ───────────────────────────────────── -->
	<div class="nav-cards" id="categories-grid">
		<a href="/lesson" class="nav-card lessons">
			<div class="card-glow"></div>
			<div class="icon">📚</div>
			<h2>{content.lessonsTitle}</h2>
			<p>{content.lessonsDesc}</p>
			{#if isAuthenticated && daysCompleted > 0}
				<div class="card-meta">Day {Math.min(currentDay, 60)} of 60</div>
			{/if}
			<div class="arrow">→</div>
		</a>

		<a href="/basics" class="nav-card basics">
			<div class="card-glow"></div>
			<div class="icon">🔤</div>
			<h2>{content.basicsTitle}</h2>
			<p>{content.basicsDesc}</p>
			<div class="arrow">→</div>
		</a>
	</div>

	<!-- ── Footer ──────────────────────────────────────── -->
	<footer class="home-footer">
		<p>Made with ❤️ for language learners</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.home-container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 28px 24px 40px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 28px;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		color: #fff;
	}

	/* ── Top Nav ──────────────────────────────────────── */
	.top-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-size: 1.4rem;
		transition: opacity 0.2s;
	}

	.nav-brand:hover {
		opacity: 0.8;
	}

	.brand-text {
		font-weight: 800;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	/* Compact language picker */
	.lang-compact {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.lang-lbl {
		font-size: 0.82rem;
		color: #888;
	}

	.lang-compact select {
		padding: 5px 12px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.07);
		color: #fff;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	.lang-compact select:hover {
		border-color: rgba(255, 255, 255, 0.35);
	}

	.lang-compact select option {
		background: #1a1a2e;
	}

	.nav-icon-btn {
		font-size: 1.2rem;
		text-decoration: none;
		padding: 4px;
		border-radius: 8px;
		transition: opacity 0.2s;
		line-height: 1;
	}

	.nav-icon-btn:hover {
		opacity: 0.7;
	}

	.nav-text-btn {
		padding: 6px 16px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: transparent;
		color: #ccc;
		cursor: pointer;
		font-size: 0.84rem;
		font-family: inherit;
		transition: all 0.2s;
	}

	.nav-text-btn:hover {
		border-color: #e94560;
		color: #fff;
		background: rgba(233, 69, 96, 0.12);
	}

	.avatar-link {
		text-decoration: none;
	}

	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: linear-gradient(135deg, #e94560, #ff6b6b);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		font-weight: 700;
		border: 2px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.avatar:hover {
		transform: scale(1.08);
		box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.4);
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	/* ── Welcome Banner ───────────────────────────────── */
	.welcome-banner {
		background: linear-gradient(135deg, rgba(233, 69, 96, 0.12), rgba(255, 107, 107, 0.06));
		border: 1px solid rgba(233, 69, 96, 0.2);
		border-radius: 20px;
		padding: 28px 32px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	.welcome-left {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.logo-anim {
		font-size: 3rem;
		animation: float 3s ease-in-out infinite;
		flex-shrink: 0;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}

	.welcome-left h1 {
		font-size: 1.6rem;
		font-weight: 800;
		margin: 0 0 6px;
		color: #fff;
		background: linear-gradient(90deg, #fff, #e94560);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.welcome-left p {
		margin: 0;
		color: #a0a0a0;
		font-size: 0.95rem;
	}

	.review-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 20px;
		background: rgba(46, 204, 113, 0.15);
		border: 1px solid rgba(46, 204, 113, 0.35);
		border-radius: 50px;
		color: #2ecc71;
		font-size: 0.9rem;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		transition: all 0.25s ease;
	}

	.review-chip:hover {
		background: rgba(46, 204, 113, 0.25);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(46, 204, 113, 0.3);
	}

	/* ── Stats Row ────────────────────────────────────── */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		text-align: center;
		transition: transform 0.25s ease, border-color 0.25s;
	}

	.stat-card:hover {
		transform: translateY(-4px);
		border-color: rgba(233, 69, 96, 0.3);
	}

	.stat-icon {
		font-size: 1.6rem;
	}

	.stat-value {
		font-size: 1.8rem;
		font-weight: 900;
		color: #fff;
		line-height: 1;
	}

	.stat-total {
		font-size: 1rem;
		color: #666;
		font-weight: 500;
	}

	.stat-label {
		font-size: 0.78rem;
		color: #777;
		font-weight: 500;
	}

	/* ── Learning Path Card ───────────────────────────── */
	.path-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: 24px 28px;
	}

	.path-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 18px;
	}

	.path-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ccc;
	}

	.path-pct {
		font-size: 0.85rem;
		color: #e94560;
		font-weight: 700;
	}

	.path-track {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.path-segment {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.seg-bar {
		height: 10px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 5px;
		overflow: hidden;
	}

	.seg-fill {
		height: 100%;
		border-radius: 5px;
		transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.seg-fill.a1 { background: linear-gradient(90deg, #2ecc71, #27ae60); }
	.seg-fill.a2 { background: linear-gradient(90deg, #3498db, #2980b9); }
	.seg-fill.b1 { background: linear-gradient(90deg, #9b59b6, #8e44ad); }

	.seg-label {
		font-size: 0.82rem;
		font-weight: 700;
	}

	.seg-label small {
		font-weight: 400;
		color: #666;
		margin-left: 4px;
	}

	.a1-lbl { color: #2ecc71; }
	.a2-lbl { color: #3498db; }
	.b1-lbl { color: #9b59b6; }

	.path-divider {
		color: rgba(255, 255, 255, 0.2);
		font-size: 1.2rem;
		flex-shrink: 0;
		padding-bottom: 20px;
	}

	.path-day-hint {
		margin-top: 14px;
		font-size: 0.85rem;
		color: #888;
	}

	/* ── Nav Cards ────────────────────────────────────── */
	.nav-cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 24px;
	}

	.nav-card {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
		border-radius: 24px;
		padding: 36px 32px;
		text-decoration: none;
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	.card-glow {
		position: absolute;
		inset: 0;
		opacity: 0;
		transition: opacity 0.3s;
		border-radius: inherit;
	}

	.nav-card.lessons .card-glow {
		background: radial-gradient(circle at 50% 0%, rgba(52, 152, 219, 0.18), transparent 70%);
	}

	.nav-card.basics .card-glow {
		background: radial-gradient(circle at 50% 0%, rgba(46, 204, 113, 0.18), transparent 70%);
	}

	.nav-card:hover .card-glow {
		opacity: 1;
	}

	.nav-card:hover {
		transform: translateY(-10px) scale(1.02);
	}

	.nav-card.lessons {
		background: linear-gradient(145deg, rgba(52, 152, 219, 0.18), rgba(52, 152, 219, 0.04));
	}

	.nav-card.lessons:hover {
		border-color: #3498db;
		box-shadow: 0 20px 60px rgba(52, 152, 219, 0.28);
	}

	.nav-card.basics {
		background: linear-gradient(145deg, rgba(46, 204, 113, 0.18), rgba(46, 204, 113, 0.04));
	}

	.nav-card.basics:hover {
		border-color: #2ecc71;
		box-shadow: 0 20px 60px rgba(46, 204, 113, 0.28);
	}

	.nav-card .icon {
		font-size: 3.6rem;
		margin-bottom: 16px;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
	}

	.nav-card h2 {
		font-size: 1.6rem;
		font-weight: 800;
		margin-bottom: 12px;
		position: relative;
		z-index: 1;
	}

	.nav-card p {
		color: #a0a0a0;
		line-height: 1.6;
		font-size: 0.92rem;
		position: relative;
		z-index: 1;
	}

	.card-meta {
		margin-top: 14px;
		padding: 5px 14px;
		background: rgba(52, 152, 219, 0.2);
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 700;
		color: #7fc8f8;
		z-index: 1;
	}

	.nav-card .arrow {
		margin-top: 18px;
		font-size: 1.5rem;
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
		position: relative;
		z-index: 1;
	}

	.nav-card:hover .arrow {
		opacity: 1;
		transform: translateX(0);
	}

	/* ── Footer ───────────────────────────────────────── */
	.home-footer {
		text-align: center;
		padding-top: 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		color: #555;
		font-size: 0.88rem;
		margin-top: auto;
	}

	/* ── Toast ────────────────────────────────────────── */
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

	/* ── Auth Modal ───────────────────────────────────── */
	.auth-overlay {
		display: flex;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		z-index: 1000;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	.auth-modal {
		background: linear-gradient(145deg, #1a1a2e, #16213e);
		border-radius: 20px;
		padding: 40px;
		max-width: 400px;
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
	}

	.auth-close {
		position: absolute;
		top: 15px;
		right: 20px;
		background: none;
		border: none;
		color: #a0a0a0;
		font-size: 1.5rem;
		cursor: pointer;
	}

	.auth-modal h2 {
		margin-bottom: 20px;
		color: #e94560;
	}

	.auth-error {
		background: rgba(233, 69, 96, 0.2);
		color: #ff6b6b;
		padding: 10px;
		border-radius: 10px;
		margin-bottom: 15px;
		font-size: 0.9rem;
	}

	.auth-field {
		margin-bottom: 15px;
	}

	.auth-field input {
		width: 100%;
		padding: 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		font-size: 1rem;
		box-sizing: border-box;
		font-family: inherit;
	}

	.auth-field input::placeholder { color: #666; }

	.auth-submit {
		width: 100%;
		padding: 12px;
		border-radius: 10px;
		border: none;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		margin-top: 5px;
		transition: opacity 0.2s;
		font-family: inherit;
	}

	.auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }

	.auth-toggle {
		text-align: center;
		margin-top: 15px;
		color: #a0a0a0;
		font-size: 0.9rem;
	}

	.auth-toggle a { color: #e94560; text-decoration: none; font-weight: 600; }

	/* ── Responsive ───────────────────────────────────── */
	@media (max-width: 700px) {
		.home-container { padding: 20px 16px; gap: 20px; }

		.stats-row { grid-template-columns: repeat(2, 1fr); }

		.nav-cards { grid-template-columns: 1fr; }

		.welcome-banner { flex-direction: column; align-items: flex-start; gap: 14px; }

		.path-track { flex-direction: column; gap: 16px; }

		.path-divider { transform: rotate(90deg); padding: 0; }

		.nav-card { padding: 28px 24px; }

		.lang-compact { display: none; }

		.welcome-left { gap: 14px; }

		.welcome-left h1 { font-size: 1.3rem; }
	}
</style>
