/**
 * Speech Recognition Service — German voice input.
 *
 * Primary engine: Web Speech API (instant, free, streaming) with up to 5
 * recognition alternatives exposed so matching can pick the best one.
 *
 * Fallback engine: MediaRecorder + /proxy/stt (server-side Whisper-class
 * transcription) for browsers without Web Speech (Firefox, many Android
 * webviews). Slightly slower (~1–2s) but works everywhere a mic works.
 */

import { playTone, getAudioContext } from './audio-context';
import { appStore } from '$stores/app';
import { stopAllAudio } from './tts';
import { trackEvent, trackObstacle } from './analytics';
import { logWarn } from '$utils/error';

export type MicState = 'idle' | 'listening' | 'processing' | 'error';
export type VoiceInputHandler = (transcript: string) => void;

const SpeechRecognition =
	typeof window !== 'undefined'
		? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
		: null;

let recognition: any = null;
let onVoiceInput: VoiceInputHandler | null = null;
let onMicStateChange: ((state: MicState) => void) | null = null;

/** All transcripts from the last recognition (primary first). */
let lastAlternatives: string[] = [];

// ── Fallback recorder state ──────────────────────────────────────────────
let usingFallback = false;
let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let recorderTimeout: ReturnType<typeof setTimeout> | null = null;

/** Max recording length for the STT fallback (safety + quota). */
const MAX_RECORD_MS = 15000;

// ── How long to wait for a learner ──
//
// These are generous on purpose. Being cut off mid-sentence is far worse
// than waiting an extra second: the learner loses the answer, gets marked
// wrong for it, and cannot tell whether their German or the app was at
// fault. Waiting too long costs a beat, and there is a tap-to-stop button
// for anyone impatient.
//
// A2/B1 sentences run long and beginners pause inside them — before a hard
// word, after an article, halfway through a compound noun.

/** Silence that ends an utterance, once they have started talking. */
const SPEECH_PAUSE_MS = 2000;
/** Silence allowed BEFORE they start, while they read and think. */
const SPEECH_LEAD_MS = 7000;
/** Absolute cap on one Web Speech utterance. */
const SPEECH_MAX_MS = 25000;

/**
 * Capture constraints for the fallback recorder.
 *
 * This used to be a bare `{ audio: true }`, which takes the browser's
 * defaults: no noise suppression, no gain normalisation, whatever channel
 * count the device feels like. Room noise and a quiet speaker both cost
 * transcription accuracy, and a learner blaming their German for a
 * recognizer that could not hear them is the worst failure mode this app
 * has.
 *
 * Only reaches the MediaRecorder path (Firefox, Android webviews). Web
 * Speech opens its own mic and does not let us near it.
 */
const MIC_CONSTRAINTS: MediaTrackConstraints = {
	echoCancellation: true,
	noiseSuppression: true,
	autoGainControl: true,
	channelCount: 1
};

// ── Voice activity detection ─────────────────────────────────────────────
/**
 * Silence after speech that ends the recording.
 *
 * Was 900ms, which cut people off mid-sentence — a pause that short is
 * ordinary inside a sentence a learner is still assembling. Matches the
 * Web Speech pause above so both engines feel the same.
 */
const SILENCE_MS = SPEECH_PAUSE_MS;
/** Never auto-stop before this, whatever the mic hears. */
const MIN_RECORD_MS = 2500;
/** How often to sample loudness. */
const VAD_POLL_MS = 100;
/** Window used to learn the room's noise floor before speech starts. */
const NOISE_FLOOR_MS = 300;
/** Absolute floor, so a silent room cannot set the bar at zero. */
const MIN_SPEECH_RMS = 0.015;

let vadTimer: ReturnType<typeof setInterval> | null = null;
let vadSource: MediaStreamAudioSourceNode | null = null;

function setListening(listening: boolean): void {
	appStore.update((s) => ({ ...s, isListening: listening }));
}

function emitState(state: MicState): void {
	if (onMicStateChange) onMicStateChange(state);
}

/**
 * Initialize speech recognition.
 * Call once when the lesson page mounts.
 * Returns true when SOME voice input engine is available.
 */
