<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { appStore } from '$stores/app';
	import { preferencesStore, type Language } from '$stores/preferences';
	import { lessonStore, type Sentence } from '$stores/lesson';
	import { examStore } from '$stores/exam';
	import {
		setCallbacks,
		initLesson,
		processNextStep,
		manualNext,
		goToNextDay,
		jumpToSentence,
		changeDay,
		changeLanguage,
		handleVoiceInput as controllerHandleVoice,
		startExam,
		startReviewMode,
		isDayUnlocked,
		incrementSession,
		getDueCount,
		type TeachStepData,
		type CompletionCardData,
		type ExamQuestionData,
		type ExamResultsData,
		type VoiceResultData
	} from '$services/lesson-controller';
	import { getLessonIndex, getGlossaryMeaning, hasLesson, type LessonMeta } from '$services/lesson-loader';
	import { stopAllAudio, playAudioPromise } from '$services/tts';
	import { unlockAudioContext } from '$services/audio-context';
	import { initSpeechRecognition, setVoiceInputHandler, toggleMic, stopListening } from '$services/speech';
	import { getLanguage, setLanguage, getVoiceSpeed, setVoiceSpeed } from '$services/data-layer';
	import { getTranslation, getTranslationLang } from '$utils/i18n';
	import { initSyncListeners } from '$services/sync-queue';

	// ============ STATE ============
	let showOverlay = $state(true);
	let isReady = $state(false);
	let chatMessages: ChatMessage[] = $state([]);
	let answerLineHtml = $state('<span class="placeholder-text">Tap words to reply...</span>');
	let currentTeachStep: TeachStepData | null = $state(null);
	let completionData: CompletionCardData | null = $state(null);
	let examQuestionData: ExamQuestionData | null = $state(null);
	let examResultsData: ExamResultsData | null = $state(null);
	let examProgressCurrent = $state(0);
	let examProgressTotal = $state(0);
	let systemMessages: string[] = $state([]);
	let voiceResult: VoiceResultData | null = $state(null);
	let dueReviewCount = $state(0);

	interface ChatMessage {
		id: number;
		type: 'received' | 'sent' | 'system';
		text: string;
	}
	let msgCounter = 0;

	// Derived
	const app = $derived($appStore);
	const prefs = $derived($preferencesStore);
	const lesson = $derived($lessonStore);
	const exam = $derived($examStore);

	const scenarioTitle = $derived(() => {
		if (!lesson.currentLesson) return 'Loading...';
		const l = lesson.currentLesson;
		if (prefs.language === 'fa' && l.titleFa) {
			const parts = l.titleFa.split(': ');
			return parts.length > 1 ? parts[1] : l.titleFa;
		}
		const parts = l.title.split(': ');
		return parts.length > 1 ? parts[1] : l.title;
	});

	let lessonIndex = $state<LessonMeta[]>([]);

	// Group lessons into weeks for select
	const weekGroups = $derived(() => {
		const weeks: Record<number, LessonMeta[]> = {};
		for (const meta of lessonIndex) {
			const weekNum = Math.ceil(meta.day / 7);
			if (!weeks[weekNum]) weeks[weekNum] = [];
			weeks[weekNum].push(meta);
		}
		return weeks;
	});

	// ============ INTERACTIVE WORDS ============
	function createInteractiveWords(text: string): Array<{ word: string; meaning: string | null }> {
		return text.split(' ').map((word) => {
			const cleanKey = word.toLowerCase().replace(/[.,!?]/g, '');
			const meaning = getGlossaryMeaning(cleanKey, prefs.language);
			return { word, meaning };
		});
	}

	let wordTooltip: { word: string; meaning: string; x: number; y: number } | null = $state(null);
	let tooltipTimer: ReturnType<typeof setTimeout> | null = null;

	function handleWordClick(word: string, meaning: string | null, event: MouseEvent) {
		stopAllAudio();
		if ($appStore.isListening) stopListening();

		// Play word
		const clean = word.replace(/[.,!?]/g, '');
		playAudioPromise(clean, 0.8, 'de-DE');

		// Show tooltip
		if (meaning) {
			if (tooltipTimer) clearTimeout(tooltipTimer);
			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			wordTooltip = { word, meaning, x: rect.left + rect.width / 2, y: rect.top };
			tooltipTimer = setTimeout(() => { wordTooltip = null; }, 3000);
		}
	}

	// ============ SCRIPT PANEL ============
	let scriptItems: Array<{ german: string; translation: string; done: boolean; active: boolean }> = $state([]);

	function updateScript() {
		if (!lesson.currentLesson) return;
		const isLessonDone = !!(app.completedLessons && app.completedLessons[app.currentDay]);

		scriptItems = lesson.currentLesson.sentences.map((step, i) => {
			const german = step.role === 'received' ? step.audioText! : step.targetText!;
			const translation = getTranslation(step, prefs.language);
			return {
				german,
				translation,
				done: isLessonDone || i < app.currentSentenceIndex,
				active: i === app.currentSentenceIndex
			};
		});
	}

	// ============ CALLBACKS ============
	function setupCallbacks() {
		setCallbacks({
			onTeachStep(data) {
				currentTeachStep = data;
				completionData = null;
				examQuestionData = null;
				examResultsData = null;
				voiceResult = null;
				updateScript();
			},
			onCompletionCard(data) {
				currentTeachStep = null;
				completionData = data;
				updateScript();
			},
			onAnswerPrompt(message) {
				answerLineHtml = message;
			},
			onMessageBubble(step) {
				currentTeachStep = null;
				voiceResult = null;
				const text = step.role === 'received' ? step.audioText! : step.targetText!;
				chatMessages = [...chatMessages, { id: msgCounter++, type: step.role, text }];
				trimMessages();
			},
			onScriptHighlight(index) {
				scriptItems = scriptItems.map((item, i) => ({ ...item, active: i === index }));
			},
			onScriptMarkDone(index) {
				if (scriptItems[index]) {
					scriptItems = scriptItems.map((item, i) =>
						i === index ? { ...item, done: true } : item
					);
				}
			},
			onExamQuestion(data) {
				currentTeachStep = null;
				completionData = null;
				examResultsData = null;
				voiceResult = null;
				examQuestionData = data;
			},
			onExamFinished(data) {
				currentTeachStep = null;
				completionData = null;
				examQuestionData = null;
				voiceResult = null;
				examResultsData = data;
			},
			onExamProgress(current, total) {
				examProgressCurrent = current;
				examProgressTotal = total;
			},
			onSystemMessage(text) {
				systemMessages = [...systemMessages, text];
			},
			onClearChat() {
				chatMessages = [];
				currentTeachStep = null;
				completionData = null;
				examQuestionData = null;
				examResultsData = null;
				voiceResult = null;
				systemMessages = [];
				answerLineHtml = '';
				updateScript();
			},
			onVoiceResult(result) {
				voiceResult = result;
			}
		});
	}

	// ============ EVENT HANDLERS ============
	function handleStart() {
		showOverlay = false;
		unlockAudioContext();
		if (isReady) {
			processNextStep();
		}
	}

	function handleMicClick() {
		toggleMic();
	}

	function handleDaySelectChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		if (val === 'review') {
			startReviewMode();
		} else if (val.startsWith('exam')) {
			const week = parseInt(val.replace('exam', ''));
			startExam(week);
		} else {
			changeDay(parseInt(val));
		}
	}

	function handleLanguageSelectChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value as Language;
		preferencesStore.update((s) => ({ ...s, language: val }));
		setLanguage(val);
		changeLanguage(val);
	}

	function handleSpeedSelectChange(e: Event) {
		const val = parseFloat((e.target as HTMLSelectElement).value);
		preferencesStore.update((s) => ({ ...s, voiceSpeed: val }));
		setVoiceSpeed(val);
	}

	function handleBlindModeChange(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		preferencesStore.update((s) => ({ ...s, blindMode: checked }));
	}

	function handleSpeakerClick() {
		if (!currentTeachStep) return;
		stopAllAudio();
		if ($appStore.isListening) stopListening();
		playAudioPromise(currentTeachStep.germanText, 0.8, 'de-DE');
	}

	function handleScriptItemClick(index: number) {
		jumpToSentence(index);
	}

	function handleMessageBubbleClick(text: string) {
		stopAllAudio();
		if ($appStore.isListening) stopListening();
		playAudioPromise(text, 0.8, 'de-DE');
	}

	function trimMessages() {
		if (chatMessages.length > 80) {
			chatMessages = chatMessages.slice(-80);
		}
	}

	// ============ LIFECYCLE ============
	let chatHistoryEl: HTMLDivElement | undefined = $state(undefined);

	$effect(() => {
		// Auto-scroll when messages change
		if (chatHistoryEl && (chatMessages.length > 0 || currentTeachStep || completionData || examQuestionData)) {
			setTimeout(() => {
				chatHistoryEl!.scrollTop = chatHistoryEl!.scrollHeight;
			}, 50);
		}
	});

	onMount(async () => {
		setupCallbacks();
		initSyncListeners();
		initSpeechRecognition();
		getLessonIndex().then((idx) => { lessonIndex = idx; });
		setVoiceInputHandler((transcript: string) => {
			controllerHandleVoice(transcript);
		});

		await initLesson();
		isReady = true;

		// Load due count
		dueReviewCount = await getDueCount();

		// If no overlay needed (already clicked), start
		if (!showOverlay) {
			processNextStep();
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			stopAllAudio();
			stopListening();
		}
	});
