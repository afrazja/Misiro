/**
 * Lesson Controller — imperative state machine that orchestrates the lesson flow.
 * Ported from app.js processNextStep(), handleVoiceInput(), manualNext(), etc.
 *
 * This controller manages:
 * - Lesson initialization and state loading
 * - Step-by-step lesson progression with audio sequences
 * - Voice input evaluation
 * - Exam and review mode orchestration
 * - Session abort pattern (sessionID) for safe async cancellation
 */

import { get } from 'svelte/store';
import { appStore, type AppState, type CompletedLesson } from '$stores/app';
import { preferencesStore, type PreferencesState, type Language } from '$stores/preferences';
import { lessonStore, type Lesson, type Sentence } from '$stores/lesson';
import { examStore, type ExamQuestion, type WrongAnswer } from '$stores/exam';
import {
	loadLesson,
	loadLessons,
	loadGlossary,
	getLesson,
	getLessonIndex,
	getAllLoadedLessons,
	hasLesson
} from '$services/lesson-loader';
import { getLanguage, getVoiceSpeed, getCompletedLessons, saveProgress, saveCompletedLessons } from '$services/data-layer';
import { recordSRAttempt, getDueReviewItems } from '$services/spaced-repetition';
import { playAudioPromise, stopAllAudio } from '$services/tts';
import { playTone } from '$services/audio-context';
import { matchVoiceInput } from '$utils/text-matching';
import { getTranslation, getTranslationLang } from '$utils/i18n';
import { wait } from '$utils/wait';
import { saveExamResult } from '$services/data-layer';

// ============ EVENT CALLBACKS ============
// The controller emits events via callbacks that the Svelte page listens to.

export interface LessonCallbacks {
	onTeachStep: (step: TeachStepData) => void;
	onCompletionCard: (data: CompletionCardData) => void;
	onAnswerPrompt: (message: string) => void;
	onMessageBubble: (step: Sentence) => void;
	onScriptHighlight: (index: number) => void;
	onScriptMarkDone: (index: number) => void;
	onExamQuestion: (data: ExamQuestionData) => void;
	onExamFinished: (data: ExamResultsData) => void;
	onExamProgress: (current: number, total: number) => void;
	onSystemMessage: (text: string) => void;
	onClearChat: () => void;
	onVoiceResult: (result: VoiceResultData) => void;
}

export interface TeachStepData {
	germanText: string;
	translationText: string;
	language: Language;
	isBlindMode: boolean;
}

export interface CompletionCardData {
	language: Language;
	nextDay: number | null;
	nextLessonTitle: string | null;
	wasAlreadyCompleted: boolean;
}

export interface ExamQuestionData {
	type: 'listen' | 'speak';
	prompt: string;
	target: string;
	translation?: string;
	questionNumber: number;
	totalQuestions: number;
	language: Language;
}

export interface ExamResultsData {
	score: number;
	total: number;
	percentage: number;
	wasReview: boolean;
	language: Language;
	wrongAnswers: WrongAnswer[];
	examWeek: number;
}

export interface VoiceResultData {
	isCorrect: boolean;
	transcript: string;
	matchPercentage: number;
	matchedWordIndices?: boolean[];
}

// ============ CONTROLLER ============

let callbacks: LessonCallbacks | null = null;

export function setCallbacks(cb: LessonCallbacks) {
	callbacks = cb;
}

/** Get the current session ID for abort checking */
function getSessionID(): number {
	return get(appStore).sessionID;
}

/** Increment session ID to abort running async sequences */
export function incrementSession(): void {
	appStore.update((s) => ({ ...s, sessionID: s.sessionID + 1 }));
}

/** Check if a day is unlocked (Day 1 always open, Day N requires Day N-1 completed) */
export function isDayUnlocked(day: number): boolean {
	const d = parseInt(String(day));
	if (d === 1) return true;
	const completed = get(appStore).completedLessons;
	return !!(completed && completed[d - 1]);
}

// ============ INITIALIZATION ============