export function initSpeechRecognition(): boolean {
	if (!SpeechRecognition) {
		usingFallback = canUseRecorderFallback();
		if (usingFallback) {
			console.info('Web Speech API unavailable — using server STT fallback');
		} else {
			trackObstacle('mic_unavailable');
			console.warn('No voice input available in this browser');
		}
		return usingFallback;
	}

	recognition = new SpeechRecognition();
	// continuous = true is the whole fix for "it cuts me off mid-sentence".
	//
	// With continuous = false the browser decides when the learner is done,
	// and Chrome decides at the FIRST end-of-speech it detects. A beginner
	// reading a German sentence pauses — mid-clause, before a hard word,
	// after an article — and the recognizer treats that pause as the end,
	// submits half a sentence and stops listening. Combined with strict
	// scoring that reads as "wrong", for a sentence they were never allowed
	// to finish.
	//
	// So we keep the stream open and decide the endpoint ourselves, below.
	recognition.continuous = true;
	recognition.lang = 'de-DE';
	// Not for display — interim results are the only signal that says
	// "still talking", which is what resets the pause timer.
	recognition.interimResults = true;
	// Multiple hypotheses: the 2nd/3rd guess is often what the learner said.
	recognition.maxAlternatives = 5;

	recognition.onstart = () => {
		void trackEvent('mic_ready', { metadata: { engine: 'web_speech' } });
		resetUtterance();
		setListening(true);
		emitState('listening');
		playTone('start');
		// They have not started yet. Give them room to think before the
		// pause timer has anything to measure.
		armEndpoint(SPEECH_LEAD_MS);
		speechMaxTimer = setTimeout(() => finishRecognition(), SPEECH_MAX_MS);
	};

	recognition.onend = () => {
		clearEndpointTimers();
		setListening(false);
		emitState('idle');
		emitUtterance();
	};

	recognition.onresult = (event: any) => {
		// Any result at all — interim included — means they are still going.
		armEndpoint(SPEECH_PAUSE_MS);

		for (let r = event.resultIndex; r < event.results.length; r++) {
			const res = event.results[r];
			if (!res.isFinal) continue;

			const alternatives: string[] = [];
			for (let i = 0; i < res.length; i++) {
				const t = res[i]?.transcript?.trim();
				if (t) alternatives.push(t);
			}
			// NOTE: no hard confidence gate here — some browsers (notably
			// Chrome on Android) report confidence 0 for perfectly good
			// results, which used to reject every answer. The text matcher
			// is the arbiter.
			if (alternatives.length) chunkAlternatives.push(alternatives);
		}
	};

	recognition.onerror = (event: any) => {
		if (event.error !== 'no-speech' && event.error !== 'aborted') {
			trackObstacle(['not-allowed', 'service-not-allowed'].includes(event.error) ? 'mic_denied' : event.error === 'audio-capture' ? 'mic_unavailable' : 'speech_failed', { engine: 'web_speech' });
		}
		// 'no-speech' is the learner tapping the mic and saying nothing. It
		// is not an error worth a tone and a red state.
		if (event.error === 'no-speech' || event.error === 'aborted') {
			clearEndpointTimers();
			return;
		}
		console.error('Voice Error:', event.error);
		clearEndpointTimers();
		playTone('error');
		emitState('error');
	};

	return true;
}

// ── Endpointing for the Web Speech path ───────────────────────────

/** Final transcripts so far this utterance, one entry per recognized chunk. */
let chunkAlternatives: string[][] = [];
let endpointTimer: ReturnType<typeof setTimeout> | null = null;
let speechMaxTimer: ReturnType<typeof setTimeout> | null = null;
let utteranceEmitted = false;

function resetUtterance(): void {
	chunkAlternatives = [];
	utteranceEmitted = false;
}

function clearEndpointTimers(): void {
	if (endpointTimer) {
		clearTimeout(endpointTimer);
		endpointTimer = null;
	}
	if (speechMaxTimer) {
		clearTimeout(speechMaxTimer);
		speechMaxTimer = null;
	}
}

/** (Re)start the silence countdown that ends the utterance. */
function armEndpoint(ms: number): void {
	if (endpointTimer) clearTimeout(endpointTimer);
	endpointTimer = setTimeout(() => finishRecognition(), ms);
}

function finishRecognition(): void {
	clearEndpointTimers();
	// Tell the learner we heard them and are working, so the extra beat of
	// patience does not read as the app having missed the whole thing.
	emitState('processing');
	try {
		recognition?.stop();
	} catch {
		// Already stopped — onend still fires and emits.
	}
}

