<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { appStore } from '$stores/app';
	import { preferencesStore } from '$stores/preferences';
	import { examStore } from '$stores/exam';
	import {
		setCallbacks,
		startReviewMode,
		handleVoiceInput as controllerHandleVoice,
		skipAndRemoveReviewItem,
		type ExamQuestionData,
		type ExamResultsData,
		type VoiceResultData
	} from '$services/lesson-controller';
	import { stopAllAudio } from '$services/tts';
	import { unlockAudioContext } from '$services/audio-context';
	import { initSpeechRecognition, setVoiceInputHandler, toggleMic, stopListening } from '$services/speech';

	// ============ STATE ============
	let showOverlay = $state(true);
	let isReady = $state(true);
	let answerLineHtml = $state('<span class="placeholder-text">Tap the microphone to reply...</span>');
	let examQuestionData: ExamQuestionData | null = $state(null);
	let examResultsData: ExamResultsData | null = $state(null);
	let examProgressCurrent = $state(0);
	let examProgressTotal = $state(0);
	let voiceResult: VoiceResultData | null = $state(null);

	const app = $derived($appStore);
	const prefs = $derived($preferencesStore);
	const exam = $derived($examStore);

	function setupCallbacks() {
		setCallbacks({
			onTeachStep() {},
			onCompletionCard() {},
			onMessageBubble() {},
			onScriptHighlight() {},
			onScriptMarkDone() {},
			onClearChat() {
				examQuestionData = null;
				examResultsData = null;
				voiceResult = null;
				answerLineHtml = '<span class="placeholder-text">Tap the microphone to reply...</span>';
			},
			onSystemMessage(text) {},
			onExamQuestion(data) {
				examQuestionData = data;
				examResultsData = null;
				voiceResult = null;
			},
			onExamFinished(data) {
				examQuestionData = null;
				voiceResult = null;
				examResultsData = data;
			},
			onExamProgress(current, total) {
				examProgressCurrent = current;
				examProgressTotal = total;
			},
			onVoiceResult(result) {
				voiceResult = result;
			},
			onAnswerPrompt(message) {
				answerLineHtml = message;
			}
		});
	}

	function handleStart() {
		showOverlay = false;
		unlockAudioContext();
		startReviewMode();
	}

	function handleMicClick() {
		toggleMic();
	}

	async function handleRemoveFromReview() {
		await skipAndRemoveReviewItem();
	}

	onMount(() => {
		setupCallbacks();
		initSpeechRecognition();
		setVoiceInputHandler((transcript: string) => {
			controllerHandleVoice(transcript);
		});
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			stopAllAudio();
			stopListening();
		}
	});
</script>

<svelte:head>
	<title>Mirifer - Review Quiz</title>
</svelte:head>