export async function initLesson(): Promise<void> {
	// Load saved language preference
	const savedLang = await getLanguage();
	if (savedLang === 'fa' || savedLang === 'en') {
		preferencesStore.update((s) => ({ ...s, language: savedLang as Language }));
	}

	// Load voice speed
	const savedSpeed = await getVoiceSpeed();
	if (savedSpeed !== null) {
		preferencesStore.update((s) => ({ ...s, voiceSpeed: savedSpeed }));
	}

	// Load completed lessons
	const completedLessons = await getCompletedLessons();
	const loadedLessons = getAllLoadedLessons();

	// Determine current day
	let currentDay = 1;
	let currentSentenceIndex = 0;
	const completedDays = Object.keys(completedLessons || {})
		.map(Number)
		.filter((d) => hasLesson(d));

	if (completedDays.length > 0) {
		const lastCompletedDay = Math.max(...completedDays);
		const nextDay = lastCompletedDay + 1;
		if (hasLesson(nextDay)) {
			currentDay = nextDay;
			currentSentenceIndex = 0;
		} else {
			currentDay = lastCompletedDay;
			// Will show completion card
			const lesson = getLesson(lastCompletedDay);
			currentSentenceIndex = lesson ? lesson.sentences.length : 0;
		}
	}

	appStore.update((s) => ({
		...s,
		currentDay,
		currentSentenceIndex,
		completedLessons: completedLessons || {}
	}));

	// Load current lesson and glossary
	lessonStore.update((s) => ({ ...s, isLoading: true }));
	const [lesson, glossary] = await Promise.all([loadLesson(currentDay), loadGlossary()]);

	lessonStore.update((s) => ({
		...s,
		currentLesson: lesson,
		glossary: glossary || {},
		isLoading: false
	}));
}

// ============ LESSON FLOW ============

export async function processNextStep(skipAudio = false): Promise<void> {
	const mySessionID = getSessionID();
	const app = get(appStore);
	const prefs = get(preferencesStore);
	const lessonState = get(lessonStore);
	const lesson = lessonState.currentLesson;

	if (!lesson) return;

	// Lesson complete?
	if (app.currentSentenceIndex >= lesson.sentences.length) {
		await handleLessonCompletion(lesson, app, prefs);
		return;
	}

	const currentStep = lesson.sentences[app.currentSentenceIndex];
	const germanText = currentStep.role === 'received' ? currentStep.audioText! : currentStep.targetText!;
	const translationText = getTranslation(currentStep, prefs.language);

	// Highlight script
	callbacks?.onScriptHighlight(app.currentSentenceIndex);

	// Show teach bubble
	callbacks?.onTeachStep({
		germanText,
		translationText,
		language: prefs.language,
		isBlindMode: prefs.blindMode
	});

	if (!skipAudio) {
		// Audio sequence: translation → pause → German
		await playAudioPromise(translationText, 1.1, getTranslationLang(prefs.language));
		if (getSessionID() !== mySessionID) return;
		await wait(300);
		if (getSessionID() !== mySessionID) return;

		await playAudioPromise(germanText, 0.8, 'de-DE');
		if (getSessionID() !== mySessionID) return;
	}

	// Prompt user
	const promptMsg =
		prefs.language === 'fa'
			? 'برای تمرین 🎙️ را بزنید یا بعدی.'
			: 'Tap 🎙️ to practice or Next to skip.';
	callbacks?.onAnswerPrompt(promptMsg);
}

