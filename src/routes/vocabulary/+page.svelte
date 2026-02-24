<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { preferencesStore } from '$stores/preferences';
	import type { Language } from '$stores/preferences';
	import { getVocabulary, removeWord, updateWordKnown, getLanguage } from '$services/data-layer';
	import type { SavedWord } from '$services/data-layer';

	// ── State ──
	let language = $state<Language>('en');
	let words = $state<SavedWord[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let filterTab = $state<'all' | 'learning' | 'known'>('all');
	let mode = $state<'list' | 'flashcard'>('list');

	// Flashcard state
	let flashcardIndex = $state(0);
	let flashcardRevealed = $state(false);
	let flashcardDeck = $state<SavedWord[]>([]);
	let flashcardDone = $state(false);

	// Derived
	const prefs = $derived($preferencesStore);

	const filteredWords = $derived.by(() => {
		let result = words;

		// Filter by tab
		if (filterTab === 'learning') {
			result = result.filter((w) => !w.known);
		} else if (filterTab === 'known') {
			result = result.filter((w) => w.known);
		}

		// Filter by search
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			result = result.filter(
				(w) =>
					w.word.toLowerCase().includes(q) ||
					w.meaningEn.toLowerCase().includes(q) ||
					w.meaningFa.includes(q)
			);
		}

		return result;
	});

	const learningCount = $derived(words.filter((w) => !w.known).length);
	const knownCount = $derived(words.filter((w) => w.known).length);

	// ── Lifecycle ──
	onMount(async () => {
		language = (await getLanguage()) || 'en';
		preferencesStore.update((s) => ({ ...s, language }));

		try {
			words = await getVocabulary();
		} catch {
			words = [];
		}
		loading = false;
	});

	// ── Helpers ──
	function getMeaning(w: SavedWord): string {
		return language === 'fa' ? w.meaningFa : w.meaningEn;
	}

	async function handleRemove(word: string) {
		words = words.filter((w) => w.word !== word);
		await removeWord(word);
	}

	async function handleToggleKnown(w: SavedWord) {
		const newKnown = !w.known;
		words = words.map((item) => (item.word === w.word ? { ...item, known: newKnown } : item));
		await updateWordKnown(w.word, newKnown);
	}

	// ── Flashcard ──
	function startFlashcards() {
		// Shuffle: unknown first, then known
		const unknown = words.filter((w) => !w.known);
		const known = words.filter((w) => w.known);
		flashcardDeck = shuffle([...unknown]).concat(shuffle([...known]));
		flashcardIndex = 0;
		flashcardRevealed = false;
		flashcardDone = false;
		mode = 'flashcard';
	}

	function shuffle<T>(arr: T[]): T[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function revealCard() {
		flashcardRevealed = true;
	}

	async function markCard(known: boolean) {
		const card = flashcardDeck[flashcardIndex];
		if (card.known !== known) {
			words = words.map((w) => (w.word === card.word ? { ...w, known } : w));
			flashcardDeck[flashcardIndex] = { ...card, known };
			await updateWordKnown(card.word, known);
		}
		// Next card
		if (flashcardIndex < flashcardDeck.length - 1) {
			flashcardIndex++;
			flashcardRevealed = false;
		} else {
			flashcardDone = true;
		}
	}

	function exitFlashcards() {
		mode = 'list';
	}
</script>

<svelte:head>
	<title>My Vocabulary - Mirifer</title>
</svelte:head>

<div class="vocab-page">
	{#if mode === 'list'}
		<!-- ── Top Nav ── -->
		<nav class="vocab-nav">
			<button class="nav-back" onclick={() => goto('/home')}>← Back</button>
			<h1 class="nav-title">My Vocabulary</h1>
			{#if words.length > 0}
				<button class="nav-practice" onclick={startFlashcards}>Practice</button>
			{:else}
				<div class="nav-spacer"></div>
			{/if}
		</nav>

		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading vocabulary...</p>
			</div>
		{:else if words.length === 0}
			<!-- ── Empty State ── -->
			<div class="empty-state">
				<span class="empty-icon">📖</span>
				<h2>No words saved yet</h2>
				<p>Tap the ☆ icon on any word during a lesson to save it here for practice.</p>
				<a href="/lesson" class="empty-cta">Go to Lessons →</a>
			</div>
		{:else}
			<!-- ── Search + Filters ── -->
			<div class="search-bar">
				<input
					type="text"
					placeholder="Search words..."
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>

			<div class="filter-tabs">
				<button
					class="filter-tab"
					class:active={filterTab === 'all'}
					onclick={() => (filterTab = 'all')}
				>
					All ({words.length})
				</button>
				<button
					class="filter-tab"
					class:active={filterTab === 'learning'}
					onclick={() => (filterTab = 'learning')}
				>
					Learning ({learningCount})
				</button>
				<button
					class="filter-tab"
					class:active={filterTab === 'known'}
					onclick={() => (filterTab = 'known')}
				>
					Known ({knownCount})
				</button>
			</div>

			<!-- ── Word List ── -->
			<div class="word-list">
				{#each filteredWords as w (w.word)}
					<div class="word-card" class:known={w.known}>
						<div class="word-main">
							<span class="word-german">{w.word}</span>
							<span class="word-meaning">{getMeaning(w)}</span>
						</div>
						<div class="word-actions">
							<button
								class="known-pill"
								class:is-known={w.known}
								onclick={() => handleToggleKnown(w)}
							>
								{w.known ? '✓ Known' : '○ Learning'}
							</button>
							<button
								class="action-btn delete-btn"
								onclick={() => handleRemove(w.word)}
								title="Remove word"
							>
								✕
							</button>
						</div>
					</div>
				{:else}
					<div class="no-results">
						<p>No words match your search.</p>
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		<!-- ══════ FLASHCARD MODE ══════ -->
		<nav class="vocab-nav">
			<button class="nav-back" onclick={exitFlashcards}>← Back</button>
			{#if !flashcardDone}
				<h1 class="nav-title">{flashcardIndex + 1} / {flashcardDeck.length}</h1>
			{:else}
				<h1 class="nav-title">Done!</h1>
			{/if}
			<div class="nav-spacer"></div>
		</nav>

		{#if flashcardDone}
			<!-- ── All Done ── -->
			<div class="flashcard-done">
				<span class="done-icon">🎉</span>
				<h2>All done!</h2>
				<p>You reviewed all {flashcardDeck.length} words.</p>
				<div class="done-stats">
					<span class="done-stat known-stat">✓ {flashcardDeck.filter((c) => c.known).length} known</span>
					<span class="done-stat learning-stat">○ {flashcardDeck.filter((c) => !c.known).length} learning</span>
				</div>
				<div class="done-actions">
					<button class="done-btn" onclick={startFlashcards}>Practice Again</button>
					<button class="done-btn secondary" onclick={exitFlashcards}>Back to List</button>
				</div>
			</div>
		{:else}
			<!-- ── Flashcard ── -->
			<div class="flashcard-area">
				<button
					class="flashcard"
					class:revealed={flashcardRevealed}
					onclick={revealCard}
				>
					<span class="flashcard-word">{flashcardDeck[flashcardIndex].word}</span>
					{#if flashcardRevealed}
						<span class="flashcard-divider"></span>
						<span class="flashcard-meaning">{getMeaning(flashcardDeck[flashcardIndex])}</span>
					{:else}
						<span class="flashcard-hint">Tap to reveal</span>
					{/if}
				</button>

				{#if flashcardRevealed}
					<div class="flashcard-buttons">
						<button class="fc-btn learning-btn" onclick={() => markCard(false)}>
							Still learning
						</button>
						<button class="fc-btn known-btn-fc" onclick={() => markCard(true)}>
							I know this
						</button>
					</div>
				{/if}
			</div>

			<!-- Progress bar -->
			<div class="progress-bar">
				<div
					class="progress-fill"
					style="width: {((flashcardIndex) / flashcardDeck.length) * 100}%"
				></div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.vocab-page {
		min-height: 100vh;
		min-height: 100dvh;
		background: #0f0f0f;
		color: #e0e0e0;
		display: flex;
		flex-direction: column;
		max-width: 600px;
		margin: 0 auto;
		padding: 0 16px 32px;
	}

	/* ── Nav ── */
	.vocab-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 0;
		gap: 12px;
		position: sticky;
		top: 0;
		background: #0f0f0f;
		z-index: 10;
	}

	.nav-back {
		background: none;
		border: none;
		color: #e94560;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		padding: 8px 0;
		white-space: nowrap;
	}

	.nav-title {
		font-size: 1.15rem;
		font-weight: 800;
		color: #fff;
		text-align: center;
		flex: 1;
	}

	.nav-practice {
		background: linear-gradient(135deg, #9b59b6, #8e44ad);
		border: none;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 700;
		padding: 8px 16px;
		border-radius: 20px;
		cursor: pointer;
		white-space: nowrap;
	}

	.nav-spacer {
		width: 70px;
	}

	/* ── Loading ── */
	.loading-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		opacity: 0.6;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #9b59b6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Empty State ── */
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-align: center;
		padding: 40px 20px;
	}

	.empty-icon {
		font-size: 3rem;
	}

	.empty-state h2 {
		font-size: 1.3rem;
		color: #fff;
		font-weight: 800;
	}

	.empty-state p {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.95rem;
		line-height: 1.5;
		max-width: 300px;
	}

	.empty-cta {
		margin-top: 12px;
		color: #e94560;
		font-weight: 700;
		text-decoration: none;
		font-size: 0.95rem;
	}

	/* ── Search ── */
	.search-bar {
		margin-bottom: 12px;
	}

	.search-input {
		width: 100%;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: #fff;
		font-size: 0.95rem;
		outline: none;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: rgba(155, 89, 182, 0.5);
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	/* ── Filter Tabs ── */
	.filter-tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.filter-tab {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.filter-tab.active {
		background: rgba(155, 89, 182, 0.15);
		border-color: rgba(155, 89, 182, 0.4);
		color: #bb86fc;
	}

	/* ── Word List ── */
	.word-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.word-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		transition: border-color 0.2s;
	}

	.word-card.known {
		border-color: rgba(46, 204, 113, 0.2);
	}

	.word-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.word-german {
		font-size: 1.05rem;
		font-weight: 700;
		color: #fff;
	}

	.word-meaning {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.word-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.action-btn {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.85rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.known-pill {
		padding: 4px 10px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.known-pill.is-known {
		background: rgba(46, 204, 113, 0.15);
		border-color: rgba(46, 204, 113, 0.4);
		color: #2ecc71;
	}

	.delete-btn:hover {
		background: rgba(231, 76, 60, 0.15);
		border-color: rgba(231, 76, 60, 0.4);
		color: #e74c3c;
	}

	.no-results {
		text-align: center;
		padding: 40px 0;
		color: rgba(255, 255, 255, 0.35);
	}

	/* ══════ FLASHCARD MODE ══════ */
	.flashcard-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 32px;
		padding: 24px 0;
	}

	.flashcard {
		width: 100%;
		min-height: 220px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 32px 24px;
		cursor: pointer;
		transition: all 0.3s ease;
		color: inherit;
	}

	.flashcard:hover {
		border-color: rgba(155, 89, 182, 0.3);
	}

	.flashcard.revealed {
		border-color: rgba(155, 89, 182, 0.4);
		background: rgba(155, 89, 182, 0.06);
	}

	.flashcard-word {
		font-size: 2rem;
		font-weight: 900;
		color: #fff;
		text-align: center;
	}

	.flashcard-hint {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.flashcard-divider {
		width: 60px;
		height: 2px;
		background: rgba(155, 89, 182, 0.3);
		border-radius: 1px;
	}

	.flashcard-meaning {
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.7);
		text-align: center;
	}

	.flashcard-buttons {
		display: flex;
		gap: 16px;
		width: 100%;
	}

	.fc-btn {
		flex: 1;
		padding: 14px 20px;
		border: none;
		border-radius: 14px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.fc-btn:active {
		opacity: 0.8;
	}

	.learning-btn {
		background: rgba(231, 76, 60, 0.15);
		color: #e74c3c;
		border: 1px solid rgba(231, 76, 60, 0.3);
	}

	.known-btn-fc {
		background: rgba(46, 204, 113, 0.15);
		color: #2ecc71;
		border: 1px solid rgba(46, 204, 113, 0.3);
	}

	/* ── Progress Bar ── */
	.progress-bar {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
		margin-top: auto;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #9b59b6, #bb86fc);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	/* ── Flashcard Done ── */
	.flashcard-done {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		text-align: center;
		padding: 40px 20px;
	}

	.done-icon {
		font-size: 3rem;
	}

	.flashcard-done h2 {
		font-size: 1.5rem;
		font-weight: 900;
		color: #fff;
	}

	.flashcard-done p {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.95rem;
	}

	.done-stats {
		display: flex;
		gap: 20px;
		margin: 8px 0;
	}

	.done-stat {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.known-stat {
		color: #2ecc71;
	}

	.learning-stat {
		color: #e74c3c;
	}

	.done-actions {
		display: flex;
		gap: 12px;
		margin-top: 12px;
	}

	.done-btn {
		padding: 12px 28px;
		border: none;
		border-radius: 14px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		background: linear-gradient(135deg, #9b59b6, #8e44ad);
		color: #fff;
	}

	.done-btn.secondary {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.7);
	}
</style>
