/**
 * Speech Recognition Service — wraps Web Speech API for German voice input.
 * Extracted from app.js voice recognition setup.
 */

import { playTone } from './audio-context';
import { appStore } from '$stores/app';
import { stopAllAudio } from './tts';

export type MicState = 'idle' | 'listening' | 'error';
export type VoiceInputHandler = (transcript: string) => void;

const SpeechRecognition =
	typeof window !== 'undefined'
		? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
		: null;

let recognition: any = null;
let onVoiceInput: VoiceInputHandler | null = null;
let onMicStateChange: ((state: MicState) => void) | null = null;

/**
 * Initialize speech recognition.
 * Call once when the lesson page mounts.
 */
export function initSpeechRecognition(): boolean {
	if (!SpeechRecognition) {
		console.warn('Web Speech API not supported in this browser');
		return false;
	}

	recognition = new SpeechRecognition();
	recognition.continuous = false;
	recognition.lang = 'de-DE';
	recognition.interimResults = false;
	recognition.maxAlternatives = 1;

	recognition.onstart = () => {
		appStore.update((s) => ({ ...s, isListening: true }));
		if (onMicStateChange) onMicStateChange('listening');
		playTone('start');
	};

	recognition.onend = () => {
		appStore.update((s) => ({ ...s, isListening: false }));
		if (onMicStateChange) onMicStateChange('idle');
	};

	recognition.onresult = (event: any) => {
		const transcript = event.results[0][0].transcript;
		if (onVoiceInput) onVoiceInput(transcript);
	};

	recognition.onerror = (event: any) => {
		console.error('Voice Error:', event.error);
		playTone('error');
		if (onMicStateChange) onMicStateChange('error');
	};

	return true;
}

/**
 * Set the callback for voice input results.
 */
export function setVoiceInputHandler(handler: VoiceInputHandler): void {
	onVoiceInput = handler;
}

/**
 * Set the callback for mic state changes.
 */
export function setMicStateChangeHandler(handler: (state: MicState) => void): void {
	onMicStateChange = handler;
}

/**
 * Toggle microphone on/off.
 */
export function toggleMic(): void {
	if (!recognition) return;

	let isListening = false;
	appStore.subscribe((s) => (isListening = s.isListening))();

	if (isListening) {
		recognition.stop();
	} else {
		stopAllAudio();
		try {
			recognition.start();
		} catch (e) {
			// Already started — ignore
			console.warn('Recognition start error:', e);
		}
	}
}

/**
 * Stop listening if currently active.
 */
export function stopListening(): void {
	if (!recognition) return;
	let isListening = false;
	appStore.subscribe((s) => (isListening = s.isListening))();
	if (isListening) {
		recognition.stop();
	}
}

/**
 * Start listening (if not already).
 */
export function startListening(): void {
	if (!recognition) return;
	let isListening = false;
	appStore.subscribe((s) => (isListening = s.isListening))();
	if (!isListening) {
		stopAllAudio();
		try {
			recognition.start();
		} catch {
			// Already started
		}
	}
}

/**
 * Whether speech recognition is supported in this browser.
 */
export function isSpeechSupported(): boolean {
	return !!SpeechRecognition;
}

/**
 * Cleanup — call when leaving the lesson page.
 */
export function destroySpeechRecognition(): void {
	if (recognition) {
		try {
			recognition.stop();
		} catch {
			// Ignore
		}
		recognition = null;
	}
	onVoiceInput = null;
	onMicStateChange = null;
}