</script>

<svelte:head>
	<title>Misiro - Learn German</title>
</svelte:head>

<!-- Audio Unlock Overlay -->
{#if showOverlay}
	<div class="start-overlay">
		<h1>Ready to Learn?</h1>
		<p>Tap start to enable audio & voice.</p>
		<button class="start-btn" onclick={handleStart} disabled={!isReady}>
			{isReady ? '▶ Start Lesson' : '⏳ Loading...'}
		</button>
	</div>
{/if}

<div class="container" class:hidden={showOverlay}>
	<!-- Header -->
	<header class="header">
		<div class="header-left">
			<a href="/" class="home-btn">&larr; Home</a>
			<h1>{'🌍'} Misiro</h1>
		</div>

		<div class="day-selection-control">
			<label for="day-select">📅 Day:</label>
			<select id="day-select" onchange={handleDaySelectChange} value={app.currentDay.toString()}>
				{#if dueReviewCount > 0}
					<optgroup label={prefs.language === 'fa' ? '\u0645\u0631\u0648\u0631' : 'Review'}>
						<option value="review">
							🔄 {prefs.language === 'fa' ? `\u0645\u0631\u0648\u0631 (${dueReviewCount} \u0645\u0648\u0631\u062F)` : `Review (${dueReviewCount} due)`}
						</option>
					</optgroup>
				{/if}
				{#each Object.entries(weekGroups()) as [weekNum, days]}
					<optgroup label="Week {weekNum}">
						{#each days as meta}
							{@const isCompleted = !!(app.completedLessons && app.completedLessons[meta.day])}
							{@const unlocked = isDayUnlocked(meta.day)}
							<option
								value={meta.day.toString()}
								disabled={!unlocked}
								selected={meta.day === app.currentDay}
							>
								{isCompleted ? '✅ ' : !unlocked ? '🔒 ' : ''}{meta.title}
							</option>
						{/each}
						{#if days.length === 7}
							{@const allWeekDone = days.every(d => app.completedLessons && app.completedLessons[d.day])}
							<option value="exam{weekNum}" disabled={!allWeekDone}>
								{allWeekDone ? '' : '🔒 '}Week {weekNum} Exam
							</option>
						{/if}
					</optgroup>
				{/each}
			</select>
		</div>

		<div class="blind-mode-control">
			<input type="checkbox" id="blind-mode-toggle" checked={prefs.blindMode} onchange={handleBlindModeChange}>
			<label for="blind-mode-toggle">🙈 Blind Mode</label>
		</div>

		<div class="language-control">
			<select id="language-select" aria-label="Select language" value={prefs.language} onchange={handleLanguageSelectChange}>
				<option value="fa">\u0641\u0627\u0631\u0633\u06CC</option>
				<option value="en">English</option>
			</select>
		</div>

		<div class="speed-control">
			<select id="speed-select" aria-label="Select voice speed" value={prefs.voiceSpeed.toString()} onchange={handleSpeedSelectChange}>
				<option value="1">{'🔊 1x'}</option>
				<option value="0.75">{'🔉 0.75x'}</option>
				<option value="0.5">{'🐢 0.5x'}</option>
				<option value="0.25">{'🐌 0.25x'}</option>
			</select>
		</div>

		<div class="progress-info">
			<span>Scenario <span class="current-scenario">{app.currentDay}</span></span>
		</div>
	</header>

	<!-- Main Learning Area -->
	<main class="learning-area">
		<div class="chat-wrapper">
			<!-- Chat Header -->
			<div class="chat-header">
				<div class="avatar-circle">☕️</div>
				<div class="header-info">
					<h3>{scenarioTitle()}</h3>
					<span class="status">Online</span>
				</div>
			</div>

			<!-- Message History -->
			<div class="chat-history" bind:this={chatHistoryEl} role="log" aria-live="polite" aria-label="Chat history">
				<div class="date-divider">Today</div>

				{#each systemMessages as msg}
					<div class="message system">
						<div class="text">{msg}</div>
					</div>
				{/each}

				<!-- Exam Progress Bar -->
				{#if exam.isExamMode}
					<div class="exam-progress-bar">
						<div class="exam-progress-fill" style="width: {examProgressTotal > 0 ? Math.round((examProgressCurrent / examProgressTotal) * 100) : 0}%"></div>
					</div>
				{/if}

				{#each chatMessages as msg (msg.id)}
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="message {msg.type}"
						role="button"
						onclick={() => handleMessageBubbleClick(msg.text)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMessageBubbleClick(msg.text); } }}
						tabindex="0"
						style="cursor: pointer;"
					>
						{msg.text}
					</div>
				{/each}

				<!-- Exam Question -->
				{#if examQuestionData}
					<div class="message received" style="border-left: 4px solid {examQuestionData.type === 'listen' ? '#FF9800' : '#2196F3'}">
						<div class="avatar">🎓</div>
						<div class="content">
							<div class="sub-text" style="font-size:0.75em; color:{examQuestionData.type === 'listen' ? '#FF9800' : '#2196F3'}; font-weight:bold; margin-bottom:4px;">
								{examQuestionData.type === 'listen'
									? (examQuestionData.language === 'fa' ? '🎧 گوش کن و تکرار کن' : '🎧 Listen & Repeat')
									: (examQuestionData.language === 'fa' ? '🗣️ به آلمانی بگو' : '🗣️ Say in German')}
							</div>
							<div class="text" style="{examQuestionData.language === 'fa' ? 'direction:rtl;' : ''}">{examQuestionData.prompt}</div>
							<div class="sub-text" style="font-size:0.8em; color:#666;">
								{examQuestionData.language === 'fa'
									? `سوال ${examQuestionData.questionNumber} از ${examQuestionData.totalQuestions}`
									: `Question ${examQuestionData.questionNumber}/${examQuestionData.totalQuestions}`}
							</div>
						</div>
					</div>
				{/if}

				<!-- Teach Bubble -->
				{#if currentTeachStep}
					{@const words = createInteractiveWords(currentTeachStep.germanText)}
					<div class="message instruction">
						<div class="translation-line" style="direction:{currentTeachStep.language === 'fa' ? 'rtl' : 'ltr'};">
							{currentTeachStep.translationText}
						</div>
						<div class="german-line">
							<!-- svelte-ignore a11y_interactive_supports_focus -->
							<span
								class="speaker-icon"
								role="button"
								aria-label="Play full sentence audio"
								onclick={handleSpeakerClick}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSpeakerClick(); } }}
								tabindex="0"
							>🔊</span>
							<span class="teach-text">
								{#if currentTeachStep.isBlindMode}
									<span style="color:#ccc; font-weight:normal;">
										{currentTeachStep.language === 'fa' ? '🙈 [مخفی] - گوش کن!' : '🙈 [Hidden] - Listen!'}
									</span>
								{:else}
									{#each words as w, i}
										<!-- svelte-ignore a11y_interactive_supports_focus -->
										<span
											class="interactive-word"
											class:success={voiceResult && voiceResult.matchedWordIndices?.[i] === true}
											class:error={voiceResult && voiceResult.isCorrect === false && voiceResult.matchedWordIndices?.[i] === false}
											role="button"
											tabindex="0"
											aria-label="{w.word}{w.meaning ? `, meaning: ${w.meaning}` : ''}"
											data-meaning={w.meaning || undefined}
											onclick={(e) => handleWordClick(w.word, w.meaning, e)}
											onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWordClick(w.word, w.meaning, e as any); } }}
										>{w.word}</span>{' '}
									{/each}
								{/if}
							</span>
							<button class="btn-inline-next" onclick={() => manualNext()}>
								{currentTeachStep.language === 'fa' ? 'بعدی ←' : 'Next ➡'}
							</button>
						</div>
					</div>
				{/if}

				<!-- Completion Card -->
				{#if completionData}
					<div class="message system completion-card">
						<div class="text" style="text-align:center;">
							<div style="font-size:2.5em; margin-bottom:10px;">🎉</div>
							<h2 style="margin:0 0 5px; color:#2e7d32;">
								{completionData.language === 'fa' ? '\u0622\u0641\u0631\u06CC\u0646!' : 'Well Done!'}
							</h2>
							<p style="color:#555; margin:0;">
								{completionData.language === 'fa' ? '\u0627\u06CC\u0646 \u062F\u0631\u0633 \u0631\u0627 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u0645\u0627\u0645 \u06A9\u0631\u062F\u06CC\u062F.' : 'You completed this lesson successfully.'}
							</p>
							{#if completionData.nextDay}
								<button class="next-day-btn" onclick={() => goToNextDay(completionData!.nextDay!)}>
									{completionData.language === 'fa' ? '\u062F\u0631\u0633 \u0628\u0639\u062F\u06CC' : 'Next Lesson'} &rarr;
									<span style="font-weight:400; font-size:0.9em;">{completionData.nextLessonTitle || ''}</span>
								</button>
							{:else}
								<p style="color:#a0a0a0; margin-top:10px;">
									{completionData.language === 'fa' ? 'همه درس‌ها را تمام کردید! 🏆' : 'All lessons completed! 🏆'}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Exam Results -->
				{#if examResultsData}
					<div class="message system" style="background:{examResultsData.percentage >= 80 ? '#e8f5e9' : '#fff3e0'}; padding:20px; border-radius:15px;">
						<div class="text" style="text-align:center">
							<h2 style="margin:0">
								{#if examResultsData.percentage >= 80}
									{examResultsData.wasReview
										? (examResultsData.language === 'fa' ? '🎉 مرور عالی بود!' : '🎉 Great Review!')
										: (examResultsData.language === 'fa' ? '🎉 آفرین!' : '🎉 Well Done!')}
								{:else}
									{examResultsData.wasReview
										? (examResultsData.language === 'fa' ? '🔄 ادامه بده!' : '🔄 Keep Going!')
										: (examResultsData.language === 'fa' ? '📚 بیشتر تمرین کن' : '📚 Keep Practicing')}
								{/if}
							</h2>
							<div style="font-size:2em; margin:10px 0;">{examResultsData.score} / {examResultsData.total}</div>
							<p>{examResultsData.percentage}%</p>

							{#if examResultsData.wrongAnswers.length > 0}
								<div style="text-align:left; margin-top:15px; padding-top:15px; border-top:1px solid #ddd;">
									<b>{examResultsData.language === 'fa' ? '\u0645\u0631\u0648\u0631 \u0627\u0634\u062A\u0628\u0627\u0647\u0627\u062A:' : 'Review mistakes:'}</b>
									{#each examResultsData.wrongAnswers as w}
										<div style="padding:6px 0; border-bottom:1px solid #eee;">
											<div style="color:#333; font-weight:bold;">{w.question.targetText}</div>
											<div style="color:#888; font-size:0.85em;">{w.question.translation}</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Interaction Area -->
			<div class="chat-interaction-area">
				<div class="message-composer" aria-live="polite" aria-label="Your reply">
					{@html answerLineHtml}
				</div>
				<button
					class="btn-send"
					class:pulse={app.isListening}
					style="background: {app.isListening ? '#f44336' : '#075E54'};"
					onclick={handleMicClick}
					aria-label={app.isListening ? 'Stop recording' : 'Microphone - tap to record'}
				>
					{app.isListening ? '🛑' : '🎙️'}
				</button>
			</div>
		</div>

		<!-- Script Panel -->
		<aside class="script-view" id="script-view">
			<div class="script-header">
				<div class="drag-handle" id="script-drag-handle"></div>
				<h3>{prefs.language === 'fa' ? '\u0645\u062A\u0646 \u062F\u0631\u0633' : 'Lesson Script'}</h3>
			</div>
			<div class="script-container">
				{#each scriptItems as item, i}
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<div
						class="script-item"
						class:done={item.done}
						class:active={item.active}
						role="button"
						tabindex="0"
						aria-label="Sentence {i + 1}: {item.german}"
						onclick={() => handleScriptItemClick(i)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleScriptItemClick(i); } }}
					>
						<div class="german">{item.german}</div>
						<div class="translation" style="direction: {prefs.language === 'fa' ? 'rtl' : 'ltr'};">
							{item.translation}
						</div>
					</div>
				{/each}
			</div>
		</aside>
	</main>
</div>

<!-- Word Tooltip -->
{#if wordTooltip}
	<div class="word-tooltip" style="left: {wordTooltip.x}px; top: {wordTooltip.y - 10}px;">
		{wordTooltip.meaning}
	</div>
{/if}

<style>
	.start-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		background: rgba(0, 0, 0, 0.8);
		z-index: 10000;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		color: white;
	}

	.start-overlay h1 {
		font-size: 2rem;
		margin-bottom: 10px;
	}

	.start-overlay p {
		margin: 20px 0;
		font-size: 1.2em;
	}

	.start-btn {
		padding: 15px 40px;
		font-size: 1.5em;
		background: #4caf50;
		color: white;
		border: none;
		border-radius: 50px;
		cursor: pointer;
		transition: all 0.3s;
	}

	.start-btn:hover {
		background: #45a049;
		transform: translateY(-2px);
	}

	.start-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.hidden {
		display: none;
	}

	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
	}

	/* Header */
	.header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 15px;
		background: #075e54;
		color: white;
		flex-wrap: wrap;
		z-index: 100;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 8px 15px;
		background: #4caf50;
		border-radius: 20px;
		color: #fff;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.3s ease;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	}

	.home-btn:hover {
		background: #45a049;
	}

	.header h1 {
		font-size: 1.2rem;
		margin: 0;
	}

	.day-selection-control,
	.blind-mode-control,
	.language-control,
	.speed-control {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.header select,
	.header input[type='checkbox'] {
		color: #333;
		background: #fff;
		border: 2px solid #ddd;
		border-radius: 8px;
		padding: 5px 10px;
		font-weight: 600;
		cursor: pointer;
	}

	.header label {
		font-weight: 600;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.progress-info {
		font-size: 0.85rem;
		opacity: 0.8;
	}

	/* Learning Area */
	.learning-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chat-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: #075e54;
		color: white;
	}

	.avatar-circle {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.3rem;
	}

	.header-info h3 {
		margin: 0;
		font-size: 1rem;
	}

	.status {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	/* Chat History */
	.chat-history {
		flex: 1;
		overflow-y: auto;
		padding: 15px;
		background: #e5ddd5;
		background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc5' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
	}

	.date-divider {
		text-align: center;
		color: #888;
		font-size: 0.8rem;
		padding: 8px;
		margin: 10px 0;
	}

	.message {
		max-width: 85%;
		padding: 8px 14px;
		border-radius: 8px;
		margin-bottom: 8px;
		font-size: 0.95rem;
		line-height: 1.4;
		word-wrap: break-word;
	}

	.message.received {
		background: #fff;
		color: #333;
		border-top-left-radius: 0;
		margin-right: auto;
	}

	.message.sent {
		background: #dcf8c6;
		color: #333;
		border-top-right-radius: 0;
		margin-left: auto;
	}

	.message.system {
		background: #fff3e0;
		max-width: 95%;
		margin: 10px auto;
		text-align: center;
		border-radius: 10px;
		padding: 15px;
	}

	.message.instruction {
		background: #fff;
		max-width: 95%;
		margin: 8px auto;
		border-radius: 12px;
		padding: 12px 16px;
	}

	.translation-line {
		font-size: 1.2em;
		color: #333;
		margin-bottom: 5px;
	}

	.german-line {
		font-weight: bold;
		font-size: 1.1em;
		color: #555;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.speaker-icon {
		cursor: pointer;
		font-size: 1.2em;
	}

	.teach-text {
		flex: 1;
	}

	.interactive-word {
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 4px;
		transition: all 0.2s;
		display: inline-block;
	}

	.interactive-word:hover {
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
	}

	.interactive-word.success {
		background: rgba(46, 204, 113, 0.3);
		color: #27ae60;
	}

	.interactive-word.error {
		background: rgba(244, 67, 54, 0.2);
		color: #e53935;
	}

	.btn-inline-next {
		padding: 6px 16px;
		border-radius: 20px;
		border: none;
		background: #4caf50;
		color: white;
		cursor: pointer;
		font-weight: bold;
		font-size: 0.95em;
		transition: all 0.3s ease;
		white-space: nowrap;
	}

	.btn-inline-next:hover {
		transform: translateY(-1px);
		box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
	}

	/* Completion Card */
	.completion-card {
		background: #e8f5e9 !important;
		border-radius: 15px !important;
		padding: 25px !important;
	}

	.next-day-btn {
		padding: 12px 30px;
		border-radius: 30px;
		border: none;
		background: linear-gradient(90deg, #2196f3, #42a5f5);
		color: white;
		cursor: pointer;
		font-size: 1.05rem;
		font-weight: 600;
		margin-top: 15px;
		transition: all 0.3s ease;
	}

	.next-day-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 20px rgba(33, 150, 243, 0.4);
	}

	/* Exam Progress */
	.exam-progress-bar {
		width: calc(100% - 20px);
		background: #e0e0e0;
		border-radius: 10px;
		height: 8px;
		margin: 5px 10px;
	}

	.exam-progress-fill {
		background: #2196f3;
		height: 100%;
		border-radius: 10px;
		transition: width 0.3s;
	}

	/* Interaction Area */
	.chat-interaction-area {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 15px;
		background: #f0f0f0;
		border-top: 1px solid #ddd;
	}

	.message-composer {
		flex: 1;
		padding: 8px 12px;
		background: white;
		border-radius: 20px;
		min-height: 36px;
		display: flex;
		align-items: center;
	}

	:global(.message-composer .placeholder-text) {
		color: #999;
		font-size: 0.9rem;
	}

	.btn-send {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		color: white;
		font-size: 24px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
		flex-shrink: 0;
	}

	.btn-send.pulse {
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	/* Script Panel */
	.script-view {
		height: 28vh;
		background: #1a1a2e;
		color: #fff;
		display: flex;
		flex-direction: column;
		border-top: 2px solid rgba(46, 204, 113, 0.3);
	}

	.script-header {
		padding: 8px 15px;
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(0, 0, 0, 0.2);
	}

	.drag-handle {
		width: 40px;
		height: 5px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
		cursor: row-resize;
	}

	.script-header h3 {
		margin: 0;
		font-size: 0.9rem;
		color: #2ecc71;
	}

	.script-container {
		flex: 1;
		overflow-y: auto;
		padding: 10px 15px;
	}

	.script-item {
		padding: 8px 12px;
		border-radius: 8px;
		margin-bottom: 6px;
		cursor: pointer;
		transition: all 0.2s;
		border-left: 3px solid transparent;
	}

	.script-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.script-item.active {
		background: rgba(46, 204, 113, 0.15);
		border-left-color: #2ecc71;
	}

	.script-item.done {
		opacity: 0.5;
	}

	.script-item .german {
		font-weight: 600;
		color: #2ecc71;
		font-size: 0.95rem;
	}

	.script-item .translation {
		color: #888;
		font-size: 0.8rem;
		margin-top: 2px;
	}

	/* Word Tooltip */
	.word-tooltip {
		position: fixed;
		transform: translateX(-50%) translateY(-100%);
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		padding: 6px 12px;
		border-radius: 8px;
		font-size: 0.85em;
		white-space: nowrap;
		z-index: 200;
		pointer-events: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		animation: popIn 0.2s ease-out;
	}

	@keyframes popIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-100%) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(-100%) scale(1);
		}
	}

	/* Responsive */
	@media (max-width: 600px) {
		.header {
			padding: 6px 10px;
			font-size: 0.85rem;
		}

		.header h1 {
			font-size: 1rem;
		}

		.home-btn {
			padding: 6px 10px;
			font-size: 0.85rem;
		}

		.blind-mode-control,
		.progress-info {
			display: none;
		}

		.script-view {
			height: 28vh;
		}
	}
</style>