/**
 * Stitch recognized chunks into whole-sentence hypotheses.
 *
 * A sentence spoken with pauses arrives as several final results, and each
 * one carries its own alternatives. Joining alternative i across every chunk
 * keeps each hypothesis internally coherent, rather than mixing chunk 1's
 * best guess with chunk 2's fourth. A chunk with fewer alternatives falls
 * back to its own primary instead of dropping out and leaving a hole in the
 * middle of the sentence.
 *
 * Exported for tests — this is the part with the off-by-ones in it.
 */
export function stitchAlternatives(chunks: string[][], maxDepth = 5): string[] {
	const usable = chunks.filter((c) => c.length > 0);
	if (!usable.length) return [];

	const depth = Math.min(maxDepth, Math.max(...usable.map((c) => c.length)));
	const combined: string[] = [];
	for (let i = 0; i < depth; i++) {
		const text = usable
			.map((c) => c[i] ?? c[0])
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (text && !combined.includes(text)) combined.push(text);
	}
	return combined;
}

/** Hand the finished utterance to whoever is listening — exactly once. */
function emitUtterance(): void {
	if (utteranceEmitted) return;
	utteranceEmitted = true;

	const combined = stitchAlternatives(chunkAlternatives);
	if (!combined.length) return;

	lastAlternatives = combined;
	if (onVoiceInput) onVoiceInput(combined[0]);
}

/** Alternatives from the most recent recognition (primary first). */
export function getLastVoiceAlternatives(): string[] {
	return lastAlternatives;
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

// ── MediaRecorder → /proxy/stt fallback ─────────────────────────────────

function canUseRecorderFallback(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof MediaRecorder !== 'undefined' &&
		!!navigator.mediaDevices?.getUserMedia
	);
}

function pickMimeType(): string {
	const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
	for (const c of candidates) {
		if (MediaRecorder.isTypeSupported?.(c)) return c;
	}
	return '';
}

/**
 * Stop the recording once the learner stops talking.
 *
 * Without this the clip runs until they tap again: tap late and the audio is
 * padded with silence, tap early and the last word is cut off mid-syllable.
 * Both hurt the transcript, and the second one gets blamed on the learner.
 *
 * The threshold adapts to the room. A fixed one either misses quiet speakers
 * or never triggers in a noisy café, and "it works at my desk" is not a
 * standard this can be held to.
 */
function startVAD(stream: MediaStream): void {
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		vadSource = ctx.createMediaStreamSource(stream);
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		vadSource.connect(analyser);

		const buf = new Float32Array(analyser.fftSize);
		let elapsed = 0;
		let noiseFloor = 0;
		let floorSamples = 0;
		let hasSpoken = false;
		let quietFor = 0;

		vadTimer = setInterval(() => {
			analyser.getFloatTimeDomainData(buf);
			let sum = 0;
			for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
			const rms = Math.sqrt(sum / buf.length);
			elapsed += VAD_POLL_MS;

			// Learn the room first — but never let a loud room raise the bar
			// above what ordinary speech clears.
			if (elapsed <= NOISE_FLOOR_MS) {
				noiseFloor = (noiseFloor * floorSamples + rms) / (floorSamples + 1);
				floorSamples++;
				return;
			}

			const threshold = Math.max(MIN_SPEECH_RMS, noiseFloor * 3);
			if (rms > threshold) {
				hasSpoken = true;
				quietFor = 0;
				return;
			}

			// Silence only counts once they have actually started. Otherwise
			// a learner who takes two seconds to think gets cut off.
			if (!hasSpoken) return;
			quietFor += VAD_POLL_MS;
			// The floor matters independently: a learner who starts, says one
			// word and hesitates would otherwise be submitted on that word.
			if (quietFor >= SILENCE_MS && elapsed >= MIN_RECORD_MS) {
				stopFallbackRecording();
			}
		}, VAD_POLL_MS);
	} catch {
		// No VAD — the manual tap and MAX_RECORD_MS still end the recording.
	}
}

function stopVAD(): void {
	if (vadTimer) {
		clearInterval(vadTimer);
		vadTimer = null;
	}
	try {
		vadSource?.disconnect();
	} catch {
		// Already torn down with the stream.
	}
	vadSource = null;
}

