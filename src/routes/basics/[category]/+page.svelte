<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { getLanguage, setLanguage, getVoiceSpeed, setVoiceSpeed } from "$services/data-layer";
	import { stopAllAudio, playAudioPromise } from "$services/tts";
	import { initSpeechRecognition, setVoiceInputHandler, setMicStateChangeHandler, toggleMic, stopListening, destroySpeechRecognition } from '$services/speech';
	import { matchVoiceInput } from '$utils/text-matching';
	import { unlockAudioContext, playTone } from '$services/audio-context';
	import { appStore } from '$stores/app';
	import type { Language } from "$stores/preferences";
	import type { BasicWord, ConjugationTense } from "$lib/types/basics";

	let { data } = $props();

	let currentLang = $state("en" as Language);
	let voiceSpeed: number = $state(1.0);

	// Quiz mode state
	let quizMode = $state(false);
	let quizIndex = $state(0);
	let quizRevealed = $state(false);
	let quizDeck = $state<BasicWord[]>([]);
	let quizDone = $state(false);
	let quizGotIt = $state(0);

	// Voice state
	let speechSupported = $state(false);
	let voiceTranscript = $state('');
	let voiceResult: { isMatch: boolean; matchPercentage: number } | null = $state(null);
	let cardPhase = $state<'prompt' | 'recording' | 'result'>('prompt');

	const app = $derived($appStore);

	const category = $derived(data.category);
	const words = $derived(data.words ?? []);
	const sections = $derived(data.sections ?? []);

	const catTitle = $derived(category ? (currentLang === "fa" ? category.title_fa : category.title_en) : "Loading...");
	const catDesc = $derived(category ? (currentLang === "fa" ? category.description_fa : category.description_en) : "");
	const catIcon = $derived(category?.icon || "📚");
	const backText = $derived(currentLang === "fa" ? "بازگشت" : "Back");

	function getWordTranslation(word: BasicWord): string {
		return currentLang === 'fa' ? word.fa : word.en;
	}

	function getExampleTranslation(word: BasicWord): string {
		return currentLang === 'fa' ? ((word.example_fa ?? word.exampleFa) || '') : ((word.example_en ?? word.exampleEn) || '');
	}

	function getFormMeaning(form: { en: string; fa: string }): string {
		return currentLang === 'fa' ? form.fa : form.en;
	}

	function playWord(text: string) {
		stopAllAudio();
		playAudioPromise(text, 0.8, 'de-DE');
	}

	function playExample(text: string) {
		if (!text) return;
		stopAllAudio();
		playAudioPromise(text, 0.8, 'de-DE');
	}

	function handleWordClick(german: string) {
		playWord(german);
	}

	function handleExampleClick(e: Event, example: string) {
		e.stopPropagation();
		playExample(example);
	}

	function handleWordKeydown(e: KeyboardEvent, german: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			playWord(german);
		}
	}

	function handleExampleKeydown(e: KeyboardEvent, example: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			playExample(example);
		}
	}

	function handleConjugationRowClick(pronoun: string, verb: string) {
		playWord(`${pronoun} ${verb}`);
	}

	function handleLanguageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		currentLang = target.value as Language;
		setLanguage(currentLang);
	}

	function handleSpeedChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		voiceSpeed = parseFloat(target.value);
		setVoiceSpeed(voiceSpeed);
	}

	// ── Quiz functions ──
	function collectAllWords(): BasicWord[] {
		const all: BasicWord[] = [];
		// Flat words (grid/table categories)
		if (words.length > 0) {
			all.push(...words);
		}
		// Section-based words (multi categories)
		for (const sec of sections) {
			if (sec.words) {
				all.push(...sec.words);
			}
			// Conjugation verbs: add infinitive as a word
			if (sec.type === 'conjugation' && sec.infinitive) {
				all.push({
					german: sec.infinitive.german,
					en: sec.infinitive.en,
					fa: sec.infinitive.fa
				});
			}
		}
		return all;
	}

	function shuffleArray<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function startQuiz() {
		const all = collectAllWords();
		if (all.length === 0) return;
		quizDeck = shuffleArray(all);
		quizIndex = 0;
		quizRevealed = false;
		quizDone = false;
		quizGotIt = 0;
		cardPhase = 'prompt';
		voiceResult = null;
		voiceTranscript = '';
		quizMode = true;
	}

	function revealQuiz() {
		quizRevealed = true;
		// Play the word audio
		stopAllAudio();
		playAudioPromise(quizDeck[quizIndex].german, 0.8, 'de-DE');
	}

	function quizAnswer(gotIt: boolean) {
		if (gotIt) quizGotIt++;
		voiceTranscript = '';
		voiceResult = null;
		cardPhase = 'prompt';
		if (quizIndex < quizDeck.length - 1) {
			quizIndex++;
			quizRevealed = false;
		} else {
			quizDone = true;
		}
	}

	function exitQuiz() {
		stopListening();
		quizMode = false;
	}

	// ── Voice functions ──
	function handleQuizMicClick() {
		unlockAudioContext();
		if (cardPhase === 'prompt') {
			cardPhase = 'recording';
		}
		toggleMic();
	}

	function handleQuizVoiceResult(transcript: string) {
		voiceTranscript = transcript;
		const card = quizDeck[quizIndex];
		const result = matchVoiceInput(transcript, card.german);
		voiceResult = result;
		cardPhase = 'result';

		if (result.isMatch) {
			quizGotIt++;
			playTone('success');
			stopAllAudio();
			playAudioPromise(card.german, 0.8, 'de-DE');
			setTimeout(() => quizAnswer(false), 1800); // already counted above
		} else {
			playTone('error');
			setTimeout(() => {
				stopAllAudio();
				playAudioPromise(card.german, 0.8, 'de-DE');
			}, 400);
		}
	}

	function showQuizAnswer() {
		cardPhase = 'result';
		voiceTranscript = '';
		voiceResult = null;
		const card = quizDeck[quizIndex];
		stopAllAudio();
		playAudioPromise(card.german, 0.8, 'de-DE');
	}

	const hasQuizWords = $derived(words.length > 0 || sections.some((s) => (s.words && s.words.length > 0) || (s.type === 'conjugation' && s.infinitive)));

	onMount(async () => {
		const savedLang = await getLanguage();
		if (savedLang === 'fa' || savedLang === 'en') {
			currentLang = savedLang;
		} else {
			const browserLang = navigator.language || 'en';
			currentLang = browserLang.startsWith('fa') ? 'fa' : 'en';
		}

		const savedSpeed = await getVoiceSpeed();
		if (savedSpeed !== null && !isNaN(savedSpeed)) {
			voiceSpeed = savedSpeed;
		}

		speechSupported = initSpeechRecognition();
		setVoiceInputHandler(handleQuizVoiceResult);
		setMicStateChangeHandler(() => {});
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') stopAllAudio();
		stopListening();
		destroySpeechRecognition();
	});
