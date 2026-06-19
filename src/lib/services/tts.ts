/**
 * TTS Service — Text-to-Speech playback with proxy + browser fallback.
 * Ported from app.js audio functions.
 *
 * Strategy:
 * - Mobile: ALL languages → /proxy/tts proxy (speechSynthesis unreliable on phones)
 * - Desktop: German/Farsi → proxy; English → browser speechSynthesis with proxy fallback
 */

import { isMobile } from '$utils/device';
import { get, writable } from 'svelte/store';
import { preferencesStore } from '$stores/preferences';

let currentAudio: HTMLAudioElement | null = null;
let ttsGeneration = 0; // incremented on stop — lets in-flight calls know they're stale
/** Reactive flag — true while any TTS audio is playing */
export const ttsIsPlaying = writable(false);

/** Stop ALL audio sources (browser TTS + proxy Audio element) */
export function stopAllAudio(): void {
	if (typeof window === 'undefined') return;
	ttsIsPlaying.set(false);

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

/** Play via same-origin Vercel serverless TTS proxy.
 *  `onTime` (if given) is called with (currentTime, duration) on each animation
 *  frame during playback — used to drive karaoke-style word highlighting. */
function playWebAudio(
	text: string,
	lang: string,
	rate: number = 1.0,
	onTime?: (currentTime: number, duration: number) => void
): Promise<void> {
	const shortLang = lang.split('-')[0];
	const url = `/proxy/tts?q=${encodeURIComponent(text)}&tl=${shortLang}`;
	const myGen = ttsGeneration; // snapshot — if it changes, we were cancelled
	const safeRate = isFinite(rate) && rate > 0 ? rate : 1.0;

	return new Promise((resolve) => {
		if (currentAudio) {
			currentAudio.pause();
			currentAudio = null;
		}

		// Already stale? resolve immediately without playing
		if (myGen !== ttsGeneration) { resolve(); return; }

		let done = false;
		let rafId = 0;
		const stopTick = () => {
			if (rafId) {
				cancelAnimationFrame(rafId);
				rafId = 0;
			}
		};
		const finish = () => {
			if (!done) {
				done = true;
				stopTick();
				resolve();
			}
		};
		const fallback = () => {
			if (done) return;
			stopTick();
			// If cancelled while waiting, don't start browser TTS
			if (myGen !== ttsGeneration) { done = true; resolve(); return; }
			done = true;
			// Stop proxy audio before starting browser TTS to prevent double playback
			if (currentAudio) {
				currentAudio.pause();
				currentAudio = null;
			}
			_browserTTS(text, lang, safeRate).then(resolve);
		};

		const audio = new Audio(url);
		audio.playbackRate = safeRate;
		currentAudio = audio;
		audio.onerror = fallback;

		// Per-frame progress loop for word highlighting (only if a hook is given).
		const tick = () => {
			if (myGen !== ttsGeneration || audio.paused || audio.ended) {
				stopTick();
				return;
			}
			if (onTime && audio.duration) onTime(audio.currentTime, audio.duration);
			rafId = requestAnimationFrame(tick);
		};

		// Timeout is for load failures only — clear it once audio starts playing
		// so slow playback (low playbackRate) doesn't trigger a false fallback
		const timeout = setTimeout(fallback, 4000);
		audio.onplay = () => {
			clearTimeout(timeout);
			if (onTime) {
				stopTick();
				rafId = requestAnimationFrame(tick);
			}
		};
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
export function playAudioPromise(
	text: string,
	rate: number = 1.0,
	lang: string = 'de-DE',
	onTime?: (currentTime: number, duration: number) => void
): Promise<void> {
	ttsIsPlaying.set(true);
	const _p = new Promise<void>((resolve) => {
		// Don't call stopAllAudio here — callers manage stop/cancel themselves
		const myGen = ttsGeneration;

		// Apply user's voice speed preference to all paths
		const prefs = get(preferencesStore);
		const effectiveRate = rate * prefs.voiceSpeed;

		// On mobile: ALL languages → proxy
		if (isMobile()) {
			playWebAudio(text, lang, effectiveRate, onTime).then(resolve);
			return;
		}

		// Desktop: German & Farsi → proxy
		if (lang.startsWith('de') || lang.startsWith('fa')) {
			playWebAudio(text, lang, effectiveRate, onTime).then(resolve);
			return;
		}

		// Desktop English/other: try browser speech first
		const voices = window.speechSynthesis.getVoices();
		const hasNativeVoice = voices.some(
			(v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0])
		);

		if (!hasNativeVoice) {
			playWebAudio(text, lang, effectiveRate).then(resolve);
			return;
		}

		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(text);
		u.lang = lang;
		u.rate = effectiveRate;

		u.onend = () => resolve();
		u.onerror = () => {
			// If cancelled, don't fallback — just resolve
			if (myGen !== ttsGeneration) { resolve(); return; }
			// Fallback to proxy
			playWebAudio(text, lang, effectiveRate).then(resolve);
		};

		window.speechSynthesis.speak(u);
	});
	_p.finally(() => ttsIsPlaying.set(false));
	return _p;
}

/**
 * Fire-and-forget audio playback (non-blocking).
 */
export function playAudio(text: string, rate: number = 1.0, lang: string = 'en-US'): void {
	playAudioPromise(text, rate, lang);
}
