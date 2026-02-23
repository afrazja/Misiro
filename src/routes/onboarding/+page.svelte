<script lang="ts">
	import { goto } from '$app/navigation';
	import { updateLanguagePreferences } from '$services/auth';
	import { preferencesStore } from '$lib/stores/preferences';
	import type { TargetLanguage, Language } from '$lib/stores/preferences';

	let targetLang = $state<TargetLanguage>('de');
	let nativeLang = $state<Language>('en');
	let saving = $state(false);
	let error = $state('');

	const targetOptions: { value: TargetLanguage; label: string; flag: string; available: boolean }[] = [
		{ value: 'de', label: 'German', flag: '🇩🇪', available: true },
		{ value: 'fr', label: 'French', flag: '🇫🇷', available: false }
	];

	const nativeOptions: { value: Language; label: string; flag: string; nativeLabel: string }[] = [
		{ value: 'en', label: 'English', flag: '🇬🇧', nativeLabel: 'English' },
		{ value: 'fa', label: 'Farsi', flag: '🇮🇷', nativeLabel: 'فارسی' }
	];

	async function handleStart() {
		if (saving) return;
		saving = true;
		error = '';

		const { error: err } = await updateLanguagePreferences(nativeLang, targetLang);
		if (err) {
			error = err;
			saving = false;
			return;
		}

		// Update preferences store immediately so home page has fresh values
		preferencesStore.update((s) => ({ ...s, language: nativeLang, targetLanguage: targetLang }));

		goto('/home');
	}
</script>

<svelte:head>
	<title>Choose Your Languages – Mirifer</title>
</svelte:head>

<div class="onboarding-wrap">
	<div class="onboarding-card">
		<!-- Header -->
		<div class="logo-row">
			<span class="logo-icon">🌍</span>
			<span class="brand">Mirifer</span>
		</div>

		<h1 class="heading">Welcome! Let's get you set up.</h1>
		<p class="subheading">Tell us which language you want to learn and which language you already speak.</p>

		<!-- Target Language -->
		<div class="section">
			<h2 class="section-title">What do you want to learn?</h2>
			<div class="option-grid">
				{#each targetOptions as opt}
					<button
						class="lang-card {targetLang === opt.value ? 'selected' : ''} {!opt.available ? 'disabled' : ''}"
						onclick={() => opt.available && (targetLang = opt.value)}
						disabled={!opt.available}
						type="button"
					>
						<span class="flag">{opt.flag}</span>
						<span class="lang-name">{opt.label}</span>
						{#if !opt.available}
							<span class="badge">Coming Soon</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Native Language -->
		<div class="section">
			<h2 class="section-title">What language do you speak?</h2>
			<div class="option-grid">
				{#each nativeOptions as opt}
					<button
						class="lang-card {nativeLang === opt.value ? 'selected' : ''}"
						onclick={() => (nativeLang = opt.value)}
						type="button"
					>
						<span class="flag">{opt.flag}</span>
						<span class="lang-name">{opt.nativeLabel}</span>
					</button>
				{/each}
			</div>
		</div>

		{#if error}
			<div class="error-msg">{error}</div>
		{/if}

		<button class="start-btn" onclick={handleStart} disabled={saving}>
			{#if saving}
				Setting up…
			{:else}
				Get Started 🚀
			{/if}
		</button>
	</div>
</div>

<style>
	.onboarding-wrap {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: radial-gradient(ellipse at 60% 20%, rgba(233, 69, 96, 0.12) 0%, transparent 60%),
			radial-gradient(ellipse at 10% 80%, rgba(100, 100, 255, 0.08) 0%, transparent 50%);
	}

	.onboarding-card {
		width: 100%;
		max-width: 520px;
		background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 28px;
		padding: 44px 40px 40px;
		backdrop-filter: blur(12px);
	}

	.logo-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 28px;
	}

	.logo-icon {
		font-size: 1.8rem;
	}

	.brand {
		font-size: 1.4rem;
		font-weight: 700;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.heading {
		font-size: 1.6rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 10px;
		line-height: 1.3;
	}

	.subheading {
		color: #a0a0b0;
		font-size: 0.95rem;
		margin: 0 0 32px;
		line-height: 1.5;
	}

	.section {
		margin-bottom: 28px;
	}

	.section-title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #a0a0b0;
		margin: 0 0 14px;
	}

	.option-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	.lang-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 22px 16px 18px;
		border-radius: 16px;
		border: 2px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		cursor: pointer;
		transition: all 0.2s ease;
		color: #fff;
	}

	.lang-card:hover:not(.disabled) {
		border-color: rgba(233, 69, 96, 0.5);
		background: rgba(233, 69, 96, 0.08);
		transform: translateY(-2px);
	}

	.lang-card.selected {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.15);
		box-shadow: 0 0 0 1px rgba(233, 69, 96, 0.3), 0 4px 20px rgba(233, 69, 96, 0.2);
	}

	.lang-card.disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.flag {
		font-size: 2.4rem;
		line-height: 1;
	}

	.lang-name {
		font-size: 1rem;
		font-weight: 600;
	}

	.badge {
		position: absolute;
		top: 10px;
		right: 10px;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #ffd700;
		background: rgba(255, 215, 0, 0.12);
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 6px;
		padding: 2px 7px;
	}

	.error-msg {
		background: rgba(233, 69, 96, 0.15);
		border: 1px solid rgba(233, 69, 96, 0.3);
		color: #ff6b6b;
		border-radius: 10px;
		padding: 12px 16px;
		font-size: 0.9rem;
		margin-bottom: 16px;
	}

	.start-btn {
		width: 100%;
		padding: 15px;
		border-radius: 14px;
		border: none;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: #fff;
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.25s ease;
		letter-spacing: 0.02em;
	}

	.start-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 24px rgba(233, 69, 96, 0.45);
	}

	.start-btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.onboarding-card {
			padding: 32px 20px 28px;
			border-radius: 20px;
		}

		.heading {
			font-size: 1.35rem;
		}
	}
</style>