async function handleLessonCompletion(
	lesson: Lesson,
	app: AppState,
	prefs: PreferencesState
): Promise<void> {
	const wasAlreadyCompleted = !!(app.completedLessons && app.completedLessons[app.currentDay]);

	if (!wasAlreadyCompleted) {
		const doneMsg = prefs.language === 'fa' ? '\u0622\u0641\u0631\u06CC\u0646! \u062F\u0631\u0633 \u062A\u0645\u0648\u0645 \u0634\u062F.' : 'Great job! You finished the lesson.';
		playAudioPromise(doneMsg, 1.0, getTranslationLang(prefs.language));
	}

	// Mark as completed
	const updatedCompleted = { ...app.completedLessons };
	updatedCompleted[app.currentDay] = {
		completedAt: Date.now(),
		sentenceCount: lesson.sentences.length
	};

	appStore.update((s) => ({ ...s, completedLessons: updatedCompleted }));
	await saveProgress(app.currentDay, app.currentSentenceIndex);
	await saveCompletedLessons(updatedCompleted);

	// Determine next day
	const nextDay = app.currentDay + 1;
	const hasNextLesson = hasLesson(nextDay);
	let nextLessonTitle: string | null = null;
	if (hasNextLesson) {
		const nextLessonData = getLesson(nextDay) || (await loadLesson(nextDay));
		if (nextLessonData) {
			nextLessonTitle =
				prefs.language === 'fa' && nextLessonData.titleFa
					? nextLessonData.titleFa
					: nextLessonData.title;
		}
	}

	callbacks?.onCompletionCard({
		language: prefs.language,
		nextDay: hasNextLesson ? nextDay : null,
		nextLessonTitle,
		wasAlreadyCompleted
	});
}

// ============ USER ACTIONS ============

export async function manualNext(): Promise<void> {
	const app = get(appStore);
	const lessonState = get(lessonStore);
	const lesson = lessonState.currentLesson;
	if (!lesson) return;

	const currentStep = lesson.sentences[app.currentSentenceIndex];
	if (!currentStep) return;

	// Abort any in-flight audio from the previous step
	incrementSession();
	stopAllAudio();

	// Add message bubble for skipped step
	callbacks?.onMessageBubble(currentStep);

	// Mark done and advance
	callbacks?.onScriptMarkDone(app.currentSentenceIndex);
	const nextIndex = app.currentSentenceIndex + 1;
	appStore.update((s) => ({ ...s, currentSentenceIndex: nextIndex }));
	await saveProgress(app.currentDay, nextIndex);
	await processNextStep();
}

export async function goToNextDay(nextDay: number): Promise<void> {
	incrementSession();
	stopAllAudio();

	appStore.update((s) => ({
		...s,
		currentDay: nextDay,
		currentSentenceIndex: 0
	}));

	const exam = get(examStore);
	if (exam.isExamMode) {
		examStore.update((s) => ({ ...s, isExamMode: false, isReviewMode: false }));
	}

	await saveProgress(nextDay, 0);
	const lesson = await loadLesson(nextDay);
	lessonStore.update((s) => ({ ...s, currentLesson: lesson, isLoading: false }));

	callbacks?.onClearChat();
	processNextStep();
}

export async function jumpToSentence(index: number): Promise<void> {
	incrementSession();
	stopAllAudio();

	appStore.update((s) => ({ ...s, currentSentenceIndex: index }));
	callbacks?.onClearChat();
	processNextStep();
}

export async function changeDay(day: number): Promise<void> {
	if (!isDayUnlocked(day)) return;
	const app = get(appStore);
	if (day === app.currentDay && !get(examStore).isExamMode) return;

	incrementSession();
	stopAllAudio();

	examStore.update((s) => ({ ...s, isExamMode: false, isReviewMode: false }));

	// Check if this day is completed
	const completedLessons = app.completedLessons;
	const selectedLesson = getLesson(day) || (await loadLesson(day));

	let sentenceIndex = 0;
	if (completedLessons && completedLessons[day] && selectedLesson) {
		sentenceIndex = selectedLesson.sentences.length; // Show completion card
	}

	appStore.update((s) => ({
		...s,
		currentDay: day,
		currentSentenceIndex: sentenceIndex
	}));

	await saveProgress(day, sentenceIndex);
	lessonStore.update((s) => ({ ...s, currentLesson: selectedLesson, isLoading: false }));

	callbacks?.onClearChat();
	processNextStep();
}

export async function changeLanguage(lang: Language): Promise<void> {
	incrementSession();
	stopAllAudio();

	preferencesStore.update((s) => ({ ...s, language: lang }));
	callbacks?.onClearChat();
	processNextStep();
}

// ============ VOICE INPUT ============