<!-- Audio Unlock Overlay -->
{#if showOverlay}
	<div class="start-overlay">
		<div class="overlay-content">
			<div class="icon">🔄</div>
			<h1>{prefs.language === 'fa' ? 'آماده برای مرور؟' : 'Ready to Review?'}</h1>
			<p>{prefs.language === 'fa' ? 'جملاتی که ذخیره کرده‌اید را تمرین کنید.' : 'Practice the sentences you\'ve saved.'}</p>
			<button class="start-btn" onclick={handleStart}>
				{prefs.language === 'fa' ? '▶ شروع آزمون' : '▶ Start Quiz'}
			</button>
			<a href="/review" class="cancel-link">{prefs.language === 'fa' ? 'بازگشت' : 'Cancel'}</a>
		</div>
	</div>
{/if}

<div class="container" class:hidden={showOverlay}>
	<!-- Header -->
	<header class="header">
		<a href="/review" class="back-btn">&larr; {prefs.language === 'fa' ? 'بازگشت' : 'Back'}</a>
		<h1>🔄 {prefs.language === 'fa' ? 'آزمون مرور' : 'Review Quiz'}</h1>
	</header>

	<!-- Main Learning Area -->
	<main class="quiz-area">
		<div class="quiz-content">
			<!-- Exam Progress Bar -->
			<div class="exam-progress-bar">
				<div class="exam-progress-fill" style="width: {examProgressTotal > 0 ? Math.round((examProgressCurrent / examProgressTotal) * 100) : 0}%"></div>
			</div>

			<!-- Exam Question -->
			{#if examQuestionData}
				<div class="message received" style="border-left: 4px solid {examQuestionData.type === 'listen' ? '#FF9800' : '#2196F3'}">
					<div class="avatar">🎓</div>
					<div class="content">
						<div class="sub-text">
							{examQuestionData.type === 'listen'
								? (examQuestionData.language === 'fa' ? '🎧 گوش کن و تکرار کن' : '🎧 Listen & Repeat')
								: (examQuestionData.language === 'fa' ? '🗣️ به آلمانی بگو' : '🗣️ Say in German')}
						</div>
						<div class="text" style="{examQuestionData.language === 'fa' ? 'direction:rtl;' : ''}">{examQuestionData.prompt}</div>
						<div class="question-count">
							{examQuestionData.language === 'fa'
								? `سوال ${examQuestionData.questionNumber} از ${examQuestionData.totalQuestions}`
								: `Question ${examQuestionData.questionNumber}/${examQuestionData.totalQuestions}`}
						</div>
						<button class="btn-remove-review" onclick={handleRemoveFromReview}>
							{examQuestionData.language === 'fa' ? '🗑️ حذف از مرور' : '🗑️ Remove from review'}
						</button>
					</div>
				</div>
			{/if}

			<!-- Feedback Banner -->
			{#if voiceResult?.isCorrect}
				<div class="correct-banner">
					{prefs.language === 'fa' ? '✅ آفرین!' : '✅ Correct!'}
				</div>
			{/if}

			<!-- Exam Results -->
			{#if examResultsData}
				<div class="message system results-card" style="background:{examResultsData.percentage >= 80 ? '#e8f5e9' : '#fff3e0'};">
					<div class="results-text">
						<h2 style="margin:0">
							{#if examResultsData.percentage >= 80}
								{examResultsData.language === 'fa' ? '🎉 مرور عالی بود!' : '🎉 Great Review!'}
							{:else}
								{examResultsData.language === 'fa' ? '🔄 ادامه بده!' : '🔄 Keep Going!'}
							{/if}
						</h2>
						<div class="score">{examResultsData.score} / {examResultsData.total}</div>
						<p>{examResultsData.percentage}%</p>

						{#if examResultsData.wrongAnswers.length > 0}
							<div class="mistakes-section">
								<b>{examResultsData.language === 'fa' ? 'مرور اشتباهات:' : 'Review mistakes:'}</b>
								{#each examResultsData.wrongAnswers as w}
									<div class="mistake-item">
										<div class="mistake-german">{w.question.targetText}</div>
										<div class="mistake-translation">{w.question.translation}</div>
									</div>
								{/each}
							</div>
						{/if}
						<a href="/review" class="done-btn">
							{examResultsData.language === 'fa' ? 'بازگشت به مرور' : 'Back to Review Due'}
						</a>
					</div>
				</div>
			{/if}
		</div>

		<!-- Interaction Area -->
		<div class="interaction-area" style="display:{examResultsData ? 'none' : 'flex'}">
			<div class="message-composer">
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
	</main>
</div>

<style>
	.start-overlay {
		position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
		background: rgba(0, 0, 0, 0.85); z-index: 10000;
		display: flex; justify-content: center; align-items: center;
		color: white; backdrop-filter: blur(5px);
	}
	.overlay-content {
		display: flex; flex-direction: column; align-items: center; text-align: center;
		background: rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.2); max-width: 400px;
	}
	.overlay-content .icon { font-size: 4rem; margin-bottom: 10px; }
	.overlay-content h1 { font-size: 1.8rem; margin: 0 0 10px 0; }
	.overlay-content p { color: rgba(255,255,255,0.8); margin: 0 0 25px 0; line-height: 1.5; }
	
	.start-btn {
		padding: 15px 40px; font-size: 1.25em; font-weight: bold; background: #4caf50;
		color: white; border: none; border-radius: 30px; cursor: pointer;
		transition: all 0.2s; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
	}
	.start-btn:hover { transform: translateY(-2px); background: #45a049; }
	
	.cancel-link {
		margin-top: 20px; color: rgba(255,255,255,0.6); text-decoration: none;
		font-size: 0.9rem; transition: color 0.2s;
	}
	.cancel-link:hover { color: white; }

	.hidden { display: none !important; }

	.container {
		display: flex; flex-direction: column; height: 100vh;
		background: #e5ddd5;
		background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc5' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
	}

	.header {
		display: flex; align-items: center; gap: 15px;
		padding: 12px 20px; background: #075e54; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
	}
	.back-btn {
		background: rgba(255,255,255,0.15); color: white; padding: 6px 14px;
		border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 0.9rem;
		transition: background 0.2s;
	}
	.back-btn:hover { background: rgba(255,255,255,0.25); }
	.header h1 { font-size: 1.2rem; margin: 0; font-weight: 600; }

	.quiz-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

	.quiz-content {
		flex: 1; overflow-y: auto; padding: 30px 20px;
		display: flex; flex-direction: column; align-items: center;
	}

	.exam-progress-bar {
		width: 100%; max-width: 600px; height: 8px;
		background: rgba(0,0,0,0.08); border-radius: 10px; margin-bottom: 30px;
	}
	.exam-progress-fill {
		background: #2196f3; height: 100%; border-radius: 10px; transition: width 0.3s;
	}

	.message {
		width: 100%; max-width: 600px; background: white; border-radius: 16px;
		padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); display: flex; gap: 16px;
	}

	.avatar { font-size: 2.5rem; align-self: flex-start; margin-top: -5px; }
	.content { flex: 1; }
	
	.sub-text { font-size: 0.85rem; font-weight: 700; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
	.text { font-size: 1.4rem; font-weight: 600; color: #222; line-height: 1.4; margin-bottom: 12px; }
	.question-count { font-size: 0.85rem; color: #888; margin-bottom: 16px; }

	.btn-remove-review {
		padding: 8px 16px; border-radius: 20px; border: 1px solid #e74c3c;
		background: transparent; color: #e74c3c; font-size: 0.85rem; font-weight: 600;
		cursor: pointer; transition: all 0.2s;
	}
	.btn-remove-review:hover { background: #e74c3c; color: white; }

	.correct-banner {
		text-align: center; padding: 12px 30px; background: #e8f5e9; color: #2e7d32;
		font-weight: 700; font-size: 1.2rem; border-radius: 30px; margin: 15px auto;
		box-shadow: 0 4px 10px rgba(46, 125, 50, 0.1); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.results-card { display: block; flex-direction: column; align-items: center; padding: 40px 30px; margin-top: 10px;}
	.results-text { text-align: center; width: 100%; }
	.score { font-size: 2.8rem; font-weight: 800; margin: 15px 0 5px; color: #333; }
	.mistakes-section {
		text-align: left; margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.1);
	}
	.mistake-item { padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
	.mistake-item:last-child { border-bottom: none; }
	.mistake-german { color: #333; font-weight: bold; font-size: 1.05rem; margin-bottom: 4px; }
	.mistake-translation { color: #888; font-size: 0.9rem; }

	.done-btn {
		display: inline-block; padding: 14px 40px; border-radius: 30px; background: #4caf50;
		color: white; text-decoration: none; font-weight: bold; font-size: 1.1rem;
		margin-top: 25px; transition: transform 0.2s, background 0.2s; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
	}
	.done-btn:hover { transform: translateY(-2px); background: #43a047; }

	/* Input Area */
	.interaction-area {
		display: flex; align-items: center; gap: 15px; padding: 15px 20px;
		background: #f0f0f0; border-top: 1px solid #ddd;
	}

	.message-composer {
		flex: 1; padding: 15px 20px; background: white; border-radius: 30px;
		min-height: 24px; display: flex; align-items: center; overflow: hidden;
		box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
	}

	:global(.message-composer .placeholder-text) {
		color: #999; font-size: 1rem;
	}

	.btn-send {
		width: 60px; height: 60px; border-radius: 50%; border: none; color: white;
		font-size: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center;
		flex-shrink: 0; transition: transform 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
	}

	.btn-send.pulse { animation: pulse 1s infinite; }

	@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(244, 67, 54, 0.6); } }
	@keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>
