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

	// Refs for focus trap
	let modalEl: HTMLDivElement | undefined = $state();
	let emailInput: HTMLInputElement | undefined = $state();

	// i18n content
	const content = $derived({
		langLabel: language === 'fa' ? 'زبان اول شما چیست؟' : 'What is your first language?',
		lessonsTitle: language === 'fa' ? 'درس‌های روزانه' : 'Daily Lessons',
		lessonsDesc: language === 'fa'
			? 'مکالمات واقعی آلمانی را تمرین کنید. هر روز سناریوهای جدید مثل سفارش در کافه، پرسیدن مسیر و موارد دیگر.'
			: 'Practice real-world conversations in German. Each day brings new scenarios like ordering at a café, asking for directions, and more.',
		basicsTitle: language === 'fa' ? 'مبانی آلمانی' : 'German Basics',
		basicsDesc: language === 'fa'
			? 'یادگیری اصول اولیه: ضمایر، حروف تعریف، قیدها، اعداد، رنگ‌ها و روزهای هفته. ابتدا پایه‌ها را محکم کنید!'
			: 'Learn essential building blocks: pronouns, articles, adverbs, numbers, colors, and days of the week. Master the fundamentals first!'
	});

	function toggleAuthModal() {
		showAuthModal = !showAuthModal;
		authError = '';
		if (showAuthModal) {
			setTimeout(() => emailInput?.focus(), 100);
		}
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
				// Ensure profile + sync
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
			const url = dataLayer.getAvatarUrl() || await auth.getAvatarUrl();
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
		if (e.key === 'Escape' && showAuthModal) {
			toggleAuthModal();
		}

		// Focus trap for modal
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
			if (visible.length === 0) return;
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
		if (e.key === 'Enter') {
			submitAuth();
		}
	}

	onMount(async () => {
		// Initialize sync listeners
		initSyncListeners();

		// Check for email confirmation redirect
		const params = $page.url.searchParams;
		if (params.get('confirmed') === 'true') {
			showConfirmToast = true;
			setTimeout(() => (showConfirmToast = false), 5000);
			// Clean URL
			goto('/', { replaceState: true });
		}

		// Load saved language
		const savedLang = await dataLayer.getLanguage();
		if (savedLang) {
			language = savedLang as Language;
		} else {
			const browserLang = navigator.language || 'en';
			language = browserLang.startsWith('fa') ? 'fa' : 'en';
		}
		preferencesStore.update((s) => ({ ...s, language }));

		// Update profile UI
		await updateProfileUI();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Misiro - Learn German</title>
</svelte:head>

<!-- Email Confirmation Toast -->
<div class="confirm-toast" class:show={showConfirmToast}>
	✅ Email confirmed! You can now sign in.
</div>

<div class="home-container">
	<!-- Top Bar with Profile -->
	<div class="top-bar">
		<div class="profile-section">
			{#if isAuthenticated}
				<a href="/settings" class="profile-avatar-link">
					<div class="profile-avatar" title="Settings">
						{#if avatarUrl}
							<img src={avatarUrl} alt="Avatar" />
						{:else}
							{(displayName || 'L').charAt(0).toUpperCase()}
						{/if}
					</div>
				</a>
			{:else}
				<div class="profile-avatar static" title="Profile">👤</div>
			{/if}
			<span class="profile-name">{displayName}</span>
			{#if isAuthenticated}
				<button class="auth-btn" onclick={handleSignOut}>Sign Out</button>
			{:else}
				<button class="auth-btn" onclick={toggleAuthModal}>Sign In</button>
			{/if}
		</div>
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
						<input
							type="text"
							placeholder="Display Name"
							aria-label="Display Name"
							bind:value={authName}
							onkeydown={handleAuthKeydown}
						/>
					</div>
				{/if}

				<div class="auth-field">
					<input
						type="email"
						placeholder="Email"
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
					{authLoading ? '...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
				</button>

				<p class="auth-toggle">
					<span>
						{authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
					</span>
					<!-- svelte-ignore a11y_invalid_attribute -->
					<a href="#" onclick={(e) => { e.preventDefault(); toggleAuthMode(); }}>
						{authMode === 'signin' ? ' Sign Up' : ' Sign In'}
					</a>
				</p>
			</div>
		</div>
	{/if}

	<!-- Header -->
	<header class="home-header">
		<div class="logo">🌍</div>
		<h1>Misiro</h1>
		<p>Learn German the Natural Way</p>
	</header>

	<!-- Controls -->
	<div class="home-controls">
		<span class="lang-label">{content.langLabel}</span>
		<select aria-label="Select your first language" value={language} onchange={onLanguageChange}>
			<option value="fa">فارسی</option>
			<option value="en">English</option>
		</select>
	</div>

	<!-- Navigation Cards -->
	<div class="nav-cards" id="categories-grid">
		<a href="/lesson" class="nav-card lessons">
			<div class="icon">📚</div>
			<h2>{content.lessonsTitle}</h2>
			<p>{content.lessonsDesc}</p>
			<div class="arrow">→</div>
		</a>

		<a href="/basics" class="nav-card basics">
			<div class="icon">🔤</div>
			<h2>{content.basicsTitle}</h2>
			<p>{content.basicsDesc}</p>
			<div class="arrow">→</div>
		</a>
	</div>

	<!-- Footer -->
	<footer class="home-footer">
		<p>Made with ❤️ for language learners</p>
	</footer>
</div>

<style>
	/* Base */
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.home-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px 20px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		color: #fff;
	}

	/* Top Bar */
	.top-bar {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		padding: 10px 0;
		margin-bottom: 20px;
	}

	.profile-section {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.profile-avatar {
		width: 45px;
		height: 45px;
		border-radius: 50%;
		background: linear-gradient(135deg, #e94560, #ff6b6b);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.3rem;
		font-weight: 700;
		border: 3px solid rgba(255, 255, 255, 0.2);
		cursor: pointer;
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.profile-avatar:hover {
		transform: scale(1.1);
		border-color: #e94560;
		box-shadow: 0 5px 20px rgba(233, 69, 96, 0.4);
	}

	.profile-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	.profile-avatar.static {
		cursor: default;
	}

	.profile-avatar.static:hover {
		transform: none;
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow: none;
	}

	.profile-avatar-link {
		text-decoration: none;
	}

	.profile-name {
		font-weight: 600;
		font-size: 1.1rem;
		color: #fff;
	}

	.auth-btn {
		padding: 6px 16px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		color: #fff;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.3s ease;
	}

	.auth-btn:hover {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.2);
	}

	/* Header */
	.home-header {
		text-align: center;
		margin-bottom: 60px;
	}

	.logo {
		font-size: 4rem;
		margin-bottom: 10px;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}

	.home-header h1 {
		font-size: 3rem;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 10px;
	}

	.home-header p {
		font-size: 1.2rem;
		color: #a0a0a0;
	}

	/* Controls */
	.home-controls {
		display: flex;
		justify-content: center;
		gap: 15px;
		margin-bottom: 50px;
		flex-wrap: wrap;
		align-items: center;
	}

	.lang-label {
		color: #a0a0a0;
		font-size: 1rem;
	}

	.home-controls select {
		padding: 10px 20px;
		border-radius: 25px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.home-controls select:hover {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.2);
	}

	.home-controls select option {
		background: #1a1a2e;
		color: #fff;
	}

	/* Nav Cards */
	.nav-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 30px;
		flex: 1;
	}

	.nav-card {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
		border-radius: 24px;
		padding: 40px;
		text-decoration: none;
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	.nav-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(145deg, rgba(233, 69, 96, 0.1), transparent);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.nav-card:hover {
		transform: translateY(-10px) scale(1.02);
		border-color: #e94560;
		box-shadow: 0 20px 60px rgba(233, 69, 96, 0.3);
	}

	.nav-card:hover::before {
		opacity: 1;
	}

	.nav-card .icon {
		font-size: 4rem;
		margin-bottom: 20px;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
	}

	.nav-card h2 {
		font-size: 1.8rem;
		margin-bottom: 15px;
		position: relative;
		z-index: 1;
	}

	.nav-card p {
		color: #a0a0a0;
		line-height: 1.6;
		position: relative;
		z-index: 1;
	}

	.nav-card .arrow {
		margin-top: 20px;
		font-size: 1.5rem;
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
	}

	.nav-card:hover .arrow {
		opacity: 1;
		transform: translateX(0);
	}

	.nav-card.lessons {
		background: linear-gradient(145deg, rgba(52, 152, 219, 0.2), rgba(52, 152, 219, 0.05));
	}

	.nav-card.lessons:hover {
		border-color: #3498db;
		box-shadow: 0 20px 60px rgba(52, 152, 219, 0.3);
	}

	.nav-card.basics {
		background: linear-gradient(145deg, rgba(46, 204, 113, 0.2), rgba(46, 204, 113, 0.05));
	}

	.nav-card.basics:hover {
		border-color: #2ecc71;
		box-shadow: 0 20px 60px rgba(46, 204, 113, 0.3);
	}

	/* Footer */
	.home-footer {
		text-align: center;
		margin-top: 50px;
		padding-top: 30px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		color: #666;
	}

	/* Confirmation Toast */
	.confirm-toast {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%) translateY(-100px);
		background: linear-gradient(135deg, #2ecc71, #27ae60);
		color: #fff;
		padding: 16px 32px;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		box-shadow: 0 10px 40px rgba(46, 204, 113, 0.4);
		z-index: 2000;
		transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.confirm-toast.show {
		transform: translateX(-50%) translateY(0);
	}

	/* Auth Modal */
	.auth-overlay {
		display: flex;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		z-index: 1000;
		justify-content: center;
		align-items: center;
	}

	.auth-modal {
		background: linear-gradient(145deg, #1a1a2e, #16213e);
		border-radius: 20px;
		padding: 40px;
		max-width: 400px;
		width: 90%;
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
	}

	.auth-field input::placeholder {
		color: #666;
	}

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
	}

	.auth-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auth-toggle {
		text-align: center;
		margin-top: 15px;
		color: #a0a0a0;
		font-size: 0.9rem;
	}

	.auth-toggle a {
		color: #e94560;
		text-decoration: none;
		font-weight: 600;
	}

	/* Responsive */
	@media (max-width: 600px) {
		.home-header h1 {
			font-size: 2rem;
		}

		.logo {
			font-size: 3rem;
		}

		.nav-card {
			padding: 30px;
		}

		.nav-card .icon {
			font-size: 3rem;
		}
	}
</style>