export async function handleVoiceInput(transcript: string): Promise<void> {
	const app = get(appStore);
	const prefs = get(preferencesStore);
	const exam = get(examStore);

	let targetGerman: string;
	const lessonState = get(lessonStore);
	const lesson = lessonState.currentLesson;
	const currentStep = !exam.isExamMode && lesson ? lesson.sentences[app.currentSentenceIndex] : null;

	if (exam.isExamMode) {
		const examQ = exam.examQuestions[exam.currentExamIndex];
		targetGerman = examQ ? examQ.targetText : '';
	} else {
		if (!currentStep) return;
		targetGerman = currentStep.role === 'received' ? currentStep.audioText! : currentStep.targetText!;
	}

	const result = matchVoiceInput(transcript, targetGerman, 0.8);

	callbacks?.onVoiceResult({
		isCorrect: result.isMatch,
		transcript,
		matchPercentage: result.matchPercentage,
		matchedWordIndices: result.targetWords.map((tw) =>
			result.userWords.some(
				(uw) => uw === tw || uw.includes(tw) || tw.includes(uw)
			)
		)
	});

	if (result.isMatch) {
		playTone('success');

		if (exam.isExamMode) {
			await handleExamCorrect(transcript);
		} else {
			await handleLessonCorrect(currentStep!, transcript);
		}
	} else {
		playTone('error');

		if (exam.isExamMode) {
			await handleExamIncorrect(targetGerman, transcript);
		} else {
			await handleLessonIncorrect(currentStep!, targetGerman, transcript);
		}
	}
}

async function handleLessonCorrect(step: Sentence, transcript: string): Promise<void> {
	const app = get(appStore);
	const prefs = get(preferencesStore);

	// Record SR success
	await recordSRAttempt(app.currentDay, step.id, true);

	// Show message bubble
	callbacks?.onMessageBubble(step);

	// Feedback
	await playAudioPromise('Good.', 1.2, 'en-US');

	// Abort any lingering audio before advancing
	incrementSession();
	stopAllAudio();

	// Advance
	callbacks?.onScriptMarkDone(app.currentSentenceIndex);
	const nextIndex = app.currentSentenceIndex + 1;
	appStore.update((s) => ({ ...s, currentSentenceIndex: nextIndex }));
	await saveProgress(app.currentDay, nextIndex);
	await processNextStep();
}

async function handleLessonIncorrect(step: Sentence, targetGerman: string, transcript: string): Promise<void> {
	const app = get(appStore);
	const prefs = get(preferencesStore);

	// Record SR failure
	await recordSRAttempt(app.currentDay, step.id, false);

	// Show what was heard
	const heardMsg = `Heard: "${transcript}"`;
	callbacks?.onAnswerPrompt(`<span style="color:red">${heardMsg}</span>`);

	// Replay target
	playAudioPromise(targetGerman, 0.8, 'de-DE');
}

// ============ EXAM SYSTEM ============

export async function startExam(week: number): Promise<void> {
	const prefs = get(preferencesStore);
	incrementSession();
	stopAllAudio();

	const startDay = (week - 1) * 7 + 1;
	const endDay = week * 7;

	// Load all lessons for this week
	const daysToLoad: number[] = [];
	for (let d = startDay; d <= endDay; d++) {
		if (hasLesson(d)) daysToLoad.push(d);
	}
	await loadLessons(daysToLoad);

	const pool: ExamQuestion[] = [];
	for (let d = startDay; d <= endDay; d++) {
		const lesson = getLesson(d);
		if (!lesson) continue;

		lesson.sentences.forEach((s) => {
			if (s.role === 'sent') {
				pool.push({
					type: 'speak',
					day: d,
					sentenceId: s.id,
					audioText: s.targetText || '',
					targetText: s.targetText || '',
					translation: prefs.language === 'fa' ? (s.translationFa || s.translation) : s.translation,
					translationFa: s.translationFa
				});
			} else if (s.role === 'received') {
				pool.push({
					type: 'listen',
					day: d,
					sentenceId: s.id,
					audioText: s.audioText || '',
					targetText: s.audioText || '',
					translation: prefs.language === 'fa' ? (s.translationFa || s.translation) : s.translation,
					translationFa: s.translationFa
				});
			}
		});
	}

	// Shuffle and pick up to 20
	const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 20);

	examStore.set({
		isExamMode: true,
		isReviewMode: false,
		examWeek: week,
		examQuestions: shuffled,
		currentExamIndex: 0,
		examScore: 0,
		examRetry: false,
		examWrongAnswers: []
	});

	callbacks?.onClearChat();

	const isFa = prefs.language === 'fa';
	const title = isFa ? `\u0622\u0632\u0645\u0648\u0646 \u0647\u0641\u062A\u0647 ${week} \u0634\u0631\u0648\u0639 \u0634\u062F!` : `Week ${week} Exam Started!`;
	callbacks?.onSystemMessage(title);

	processNextExamQuestion();
}

