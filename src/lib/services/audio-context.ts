/**
 * Audio Context — tone effects (start, success, error beeps).
 * Reuses a single AudioContext to avoid browser limits (~6 contexts).
 * Extracted from app.js playTone().
 */

let _toneCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
	try {
		if (!_toneCtx || _toneCtx.state === 'closed') {
			_toneCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
		}
		if (_toneCtx.state === 'suspended') _toneCtx.resume();
		return _toneCtx;
	} catch {
		return null;
	}
}

export type ToneType = 'start' | 'success' | 'error';

/**
 * Play a short tone effect for audio feedback.
 * - start: ascending chirp (440→880 Hz)
 * - success: ascending chirp (523→1046 Hz)
 * - error: descending sawtooth (200→100 Hz)
 */
export function playTone(type: ToneType): void {
	const ctx = getCtx();
	if (!ctx) return;

	try {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.connect(gain);
		gain.connect(ctx.destination);

		if (type === 'start') {
			osc.frequency.setValueAtTime(440, ctx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
		} else if (type === 'success') {
			osc.frequency.setValueAtTime(523, ctx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.2);
		} else if (type === 'error') {
			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(200, ctx.currentTime);
			osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
		}

		gain.gain.setValueAtTime(0.3, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
		osc.start();
		osc.stop(ctx.currentTime + 0.3);
	} catch {
		// AudioContext not available — silently skip
	}
}

/**
 * Resume AudioContext after a user gesture (required by browsers).
 * Call this on user's first click/tap.
 */
export function unlockAudioContext(): void {
	const ctx = getCtx();
	if (ctx && ctx.state === 'suspended') {
		ctx.resume();
	}
}

/**
 * Get the raw AudioContext (for advanced usage).
 */
export function getAudioContext(): AudioContext | null {
	return getCtx();
}
