<script lang="ts">
	import { onMount } from 'svelte';
	import { basicsData, basicsWordCount, type BasicCategory } from '$data/basics';
	import { getLanguage, setLanguage } from '$services/data-layer';
	import type { Language } from '$stores/preferences';

	let currentLang = $state('en' as Language);

	const categories = $derived(
		Object.entries(basicsData).map(([key, cat]) => ({
			key,
			icon: cat.icon,
			title: cat.title[currentLang] || cat.title.en,
			description: cat.description[currentLang] || cat.description.en,
			count: basicsWordCount(cat)
		}))
	);

	const pageTitle = $derived(currentLang === 'fa' ? '🔤 مبانی آلمانی' : '🔤 German Basics');
	const pageSubtitle = $derived(
		currentLang === 'fa'
			? '\u06CC\u06A9 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u0631\u0627 \u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639 \u06CC\u0627\u062F\u06AF\u06CC\u0631\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F'
			: 'Choose a category to start learning'
	);
	const backText = $derived(currentLang === 'fa' ? '\u062E\u0627\u0646\u0647' : 'Home');
	const wordsLabel = $derived(currentLang === 'fa' ? '\u06A9\u0644\u0645\u0647' : 'words');

	function handleLanguageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		currentLang = target.value as Language;
		setLanguage(currentLang);
	}

	onMount(async () => {
		const savedLang = await getLanguage();
		if (savedLang === 'fa' || savedLang === 'en') {
			currentLang = savedLang;
		} else {
			const browserLang = navigator.language || 'en';
			currentLang = browserLang.startsWith('fa') ? 'fa' : 'en';
		}
	});
</script>

<svelte:head>
	<title>{pageTitle} - Misiro</title>
</svelte:head>

<a href="#categories-container" class="skip-link">Skip to categories</a>

<div class="basics-container">
	<header class="basics-header">
		<a href="/" class="back-btn">&larr; {backText}</a>
		<div class="header-title">
			<h1>{pageTitle}</h1>
			<p>{pageSubtitle}</p>
		</div>
		<div class="controls">
			<select
				aria-label="Select language"
				value={currentLang}
				onchange={handleLanguageChange}
			>
				<option value="fa">\u0641\u0627\u0631\u0633\u06CC</option>
				<option value="en">English</option>
			</select>
		</div>
	</header>

	<div class="categories-grid" id="categories-container">
		{#each categories as cat (cat.key)}
			<a href="/basics/{cat.key}" class="category-card">
				<div class="category-icon">{cat.icon}</div>
				<div class="category-title">{cat.title}</div>
				<div class="category-desc">{cat.description}</div>
				<div class="category-count">{cat.count} {wordsLabel}</div>
				<div class="category-arrow">&rarr;</div>
			</a>
		{/each}
	</div>
</div>

<style>
	.basics-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 30px 20px;
	}

	.basics-header {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 40px;
		flex-wrap: wrap;
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 25px;
		color: #fff;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.3s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateX(-5px);
	}

	.header-title {
		flex: 1;
	}

	.header-title h1 {
		font-size: 2rem;
		background: linear-gradient(90deg, #2ecc71, #27ae60);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-title p {
		color: #a0a0a0;
		margin-top: 5px;
	}

	.controls select {
		padding: 8px 16px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.controls select option {
		background: #1a1a2e;
	}

	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 20px;
	}

	.category-card {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
		border-radius: 20px;
		padding: 25px;
		text-decoration: none;
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.category-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(145deg, rgba(46, 204, 113, 0.1), transparent);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.category-card:hover {
		transform: translateY(-8px) scale(1.02);
		border-color: #2ecc71;
		box-shadow: 0 15px 40px rgba(46, 204, 113, 0.25);
	}

	.category-card:hover::before {
		opacity: 1;
	}

	.category-icon {
		font-size: 2.5rem;
		margin-bottom: 15px;
		filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
	}

	.category-title {
		font-size: 1.3rem;
		font-weight: 700;
		margin-bottom: 8px;
		position: relative;
		z-index: 1;
	}

	.category-desc {
		color: #888;
		font-size: 0.9rem;
		line-height: 1.5;
		position: relative;
		z-index: 1;
		flex: 1;
	}

	.category-count {
		margin-top: 15px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 0.85rem;
		color: #2ecc71;
		font-weight: 600;
		position: relative;
		z-index: 1;
	}

	.category-arrow {
		position: absolute;
		right: 20px;
		top: 50%;
		transform: translateY(-50%) translateX(-10px);
		font-size: 1.3rem;
		opacity: 0;
		transition: all 0.3s ease;
	}

	.category-card:hover .category-arrow {
		opacity: 1;
		transform: translateY(-50%) translateX(0);
	}

	@media (max-width: 600px) {
		.basics-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-title h1 {
			font-size: 1.5rem;
		}

		.categories-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