export async function startReviewMode(): Promise<void> {
	const prefs = get(preferencesStore);
	const dueItems = (await getDueReviewItems()).slice(0, 15);
	const isFa = prefs.language === 'fa';

	if (dueItems.length === 0) {
		const noMsg = isFa ? '\u0647\u06CC\u0686 \u0645\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u0645\u0631\u0648\u0631 \u0646\u06CC\u0633\u062A!' : 'No items due for review!';
		callbacks?.onSystemMessage(noMsg);
		return;
	}

	// Load needed lessons
	const uniqueDays = [...new Set(dueItems.map((item) => item.day))];
	await loadLessons(uniqueDays);

	const questions: ExamQuestion[] = [];
	for (const item of dueItems) {
		const lesson = getLesson(item.day);
		if (!lesson?.sentences) continue;

		const sentence = lesson.sentences.find((s) => s.id === item.sentenceId);
		if (!sentence) continue;

		if (sentence.role === 'sent') {
			questions.push({
				type: 'speak',
				day: item.day,
				sentenceId: item.sentenceId,
				audioText: sentence.targetText || '',
				targetText: sentence.targetText || '',
				translation: prefs.language === 'fa' ? (sentence.translationFa || sentence.translation) : sentence.translation,
				translationFa: sentence.translationFa
			});
		} else {
			questions.push({
				type: 'listen',
				day: item.day,
				sentenceId: item.sentenceId,
				audioText: sentence.audioText || '',
				targetText: sentence.audioText || '',
				translation: prefs.language === 'fa' ? (sentence.translationFa || sentence.translation) : sentence.translation,
				translationFa: sentence.translationFa
			});
		}
	}

	if (questions.length === 0) {
		const noMsg = isFa ? '\u0647\u06CC\u0686 \u0645\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u0645\u0631\u0648\u0631 \u0646\u06CC\u0633\u062A!' : 'No items due for review!';
		callbacks?.onSystemMessage(noMsg);
		return;
	}

	examStore.set({
		isExamMode: true,
		isReviewMode: true,
		examWeek: 0,
		examQuestions: questions,
		currentExamIndex: 0,
		examScore: 0,
		examRetry: false,
		examWrongAnswers: []
	});

	callbacks?.onClearChat();
	const title = isFa ? '🔄 مرور فاصله‌دار' : '🔄 Spaced Review';
	callbacks?.onSystemMessage(title);

	processNextExamQuestion();
}

function processNextExamQuestion(): void {
	const exam = get(examStore);
	const prefs = get(preferencesStore);

	examStore.update((s) => ({ ...s, examRetry: false }));

	if (exam.currentExamIndex >= exam.examQuestions.length) {
		finishExam();
		return;
	}

	callbacks?.onExamProgress(exam.currentExamIndex, exam.examQuestions.length);

	const q = exam.examQuestions[exam.currentExamIndex];
	callbacks?.onExamQuestion({
		type: q.type,
		prompt: q.type === 'listen' ? q.translation : (prefs.language === 'fa' ? (q.translationFa || q.translation) : q.translation),
		target: q.targetText,
		translation: q.translation,
		questionNumber: exam.currentExamIndex + 1,
		totalQuestions: exam.examQuestions.length,
		language: prefs.language
	});

	// Auto-play audio for listen questions
	if (q.type === 'listen') {
		const isFa = prefs.language === 'fa';
		const listenMsg = isFa ? '\u06AF\u0648\u0634 \u06A9\u0646...' : 'Listening...';
		callbacks?.onAnswerPrompt(listenMsg);
		playAudioPromise(q.audioText, 0.8, 'de-DE');
	} else {
		const isFa = prefs.language === 'fa';
		const speakMsg = isFa ? 'آلمانی بگو...' : 'Speak in German...';
		callbacks?.onAnswerPrompt(`🎙️ ${speakMsg}`);
	}
}