</script>

<svelte:head>
	<title>{catTitle} - Mirifer</title>
</svelte:head>

<a href="#content-container" class="skip-link">Skip to content</a>

<div class="category-container">
	<header class="category-header">
		<a href="/basics" class="back-btn">&larr; {backText}</a>
		<div class="header-title">
			<h1>
				<span class="icon">{catIcon}</span>
				<span>{catTitle}</span>
			</h1>
			<p>{catDesc}</p>
		</div>
		<div class="controls">
			{#if hasQuizWords}
				<button class="practice-btn" onclick={startQuiz}>Practice</button>
			{/if}
			<select aria-label="Select language" value={currentLang} onchange={handleLanguageChange}>
				<option value="fa">{'\u0641\u0627\u0631\u0633\u06CC'}</option>
				<option value="en">English</option>
			</select>
			<select aria-label="Select voice speed" value={voiceSpeed.toString()} onchange={handleSpeedChange}>
				<option value="1">{'🔊 1x'}</option>
				<option value="0.75">{'🔉 0.75x'}</option>
				<option value="0.5">{'🐢 0.5x'}</option>
				<option value="0.25">{'🐌 0.25x'}</option>
			</select>
		</div>
	</header>

	{#if quizMode}
		<!-- ══════ FLASHCARD QUIZ MODE ══════ -->
		<div class="quiz-area">
			<div class="quiz-nav">
				<button class="quiz-back" onclick={exitQuiz}>← Back</button>
				{#if !quizDone}
					<span class="quiz-counter">{quizIndex + 1} / {quizDeck.length}</span>
				{:else}
					<span class="quiz-counter">Done!</span>
				{/if}
			</div>

			{#if quizDone}
				<div class="quiz-done">
					<span class="quiz-done-icon">🎉</span>
					<h2>Practice Complete!</h2>
					<p>You reviewed {quizDeck.length} words.</p>
					<div class="quiz-done-stats">
						<span class="quiz-stat got-it">✓ {quizGotIt} got it</span>
						<span class="quiz-stat still-learning">○ {quizDeck.length - quizGotIt} still learning</span>
					</div>
					<div class="quiz-done-actions">
						<button class="quiz-action-btn primary" onclick={startQuiz}>Practice Again</button>
						<button class="quiz-action-btn secondary" onclick={exitQuiz}>Back to {catTitle}</button>
					</div>
				</div>
			{:else}
				<div class="quiz-card" class:result={cardPhase === 'result'}>
					{#if cardPhase === 'result'}
						<span class="quiz-word">{quizDeck[quizIndex].german}</span>
						<span class="quiz-divider"></span>
						<span class="quiz-meaning">{getWordTranslation(quizDeck[quizIndex])}</span>

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
						<span class="quiz-meaning-prompt">{getWordTranslation(quizDeck[quizIndex])}</span>
						<span class="quiz-hint">
							{cardPhase === 'recording' ? 'Listening...' : 'Say the German word'}
						</span>
					{/if}
				</div>

				<div class="quiz-buttons">
					{#if cardPhase === 'result'}
						{#if voiceResult?.isMatch}
							<button class="quiz-btn got-it" onclick={() => quizAnswer(false)}>
								Continue →
							</button>
						{:else if voiceResult}
							<button class="quiz-btn still-learning" onclick={() => quizAnswer(false)}>
								Next →
							</button>
						{:else}
							<button class="quiz-btn still-learning" onclick={() => quizAnswer(false)}>
								Still learning
							</button>
							<button class="quiz-btn got-it" onclick={() => quizAnswer(true)}>
								I knew it
							</button>
						{/if}
					{:else}
						{#if speechSupported}
							<button
								class="quiz-mic-btn"
								class:pulse={app.isListening}
								onclick={handleQuizMicClick}
							>
								🎙️
							</button>
						{/if}
						<button class="quiz-skip-btn" onclick={showQuizAnswer}>
							Show Answer
						</button>
					{/if}
				</div>

				<div class="quiz-progress-bar">
					<div class="quiz-progress-fill" style="width: {(quizIndex / quizDeck.length) * 100}%"></div>
				</div>
			{/if}
		</div>
	{:else}
	<div id="content-container">
		{#if category}
			{#if category.type === 'multi' && sections.length > 0}
				{#each sections as section}
					<div class="section-block">
						<h3 class="section-heading">{currentLang === "fa" ? section.heading_fa : section.heading_en}</h3>

						{#if section.type === 'conjugation' && section.infinitive && section.tenses}
							<!-- Verb Banner -->
							<!-- svelte-ignore a11y_interactive_supports_focus -->
							<div
								class="verb-infinitive-banner"
								role="button"
								aria-label="{section.infinitive.german} - {getFormMeaning(section.infinitive)}"
								onclick={() => playWord(section.infinitive!.german)}
								onkeydown={(e) => handleWordKeydown(e, section.infinitive!.german)}
								tabindex="0"
							>
								<div>
									<span class="verb-main">{section.infinitive.german}</span>
									<span class="verb-meaning">&mdash; {getFormMeaning(section.infinitive)}</span>
								</div>
								<span class="verb-play" aria-hidden="true">🔊</span>
							</div>

							<!-- Conjugation Tables -->
							{#each section.tenses as tense}
								<div class="conjugation-section">
									<h3>{tense.name[currentLang] || tense.name.en}</h3>
									<table class="conjugation-table">
										<thead>
											<tr>
												<th>{currentLang === 'fa' ? '\u0636\u0645\u06CC\u0631' : 'Pronoun'}</th>
												<th>{currentLang === 'fa' ? '\u0641\u0639\u0644' : 'Verb'}</th>
												<th>{currentLang === 'fa' ? '\u0645\u0639\u0646\u06CC' : 'Meaning'}</th>
												<th class="example-cell">{currentLang === 'fa' ? '\u0645\u062B\u0627\u0644' : 'Example'}</th>
												<th></th>
											</tr>
										</thead>
										<tbody>
											{#each tense.forms as form}
												<!-- svelte-ignore a11y_interactive_supports_focus -->
												<tr
													role="button"
													aria-label="{form.pronoun} {form.verb} - {getFormMeaning(form)}"
													onclick={() => handleConjugationRowClick(form.pronoun, form.verb)}
													onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleConjugationRowClick(form.pronoun, form.verb); } }}
													tabindex="0"
												>
													<td class="pronoun-cell">{form.pronoun}</td>
													<td class="verb-cell">{form.verb}</td>
													<td class="meaning-cell">{getFormMeaning(form)}</td>
													<!-- svelte-ignore a11y_interactive_supports_focus -->
													<td
														class="example-cell"
														role="button"
														aria-label="Example: {form.example || ''}"
														onclick={(e) => handleExampleClick(e, form.example || '')}
														onkeydown={(e) => handleExampleKeydown(e, form.example || '')}
														tabindex="0"
													>
														<div>{form.example || ''}</div>
														{#if (currentLang === 'fa' ? form.exampleFa : form.exampleEn)}
															<div class="example-cell-translation">
																{currentLang === 'fa' ? (form.exampleFa || '') : (form.exampleEn || '')}
															</div>
														{/if}
													</td>
													<td class="play-cell" aria-hidden="true">🔊</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/each}

						{:else if section.type === 'table' && section.words}
							<!-- Pronoun Table -->
							<div class="pronoun-grid">
								{#each section.words as word}
									<!-- svelte-ignore a11y_interactive_supports_focus -->
									<div
										class="pronoun-row"
										role="button"
										aria-label="{word.german} - {getWordTranslation(word)}"
										onclick={() => handleWordClick(word.german)}
										onkeydown={(e) => handleWordKeydown(e, word.german)}
										tabindex="0"
									>
										<div class="pronoun-german">{word.german}</div>
										<div class="pronoun-meaning">{getWordTranslation(word)}</div>
										<!-- svelte-ignore a11y_interactive_supports_focus -->
										<div
											class="pronoun-example"
											role="button"
											aria-label="Example: {word.example}"
											onclick={(e) => handleExampleClick(e, word.example || '')}
											onkeydown={(e) => handleExampleKeydown(e, word.example || '')}
											tabindex="0"
										>
											{word.example} <span aria-hidden="true">🔊</span>
											{#if getExampleTranslation(word)}
												<div class="example-translation">{getExampleTranslation(word)}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>

						{:else if section.words}
							<!-- Word Grid -->
							<div class="word-grid">
								{#each section.words as word}
									<!-- svelte-ignore a11y_interactive_supports_focus -->
									<div
										class="word-card"
										role="button"
										aria-label="{word.german} - {getWordTranslation(word)}"
										onclick={() => handleWordClick(word.german)}
										onkeydown={(e) => handleWordKeydown(e, word.german)}
										tabindex="0"
									>
										<div class="word-german">{word.german}</div>
										<div class="word-translation">{getWordTranslation(word)}</div>
										{#if word.example}
											<!-- svelte-ignore a11y_interactive_supports_focus -->
											<div
												class="word-example"
												role="button"
												aria-label="Example: {word.example}"
												onclick={(e) => handleExampleClick(e, word.example || '')}
												onkeydown={(e) => handleExampleKeydown(e, word.example || '')}
												tabindex="0"
											>
												{word.example} <span class="example-speaker" aria-hidden="true">🔊</span>
												{#if getExampleTranslation(word)}
													<div class="example-translation">{getExampleTranslation(word)}</div>
												{/if}
											</div>
										{/if}
										<div class="play-icon" aria-hidden="true">🔊</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}

			{:else if words.length > 0}
				<!-- Simple Word Grid -->
				<div class="word-grid">
					{#each words as word}
						<!-- svelte-ignore a11y_interactive_supports_focus -->
						<div
							class="word-card"
							role="button"
							aria-label="{word.german} - {getWordTranslation(word)}"
							onclick={() => handleWordClick(word.german)}
							onkeydown={(e) => handleWordKeydown(e, word.german)}
							tabindex="0"
						>
							<div class="word-german">{word.german}</div>
							<div class="word-translation">{getWordTranslation(word)}</div>
							{#if word.example}
								<!-- svelte-ignore a11y_interactive_supports_focus -->
								<div
									class="word-example"
									role="button"
									aria-label="Example: {word.example}"
									onclick={(e) => handleExampleClick(e, word.example || '')}
									onkeydown={(e) => handleExampleKeydown(e, word.example || '')}
									tabindex="0"
								>
									{word.example} <span class="example-speaker" aria-hidden="true">🔊</span>
									{#if getExampleTranslation(word)}
										<div class="example-translation">{getExampleTranslation(word)}</div>
									{/if}
								</div>
							{/if}
							<div class="play-icon" aria-hidden="true">🔊</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<p style="color: #888; text-align: center; padding: 40px;">Category not found.</p>
		{/if}
	</div>
	{/if}
</div>

<style>
	.category-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 30px 20px;
	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 30px;
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
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.header-title h1 .icon {
		font-size: 2.5rem;
	}

	.header-title p {
		color: #a0a0a0;
		margin-top: 5px;
	}

	.controls {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
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

	.section-block {
		margin-bottom: 30px;
	}

	.section-heading {
		color: #2ecc71;
		font-size: 1.2rem;
		margin-bottom: 15px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	/* Word Grid */
	.word-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 15px;
		margin-top: 20px;
	}

	.word-card {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
		border-radius: 16px;
		padding: 20px;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		min-height: 140px;
		display: flex;
		flex-direction: column;
	}

	.word-card:hover {
		transform: translateY(-5px);
		background: rgba(46, 204, 113, 0.2);
		border-color: #2ecc71;
		box-shadow: 0 10px 30px rgba(46, 204, 113, 0.25);
	}

	.word-card:active {
		transform: scale(0.95);
	}

	.word-german {
		font-size: clamp(1rem, 4vw, 1.6rem);
		font-weight: 700;
		margin-bottom: 10px;
		color: #2ecc71;
		word-wrap: break-word;
		overflow-wrap: break-word;
		hyphens: auto;
		line-height: 1.2;
	}

	.word-translation {
		font-size: 1rem;
		color: #ccc;
		margin-bottom: 8px;
	}

	.word-example {
		font-size: 0.85rem;
		color: #888;
		font-style: italic;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		cursor: pointer;
		transition: color 0.3s;
	}

	.word-example:hover {
		color: #2ecc71;
	}

	.example-speaker {
		opacity: 0.6;
		transition: opacity 0.3s;
	}

	.word-example:hover .example-speaker {
		opacity: 1;
	}

	.example-translation {
		font-size: 0.78rem;
		color: #3498db;
		font-style: normal;
		margin-top: 4px;
	}

	.play-icon {
		font-size: 1.3rem;
		opacity: 0.3;
		margin-top: auto;
		padding-top: 10px;
		transition: opacity 0.3s;
	}

	.word-card:hover .play-icon {
		opacity: 1;
	}

	/* Pronoun Table */
	.pronoun-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 20px;
	}

	.pronoun-row {
		display: grid;
		grid-template-columns: 100px 1fr 2fr;
		gap: 15px;
		padding: 18px 20px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: all 0.3s ease;
		align-items: center;
	}

	.pronoun-row:hover {
		background: rgba(46, 204, 113, 0.15);
		transform: translateX(5px);
	}

	.pronoun-german {
		font-weight: 700;
		color: #2ecc71;
		font-size: 1.4rem;
	}

	.pronoun-meaning {
		color: #3498db;
		font-size: 1.1rem;
	}

	.pronoun-example {
		color: #888;
		font-size: 0.95rem;
	}

	/* Conjugation */
	.verb-infinitive-banner {
		background: linear-gradient(145deg, rgba(46, 204, 113, 0.15), rgba(46, 204, 113, 0.05));
		border: 1px solid rgba(46, 204, 113, 0.2);
		border-radius: 16px;
		padding: 20px 25px;
		margin-bottom: 25px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.verb-infinitive-banner:hover {
		background: rgba(46, 204, 113, 0.2);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(46, 204, 113, 0.2);
	}

	.verb-main {
		font-size: 1.8rem;
		font-weight: 700;
		color: #2ecc71;
	}

	.verb-meaning {
		font-size: 1.1rem;
		color: #a0a0a0;
		margin-left: 15px;
	}

	.verb-play {
		font-size: 1.5rem;
		opacity: 0.6;
		transition: opacity 0.3s;
	}

	.verb-infinitive-banner:hover .verb-play {
		opacity: 1;
	}

	.conjugation-section {
		margin-bottom: 30px;
	}

	.conjugation-section h3 {
		font-size: 1.2rem;
		color: #2ecc71;
		margin-bottom: 15px;
		padding-bottom: 8px;
		border-bottom: 2px solid rgba(46, 204, 113, 0.3);
	}

	.conjugation-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.conjugation-table th {
		padding: 14px 18px;
		text-align: left;
		font-weight: 600;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: #a0a0a0;
		background: rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.conjugation-table td {
		padding: 14px 18px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		transition: all 0.2s ease;
	}

	.conjugation-table tr {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.conjugation-table tbody tr:hover {
		background: rgba(46, 204, 113, 0.1);
	}

	.conjugation-table tbody tr:hover td {
		color: #fff;
	}

	.conjugation-table tbody tr:last-child td {
		border-bottom: none;
	}

	.pronoun-cell {
		color: #888;
		font-size: 0.95rem;
		width: 100px;
	}

	.verb-cell {
		color: #2ecc71;
		font-weight: 700;
		font-size: 1.1rem;
	}

	.meaning-cell {
		color: #3498db;
		font-size: 0.95rem;
	}

	.example-cell {
		color: #888;
		font-size: 0.85rem;
		font-style: italic;
	}

	.example-cell-translation {
		font-size: 0.75rem;
		color: #3498db;
		font-style: normal;
		margin-top: 2px;
	}

	.play-cell {
		width: 40px;
		text-align: center;
		font-size: 1.1rem;
		opacity: 0.4;
		transition: opacity 0.3s;
	}

	.conjugation-table tbody tr:hover .play-cell {
		opacity: 1;
	}

	@media (max-width: 600px) {
		.category-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-title h1 {
			font-size: 1.5rem;
		}

		.word-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.pronoun-row {
			grid-template-columns: 80px 1fr;
		}

		.pronoun-example {
			grid-column: span 2;
		}

		.conjugation-table th,
		.conjugation-table td {
			padding: 10px 12px;
			font-size: 0.85rem;
		}

		.verb-cell {
			font-size: 0.95rem;
		}

		.example-cell {
			display: none;
		}

		.verb-main {
			font-size: 1.4rem;
		}
	}

	/* ══════ Practice Button ══════ */
	.practice-btn {
		padding: 8px 18px;
		background: linear-gradient(135deg, #9b59b6, #8e44ad);
		border: none;
		border-radius: 20px;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.2s;
	}

	.practice-btn:hover { opacity: 0.85; }

	/* ══════ Quiz Mode ══════ */
	.quiz-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 60vh;
		padding: 16px 0;
	}

	.quiz-nav {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 32px;
	}

	.quiz-back {
		background: none;
		border: none;
		color: #e94560;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		padding: 8px 0;
	}

	.quiz-counter {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.5);
	}

	.quiz-card {
		width: 100%;
		max-width: 420px;
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
		transition: all 0.3s ease;
		color: inherit;
	}

	.quiz-card.result {
		border-color: rgba(155, 89, 182, 0.4);
		background: rgba(155, 89, 182, 0.06);
	}

	.quiz-word {
		font-size: 2rem;
		font-weight: 900;
		color: #fff;
		text-align: center;
	}

	.quiz-meaning-prompt {
		font-size: 1.6rem;
		font-weight: 800;
		color: #bb86fc;
		text-align: center;
		line-height: 1.3;
	}

	.quiz-hint {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.quiz-divider {
		width: 60px;
		height: 2px;
		background: rgba(155, 89, 182, 0.3);
		border-radius: 1px;
	}

	.quiz-meaning {
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

	.quiz-buttons {
		display: flex;
		gap: 16px;
		width: 100%;
		max-width: 420px;
		margin-top: 24px;
		align-items: center;
		justify-content: center;
	}

	.quiz-btn {
		flex: 1;
		padding: 14px 20px;
		border: none;
		border-radius: 14px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.quiz-btn:active { opacity: 0.8; }

	.quiz-btn.still-learning {
		background: rgba(231, 76, 60, 0.15);
		color: #e74c3c;
		border: 1px solid rgba(231, 76, 60, 0.3);
	}

	.quiz-btn.got-it {
		background: rgba(46, 204, 113, 0.15);
		color: #2ecc71;
		border: 1px solid rgba(46, 204, 113, 0.3);
	}

	/* Mic button */
	.quiz-mic-btn {
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

	.quiz-mic-btn:hover {
		background: rgba(46, 204, 113, 0.2);
		border-color: rgba(46, 204, 113, 0.6);
	}

	.quiz-mic-btn.pulse {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.15);
		animation: mic-pulse 1.2s ease-in-out infinite;
	}

	@keyframes mic-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.3); }
		50% { box-shadow: 0 0 0 12px rgba(233, 69, 96, 0); }
	}

	.quiz-skip-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		padding: 8px 16px;
		transition: color 0.2s;
	}

	.quiz-skip-btn:hover {
		color: rgba(255, 255, 255, 0.7);
	}

	.quiz-progress-bar {
		width: 100%;
		max-width: 420px;
		height: 4px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
		margin-top: auto;
		padding-top: 32px;
		overflow: hidden;
	}

	.quiz-progress-fill {
		height: 4px;
		background: linear-gradient(90deg, #9b59b6, #bb86fc);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	/* ── Quiz Done ── */
	.quiz-done {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		text-align: center;
		padding: 40px 20px;
	}

	.quiz-done-icon { font-size: 3rem; }

	.quiz-done h2 {
		font-size: 1.5rem;
		font-weight: 900;
		color: #fff;
	}

	.quiz-done p {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.95rem;
	}

	.quiz-done-stats {
		display: flex;
		gap: 20px;
		margin: 8px 0;
	}

	.quiz-stat {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.quiz-stat.got-it { color: #2ecc71; }
	.quiz-stat.still-learning { color: #e74c3c; }

	.quiz-done-actions {
		display: flex;
		gap: 12px;
		margin-top: 12px;
	}

	.quiz-action-btn {
		padding: 12px 28px;
		border: none;
		border-radius: 14px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.quiz-action-btn.primary {
		background: linear-gradient(135deg, #9b59b6, #8e44ad);
		color: #fff;
	}

	.quiz-action-btn.secondary {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.7);
	}
</style>
