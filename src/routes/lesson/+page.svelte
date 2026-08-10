<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import AppHeader from "$lib/components/AppHeader.svelte";
	import { appStore } from "$stores/app";
	import { preferencesStore, type Language } from "$stores/preferences";
	import { lessonStore, type Sentence } from "$stores/lesson";
	import { examStore } from "$stores/exam";
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
		answerExamChoice,
		startReviewMode,
		startConversation,
		incrementSession,
		skipAndRemoveReviewItem,
		continueAfterGrammar,
		finishBuildStep,
		isBuildCorrect,
		type TeachStepData,
		type CompletionCardData,
		type GrammarMomentData,
		type BuildStepData,
		type ExamQuestionData,
		type ExamResultsData,
		type VoiceResultData,
		type ConvOption,
	} from "$services/lesson-controller";
	import {
		getLessonIndex,
		getGlossaryMeaning,
		hasLesson,
		type LessonMeta,
	} from "$services/lesson-loader";
	import { stopAllAudio, playAudioPromise } from "$services/tts";
	import { unlockAudioContext, playTone } from "$services/audio-context";
	import {
		initSpeechRecognition,
		setVoiceInputHandler,
		toggleMic,
		stopListening,
		getLastVoiceAlternatives,
		isSpeechSupported,
	} from "$services/speech";
	import SentencePractice from "$components/SentencePractice.svelte";
	import {
		getWordStrengths,
		saveWordStrengths,
	} from "$services/data-layer";
	import { applyAttempt, sentenceMastery } from "$services/word-strength";
	import {
		getLanguage,
		setLanguage,
		getVoiceSpeed,
		setVoiceSpeed,
		saveWord,
		removeWord,
		getVocabulary,
		getBookmarks,
		addBookmark,
		removeBookmark,
	} from "$services/data-layer";
	import {
		bookmarkForReview,
		removeFromReview,
	} from "$services/spaced-repetition";
	import { loadGlossary } from "$services/lesson-loader";
	import { getTranslation, getTranslationLang } from "$utils/i18n";
	import { makeWordHighlighter } from "$utils/word-timing";
	import { computeStreak } from "$utils/streak";
	import { initSyncListeners } from "$services/sync-queue";

	// ============ STATE ============
	let showOverlay = $state(true);
	let isReady = $state(false);
	let chatMessages: ChatMessage[] = $state([]);
	let answerLineHtml = $state(
		'<span class="placeholder-text">Tap words to reply...</span>',
	);
	let currentTeachStep: TeachStepData | null = $state(null);
	let spokenWordIndex = $state(-1); // karaoke: German word currently being read
	let showHint = $state(false);
	let completionData: CompletionCardData | null = $state(null);
	let grammarMoment: GrammarMomentData | null = $state(null);

	// ── Tap-to-build (retrieval ladder, stage 2) ──
	let buildStep: BuildStepData | null = $state(null);
	/** Tiles still in the tray, as {word, id} so duplicates stay distinct. */
	let buildTray: Array<{ word: string; id: number }> = $state([]);
	/** Tiles the learner has placed, in order. */
	let buildAnswer: Array<{ word: string; id: number }> = $state([]);
	let buildVerdict: "none" | "right" | "wrong" = $state("none");

	function startBuild(data: BuildStepData) {
		buildStep = data;
		buildTray = data.tiles.map((word, id) => ({ word, id }));
		buildAnswer = [];
		buildVerdict = "none";
	}

	function placeTile(tile: { word: string; id: number }) {
		if (buildVerdict === "right") return;
		buildTray = buildTray.filter((t) => t.id !== tile.id);
		buildAnswer = [...buildAnswer, tile];
		buildVerdict = "none";
	}

	function removeTile(tile: { word: string; id: number }) {
		if (buildVerdict === "right") return;
		buildAnswer = buildAnswer.filter((t) => t.id !== tile.id);
		buildTray = [...buildTray, tile];
		buildVerdict = "none";
	}

	function checkBuild() {
		if (!buildStep) return;
		const ok = isBuildCorrect(
			buildAnswer.map((t) => t.word),
			buildStep.solution,
		);
		buildVerdict = ok ? "right" : "wrong";
		playTone(ok ? "success" : "error");
		if (ok) {
			// Hear the sentence they just assembled, then move on.
			playAudioPromise(buildStep.solution.join(" "), 0.85, "de-DE");
			setTimeout(() => finishBuildStep(true), 1400);
		}
	}

	/** Wrong twice is a teaching moment, not a wall: show it and continue. */
	function revealBuild() {
		if (!buildStep) return;
		buildAnswer = buildStep.solution.map((word, id) => ({ word, id }));
		buildTray = [];
		buildVerdict = "right";
		playAudioPromise(buildStep.solution.join(" "), 0.85, "de-DE");
		setTimeout(() => finishBuildStep(false), 1800);
	}
	let examQuestionData: ExamQuestionData | null = $state(null);
	let examResultsData: ExamResultsData | null = $state(null);
	let examProgressCurrent = $state(0);
	let examProgressTotal = $state(0);
	let systemMessages: string[] = $state([]);
	let voiceResult: VoiceResultData | null = $state(null);
	let listenerMode = $state(false);
	let _listenerSeq = 0;
	// Review-first flow: due SR items become a warm-up before the day's lesson.
	// Capped low on purpose — a big review wall before new material is the #1
	// "open app, feel guilt, close app" churn loop. The backlog lives in the
	// dedicated Review flow instead.
	const WARMUP_CAP = 3;
	let warmupThenLesson = $state(false);
	// Tap-based exam questions: index the user picked (-1 = not yet answered)
	let choiceAnswered = $state(-1);
	// Conversation mode: reply choices for the user's current turn
	let convOptions = $state<ConvOption[] | null>(null);

	function examTypeLabel(t: string, fa: boolean): string {
		if (t === "listen") return fa ? "🎧 گوش کن و تکرار کن" : "🎧 Listen & Repeat";
		if (t === "meaning") return fa ? "🔊 یعنی چه؟" : "🔊 What does it mean?";
		if (t === "gap") return fa ? "✍️ جای خالی را پر کن" : "✍️ Fill the blank";
		return fa ? "🗣️ به آلمانی بگو" : "🗣️ Say in German";
	}

	function examTypeColor(t: string): string {
		if (t === "listen") return "#f0b429";
		if (t === "meaning") return "#a569bd";
		if (t === "gap") return "#58d68d";
		return "#5dade2";
	}

	function handleChoiceTap(i: number) {
		if (choiceAnswered !== -1) return;
		choiceAnswered = i;
		answerExamChoice(i);
	}

	interface ChatMessage {
		id: number;
		type: "received" | "sent" | "system";
		text: string;
	}
	let msgCounter = 0;

	// Derived
	const app = $derived($appStore);
	const prefs = $derived($preferencesStore);
	const lesson = $derived($lessonStore);
	const exam = $derived($examStore);
	let isSpeaking = $state(false);

	const scenarioTitle = $derived(() => {
		if (!lesson.currentLesson) return "Loading...";
		const l = lesson.currentLesson;
		if (prefs.language === "fa" && l.titleFa) {
			const parts = l.titleFa.split(": ");
			return parts.length > 1 ? parts[1] : l.titleFa;
		}
		const parts = l.title.split(": ");
		return parts.length > 1 ? parts[1] : l.title;
	});

	const scenarioDescription = $derived(() => {
		if (!lesson.currentLesson) return null;
		const l = lesson.currentLesson;
		if (prefs.language === "fa" && l.descriptionFa) return l.descriptionFa;
		return l.description ?? null;
	});

	const lessonDifficulty = $derived(
		() => lesson.currentLesson?.difficulty ?? null,
	);
	const lessonGrammarFocus = $derived(() => {
		if (!lesson.currentLesson) return null;
		const l = lesson.currentLesson;
		if (prefs.language === "fa" && l.grammarFocusFa)
			return l.grammarFocusFa;
		return l.grammarFocus ?? null;
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
	function createInteractiveWords(
		text: string,
	): Array<{ word: string; meaning: string | null }> {
		return text.split(" ").map((word) => {
			const cleanKey = word.toLowerCase().replace(/[.,!?]/g, "");
			const meaning = getGlossaryMeaning(cleanKey, 'en');
			return { word, meaning };
		});
	}

	let wordTooltip: {
		word: string;
		meaning: string;
		x: number;
		y: number;
	} | null = $state(null);
	let tooltipTimer: ReturnType<typeof setTimeout> | null = null;
	let savedWords = $state<Set<string>>(new Set());
	let bookmarkedSentences = $state<Set<string>>(new Set());
	const currentSentenceKey = $derived(
		`${app.currentDay}:${lesson.currentLesson?.sentences[app.currentSentenceIndex]?.id}`,
	);

	function handleWordClick(
		word: string,
		meaning: string | null,
		event: MouseEvent,
	) {
		stopAllAudio();
		if ($appStore.isListening) stopListening();

		// Play word
		const clean = word.replace(/[.,!?]/g, "");
		playAudioPromise(clean, 0.8, "de-DE");

		// Show tooltip
		if (meaning) {
			if (tooltipTimer) clearTimeout(tooltipTimer);
			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			wordTooltip = {
				word,
				meaning,
				x: rect.left + rect.width / 2,
				y: rect.top,
			};
			tooltipTimer = setTimeout(() => {
				wordTooltip = null;
			}, 5000);
		}
	}

	async function handleBookmarkWord() {
		if (!wordTooltip) return;
		const cleanWord = wordTooltip.word.toLowerCase().replace(/[.,!?]/g, "");
		const glossary = await loadGlossary();
		const entry = glossary[cleanWord];
		if (!entry) return;

		if (savedWords.has(cleanWord)) {
			await removeWord(cleanWord);
			savedWords = new Set(
				[...savedWords].filter((w) => w !== cleanWord),
			);
		} else {
			await saveWord(cleanWord, entry.en, entry.fa);
			savedWords = new Set([...savedWords, cleanWord]);
		}
	}

	async function handleBookmarkSentence() {
		const day = app.currentDay;
		const sentence =
			lesson.currentLesson?.sentences[app.currentSentenceIndex];
		if (!sentence) return;
		const key = `${day}:${sentence.id}`;

		if (bookmarkedSentences.has(key)) {
			removeBookmark(day, sentence.id);
			await removeFromReview(day, sentence.id);
			bookmarkedSentences = new Set(
				[...bookmarkedSentences].filter((k) => k !== key),
			);
		} else {
			addBookmark(day, sentence.id);
			await bookmarkForReview(day, sentence.id);
			bookmarkedSentences = new Set([...bookmarkedSentences, key]);
		}
	}

	async function handleRemoveFromReview() {
		await skipAndRemoveReviewItem();
		bookmarkedSentences = getBookmarks();
	}

	// ============ SCRIPT PANEL ============
	let scriptItems: Array<{
		german: string;
		translation: string;
		done: boolean;
		active: boolean;
	}> = $state([]);
	let showScript = $state(false);
	let showScenarioInfo = $state(false);

	function updateScript() {
		if (!lesson.currentLesson) return;
		const isLessonDone = !!(
			app.completedLessons && app.completedLessons[app.currentDay]
		);

		scriptItems = lesson.currentLesson.sentences.map((step, i) => {
			const german =
				step.role === "received" ? step.audioText! : step.targetText!;
			const translation = getTranslation(step, prefs.language);
			return {
				german,
				translation,
				done: isLessonDone || i < app.currentSentenceIndex,
				active: i === app.currentSentenceIndex,
			};
		});
	}

	// ============ CALLBACKS ============
	function setupCallbacks() {
		setCallbacks({
			onTeachStep(data) {
				currentTeachStep = data;
				spokenWordIndex = -1; // reset karaoke highlight for the new sentence
				showHint = false;
				completionData = null;
				grammarMoment = null;
				buildStep = null;
				examQuestionData = null;
				examResultsData = null;
				voiceResult = null;
				_listenerSeq++; // invalidate any pending listener timers
				isSpeaking = true; // audio is about to play
				updateScript();
			},
			onSpokenWord(index) {
				spokenWordIndex = index;
			},
			onBuildStep(data) {
				if (data) {
					startBuild(data);
					isSpeaking = false;
				} else {
					buildStep = null;
				}
			},
			onGrammarMoment(data) {
				grammarMoment = data;
				if (data) {
					currentTeachStep = null;
					isSpeaking = false;
					updateScript();
				}
			},
			onCompletionCard(data) {
				currentTeachStep = null;
				completionData = data;
				updateScript();
			},
			async onAnswerPrompt(message) {
				answerLineHtml = message;
				isSpeaking = false; // audio just finished
				if (!listenerMode || !currentTeachStep || exam.isExamMode)
					return;
				const mySeq = _listenerSeq;
				const germanText = currentTeachStep.germanText;
				const ttsVoice = currentTeachStep.role === "received" ? "b" : "a";
				// Brief pause after the normal-speed audio that just finished
				await new Promise<void>((r) => setTimeout(r, 800));
				if (_listenerSeq !== mySeq || !listenerMode) return;
				// Play German a second time at 0.75x speed (rate 0.6 = 0.8 x 0.75)
				stopAllAudio();
				const highlight = makeWordHighlighter(
					germanText,
					(i) => (spokenWordIndex = i),
				);
				await playAudioPromise(germanText, 0.6, "de-DE", highlight, ttsVoice);
				spokenWordIndex = -1;
				await new Promise<void>((r) => setTimeout(r, 600));
				if (_listenerSeq !== mySeq || !listenerMode) return;
				manualNext();
			},
			onMessageBubble(step) {
				currentTeachStep = null;
				voiceResult = null;
				const text =
					step.role === "received"
						? step.audioText!
						: step.targetText!;
				chatMessages = [
					...chatMessages,
					{ id: msgCounter++, type: step.role, text },
				];
				trimMessages();
			},
			onScriptHighlight(index) {
				scriptItems = scriptItems.map((item, i) => ({
					...item,
					active: i === index,
				}));
				setTimeout(() => {
					const active = scriptContainerEl?.children[index] as
						| HTMLElement
						| undefined;
					active?.scrollIntoView({
						block: "nearest",
						behavior: "smooth",
					});
				}, 50);
			},
			onScriptMarkDone(index) {
				if (scriptItems[index]) {
					scriptItems = scriptItems.map((item, i) =>
						i === index ? { ...item, done: true } : item,
					);
				}
			},
			onExamQuestion(data) {
				currentTeachStep = null;
				completionData = null;
				grammarMoment = null;
				buildStep = null;
				examResultsData = null;
				voiceResult = null;
				choiceAnswered = -1;
				examQuestionData = data;
			},
			onExamFinished(data) {
				currentTeachStep = null;
				completionData = null;
				grammarMoment = null;
				buildStep = null;
				examQuestionData = null;
				voiceResult = null;
				examResultsData = data;
				// Warm-up finished → show the result briefly, then flow into
				// today's lesson automatically.
				if (warmupThenLesson && data.wasReview) {
					warmupThenLesson = false;
					setTimeout(() => {
						examResultsData = null;
						systemMessages = [];
						processNextStep();
					}, 2500);
				}
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
				grammarMoment = null;
				buildStep = null;
				examQuestionData = null;
				examResultsData = null;
				voiceResult = null;
				convOptions = null;
				systemMessages = [];
				answerLineHtml = "";
				updateScript();
			},
			onVoiceResult(result) {
				voiceResult = result;
			},
			onConversationOptions(options) {
				convOptions = options;
			},
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

	async function handleStartWithWarmup() {
		showOverlay = false;
		unlockAudioContext();
		if (!isReady) return;
		warmupThenLesson = true;
		await startReviewMode(WARMUP_CAP);
		// Queue emptied since page load → nothing to warm up, go straight in.
		if (!exam.isExamMode) {
			warmupThenLesson = false;
			processNextStep();
		}
	}

	function handleMicClick() {
		if (isSpeaking) {
			stopAllAudio();
			return;
		}
		toggleMic();
	}

	// ── Practice mode ──────────────────────────────────────────────────
	// The retrieval ladder for one sentence, opened from its Practice button.
	// The lesson keeps running underneath; closing returns to exactly where
	// the learner was.
	let practiceSentence = $state<{ german: string; meaning: string } | null>(
		null,
	);
	let practiceEl = $state<SentencePractice | null>(null);
	let wordStrengths = $state<Record<string, number>>({});
	let micSupported = $state(false);

	function openPractice(german: string, meaning: string) {
		if (!german?.trim()) return;
		stopAllAudio();
		if (app.isListening) stopListening();
		// On mobile the script is a drawer over the content — leaving it open
		// would cover the panel it just launched.
		showScript = false;
		practiceSentence = { german, meaning };
	}

	function closePractice() {
		stopAllAudio();
		if (app.isListening) stopListening();
		practiceSentence = null;
	}

	/** Practice reports a rung result; strength is the lesson's to persist. */
	function handlePracticeResult(german: string, correct: boolean) {
		wordStrengths = applyAttempt(wordStrengths, german, correct);
		saveWordStrengths(wordStrengths);
	}

	function masteryOf(german: string): number {
		return sentenceMastery(wordStrengths, german);
	}

	function handleDaySelectChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		if (val.startsWith("exam") || val.startsWith("talk")) {
			// Exams/conversations start immediately — dismiss the start
			// overlay if it's still up (picked straight from the dropdown).
			showOverlay = false;
			unlockAudioContext();
			if (val.startsWith("exam")) {
				startExam(parseInt(val.replace("exam", "")));
			} else {
				startConversation(parseInt(val.replace("talk", "")));
			}
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
		if (isSpeaking) {
			_listenerSeq++;
			incrementSession();
			stopAllAudio();
			isSpeaking = false;
			spokenWordIndex = -1;
			return;
		}
		if ($appStore.isListening) stopListening();
		stopAllAudio();
		isSpeaking = true;
		const highlight = makeWordHighlighter(
			currentTeachStep.germanText,
			(i) => (spokenWordIndex = i),
		);
		playAudioPromise(
			currentTeachStep.germanText,
			0.8,
			"de-DE",
			highlight,
			currentTeachStep.role === "received" ? "b" : "a",
		).then(() => {
			isSpeaking = false;
			spokenWordIndex = -1;
		});
	}

	async function handleListenerToggle() {
		listenerMode = !listenerMode;
		// If turning ON while a sentence is already shown and audio has finished,
		// immediately start the listener sequence for the current sentence.
		if (!listenerMode || !currentTeachStep || isSpeaking || exam.isExamMode)
			return;
		const mySeq = _listenerSeq;
		const germanText = currentTeachStep.germanText;
		const ttsVoice = currentTeachStep.role === "received" ? "b" : "a";
		const highlight = makeWordHighlighter(
			germanText,
			(i) => (spokenWordIndex = i),
		);
		// Normal-speed play
		isSpeaking = true;
		await playAudioPromise(germanText, 0.8, "de-DE", highlight, ttsVoice);
		isSpeaking = false;
		spokenWordIndex = -1;
		await new Promise<void>((r) => setTimeout(r, 600));
		if (_listenerSeq !== mySeq || !listenerMode) return;
		// Slow play (0.75x)
		stopAllAudio();
		isSpeaking = true;
		const highlightSlow = makeWordHighlighter(
			germanText,
			(i) => (spokenWordIndex = i),
		);
		await playAudioPromise(germanText, 0.6, "de-DE", highlightSlow, ttsVoice);
		isSpeaking = false;
		spokenWordIndex = -1;
		await new Promise<void>((r) => setTimeout(r, 600));
		if (_listenerSeq !== mySeq || !listenerMode) return;
		manualNext();
	}

	function handleScriptItemClick(index: number) {
		jumpToSentence(index);
		showScript = false; // close mobile drawer after selecting a sentence
	}

	function handleMessageBubbleClick(text: string) {
		stopAllAudio();
		if ($appStore.isListening) stopListening();
		playAudioPromise(text, 0.8, "de-DE");
	}

	function trimMessages() {
		if (chatMessages.length > 80) {
			chatMessages = chatMessages.slice(-80);
		}
	}

	// ============ LIFECYCLE ============
	let chatHistoryEl: HTMLDivElement | undefined = $state(undefined);
	let scriptContainerEl: HTMLElement | undefined = $state(undefined);

	$effect(() => {
		// Auto-scroll when messages change
		if (
			chatHistoryEl &&
			(chatMessages.length > 0 ||
				currentTeachStep ||
				completionData ||
				examQuestionData)
		) {
			setTimeout(() => {
				chatHistoryEl!.scrollTop = chatHistoryEl!.scrollHeight;
			}, 50);
		}
	});

	onMount(async () => {
		setupCallbacks();
		initSyncListeners();
		micSupported = initSpeechRecognition() && isSpeechSupported();
		wordStrengths = getWordStrengths();
		getLessonIndex().then((idx) => {
			lessonIndex = idx;
		});
		// One owner for speech recognition. When practice is open it gets the
		// transcript instead of the controller, so nothing has to be swapped
		// out and restored around the panel.
		setVoiceInputHandler((transcript: string) => {
			if (practiceSentence) {
				practiceEl?.handleVoice(transcript, getLastVoiceAlternatives());
				return;
			}
			controllerHandleVoice(transcript);
		});

		await initLesson();
		isReady = true;

		// Load saved vocabulary words
		getVocabulary().then((words) => {
			savedWords = new Set(words.map((w) => w.word));
		});

		// Load bookmarked sentences
		bookmarkedSentences = getBookmarks();

		// Check for ?mode=review query param (coming from /review "Start Quiz")
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("mode") === "review") {
			showOverlay = false;
			unlockAudioContext();
			startReviewMode();
			window.history.replaceState({}, "", "/lesson");
			return;
		}

		// (No due-count fetch: the start overlay no longer offers a warm-up.)

		// If no overlay needed (already clicked), start
		if (!showOverlay) {
			processNextStep();
		}
	});

	onDestroy(() => {
		if (typeof window !== "undefined") {
			stopAllAudio();
			stopListening();
		}
	});
</script>

<!-- Escape leaves practice. A drill you cannot back out of with the keyboard
     is a trap for anyone not using a mouse. -->
<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape" && practiceSentence) closePractice();
	}}
/>

<svelte:head>
	<title>Mirifer - Learn German</title>
</svelte:head>

<!-- Audio Unlock Overlay -->
{#if showOverlay}
	<div class="start-overlay">
		<h1>Ready to Learn?</h1>
		{#if lesson.currentLesson}
			<div class="overlay-preview">
				<h2 class="overlay-title">{scenarioTitle()}</h2>
				{#if scenarioDescription()}
					<p class="overlay-desc">{scenarioDescription()}</p>
				{/if}
				<div class="overlay-tags">
					{#if lessonGrammarFocus()}
						<span class="overlay-badge grammar-tag"
							>{lessonGrammarFocus()}</span
						>
					{/if}
					<span class="overlay-badge"
						>{lesson.currentLesson.sentences.length} sentences</span
					>
				</div>
			</div>
		{:else}
			<p>Loading lesson details...</p>
		{/if}
		<!-- Review warm-up removed from the start overlay: it pushed the real
		     Start button below the fold. Reviews stay available on their own
		     in /review; handleStartWithWarmup() is kept for when we bring an
		     opt-in version back. -->
		<button class="start-btn" onclick={handleStart} disabled={!isReady}>
			{isReady
				? prefs.language === "fa"
					? "▶ شروع درس"
					: "▶ Start Lesson"
				: prefs.language === "fa"
					? "⏳ در حال بارگذاری..."
					: "⏳ Loading..."}
		</button>
	</div>
{/if}

{#snippet lessonSecondaryControls()}
	<div class="lesson-toolbar-content">
		<div class="lesson-toolbar-primary">
			<div class="day-selection-control">
				<label for="day-select">
					<span aria-hidden="true">📅</span>
					{prefs.language === "fa" ? "روز:" : "Day:"}
				</label>
			<select
				id="day-select"
				aria-label={prefs.language === "fa" ? "انتخاب روز" : "Select day"}
				onchange={handleDaySelectChange}
				value={app.currentDay.toString()}
			>
				{#each Object.entries(weekGroups()) as [weekNum, days]}
					<optgroup
						label={prefs.language === "fa"
							? `هفته ${weekNum}`
							: `Week ${weekNum}`}
					>
						{#each days as meta}
							{@const isCompleted = !!(
								app.completedLessons &&
								app.completedLessons[meta.day]
							)}
							<option
								value={meta.day.toString()}
								selected={meta.day === app.currentDay}
							>
								{isCompleted ? "✅ " : ""}{prefs.language === "fa" &&
								meta.titleFa
									? `${meta.day}: ${meta.titleFa}`
									: meta.title}
							</option>
						{/each}
						{#if days.length === 7}
							<option value="exam{weekNum}">
								{prefs.language === "fa"
									? `آزمون هفته ${weekNum}`
									: `Week ${weekNum} Exam`}
							</option>
							<option value="talk{weekNum}">
								{prefs.language === "fa"
									? `💬 گفتگوی هفته ${weekNum}`
									: `💬 Week ${weekNum} Talk`}
							</option>
						{/if}
					</optgroup>
				{/each}
			</select>
		</div>
		</div>

		<div class="lesson-toolbar-options">
			<div class="blind-mode-control">
				<input
					type="checkbox"
					id="blind-mode-toggle"
					checked={prefs.blindMode}
					onchange={handleBlindModeChange}
				/>
				<label for="blind-mode-toggle">
					🙈 <span>{prefs.language === "fa" ? "حالت پنهان" : "Blind Mode"}</span>
				</label>
			</div>

			<div class="language-control">
				<select
					id="language-select"
					aria-label={prefs.language === "fa" ? "انتخاب زبان" : "Select language"}
					value={prefs.language}
					onchange={handleLanguageSelectChange}
				>
					<option value="fa">فارسی</option>
					<option value="en">English</option>
				</select>
			</div>

			<div class="speed-control">
				<select
					id="speed-select"
					aria-label={prefs.language === "fa"
						? "سرعت صدای آلمانی"
						: "German voice speed"}
					title={prefs.language === "fa"
						? "سرعت صدای آلمانی"
						: "German voice speed"}
					value={prefs.voiceSpeed.toString()}
					onchange={handleSpeedSelectChange}
				>
					<option value="1">{"🔊 🇩🇪 1x"}</option>
					<option value="0.75">{"🔉 🇩🇪 0.75x"}</option>
				</select>
			</div>

			<button
				class="listener-mode-btn"
				class:active={listenerMode}
				onclick={handleListenerToggle}
				title={prefs.language === "fa"
					? listenerMode
						? "حالت شنونده روشن است — برای خاموش کردن کلیک کنید"
						: "فعال کردن حالت شنونده"
					: listenerMode
						? "Listener Mode ON — click to disable"
						: "Enable Listener Mode"}
			>
				🎧 {prefs.language === "fa"
					? listenerMode
						? "شنونده روشن"
						: "شنونده"
					: listenerMode
						? "Listener ON"
						: "Listener"}
			</button>
		</div>
	</div>
{/snippet}

<div class="container" class:hidden={showOverlay}>
	<AppHeader
		title={prefs.language === "fa" ? "درس‌های روزانه" : "Daily Lessons"}
		icon="📖"
		backHref="/home"
		backLabel={prefs.language === "fa" ? "خانه" : "Home"}
		secondary={lessonSecondaryControls}
		secondaryLabel={prefs.language === "fa" ? "کنترل‌های درس" : "Lesson controls"}
		sticky
		variant="brand"
		direction={prefs.language === "fa" ? "rtl" : "ltr"}
	/>

	<!-- Main Learning Area -->
	<main
		id="main-content"
		tabindex="-1"
		class="learning-area"
		class:practicing={!!practiceSentence}
	>
		{#if practiceSentence}
			<!-- Practice takes over the content area, never the whole page:
			     the lesson is still there underneath and Back returns to it. -->
			<div class="practice-host">
				<SentencePractice
					bind:this={practiceEl}
					sentence={practiceSentence}
					lang={prefs.language}
					micAvailable={micSupported}
					isListening={app.isListening}
					onToggleMic={toggleMic}
					onExit={closePractice}
					onResult={handlePracticeResult}
				/>
			</div>
		{/if}

		<!-- Mobile script toggle bar — top of content area on mobile -->
		<button
			class="script-toggle-btn"
			onclick={() => (showScript = !showScript)}
			aria-label="Toggle lesson script"
		>
			📋 {prefs.language === "fa" ? "متن درس" : "Script"}
			{#if lesson.currentLesson}
				<span class="script-toggle-count">
					{Math.min(
						app.currentSentenceIndex + 1,
						lesson.currentLesson.sentences.length,
					)} / {lesson.currentLesson.sentences.length}
				</span>
			{/if}
			<span class="script-toggle-arrow" class:open={showScript}>▼</span>
		</button>

		<div class="chat-wrapper">
			<!-- Lesson Progress Bar -->
			{#if lesson.currentLesson && !exam.isExamMode}
				{@const total = lesson.currentLesson.sentences.length}
				{@const current = Math.min(app.currentSentenceIndex, total)}
				<div class="lesson-progress">
					<div
						class="lesson-progress-fill"
						style="width: {total > 0
							? Math.round((current / total) * 100)
							: 0}%"
					></div>
				</div>
			{/if}

			<!-- Content row: chat + sidebar side-by-side (desktop only) -->
			<div class="chat-body">
				<div class="chat-main">
					<!-- Current Sentence Area (one sentence at a time, centered) -->
					<div
						class="chat-history"
						bind:this={chatHistoryEl}
						role="log"
						aria-live="polite"
						aria-label="Current sentence"
					>
						{#each systemMessages as msg}
							<div class="message system">
								<div class="text">{msg}</div>
							</div>
						{/each}

						<!-- Exam Progress Bar -->
						{#if exam.isExamMode}
							<div class="exam-progress-bar">
								<div
									class="exam-progress-fill"
									style="width: {examProgressTotal > 0
										? Math.round(
												(examProgressCurrent /
													examProgressTotal) *
													100,
											)
										: 0}%"
								></div>
							</div>
						{/if}

						<!-- Chat bubbles (conversation mode dialogue history) -->
						{#each chatMessages as msg (msg.id)}
							{#if msg.type === "system"}
								<div class="message system">{msg.text}</div>
							{:else}
								<div
									class="message {msg.type}"
									role="button"
									tabindex="0"
									onclick={() =>
										handleMessageBubbleClick(msg.text)}
									onkeydown={(e) =>
										e.key === "Enter" &&
										handleMessageBubbleClick(msg.text)}
								>
									{msg.text}
								</div>
							{/if}
						{/each}

						<!-- Exam Question -->
						{#if examQuestionData}
							<div
								class="message received"
								style="border-left: 4px solid {examTypeColor(
									examQuestionData.type,
								)}"
							>
								<div class="avatar">🎓</div>
								<div class="content">
									<div
										class="sub-text"
										style="font-size:0.75em; color:{examTypeColor(
											examQuestionData.type,
										)}; font-weight:bold; margin-bottom:4px;"
									>
										{examTypeLabel(
											examQuestionData.type,
											examQuestionData.language === "fa",
										)}
									</div>
									<div
										class="text"
										style={examQuestionData.language ===
											"fa" &&
										(examQuestionData.type === "speak" ||
											examQuestionData.type === "listen")
											? "direction:rtl;"
											: ""}
									>
										{examQuestionData.prompt}
									</div>
									{#if examQuestionData.options}
										<div class="choice-options">
											{#each examQuestionData.options as opt, i}
												<button
													class="choice-btn"
													class:correct={choiceAnswered !==
														-1 &&
														i ===
															examQuestionData.correctIndex}
													class:wrong={choiceAnswered ===
														i &&
														i !==
															examQuestionData.correctIndex}
													disabled={choiceAnswered !==
														-1}
													style={examQuestionData.type ===
														"meaning" &&
													examQuestionData.language ===
														"fa"
														? "direction:rtl; text-align:right;"
														: ""}
													onclick={() =>
														handleChoiceTap(i)}
												>
													{opt}
												</button>
											{/each}
										</div>
									{/if}
									<div
										class="sub-text"
										style="font-size:0.8em; color:var(--ink-soft);"
									>
										{examQuestionData.language === "fa"
											? `سوال ${examQuestionData.questionNumber} از ${examQuestionData.totalQuestions}`
											: `Question ${examQuestionData.questionNumber}/${examQuestionData.totalQuestions}`}
									</div>
									{#if exam.isReviewMode}
										<button
											class="btn-remove-review"
											onclick={handleRemoveFromReview}
										>
											{examQuestionData.language === "fa"
												? "🗑️ حذف از مرور"
												: "🗑️ Remove"}
										</button>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Conversation: your turn — pick a reply and say it -->
						{#if convOptions}
							<div class="conv-panel">
								<div class="conv-title">
									{prefs.language === "fa"
										? "🎙️ نوبت توست — یکی را انتخاب کن و بگو:"
										: "🎙️ Your turn — say one of these:"}
								</div>
								{#each convOptions as opt}
									<div class="conv-option">
										<div class="conv-german">
											{opt.german}
										</div>
										<div
											class="conv-translation"
											style="direction:{prefs.language ===
											'fa'
												? 'rtl'
												: 'ltr'};"
										>
											{opt.translation}
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Correct Feedback Banner -->
						{#if voiceResult?.isCorrect}
							<div class="correct-banner">
								{prefs.language === "fa"
									? "✅ آفرین!"
									: "✅ Correct!"}
							</div>
						{/if}

						<!-- Teach Bubble -->
						{#if currentTeachStep}
							{@const words = createInteractiveWords(
								currentTeachStep.germanText,
							)}
							<div class="message instruction">
								{#if currentTeachStep.difficulty}
									<span
										class="difficulty-badge difficulty-{currentTeachStep.difficulty}"
										>{currentTeachStep.difficulty}</span
									>
								{/if}
								<div
									class="translation-line"
									style="direction:{currentTeachStep.language ===
									'fa'
										? 'rtl'
										: 'ltr'};"
								>
									{currentTeachStep.translationText}
								</div>
								<div class="german-line">
									<span class="teach-text">
										{#if prefs.blindMode}
											<span
												style="color:var(--ink-faint); font-weight:normal;"
											>
												{currentTeachStep.language ===
												"fa"
													? "🙈 [مخفی] - گوش کن!"
													: "🙈 [Hidden] - Listen!"}
											</span>
										{:else}
											{#each words as w, i}
												<!-- svelte-ignore a11y_interactive_supports_focus -->
												<span
													class="interactive-word"
													class:reading={i ===
														spokenWordIndex}
													class:success={voiceResult &&
														voiceResult
															.matchedWordIndices?.[
															i
														] === true}
													class:error={voiceResult &&
														voiceResult.isCorrect ===
															false &&
														voiceResult
															.matchedWordIndices?.[
															i
														] === false}
													role="button"
													tabindex="0"
													aria-label="{w.word}{w.meaning
														? `, meaning: ${w.meaning}`
														: ''}"
													data-meaning={w.meaning ||
														undefined}
													onclick={(e) =>
														handleWordClick(
															w.word,
															w.meaning,
															e,
														)}
													onkeydown={(e) => {
														if (
															e.key === "Enter" ||
															e.key === " "
														) {
															e.preventDefault();
															handleWordClick(
																w.word,
																w.meaning,
																e as any,
															);
														}
													}}>{w.word}</span
												>{" "}
											{/each}
										{/if}
									</span>
								</div>
								<div class="teach-actions">
									<!-- One button, two jobs. While audio is playing it
									     STOPS it, so the name has to say so — the
									     waveform alone told a screen reader nothing,
									     and the label still said "Replay". -->
									<button
										class="btn-replay"
										class:speaking={isSpeaking}
										onclick={handleSpeakerClick}
										aria-label={isSpeaking
											? currentTeachStep.language === "fa"
												? "توقف صدا"
												: "Stop audio"
											: currentTeachStep.language === "fa"
												? "پخش دوباره"
												: "Replay audio"}
									>
										{#if isSpeaking}
											<span class="audio-wave" aria-hidden="true">
												<span></span><span></span><span
												></span><span></span><span
												></span>
											</span>
											<span class="sr-only">
												{currentTeachStep.language === "fa"
													? "توقف"
													: "Stop"}
											</span>
										{:else}
											{currentTeachStep.language === "fa"
												? "🔊 دوباره"
												: "🔊 Replay"}
										{/if}
									</button>
									{#if currentTeachStep.role === "sent" && (currentTeachStep.hint || currentTeachStep.hintFa)}
										<button
											class="btn-hint"
											onclick={() =>
												(showHint = !showHint)}
											aria-label="Toggle hint"
										>
											💡 {currentTeachStep.language ===
											"fa"
												? "راهنما"
												: "Hint"}
										</button>
									{/if}
									<!-- The ladder for the sentence on screen,
									     without hunting for it in the script. -->
									<button
										class="btn-practice"
										onclick={() =>
											openPractice(
												currentTeachStep!.germanText,
												currentTeachStep!
													.translationText,
											)}
									>
										🎯 {currentTeachStep.language === "fa"
											? "تمرین"
											: "Practice"}
									</button>
									<button
										class="btn-inline-next"
										onclick={() => manualNext()}
									>
										{currentTeachStep.language === "fa"
											? "بعدی ←"
											: "Next ➡"}
									</button>
								</div>
								{#if !exam.isExamMode && !exam.isReviewMode}
									<button
										class="btn-bookmark"
										class:bookmarked={bookmarkedSentences.has(
											currentSentenceKey,
										)}
										onclick={handleBookmarkSentence}
										aria-label={bookmarkedSentences.has(
											currentSentenceKey,
										)
											? "Remove bookmark"
											: "Bookmark sentence"}
									>
										{#if bookmarkedSentences.has(currentSentenceKey)}
											★
										{:else}
											☆
										{/if}
									</button>
								{/if}
								{#if showHint && currentTeachStep.role === "sent"}
									<div
										class="hint-text"
										dir={currentTeachStep.language === "fa"
											? "rtl"
											: "ltr"}
									>
										{currentTeachStep.language === "fa" &&
										currentTeachStep.hintFa
											? currentTeachStep.hintFa
											: (currentTeachStep.hint ?? "")}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Tap-to-build: assemble the sentence before saying it -->
						{#if buildStep}
							<div class="message system build-step">
								<div class="text">
									<div class="bs-head">
										<span class="bs-badge"
											>🧩 {buildStep.language === "fa"
												? "جمله را بچین"
												: "Build the sentence"}</span
										>
									</div>
									<p
										class="bs-prompt"
										dir={buildStep.language === "fa" ? "rtl" : "ltr"}
									>
										{buildStep.translation}
									</p>

									<!-- Answer row -->
									<div
										class="bs-answer"
										class:right={buildVerdict === "right"}
										class:wrong={buildVerdict === "wrong"}
										aria-live="polite"
									>
										{#if buildAnswer.length === 0}
											<span class="bs-placeholder">
												{buildStep.language === "fa"
													? "کلمه‌ها را به ترتیب بزن"
													: "Tap the words in order"}
											</span>
										{:else}
											{#each buildAnswer as tile (tile.id)}
												<button
													class="bs-tile placed"
													lang="de"
													onclick={() => removeTile(tile)}
													disabled={buildVerdict === "right"}
												>
													{tile.word}
												</button>
											{/each}
										{/if}
									</div>

									<!-- Tray -->
									{#if buildTray.length}
										<div class="bs-tray">
											{#each buildTray as tile (tile.id)}
												<button
													class="bs-tile"
													lang="de"
													onclick={() => placeTile(tile)}
												>
													{tile.word}
												</button>
											{/each}
										</div>
									{/if}

									<div class="bs-actions">
										{#if buildVerdict === "right"}
											<span class="bs-ok"
												>✓ {buildStep.language === "fa"
													? "درست!"
													: "Correct!"}</span
											>
										{:else}
											<button
												class="bs-check"
												onclick={checkBuild}
												disabled={buildTray.length > 0}
											>
												{buildStep.language === "fa" ? "بررسی" : "Check"}
											</button>
											{#if buildVerdict === "wrong"}
												<span class="bs-retry">
													{buildStep.language === "fa"
														? "هنوز نه — دوباره بچین."
														: "Not yet — try another order."}
												</span>
												<button class="bs-reveal" onclick={revealBuild}>
													{buildStep.language === "fa"
														? "نشانم بده"
														: "Show me"}
												</button>
											{/if}
											<button
												class="bs-skip"
												onclick={() => finishBuildStep(null)}
											>
												{buildStep.language === "fa" ? "رد کن" : "Skip"}
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/if}

						<!-- Grammar Moment (after the last sentence, before completion) -->
						{#if grammarMoment}
							<div class="message system grammar-moment">
								<div class="text">
									<div class="gm-head">
										<span class="gm-badge"
											>📘 {grammarMoment.language === "fa"
												? "نکتهٔ گرامری"
												: "Grammar moment"}</span
										>
									</div>
									<h3 class="gm-title">{grammarMoment.title}</h3>
									<p
										class="gm-explanation"
										dir={grammarMoment.language === "fa" ? "rtl" : "ltr"}
									>
										{grammarMoment.explanation}
									</p>
									{#if grammarMoment.examples.length}
										<ul class="gm-examples">
											{#each grammarMoment.examples as ex (ex.de)}
												<li>
													<button
														class="gm-play"
														onclick={() =>
															playAudioPromise(ex.de, 0.85, "de-DE")}
														aria-label="Play example"
													>
														🔊
													</button>
													<span class="gm-de">{ex.de}</span>
													{#if ex.gloss}
														<span
															class="gm-gloss"
															dir={grammarMoment.language === "fa"
																? "rtl"
																: "ltr"}>{ex.gloss}</span
														>
													{/if}
												</li>
											{/each}
										</ul>
									{/if}
									<div class="gm-actions">
										{#if grammarMoment.basicsKey}
											<a
												class="gm-basics"
												href="/basics/{grammarMoment.basicsKey}"
											>
												{grammarMoment.language === "fa"
													? "بیشتر در مبانی ←"
													: "More in Basics →"}
											</a>
										{/if}
										<button
											class="gm-continue"
											onclick={() => continueAfterGrammar()}
										>
											{grammarMoment.language === "fa"
												? "فهمیدم ←"
												: "Got it →"}
										</button>
									</div>
								</div>
							</div>
						{/if}

						<!-- Completion Card -->
						{#if completionData}
							<div class="message system completion-card">
								<div class="text" style="text-align:center;">
									<div
										style="font-size:2.5em; margin-bottom:10px;"
									>
										🎉
									</div>
									<h2 style="margin:0 0 5px; color:var(--leaf);">
										{completionData.language === "fa"
											? "\u0622\u0641\u0631\u06CC\u0646!"
											: "Well Done!"}
									</h2>
									<p style="color:var(--ink-soft); margin:0 0 8px;">
										{completionData.language === "fa"
											? `\u0631\u0648\u0632 ${app.currentDay} \u0631\u0627 \u062A\u0645\u0627\u0645 \u06A9\u0631\u062F\u06CC\u062F!`
											: `Day ${app.currentDay} complete!`}
									</p>
									<div class="completion-stats">
										{#if lesson.currentLesson}
											<span class="comp-stat"
												>{lesson.currentLesson.sentences
													.length}
												{completionData.language ===
												"fa"
													? "جمله"
													: "sentences"}</span
											>
										{/if}
										{#if app.completedLessons}
											<span class="comp-stat"
												>🔥 {computeStreak(
													app.completedLessons,
												)}-{completionData.language ===
												"fa"
													? "روز"
													: "day streak"}</span
											>
											<span class="comp-stat"
												>📚 {Object.keys(
													app.completedLessons,
												).length}
												{completionData.language ===
												"fa"
													? "روز کامل شده"
													: "days done"}</span
											>
										{/if}
									</div>
									{#if completionData.readinessBefore !== null && completionData.readinessAfter !== null}
										{@const delta =
											completionData.readinessAfter -
											completionData.readinessBefore}
										<div class="comp-readiness">
											🎓
											{completionData.language === "fa"
												? "آمادگی گوته"
												: "Goethe readiness"}:
											{#if delta > 0}
												<span class="cr-was"
													>{completionData.readinessBefore}</span
												>
												<span class="cr-now"
													>{completionData.readinessAfter}/100</span
												>
												<span class="cr-delta">+{delta}</span>
											{:else}
												<span class="cr-now"
													>{completionData.readinessAfter}/100</span
												>
											{/if}
										</div>
									{/if}
									{#if completionData.nextDay}
										<button
											class="next-day-btn"
											onclick={() =>
												goToNextDay(
													completionData!.nextDay!,
												)}
										>
											{completionData.language === "fa"
												? "\u062F\u0631\u0633 \u0628\u0639\u062F\u06CC"
												: "Next Lesson"} &rarr;
											<span
												style="font-weight:400; font-size:0.9em;"
												>{completionData.nextLessonTitle ||
													""}</span
											>
										</button>
									{:else}
										<p
											style="color:var(--ink-faint); margin-top:10px;"
										>
											{completionData.language === "fa"
												? "همه درس‌ها را تمام کردید! 🏆"
												: "All lessons completed! 🏆"}
										</p>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Exam Results -->
						{#if examResultsData}
							<div
								class="message system"
								style="background:{examResultsData.percentage >=
								80
									? 'var(--leaf-wash)'
									: 'var(--accent-wash)'}; padding:20px; border-radius:15px;"
							>
								<div class="text" style="text-align:center">
									<h2 style="margin:0">
										{#if examResultsData.percentage >= 80}
											{examResultsData.wasReview
												? examResultsData.language ===
													"fa"
													? "🎉 مرور عالی بود!"
													: "🎉 Great Review!"
												: examResultsData.language ===
													  "fa"
													? "🎉 آفرین!"
													: "🎉 Well Done!"}
										{:else}
											{examResultsData.wasReview
												? examResultsData.language ===
													"fa"
													? "🔄 ادامه بده!"
													: "🔄 Keep Going!"
												: examResultsData.language ===
													  "fa"
													? "📚 بیشتر تمرین کن"
													: "📚 Keep Practicing"}
										{/if}
									</h2>
									<div style="font-size:2em; margin:10px 0;">
										{examResultsData.score} / {examResultsData.total}
									</div>
									<p>{examResultsData.percentage}%</p>
									{#if !examResultsData.wasReview && examResultsData.percentage >= 80}
										<div class="exam-badge">
											🏅
											{examResultsData.language === "fa"
												? `آزمون هفته ${examResultsData.examWeek} را قبول شدی!`
												: `Week ${examResultsData.examWeek} Exam passed!`}
										</div>
									{/if}

									{#if examResultsData.wrongAnswers.length > 0}
										<div
											style="text-align:left; margin-top:15px; padding-top:15px; border-top:1px solid var(--line);"
										>
											<b
												>{examResultsData.language ===
												"fa"
													? "\u0645\u0631\u0648\u0631 \u0627\u0634\u062A\u0628\u0627\u0647\u0627\u062A:"
													: "Review mistakes:"}</b
											>
											{#each examResultsData.wrongAnswers as w}
												<div
													style="padding:6px 0; border-bottom:1px solid var(--line);"
												>
													<div
														style="color:var(--ink); font-weight:bold;"
													>
														{w.question.targetText}
													</div>
													<div
														style="color:var(--ink-soft); font-size:0.85em;"
													>
														{w.question.translation}
													</div>
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
						<div
							class="message-composer"
							aria-live="polite"
							aria-label="Your reply"
						>
							{@html answerLineHtml}
						</div>
						<button
							class="btn-send"
							class:pulse={app.isListening}
							style="background: {app.isListening
								? '#f44336'
								: 'var(--accent)'};"
							onclick={handleMicClick}
							aria-label={app.isListening
								? "Stop recording"
								: "Microphone - tap to record"}
						>
							{app.isListening ? "🛑" : "🎙️"}
						</button>
					</div>
				</div>
				<!-- end chat-main -->

				<!-- Script Panel -->
				<aside
					class="script-view"
					class:open={showScript}
					id="script-view"
				>
					<div class="script-header">
						<h3>
							{prefs.language === "fa"
								? "\u0645\u062A\u0646 \u062F\u0631\u0633"
								: "Lesson Script"}
						</h3>
						<div class="script-header-right">
							{#if lesson.currentLesson && !exam.isExamMode && !exam.isConversation}
								<span class="script-count"
									>{Math.min(
										app.currentSentenceIndex + 1,
										scriptItems.length,
									)}/{scriptItems.length}</span
								>
							{/if}
							<button
								class="script-close-btn"
								onclick={() => (showScript = false)}
								aria-label="Close script">✕</button
							>
						</div>
					</div>
					<div class="script-container" bind:this={scriptContainerEl}>
						{#if exam.isExamMode || exam.isConversation}
							<!-- The lesson script doesn't apply to exams or
							     Week Talks — the previous lesson's script
							     showing here was just confusing. -->
							<div class="script-empty">
								<p>
									{exam.isConversation
										? prefs.language === "fa"
											? "💬 گفتگو در جریان است — از چت دنبال کن."
											: "💬 Conversation in progress — follow the chat."
										: prefs.language === "fa"
											? "📝 آزمون در جریان است — متن درس پنهان است."
											: "📝 Exam in progress — the script stays hidden."}
								</p>
							</div>
						{:else if scriptItems.length === 0}
							<div class="script-empty">
								<p>
									Lesson script will appear here once you
									start.
								</p>
							</div>
						{/if}
						{#each exam.isExamMode || exam.isConversation ? [] : scriptItems as item, i}
							{@const mastery = masteryOf(item.german)}
							<div class="script-row">
								<!-- svelte-ignore a11y_interactive_supports_focus -->
								<div
									class="script-item"
									class:done={item.done}
									class:active={item.active}
									role="button"
									tabindex="0"
									aria-label="Sentence {i + 1}: {item.german}"
									onclick={() => handleScriptItemClick(i)}
									onkeydown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											handleScriptItemClick(i);
										}
									}}
								>
									<div class="script-num">
										{item.active ? "▶" : i + 1}
									</div>
									<div class="script-text">
										<div class="german">{item.german}</div>
										<div
											class="translation"
											style="direction: {prefs.language ===
											'fa'
												? 'rtl'
												: 'ltr'};"
										>
											{item.translation}
										</div>
									</div>
								</div>

								<div class="script-foot">
									<!-- Five dots = the weakest word in the
									     sentence, not an average. -->
									<span
										class="mastery"
										aria-label="Mastery {mastery} of 5"
									>
										{#each [0, 1, 2, 3, 4] as d}
											<span
												class="dot"
												class:lit={d < mastery}
											></span>
										{/each}
									</span>
									<button
										class="practice-link"
										onclick={() =>
											openPractice(
												item.german,
												item.translation,
											)}
									>
										{prefs.language === "fa"
											? "تمرین ←"
											: "Practice →"}
									</button>
								</div>
							</div>
						{/each}
					</div>
				</aside>

				<!-- Mobile: tap outside to close -->
				{#if showScript}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="script-backdrop"
						onclick={() => (showScript = false)}
					></div>
				{/if}
			</div>
			<!-- end chat-body -->
		</div>
		<!-- end chat-wrapper -->
	</main>
</div>

<!-- Word Tooltip -->
{#if wordTooltip}
	<div
		class="word-tooltip"
		style="left: {wordTooltip.x}px; top: {wordTooltip.y - 10}px;"
	>
		<span class="tooltip-meaning">{wordTooltip.meaning}</span>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="tooltip-bookmark"
			class:saved={savedWords.has(
				wordTooltip.word.toLowerCase().replace(/[.,!?]/g, ""),
			)}
			onclick={(e) => {
				e.stopPropagation();
				handleBookmarkWord();
			}}
			role="button"
			tabindex="-1"
		>
			{savedWords.has(
				wordTooltip.word.toLowerCase().replace(/[.,!?]/g, ""),
			)
				? "★"
				: "☆"}
		</span>
	</div>
{/if}

<style>
	:global(body) {
		background: var(--paper);
	}

	.start-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		background: rgba(15, 15, 26, 0.97);
		z-index: 10000;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		color: var(--ink);
	}

	.start-overlay h1 {
		font-size: 2rem;
		margin-bottom: 10px;
		font-family: var(--font-display);
		color: var(--ink);
	}

	.start-overlay p {
		margin: 20px 0;
		font-size: 1.2em;
	}

	.start-btn {
		padding: 15px 40px;
		font-size: 1.5em;
		background: var(--accent);
		color: var(--on-accent);
		border: none;
		border-radius: 50px;
		cursor: pointer;
		transition: all 0.3s;
	}

	.start-btn:hover {
		background: var(--accent);
		filter: brightness(1.06);
		transform: translateY(-2px);
	}

	.start-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	/* ── Overlay Preview ── */
	.overlay-preview {
		text-align: center;
		max-width: 380px;
		margin-bottom: 8px;
	}

	.overlay-title {
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--ink);
		font-family: var(--font-display);
		margin: 0 0 6px;
	}

	.overlay-desc {
		font-size: 0.9rem;
		color: var(--ink-soft);
		margin: 0 0 10px;
		line-height: 1.4;
	}

	.overlay-tags {
		display: flex;
		gap: 8px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.overlay-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 12px;
		background: var(--paper-sunken);
		color: var(--ink-soft);
	}

	.overlay-badge.difficulty-A1 {
		background: var(--leaf-wash);
		color: var(--leaf);
	}
	.overlay-badge.difficulty-A2 {
		background: rgba(49, 89, 122, 0.12);
		color: #5dade2;
	}
	.overlay-badge.difficulty-B1 {
		background: rgba(123, 75, 148, 0.12);
		color: #a569bd;
	}
	.overlay-badge.difficulty-B1plus {
		background: rgba(123, 75, 148, 0.12);
		color: #a569bd;
	}
	.overlay-badge.grammar-tag {
		background: var(--accent-wash);
		color: var(--accent-deep);
	}

	/* ── Completion Stats ── */
	.completion-stats {
		display: flex;
		gap: 16px;
		justify-content: center;
		margin: 10px 0;
	}

	.comp-stat {
		font-size: 0.85rem;
		color: var(--ink-soft);
		font-weight: 600;
	}

	/* ── Tap-to-build (retrieval ladder, stage 2) ── */
	.build-step .text {
		text-align: start;
		max-width: 560px;
	}

	.bs-head {
		margin-bottom: 8px;
	}

	.bs-badge {
		background: var(--accent-wash);
		color: var(--accent-deep);
		border-radius: 999px;
		padding: 3px 12px;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.bs-prompt {
		color: var(--ink-soft);
		font-size: 1.02rem;
		line-height: 1.6;
		margin: 0 0 12px;
	}

	/* The slot the learner fills. Dashed while empty so it reads as a target. */
	.bs-answer {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		min-height: 56px;
		padding: 10px 12px;
		border: 2px dashed var(--line);
		border-radius: 12px;
		background: var(--paper-sunken);
		margin-bottom: 12px;
		transition: border-color 0.15s, background 0.15s;
	}

	.bs-answer.right {
		border-style: solid;
		border-color: var(--leaf);
		background: var(--leaf-wash);
	}

	.bs-answer.wrong {
		border-style: solid;
		border-color: #e74c3c;
	}

	.bs-placeholder {
		color: var(--ink-faint);
		font-size: 0.92rem;
	}

	.bs-tray {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 14px;
	}

	.bs-tile {
		min-height: 44px;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1.5px solid var(--control-border);
		background: var(--control);
		color: var(--ink);
		font-family: inherit;
		font-size: 1.02rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.1),
			0 2px 0 var(--control-edge);
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.bs-tile:active {
		transform: translateY(2px);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.bs-tile.placed {
		border-color: var(--accent);
		background: var(--accent-wash);
		color: var(--accent-deep);
	}

	.bs-tile:disabled {
		cursor: default;
		opacity: 0.9;
	}

	.bs-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.bs-check {
		background: var(--accent);
		color: var(--on-accent);
		border: none;
		border-radius: 10px;
		min-height: 44px;
		padding: 11px 22px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.bs-check:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.bs-ok {
		color: var(--leaf);
		font-weight: 800;
		font-size: 1.05rem;
	}

	.bs-retry {
		color: #e74c3c;
		font-size: 0.9rem;
	}

	.bs-reveal,
	.bs-skip {
		background: none;
		border: none;
		color: var(--ink-faint);
		font-size: 0.9rem;
		text-decoration: underline;
		cursor: pointer;
		min-height: 44px;
		padding: 4px 6px;
	}

	.bs-skip {
		margin-inline-start: auto;
	}

	/* ── Grammar moment (end-of-lesson consolidation card) ── */
	.grammar-moment .text {
		text-align: start;
		max-width: 560px;
	}

	.gm-head {
		margin-bottom: 8px;
	}

	.gm-badge {
		background: var(--info-wash);
		color: var(--info);
		border-radius: 999px;
		padding: 3px 12px;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.gm-title {
		font-family: var(--font-display);
		font-size: 1.15rem;
		color: var(--ink);
		margin: 0 0 6px;
	}

	.gm-explanation {
		color: var(--ink-soft);
		line-height: 1.7;
		margin: 0 0 10px;
	}

	.gm-examples {
		list-style: none;
		padding: 0;
		margin: 0 0 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.gm-examples li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
		background: var(--paper-sunken);
		border-radius: 8px;
		padding: 7px 11px;
	}

	.gm-play {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0;
		line-height: 1;
	}

	.gm-de {
		font-weight: 700;
		color: var(--ink);
	}

	.gm-gloss {
		color: var(--ink-faint);
		font-size: 0.88rem;
	}

	.gm-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.gm-basics {
		color: var(--accent-deep);
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		border-bottom: 1px dotted var(--accent);
	}

	.gm-continue {
		background: var(--accent);
		color: var(--on-accent);
		border: none;
		border-radius: 10px;
		padding: 10px 20px;
		font-size: 0.98rem;
		font-weight: 700;
		cursor: pointer;
		margin-inline-start: auto;
	}

	/* Readiness delta on the completion card — the daily payoff moment. */
	.comp-readiness {
		display: inline-flex;
		align-items: baseline;
		gap: 7px;
		background: var(--leaf-wash);
		border-radius: 999px;
		padding: 6px 16px;
		margin: 10px 0 4px;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--ink-soft);
	}

	.cr-was {
		text-decoration: line-through;
		color: var(--ink-faint);
	}

	.cr-now {
		color: var(--leaf);
		font-weight: 800;
		font-size: 1.05rem;
	}

	.cr-delta {
		background: var(--leaf);
		color: var(--on-accent);
		border-radius: 999px;
		padding: 1px 9px;
		font-size: 0.8rem;
		font-weight: 800;
	}

	/* ── Script Empty ── */
	.script-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 120px;
		text-align: center;
		padding: 24px;
	}

	.script-empty p {
		color: var(--ink-soft);
		font-size: 0.88rem;
		line-height: 1.5;
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

	.lesson-toolbar-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		min-width: 0;
	}

	.lesson-toolbar-primary {
		flex: 1 1 320px;
		min-width: 240px;
	}

	.lesson-toolbar-options {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}

	.day-selection-control,
	.blind-mode-control,
	.language-control,
	.speed-control {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.lesson-toolbar-content select {
		min-height: 44px;
		color: var(--ink);
		background: var(--control);
		border: 1px solid var(--control-border);
		border-radius: 10px;
		padding: 7px 10px;
		font-family: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.lesson-toolbar-content select:hover,
	.lesson-toolbar-content select:focus-visible {
		border-color: var(--accent);
		outline: none;
	}

	.lesson-toolbar-content select option {
		background: var(--paper-raised);
		color: var(--ink);
	}

	/* Cap widths so the header stays on one row */
	.language-control select {
		min-width: 104px;
		max-width: 120px;
	}
	.speed-control select {
		max-width: 132px;
		min-width: 116px;
	}
	.day-selection-control select {
		width: min(100%, 360px);
		max-width: 360px;
	}

	.blind-mode-control {
		min-height: 44px;
		padding: 7px 10px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 10px;
		white-space: nowrap;
	}

	.blind-mode-control input {
		width: 16px;
		height: 16px;
		margin: 0;
		accent-color: var(--leaf);
	}

	.listener-mode-btn {
		min-height: 44px;
		padding: 7px 12px;
		border-radius: 10px;
		border: 1px solid var(--control-border);
		background: var(--control);
		color: var(--ink);
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.2s,
			border-color 0.2s;
	}
	.listener-mode-btn:hover {
		background: var(--accent-wash);
	}
	.listener-mode-btn.active {
		background: var(--leaf);
		border-color: var(--leaf);
		color: var(--on-accent);
	}

	.lesson-toolbar-content label {
		font-weight: 600;
		cursor: pointer;
		font-size: 0.84rem;
	}

	.progress-info {
		font-size: 0.85rem;
		opacity: 0.8;
	}

	/* Learning Area */
	.learning-area {
		flex: 1;
		min-height: 0;
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

	/* Row that holds chat content + sidebar (desktop) */
	.chat-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.chat-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--paper-raised);
		color: var(--ink);
	}

	/* Scenario dropdown bar */
	.scenario-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 14px;
		background: var(--paper-raised);
		color: var(--ink);
		cursor: pointer;
		user-select: none;
		border-bottom: 1px solid var(--line);
		gap: 8px;
	}

	.scenario-bar:hover {
		background: var(--paper-sunken);
	}

	.scenario-bar-title {
		font-size: 0.9rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 7px;
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.scenario-bar-chevron {
		font-size: 1.1rem;
		transition: transform 0.25s;
		flex-shrink: 0;
		opacity: 0.8;
	}

	.scenario-bar-chevron.open {
		transform: rotate(180deg);
	}

	.scenario-dropdown {
		background: var(--paper-sunken);
		padding: 10px 14px;
		border-bottom: 1px solid var(--line);
		animation: dropIn 0.18s ease-out;
	}

	@keyframes dropIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.scenario-drop-desc {
		margin: 0 0 6px;
		font-size: 0.82rem;
		color: var(--ink-soft);
		line-height: 1.5;
	}

	.scenario-drop-grammar {
		margin: 0;
		font-size: 0.78rem;
		color: var(--leaf);
	}

	.avatar-circle {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--paper-sunken);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.3rem;
	}

	.status {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	/* Current Sentence Area — one at a time, vertically centered */
	.chat-history {
		flex: 1;
		overflow-y: auto;
		padding: 24px 20px;
		/* Warm field with the faint cross pattern from the app screenshot,
		   so white message cards read as cards sitting on something. */
		background-color: var(--field);
		background-image:
			linear-gradient(var(--field-dot) 1.5px, transparent 1.5px),
			linear-gradient(90deg, var(--field-dot) 1.5px, transparent 1.5px);
		background-size: 44px 44px;
		background-position: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 16px;
	}

	/* Pushes messages toward the bottom when the chat is sparse */
	.chat-spacer {
		flex: 1;
	}

	.date-divider {
		text-align: center;
		color: var(--ink-soft);
		font-size: 0.8rem;
		padding: 8px;
		margin: 10px 0;
	}

	.message {
		max-width: 85%;
		padding: 14px 18px;
		/* Softly rounded white cards lifted off the field, as in the
		   screenshot — not tight chat bubbles. */
		border-radius: 16px;
		margin-bottom: 8px;
		font-size: 0.95rem;
		line-height: 1.5;
		word-wrap: break-word;
		align-self: flex-start;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.message.received {
		background: var(--paper-raised);
		border: 1px solid var(--line);
		color: var(--ink);
	}

	.message.sent {
		background: var(--leaf-wash);
		border: 1px solid var(--leaf);
		color: var(--ink);
		align-self: flex-end;
	}

	.message.system {
		background: var(--accent-wash);
		color: var(--accent-deep); /* dark warm brown — readable on the cream background */
		font-weight: 600;
		max-width: 95%;
		width: 95%;
		align-self: center;
		text-align: center;
		border-radius: 10px;
		padding: 15px;
		margin: 4px 0;
	}

	.message.instruction {
		background: var(--paper-raised);
		border: 1px solid var(--line);
		max-width: 540px;
		width: 100%;
		align-self: center;
		border-radius: 16px;
		padding: 24px 28px;
		margin: 0;
		box-shadow: var(--paper-shadow);
		position: relative;
	}

	.translation-line {
		font-size: 1.2em;
		color: var(--ink);
		margin-bottom: 5px;
	}

	.german-line {
		font-weight: bold;
		font-size: 1.1em;
		color: var(--ink-soft);
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
		padding: 2px 3px;
		border-radius: 4px;
		transition:
			background 0.2s,
			color 0.2s;
		display: inline; /* inline keeps natural word spacing */
		font-weight: 600; /* solid base; the read word goes heavier + darker */
	}

	.interactive-word:hover {
		background: var(--leaf-wash);
		color: var(--leaf);
	}

	.interactive-word.success {
		background: var(--leaf-wash);
		color: var(--leaf);
	}

	.interactive-word.error {
		background: rgba(231, 76, 60, 0.12);
		color: #e74c3c;
	}

	/* Karaoke — the word currently being read goes heavier and darker. */
	.interactive-word.reading {
		font-weight: 900;
		color: var(--ink);
	}

	.btn-inline-next {
		padding: 6px 16px;
		border-radius: 20px;
		border: none;
		background: var(--accent);
		color: var(--on-accent);
		cursor: pointer;
		font-weight: bold;
		font-size: 0.95em;
		transition: all 0.3s ease;
		white-space: nowrap;
	}

	.btn-inline-next:hover {
		transform: translateY(-1px);
		box-shadow: 0 3px 10px rgba(46, 204, 113, 0.3);
	}

	/* Completion Card */
	.completion-card {
		background: var(--paper-raised) !important;
		border: 1px solid var(--line) !important;
		box-shadow: var(--paper-shadow);
		border-radius: 15px !important;
		padding: 25px !important;
	}

	.next-day-btn {
		padding: 12px 30px;
		border-radius: 30px;
		border: none;
		background: var(--accent);
		color: var(--on-accent);
		cursor: pointer;
		font-size: 1.05rem;
		font-weight: 600;
		margin-top: 15px;
		transition: all 0.3s ease;
	}

	.next-day-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 20px rgba(46, 204, 113, 0.35);
	}

	/* Exam Progress */
	.exam-progress-bar {
		width: calc(100% - 20px);
		background: var(--line);
		border-radius: 10px;
		height: 8px;
		margin: 5px 10px;
	}

	.exam-progress-fill {
		background: var(--leaf);
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
		background: var(--paper-sunken);
		border-top: 1px solid var(--line);
	}

	.message-composer {
		flex: 1;
		padding: 10px 16px;
		/* Pill input on the white bar, matching the screenshot. */
		background: var(--paper-raised);
		border: 1px solid var(--line);
		color: var(--ink);
		border-radius: 999px;
		min-height: 44px;
		display: flex;
		align-items: center;
	}

	:global(.message-composer .placeholder-text) {
		color: var(--ink-soft);
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

	/* Lesson Progress Bar */
	.lesson-progress {
		position: relative;
		height: 4px;
		background: var(--line);
		overflow: visible;
		display: flex;
		align-items: center;
	}

	.lesson-progress-fill {
		height: 100%;
		background: var(--leaf);
		transition: width 0.4s ease;
		border-radius: 0 2px 2px 0;
	}

	.lesson-progress-text {
		position: absolute;
		right: 10px;
		font-size: 0.7rem;
		color: var(--ink-soft);
		font-weight: 600;
		white-space: nowrap;
	}

	/* Correct Feedback Banner */
	.correct-banner {
		text-align: center;
		padding: 8px 16px;
		background: var(--leaf-wash);
		color: var(--leaf);
		font-weight: 700;
		font-size: 1rem;
		border-radius: 20px;
		margin: 4px auto;
		width: fit-content;
		animation: popIn 0.2s ease-out;
	}

	/* Teach Actions Row */
	.teach-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
		flex-wrap: wrap;
	}

	.btn-replay {
		padding: 6px 16px;
		border-radius: 20px;
		border: 2px solid var(--accent);
		background: transparent;
		color: var(--accent);
		cursor: pointer;
		font-weight: bold;
		font-size: 0.95em;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-replay:hover {
		background: var(--accent);
		color: var(--on-accent);
	}

	.btn-replay.speaking {
		border-color: var(--accent);
	}

	.audio-wave {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		height: 16px;
	}

	.audio-wave span {
		display: block;
		width: 3px;
		height: 100%;
		background: var(--accent);
		border-radius: 2px;
		transform-origin: center;
		animation: wave-bar 0.7s ease-in-out infinite;
	}

	.audio-wave span:nth-child(1) {
		animation-delay: 0s;
	}
	.audio-wave span:nth-child(2) {
		animation-delay: 0.14s;
	}
	.audio-wave span:nth-child(3) {
		animation-delay: 0.28s;
	}
	.audio-wave span:nth-child(4) {
		animation-delay: 0.14s;
	}
	.audio-wave span:nth-child(5) {
		animation-delay: 0s;
	}

	@keyframes wave-bar {
		0%,
		100% {
			transform: scaleY(0.25);
		}
		50% {
			transform: scaleY(1);
		}
	}

	/* ── Practice mode ── */
	/* Practice owns the content area while it is open. Hiding the siblings
	   rather than unmounting them keeps the lesson's scroll and state, so
	   Back really does return to where the learner was. */
	.learning-area.practicing > :global(*:not(.practice-host)) {
		display: none;
	}

	.practice-host {
		padding: 16px;
		max-width: 640px;
		margin: 0 auto;
		width: 100%;
	}

	.btn-practice {
		min-height: 44px;
		padding: 6px 16px;
		border-radius: 20px;
		border: 2px solid var(--leaf-edge);
		background: var(--leaf);
		color: var(--on-accent);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--leaf-edge);
	}

	.btn-practice:active {
		transform: translateY(3px);
		box-shadow: none;
	}

	.script-row {
		border-bottom: 1px solid var(--line);
	}

	.script-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 0 12px 8px;
	}

	.mastery {
		display: inline-flex;
		gap: 4px;
	}

	.mastery .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--control-edge);
	}

	.mastery .dot.lit {
		background: var(--leaf);
	}

	.practice-link {
		min-height: 44px;
		padding: 6px 12px;
		border: none;
		background: none;
		color: var(--leaf);
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
	}

	.practice-link:hover {
		text-decoration: underline;
	}

	/* Hint button */
	.btn-hint {
		padding: 6px 16px;
		border-radius: 20px;
		border: 2px solid var(--accent-deep);
		background: transparent;
		color: var(--accent-deep);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-hint:hover {
		background: var(--accent-deep);
		color: var(--on-accent);
	}

	/* Bookmark button - Star */
	.btn-bookmark {
		position: absolute;
		bottom: 16px;
		right: 18px;
		font-size: 1.8rem;
		background: transparent;
		border: none;
		color: var(--ink-faint);
		cursor: pointer;
		padding: 4px;
		transition:
			transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
			color 0.2s;
		line-height: 1;
	}

	.btn-bookmark:hover {
		transform: scale(1.15);
		color: var(--accent-deep);
	}

	.btn-bookmark.bookmarked {
		color: var(--accent-deep);
	}

	.btn-bookmark.bookmarked:hover {
		transform: scale(1.15);
	}

	/* Remove from review button */
	.choice-options {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 10px 0;
	}

	.choice-btn {
		padding: 10px 14px;
		border: 2px solid var(--line);
		border-radius: 10px;
		background: var(--paper-raised);
		cursor: pointer;
		text-align: left;
		font-size: 0.95em;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.choice-btn:hover:not(:disabled) {
		border-color: var(--accent);
		background: var(--accent-wash);
	}

	.choice-btn:disabled {
		cursor: default;
	}

	.choice-btn.correct {
		border-color: var(--leaf);
		background: var(--leaf-wash);
		font-weight: bold;
	}

	.choice-btn.wrong {
		border-color: #e74c3c;
		background: rgba(231, 76, 60, 0.08);
	}

	.exam-badge {
		display: inline-block;
		padding: 8px 18px;
		margin-top: 8px;
		background: var(--accent-wash);
		border: 1px solid var(--accent-deep);
		border-radius: 20px;
		font-weight: bold;
	}

	/* ── Conversation mode (Week Talk) ── */
	.conv-panel {
		align-self: flex-end;
		max-width: 75%;
		background: var(--paper-raised);
		border: 2px dashed var(--accent);
		border-radius: 15px;
		padding: 14px 16px;
		margin: 8px 0;
	}

	.conv-title {
		font-size: 0.85em;
		font-weight: bold;
		color: var(--accent-deep);
		margin-bottom: 10px;
	}

	.conv-option {
		padding: 8px 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--paper-sunken);
	}

	.conv-option + .conv-option {
		margin-top: 8px;
	}

	.conv-german {
		font-weight: bold;
		color: var(--ink);
	}

	.conv-translation {
		font-size: 0.85em;
		color: var(--ink-soft);
		margin-top: 2px;
	}

	.btn-remove-review {
		padding: 5px 14px;
		border-radius: 20px;
		border: 2px solid #e74c3c;
		background: transparent;
		color: #e74c3c;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 8px;
	}

	.btn-remove-review:hover {
		background: #e74c3c;
		color: white;
	}

	.hint-text {
		margin-top: 8px;
		padding: 8px 12px;
		background: var(--accent-wash);
		border-left: 3px solid var(--accent);
		border-radius: 6px;
		font-size: 0.85rem;
		color: var(--accent-deep);
		line-height: 1.5;
	}

	/* Scenario description */
	.scenario-description {
		background: var(--accent-wash);
		border-left: 3px solid var(--accent);
		border-radius: 8px;
		padding: 10px 14px;
		margin: 0 0 8px;
		font-size: 0.85rem;
		color: var(--ink);
		line-height: 1.5;
		max-width: 540px;
		width: 100%;
		align-self: center;
		box-sizing: border-box;
	}

	/* Lesson meta tags (difficulty + grammar focus) */
	.lesson-meta-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}

	.difficulty-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.7rem;
		font-weight: bold;
		letter-spacing: 0.5px;
		color: white;
	}

	/* CEFR level colours */
	.difficulty-A1 {
		background: var(--leaf);
	}
	.difficulty-A1plus {
		background: rgba(88, 214, 141, 0.22);
	}
	.difficulty-A2 {
		background: #5dade2;
	}
	.difficulty-A2plus {
		background: rgba(93, 173, 226, 0.22);
	}
	.difficulty-B1 {
		background: #a569bd;
	}
	.difficulty-B1plus {
		background: rgba(165, 105, 189, 0.22);
	}

	.grammar-tag {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 10px;
		font-size: 0.7rem;
		background: var(--accent-wash);
		color: var(--accent-deep);
		max-width: 220px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Script Panel */
	.script-view {
		height: 28vh;
		background: var(--paper-raised);
		color: var(--ink);
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--line);
	}

	.script-header {
		padding: 10px 15px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--paper-sunken);
		border-bottom: 1px solid var(--line);
		flex-shrink: 0;
	}

	.script-header h3 {
		margin: 0;
		font-size: 0.88rem;
		color: var(--ink);
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.script-count {
		font-size: 0.75rem;
		color: var(--ink-soft);
		font-weight: 600;
	}

	.script-container {
		flex: 1;
		overflow-y: auto;
		padding: 8px 12px;
	}

	.script-item {
		padding: 8px 10px;
		border-radius: 8px;
		margin-bottom: 4px;
		cursor: pointer;
		transition:
			background 0.2s,
			border-color 0.2s;
		border-left: 3px solid transparent;
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}

	.script-item:hover {
		background: var(--paper-sunken);
	}

	.script-item.active {
		background: var(--accent-wash);
		border-left-color: var(--accent);
		border-left-width: 4px;
		box-shadow: 0 0 0 1px rgba(46, 204, 113, 0.3);
	}

	.script-item.done {
		opacity: 0.72;
	}

	.script-num {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--ink-faint);
		min-width: 18px;
		height: 18px;
		background: var(--paper-sunken);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.script-item.active .script-num {
		background: var(--accent);
		color: var(--on-accent);
		font-size: 0.7rem;
	}

	.script-item.done .script-num {
		background: var(--leaf-wash);
		color: var(--leaf);
	}

	.script-text {
		flex: 1;
		min-width: 0;
	}

	.script-item .german {
		font-weight: 700;
		color: var(--ink);
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.script-item .translation {
		color: var(--ink-soft);
		font-size: 0.78rem;
		margin-top: 2px;
		line-height: 1.3;
	}

	.script-item.active .german {
		color: var(--accent-deep);
	}

	.script-item.active .translation {
		color: var(--accent-deep);
	}

	/* Word Tooltip */
	.word-tooltip {
		position: fixed;
		transform: translateX(-50%) translateY(-100%);
		background: rgba(0, 0, 0, 0.9);
		color: #fff;
		padding: 6px 12px;
		border-radius: 8px;
		font-size: 0.85em;
		white-space: nowrap;
		z-index: 200;
		pointer-events: auto;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		animation: popIn 0.2s ease-out;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tooltip-bookmark {
		color: #888;
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0 2px;
		line-height: 1;
		transition:
			transform 0.2s,
			color 0.2s;
		user-select: none;
	}

	.tooltip-bookmark:hover {
		transform: scale(1.3);
	}

	.tooltip-bookmark.saved {
		color: #ffd700;
		text-shadow: 0 0 4px rgba(255, 215, 0, 0.5);
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

	/* ── Script header right side (count + close btn) ── */
	.script-header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.script-close-btn {
		display: none; /* shown only on mobile via media query */
		background: none;
		border: none;
		color: var(--ink-soft);
		font-size: 1rem;
		cursor: pointer;
		padding: 2px 6px;
		line-height: 1;
	}

	/* ── Mobile script toggle bar ─────────────────────────── */
	.script-toggle-btn {
		display: none; /* hidden on desktop */
	}

	.script-backdrop {
		display: none;
	}

	/* ── Desktop: right sidebar layout ───────────────── */
	@media (min-width: 768px) {
		/* Chat header stays full-width; sidebar only sits beside chat content */
		.chat-body {
			flex-direction: row;
		}

		.chat-main {
			flex: 1;
			min-width: 0;
		}

		.script-view {
			width: 300px;
			flex-shrink: 0;
			height: auto;
			overflow: hidden;
			border-top: none;
			border-left: 1px solid var(--line);
		}
	}

	/* ── Mobile: top-down dropdown drawer ──────────────────────── */
	@media (max-width: 767px) {
		/* Hide the static sidebar panel; become a slide-down drawer */
		.script-view {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			height: 65vh;
			z-index: 400;
			transform: translateY(-105%);
			transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
			border-top: none;
			border-radius: 0 0 18px 18px;
			box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
		}

		.script-view.open {
			transform: translateY(0);
		}

		/* Drag handle at bottom of drawer (now slides down) */
		.script-header::before {
			content: none;
		}

		.script-header {
			flex-direction: column;
			align-items: stretch;
		}

		.script-header > * {
			display: flex;
			align-items: center;
		}

		.script-header h3,
		.script-header-right {
			display: flex;
		}

		/* Show close × button inside drawer on mobile */
		.script-close-btn {
			display: flex;
		}

		/* Script toggle as full-width bar at the top of content */
		.script-toggle-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			width: 100%;
			/* Dark strip directly under the green band, as in the screenshot. */
			background: var(--strip);
			color: var(--on-strip);
			border: none;
			border-bottom: none;
			border-radius: 0;
			padding: 9px 16px;
			font-size: 0.85rem;
			font-weight: 600;
			cursor: pointer;
			flex-shrink: 0;
			box-shadow: none;
		}

		.script-toggle-count {
			background: rgba(255, 255, 255, 0.14);
			color: var(--leaf);
			border-radius: 10px;
			padding: 1px 6px;
			font-size: 0.75rem;
			font-weight: 700;
		}

		.script-toggle-arrow {
			font-size: 0.7rem;
			color: var(--leaf);
			transition: transform 0.3s;
		}

		.script-toggle-arrow.open {
			transform: rotate(180deg);
		}

		/* Backdrop behind open drawer */
		.script-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.35);
			z-index: 399;
		}
	}

	@media (max-width: 980px) {
		.lesson-toolbar-content {
			align-items: stretch;
			flex-wrap: wrap;
		}

		.lesson-toolbar-primary {
			flex-basis: 100%;
		}

		.day-selection-control select {
			width: 100%;
			max-width: none;
		}

		.lesson-toolbar-options {
			width: 100%;
			justify-content: flex-start;
		}
	}

	/* Responsive */
	@media (max-width: 600px) {
		.lesson-toolbar-content {
			flex-direction: column;
			gap: 8px;
		}

		.lesson-toolbar-primary {
			min-width: 0;
			width: 100%;
		}

		.day-selection-control {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			width: 100%;
		}

		.lesson-toolbar-options {
			display: grid;
			grid-template-columns: 56px 82px minmax(112px, 1fr) 92px;
			gap: 6px;
		}

		.language-control,
		.speed-control,
		.language-control select,
		.speed-control select,
		.listener-mode-btn {
			width: 100%;
			max-width: none;
			min-width: 0;
		}

		.blind-mode-control {
			justify-content: center;
			padding-inline: 6px;
		}

		.blind-mode-control label span {
			display: none;
		}

		.progress-info {
			display: none;
		}

		/* script-view is a fixed drawer on mobile — no height override needed */
	}

	@media (max-width: 360px) {
		.lesson-toolbar-options {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