async function startFallbackRecording(): Promise<void> {
	void trackEvent('mic_requested', { metadata: { engine: 'recorder' } });
	try {
		mediaStream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
		void trackEvent('mic_ready', { metadata: { engine: 'recorder' } });
	} catch (e) {
		trackObstacle((e as Error)?.name === 'NotAllowedError' ? 'mic_denied' : 'mic_unavailable', { engine: 'recorder' });
		logWarn('speech:fallback', `Mic permission denied or unavailable: ${(e as Error)?.message}`);
		playTone('error');
		emitState('error');
		return;
	}

	recordedChunks = [];
	const mimeType = pickMimeType();
	mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);

	mediaRecorder.ondataavailable = (e: BlobEvent) => {
		if (e.data.size > 0) recordedChunks.push(e.data);
	};

	mediaRecorder.onstop = async () => {
		if (recorderTimeout) {
			clearTimeout(recorderTimeout);
			recorderTimeout = null;
		}
		stopVAD();
		mediaStream?.getTracks().forEach((t) => t.stop());
		mediaStream = null;
		setListening(false);

		const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
		recordedChunks = [];
		mediaRecorder = null;

		if (blob.size < 1000) {
			// Essentially silence / instant double-tap — nothing to transcribe
			emitState('idle');
			return;
		}

		emitState('processing');
		try {
			const resp = await fetch('/proxy/stt', {
				method: 'POST',
				headers: { 'Content-Type': blob.type || 'audio/webm' },
				body: blob
			});
			if (!resp.ok) throw new Error(`STT ${resp.status}`);
			const data = (await resp.json()) as { text?: string };
			const transcript = (data.text || '').trim();
			emitState('idle');
			if (transcript) {
				lastAlternatives = [transcript];
				if (onVoiceInput) onVoiceInput(transcript);
			} else {
				playTone('error');
			}
		} catch (e) {
			trackObstacle('stt_failed', { engine: 'recorder' });
			logWarn('speech:fallback', `STT request failed: ${(e as Error)?.message}`);
			playTone('error');
			emitState('error');
		}
	};

	mediaRecorder.start();
	setListening(true);
	emitState('listening');
	playTone('start');
	startVAD(mediaStream);

	// Hard stop so an abandoned mic never records forever
	recorderTimeout = setTimeout(() => stopFallbackRecording(), MAX_RECORD_MS);
}

function stopFallbackRecording(): void {
	if (mediaRecorder && mediaRecorder.state !== 'inactive') {
		mediaRecorder.stop();
	}
}

// ── Public mic controls (engine-agnostic) ────────────────────────────────

function isListeningNow(): boolean {
	let isListening = false;
	appStore.subscribe((s) => (isListening = s.isListening))();
	return isListening;
}

/**
 * Toggle microphone on/off.
 */
export function toggleMic(): void {
	if (usingFallback) {
		if (isListeningNow()) {
			stopFallbackRecording();
		} else {
			stopAllAudio();
			void startFallbackRecording();
		}
		return;
	}

	if (!recognition) return;
	if (isListeningNow()) {
		recognition.stop();
	} else {
		stopAllAudio();
		try {
			void trackEvent('mic_requested', { metadata: { engine: 'web_speech' } });
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
	if (usingFallback) {
		stopFallbackRecording();
		return;
	}
	if (!recognition) return;
	if (isListeningNow()) {
		recognition.stop();
	}
}

/**
 * Start listening (if not already).
 */
export function startListening(): void {
	if (usingFallback) {
		if (!isListeningNow()) {
			stopAllAudio();
			void startFallbackRecording();
		}
		return;
	}
	if (!recognition) return;
	if (!isListeningNow()) {
		stopAllAudio();
		try {
			void trackEvent('mic_requested', { metadata: { engine: 'web_speech' } });
			recognition.start();
		} catch {
			// Already started
		}
	}
}

/**
 * Whether ANY voice input engine is available in this browser.
 */
export function isSpeechSupported(): boolean {
	return !!SpeechRecognition || canUseRecorderFallback();
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
	clearEndpointTimers();
	resetUtterance();
	stopFallbackRecording();
	stopVAD();
	mediaStream?.getTracks().forEach((t) => t.stop());
	mediaStream = null;
	onVoiceInput = null;
	onMicStateChange = null;
	lastAlternatives = [];
}
