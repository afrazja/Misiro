/**
 * WAV encoding — turning what MediaRecorder gives us into what Azure wants.
 *
 * MediaRecorder produces Opus inside a WebM container. Azure's pronunciation
 * assessment endpoint takes PCM WAV (or OGG-Opus, which Chrome will not
 * produce). Rather than negotiate container support per browser, decode
 * whatever was recorded and re-encode one canonical format: 16 kHz, mono,
 * 16-bit. That is also exactly what the model wants — sending 48 kHz stereo
 * is bytes over the wire for information the model discards.
 */

/** Azure's expected input rate. Higher buys nothing here. */
export const TARGET_SAMPLE_RATE = 16000;

const WAV_HEADER_BYTES = 44;
const BITS_PER_SAMPLE = 16;

/**
 * Wrap mono float samples in a 16-bit PCM WAV container.
 *
 * Pure and synchronous, which is the point — the browser-dependent decoding
 * lives in toWav16k below, and this part can be tested.
 */
export function encodeWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): ArrayBuffer {
	const bytesPerSample = BITS_PER_SAMPLE / 8;
	const dataBytes = samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
	const view = new DataView(buffer);

	const writeAscii = (offset: number, text: string) => {
		for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
	};

	writeAscii(0, 'RIFF');
	view.setUint32(4, 36 + dataBytes, true); // file size minus the first 8 bytes
	writeAscii(8, 'WAVE');
	writeAscii(12, 'fmt ');
	view.setUint32(16, 16, true); // fmt chunk length
	view.setUint16(20, 1, true); // 1 = uncompressed PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
	view.setUint16(32, bytesPerSample, true); // block align
	view.setUint16(34, BITS_PER_SAMPLE, true);
	writeAscii(36, 'data');
	view.setUint32(40, dataBytes, true);

	// Clamp before scaling. A sample above 1.0 (possible after gain) would
	// wrap to a large negative value and put a click in the audio, which the
	// assessor would happily score as a mispronunciation.
	let offset = WAV_HEADER_BYTES;
	for (let i = 0; i < samples.length; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
		offset += bytesPerSample;
	}

	return buffer;
}

/**
 * Decode a recorded blob and re-encode it as 16 kHz mono PCM WAV.
 *
 * Returns null rather than throwing: this feeds an optional enhancement, and
 * a browser that cannot decode its own recording should cost the learner
 * nothing.
 */
export async function toWav16k(blob: Blob): Promise<ArrayBuffer | null> {
	if (typeof window === 'undefined') return null;
	const Ctx = window.AudioContext || (window as any).webkitAudioContext;
	const Offline = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
	if (!Ctx || !Offline) return null;

	let decodeCtx: AudioContext | null = null;
	try {
		const encoded = await blob.arrayBuffer();
		decodeCtx = new Ctx();
		const decoded = await decodeCtx.decodeAudioData(encoded);

		// Resample and downmix in one pass. Rendering into a 16 kHz context
		// does the sample-rate conversion; connecting a multi-channel buffer
		// to a 1-channel destination does the downmix.
		const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
		if (frames <= 0) return null;

		const offline = new Offline(1, frames, TARGET_SAMPLE_RATE);
		const source = offline.createBufferSource();
		source.buffer = decoded;
		source.connect(offline.destination);
		source.start();
		const rendered = await offline.startRendering();

		return encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
	} catch {
		return null;
	} finally {
		// Contexts are a limited resource (~6 per page) and this runs once
		// per spoken answer, so leaking them would break audio partway
		// through a lesson.
		try {
			await decodeCtx?.close();
		} catch {
			// Already closed.
		}
	}
}
