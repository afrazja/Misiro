<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { preferencesStore } from '$stores/preferences';
	import type { Language } from '$stores/preferences';
	import { getVocabulary, removeWord, updateWordKnown, getLanguage } from '$services/data-layer';
	import type { SavedWord } from '$services/data-layer';
	import { initSpeechRecognition, setVoiceInputHandler, setMicStateChangeHandler, toggleMic, stopListening, destroySpeechRecognition } from '$services/speech';
	import type { MicState } from '$services/speech';
	import { matchVoiceInput } from '$utils/text-matching';
	import { unlockAudioContext, playTone } from '$services/audio-context';
	import { stopAllAudio, playAudioPromise } from '$services/tts';
	import { appStore } from '$stores/app';

	// ── State ──
	let language = $state<Language>('en');
	let words = $state<SavedWord[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let filterTab = $state<'all' | 'learning' | 'known'>('all');
	let mode = $state<'list' | 'flashcard'>('list');

	// Flashcard state
	let flashcardIndex = $state(0);
	let flashcardDeck = $state<SavedWord[]>([]);
	let flashcardDone = $state(false);
	let correctCount = $state(0);

	// Voice state
	let speechSupported = $state(false);
	let voiceTranscript = $state('');
	let voiceResult: { isMatch: boolean; matchPercentage: number } | null = $state(null);
	let cardPhase = $state<'prompt' | 'recording' | 'result'>('prompt');
	let wrongFlash = $state(false);

	// Derived
	const prefs = $derived($preferencesStore);
	const app = $derived($appStore);

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

		speechSupported = initSpeechRecognition();
		setVoiceInputHandler(handleVoiceResult);
		setMicStateChangeHandler(() => {});

		try {
			words = await getVocabulary();
		} catch {
			words = [];
		}
		loading = false;
	});

	onDestroy(() => {
		stopListening();
		destroySpeechRecognition();
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
		const unknown = words.filter((w) => !w.known);
		const known = words.filter((w) => w.known);
		flashcardDeck = shuffle([...unknown]).concat(shuffle([...known]));
		flashcardIndex = 0;
		flashcardDone = false;
		correctCount = 0;
		cardPhase = 'prompt';
		voiceResult = null;
		voiceTranscript = '';
		mode = 'flashcard';
	}

	function shuffle<T>(arr: T[]): T[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function handleMicClick() {
		unlockAudioContext();
		if (cardPhase === 'prompt') {
			cardPhase = 'recording';
		}
		toggleMic();
	}

	function handleVoiceResult(transcript: string) {
		voiceTranscript = transcript;
		const card = flashcardDeck[flashcardIndex];
		const result = matchVoiceInput(transcript, card.word);
		voiceResult = result;
		cardPhase = 'result';

		if (result.isMatch) {
			correctCount++;
			playTone('success');
			// Play the correct pronunciation
			stopAllAudio();
			playAudioPromise(card.word, 0.8, 'de-DE');
			// Auto-advance after delay
			setTimeout(() => advanceCard(true), 1800);
		} else {
			playTone('error');
			wrongFlash = true;
			setTimeout(() => { wrongFlash = false; }, 1000);
			// Play the correct pronunciation so user hears it
			setTimeout(() => {
				stopAllAudio();
				playAudioPromise(card.word, 0.8, 'de-DE');
			}, 400);
		}
	}

	function showAnswer() {
		cardPhase = 'result';
		voiceTranscript = '';
		voiceResult = null;
		// Play the word
		const card = flashcardDeck[flashcardIndex];
		stopAllAudio();
		playAudioPromise(card.word, 0.8, 'de-DE');
	}

	function retryCard() {
		voiceTranscript = '';
		voiceResult = null;
		cardPhase = 'prompt';
		wrongFlash = false;
	}

	async function advanceCard(known: boolean) {
		const card = flashcardDeck[flashcardIndex];
		if (card.known !== known) {
			words = words.map((w) => (w.word === card.word ? { ...w, known } : w));
			flashcardDeck[flashcardIndex] = { ...card, known };
			await updateWordKnown(card.word, known);
		}
		// Reset and next
		voiceTranscript = '';
		voiceResult = null;
		cardPhase = 'prompt';
		wrongFlash = false;
		if (flashcardIndex < flashcardDeck.length - 1) {
			flashcardIndex++;
		} else {
			flashcardDone = true;
		}
	}

	function exitFlashcards() {
		stopListening();
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
			<!-- ── Voice Flashcard ── -->
			<div class="flashcard-area">
				<div class="flashcard" class:result={cardPhase === 'result'} class:wrong-flash={wrongFlash}>
					{#if cardPhase === 'result'}
						<span class="flashcard-word">{flashcardDeck[flashcardIndex].word}</span>
						<span class="flashcard-divider"></span>
						<span class="flashcard-meaning">{getMeaning(flashcardDeck[flashcardIndex])}</span>

						{#if voiceResult}
							<div class="voice-feedback" class:correct={voiceResult.isMatch} class:wrong={!voiceResult.isMatch}>
								<span class="vf-icon">{voiceResult.isMatch ? '✅' : '❌'}</span>
								<span class="vf-label">{voiceResult.isMatch ? 'Correct!' : 'Not quite'}</span>
								{#if voiceTranscript}
									<span class="vf-transcript">You said: "{voiceTranscript}"</span>
								{/if}
							</div>
						{:else}
							<div class="voice-feedback skipped">
								<span class="vf-icon">👁️</span>
								<span class="vf-label">Answer revealed</span>
							</div>
						{/if}
					{:else}
						<span class="flashcard-meaning-prompt">{getMeaning(flashcardDeck[flashcardIndex])}</span>
						<span class="flashcard-hint">
							{cardPhase === 'recording' ? 'Listening...' : 'Say the German word'}
						</span>
					{/if}
				</div>

				<div class="flashcard-buttons">
					{#if cardPhase === 'result'}
						{#if voiceResult?.isMatch}
							<button class="fc-btn known-btn-fc" onclick={() => advanceCard(true)}>
								Continue →
							</button>
						{:else if voiceResult}
							<button class="fc-btn retry-btn" onclick={retryCard}>
								Retry 🎙️
							</button>
							<button class="fc-btn learning-btn" onclick={() => advanceCard(false)}>
								Next →
							</button>
						{:else}
							<button class="fc-btn learning-btn" onclick={() => advanceCard(false)}>
								Still learning
							</button>
							<button class="fc-btn known-btn-fc" onclick={() => advanceCard(true)}>
								I knew it
							</button>
						{/if}
					{:else}
						{#if speechSupported}
							<button
								class="fc-mic-btn"
								class:pulse={app.isListening}
								onclick={handleMicClick}
							>
								🎙️
							</button>
						{/if}
						<button class="fc-skip-btn" onclick={showAnswer}>
							Show Answer
						</button>
					{/if}
				</div>
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
		gap: 28px;
		padding: 24px 0;
	}

	.flashcard {
		width: 100%;
		min-height: 280px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 40px 24px;
		transition: all 0.3s ease;
		color: inherit;
	}

	.flashcard.result {
		border-color: rgba(155, 89, 182, 0.4);
		background: rgba(155, 89, 182, 0.06);
	}

	.flashcard.wrong-flash {
		animation: flash-red 1s ease forwards;
		transition: none;
		border-color: #e74c3c;
		box-shadow: 0 0 24px rgba(231, 76, 60, 0.5);
	}

	@keyframes flash-red {
		0% { border-color: #e74c3c; box-shadow: 0 0 24px rgba(231, 76, 60, 0.6); background: rgba(231, 76, 60, 0.1); }
		60% { border-color: #e74c3c; box-shadow: 0 0 16px rgba(231, 76, 60, 0.3); background: rgba(231, 76, 60, 0.05); }
		100% { border-color: rgba(255, 255, 255, 0.1); box-shadow: none; background: rgba(255, 255, 255, 0.05); }
	}

	.flashcard-word {
		font-size: 2rem;
		font-weight: 900;
		color: #fff;
		text-align: center;
	}

	.flashcard-meaning-prompt {
		font-size: 1.6rem;
		font-weight: 800;
		color: #bb86fc;
		text-align: center;
		line-height: 1.3;
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

	/* Voice feedback */
	.voice-feedback {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		margin-top: 8px;
		padding: 12px 20px;
		border-radius: 12px;
		font-size: 0.9rem;
	}

	.voice-feedback.correct {
		background: rgba(46, 204, 113, 0.12);
		border: 1px solid rgba(46, 204, 113, 0.3);
	}

	.voice-feedback.wrong {
		background: rgba(231, 76, 60, 0.12);
		border: 1px solid rgba(231, 76, 60, 0.3);
	}

	.voice-feedback.skipped {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.vf-icon {
		font-size: 1.4rem;
	}

	.vf-label {
		font-weight: 700;
		color: rgba(255, 255, 255, 0.85);
	}

	.vf-transcript {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.45);
		font-style: italic;
	}

	/* Action buttons */
	.flashcard-buttons {
		display: flex;
		gap: 16px;
		width: 100%;
		align-items: center;
		justify-content: center;
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

	.retry-btn {
		background: rgba(243, 156, 18, 0.15);
		color: #f39c12;
		border: 1px solid rgba(243, 156, 18, 0.4);
	}

	.known-btn-fc {
		background: rgba(46, 204, 113, 0.15);
		color: #2ecc71;
		border: 1px solid rgba(46, 204, 113, 0.3);
	}

	/* Mic button */
	.fc-mic-btn {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: 2px solid rgba(46, 204, 113, 0.4);
		background: rgba(46, 204, 113, 0.12);
		font-size: 1.6rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.fc-mic-btn:hover {
		background: rgba(46, 204, 113, 0.2);
		border-color: rgba(46, 204, 113, 0.6);
	}

	.fc-mic-btn.pulse {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.15);
		animation: mic-pulse 1.2s ease-in-out infinite;
	}

	@keyframes mic-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.3); }
		50% { box-shadow: 0 0 0 12px rgba(233, 69, 96, 0); }
	}

	.fc-skip-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		padding: 8px 16px;
		transition: color 0.2s;
	}

	.fc-skip-btn:hover {
		color: rgba(255, 255, 255, 0.7);
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
