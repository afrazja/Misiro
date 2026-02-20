/**
 * TTS Service — Text-to-Speech playback with proxy + browser fallback.
 * Ported from app.js audio functions.
 *
 * Strategy:
 * - Mobile: ALL languages → /proxy/tts proxy (speechSynthesis unreliable on phones)
 * - Desktop: German/Farsi → proxy; English → browser speechSynthesis with proxy fallback
 */

import { isMobile } from '$utils/device';
import { get } from 'svelte/store';
import { preferencesStore } from '$stores/preferences';

let currentAudio: HTMLAudioElement | null = null;
let ttsGeneration = 0; // incremented on stop — lets in-flight calls know they're stale

/** Stop ALL audio sources (browser TTS + proxy Audio element) */
export function stopAllAudio(): void {
	if (typeof window === 'undefined') return;

	ttsGeneration++; // invalidate any in-flight playback
	window.speechSynthesis?.cancel();
	if (currentAudio) {
		currentAudio.pause();
		currentAudio.removeAttribute('src');
		currentAudio.load();
		currentAudio = null;
	}
}

/** Browser speech synthesis fallback */
function _browserTTS(text: string, lang: string, rate?: number): Promise<void> {
	return new Promise((resolve) => {
		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(text);
		u.lang = lang === 'fa' ? 'fa-IR' : lang === 'en' ? 'en-US' : lang;
		const r = rate || 0.9;
		u.rate = isFinite(r) && r > 0 ? r : 1.0;

		let resolved = false;
		let mobileResumeTimer: ReturnType<typeof setInterval> | null = null;

		const done = () => {
			if (!resolved) {
				resolved = true;
				if (mobileResumeTimer) {
					clearInterval(mobileResumeTimer);
					mobileResumeTimer = null;
				}
				resolve();
			}
		};

		u.onend = done;
		u.onerror = done;

		if (isMobile()) {
			mobileResumeTimer = setInterval(() => {
				if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) {
					window.speechSynthesis.resume();
				}
			}, 5000);
		}

		// Safety timeout: never hang more than 10s
		setTimeout(done, 10000);
		window.speechSynthesis.speak(u);
	});
}

/** Play via same-origin Vercel serverless TTS proxy */
function playWebAudio(text: string, lang: string): Promise<void> {
	const shortLang = lang.split('-')[0];
	const url = `/proxy/tts?q=${encodeURIComponent(text)}&tl=${shortLang}`;
	const myGen = ttsGeneration; // snapshot — if it changes, we were cancelled

	return new Promise((resolve) => {
		if (currentAudio) {
			currentAudio.pause();
			currentAudio = null;
		}

		// Already stale? resolve immediately without playing
		if (myGen !== ttsGeneration) { resolve(); return; }

		let done = false;
		const finish = () => {
			if (!done) {
				done = true;
				resolve();
			}
		};
		const fallback = () => {
			if (done) return;
			// If cancelled while waiting, don't start browser TTS
			if (myGen !== ttsGeneration) { done = true; resolve(); return; }
			done = true;
			_browserTTS(text, lang).then(resolve);
		};

		const audio = new Audio(url);
		currentAudio = audio;
		audio.onerror = fallback;
		const timeout = setTimeout(fallback, 4000);
		audio.onended = () => {
			clearTimeout(timeout);
			finish();
		};
		audio.play().catch(fallback);
	});
}

/**
 * Play audio with the TTS routing strategy.
 * Returns a promise that resolves when playback finishes.
 *
 * @param text - Text to speak
 * @param rate - Playback rate multiplier (before voice speed preference)
 * @param lang - BCP-47 language code (e.g. 'de-DE', 'en-US', 'fa-IR')
 */
export function playAudioPromise(text: string, rate: number = 1.0, lang: string = 'de-DE'): Promise<void> {
	return new Promise((resolve) => {
		// Don't call stopAllAudio here — callers manage stop/cancel themselves
		const myGen = ttsGeneration;

		// On mobile: ALL languages → proxy
		if (isMobile()) {
			playWebAudio(text, lang).then(resolve);
			return;
		}

		// Desktop: German & Farsi → proxy
		if (lang.startsWith('de') || lang.startsWith('fa')) {
			playWebAudio(text, lang).then(resolve);
			return;
		}

		// Desktop English/other: try browser speech first
		const voices = window.speechSynthesis.getVoices();
		const hasNativeVoice = voices.some(
			(v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0])
		);

		if (!hasNativeVoice) {
			playWebAudio(text, lang).then(resolve);
			return;
		}

		// Apply user's voice speed preference
		const prefs = get(preferencesStore);
		const effectiveRate = rate * prefs.voiceSpeed;

		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(text);
		u.lang = lang;
		u.rate = effectiveRate;

		u.onend = () => resolve();
		u.onerror = () => {
			// If cancelled, don't fallback — just resolve
			if (myGen !== ttsGeneration) { resolve(); return; }
			// Fallback to proxy
			playWebAudio(text, lang).then(resolve);
		};

		window.speechSynthesis.speak(u);
	});
}

/**
 * Fire-and-forget audio playback (non-blocking).
 */
export function playAudio(text: string, rate: number = 1.0, lang: string = 'en-US'): void {
	playAudioPromise(text, rate, lang);
}