async function handleExamCorrect(transcript: string): Promise<void> {
	const exam = get(examStore);
	const prefs = get(preferencesStore);
	const q = exam.examQuestions[exam.currentExamIndex];

	// Track SR success
	if (q.day && q.sentenceId) {
		await recordSRAttempt(q.day, q.sentenceId, true);
	}

	examStore.update((s) => ({ ...s, examScore: s.examScore + 1 }));

	const correctMsg = prefs.language === 'fa' ? '\u062F\u0631\u0633\u062A\u0647!' : 'Correct!';
	callbacks?.onAnswerPrompt(`<span style="color:green">${correctMsg}</span>`);

	setTimeout(() => {
		examStore.update((s) => ({ ...s, currentExamIndex: s.currentExamIndex + 1 }));
		processNextExamQuestion();
	}, 1000);
}

async function handleExamIncorrect(targetGerman: string, transcript: string): Promise<void> {
	const exam = get(examStore);
	const prefs = get(preferencesStore);
	const q = exam.examQuestions[exam.currentExamIndex];
	const isFa = prefs.language === 'fa';

	if (!exam.examRetry) {
		// First attempt failed — allow retry
		examStore.update((s) => ({ ...s, examRetry: true }));
		const retryMsg = isFa ? '\u06CC\u06A9\u0628\u0627\u0631 \u062F\u06CC\u06AF\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646...' : 'Try once more...';
		callbacks?.onAnswerPrompt(`<span style="color:orange">${retryMsg}</span>`);
		playAudioPromise(targetGerman, 0.8, 'de-DE');
	} else {
		// Second attempt failed — move on
		examStore.update((s) => ({ ...s, examRetry: false }));

		// Track SR failure
		if (q.day && q.sentenceId) {
			await recordSRAttempt(q.day, q.sentenceId, false);
		}

		// Record wrong answer
		const wrongAnswer: WrongAnswer = {
			question: q,
			heard: transcript
		};
		examStore.update((s) => ({
			...s,
			examWrongAnswers: [...s.examWrongAnswers, wrongAnswer]
		}));

		const nextMsg = isFa ? '\u0633\u0648\u0627\u0644 \u0628\u0639\u062F\u06CC...' : 'Moving to next...';
		callbacks?.onAnswerPrompt(`<span style="color:red">${nextMsg}</span>`);

		setTimeout(() => {
			examStore.update((s) => ({ ...s, currentExamIndex: s.currentExamIndex + 1 }));
			processNextExamQuestion();
		}, 1500);
	}
}

async function finishExam(): Promise<void> {
	const exam = get(examStore);
	const prefs = get(preferencesStore);
	const wasReview = exam.isReviewMode;
	const totalQ = exam.examQuestions.length;
	const percentage = totalQ > 0 ? Math.round((exam.examScore / totalQ) * 100) : 0;

	callbacks?.onExamProgress(totalQ, totalQ);

	// Save exam results
	const weekKey = `week_${exam.examWeek}`;
	await saveExamResult(weekKey, {
		score: exam.examScore,
		total: totalQ,
		percentage,
		date: Date.now(),
		wrongAnswers: exam.examWrongAnswers.map((w) => ({
			prompt: w.question.translation,
			target: w.question.targetText,
			heard: w.heard
		}))
	});

	// Reset exam state
	examStore.update((s) => ({
		...s,
		isExamMode: false,
		isReviewMode: false
	}));

	callbacks?.onExamFinished({
		score: exam.examScore,
		total: totalQ,
		percentage,
		wasReview,
		language: prefs.language,
		wrongAnswers: exam.examWrongAnswers,
		examWeek: exam.examWeek
	});
}

// ============ DUE COUNT ============

export async function getDueCount(): Promise<number> {
	return (await getDueReviewItems()).length;
}
