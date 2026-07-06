<script lang="ts">
	import { onMount } from "svelte";
	import { getLanguage, setLanguage } from "$services/data-layer";
	import type { Language } from "$stores/preferences";

	let { data } = $props();

	let currentLang = $state("en" as Language);

	const categories = $derived(
		(data.categories ?? []).map((cat: any) => ({
			key: cat.key,
			icon: cat.icon,
			title: currentLang === "fa" ? cat.title_fa : cat.title_en,
			description:
				currentLang === "fa" ? cat.description_fa : cat.description_en,
		})),
	);

	const pageTitle = $derived(
		currentLang === "fa" ? "🔤 مبانی آلمانی" : "🔤 German Basics",
	);
	const pageSubtitle = $derived(
		currentLang === "fa"
			? "\u06CC\u06A9 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u0631\u0627 \u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639 \u06CC\u0627\u062F\u06AF\u06CC\u0631\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F"
			: "Choose a category to start learning",
	);
	const backText = $derived(
		currentLang === "fa" ? "\u062E\u0627\u0646\u0647" : "Home",
	);
	const wordsLabel = $derived(
		currentLang === "fa" ? "\u06A9\u0644\u0645\u0647" : "words",
	);

	function handleLanguageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		currentLang = target.value as Language;
		setLanguage(currentLang);
	}

	onMount(async () => {
		const savedLang = await getLanguage();
		if (savedLang === "fa" || savedLang === "en") {
			currentLang = savedLang;
		} else {
			const browserLang = navigator.language || "en";
			currentLang = browserLang.startsWith("fa") ? "fa" : "en";
		}
	});
</script>

<svelte:head>
	<title>{pageTitle} - Mirifer</title>
</svelte:head>

<a href="#categories-container" class="skip-link">Skip to categories</a>

<div class="basics-container">
	<header class="basics-header">
		<a href="/home" class="back-btn">&larr; {backText}</a>
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
				<option value="fa">فارسی</option>
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
				<div class="category-arrow">&rarr;</div>
			</a>
		{/each}
	</div>
</div>

<style>
	:global(body) {
		background: var(--paper);
	}

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
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-radius: 25px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 600;
		transition: all 0.3s ease;
	}

	.back-btn:hover {
		background: var(--accent-wash);
		transform: translateX(-5px);
	}

	.header-title {
		flex: 1;
	}

	.header-title h1 {
		font-size: 2rem;
		color: var(--ink);
		font-family: var(--font-display);
	}

	.header-title p {
		color: var(--ink-soft);
		margin-top: 5px;
	}

	.controls select {
		padding: 8px 16px;
		border-radius: 20px;
		border: 1px solid var(--line);
		background: var(--paper-sunken);
		color: var(--ink);
		font-size: 0.9rem;
		cursor: pointer;
	}

	.controls select option {
		background: var(--paper-raised);
		color: var(--ink);
	}

	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 20px;
	}

	.category-card {
		background: var(--paper-raised);
		border-radius: 20px;
		padding: 25px;
		text-decoration: none;
		color: var(--ink);
		border: 1px solid var(--line);
		box-shadow: var(--paper-shadow);
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.category-card::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			145deg,
			var(--leaf-wash),
			transparent
		);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.category-card:hover {
		transform: translateY(-8px) scale(1.02);
		border-color: var(--leaf);
		box-shadow: 0 15px 40px rgba(47, 111, 79, 0.18);
	}

	.category-card:hover::before {
		opacity: 1;
	}

	.category-icon {
		font-size: 2.5rem;
		margin-bottom: 15px;
		filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12));
	}

	.category-title {
		font-size: 1.3rem;
		font-weight: 700;
		font-family: var(--font-display);
		margin-bottom: 8px;
		position: relative;
		z-index: 1;
	}

	.category-desc {
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
		position: relative;
		z-index: 1;
		flex: 1;
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
