import { describe, it, expect } from 'vitest';
import { encodeWav, TARGET_SAMPLE_RATE } from './wav-encode';

/** Read the ASCII tag at a byte offset — WAV is full of them. */
function tag(buf: ArrayBuffer, offset: number, length = 4): string {
	return String.fromCharCode(...new Uint8Array(buf, offset, length));
}

describe('encodeWav', () => {
	const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);

	it('writes a header Azure will recognise', () => {
		const buf = encodeWav(samples);
		const view = new DataView(buf);

		expect(tag(buf, 0)).toBe('RIFF');
		expect(tag(buf, 8)).toBe('WAVE');
		expect(tag(buf, 12)).toBe('fmt ');
		expect(tag(buf, 36)).toBe('data');

		expect(view.getUint16(20, true)).toBe(1); // uncompressed PCM
		expect(view.getUint16(22, true)).toBe(1); // mono
		expect(view.getUint32(24, true)).toBe(TARGET_SAMPLE_RATE);
		expect(view.getUint16(34, true)).toBe(16); // bits per sample
	});

	it('declares sizes that match the actual buffer', () => {
		const buf = encodeWav(samples);
		const view = new DataView(buf);
		const dataBytes = samples.length * 2;

		expect(buf.byteLength).toBe(44 + dataBytes);
		expect(view.getUint32(4, true)).toBe(36 + dataBytes);
		expect(view.getUint32(40, true)).toBe(dataBytes);
		// Byte rate and block align have to agree or players read garbage.
		expect(view.getUint32(28, true)).toBe(TARGET_SAMPLE_RATE * 2);
		expect(view.getUint16(32, true)).toBe(2);
	});

	it('converts floats to 16-bit at full scale', () => {
		const view = new DataView(encodeWav(samples));
		expect(view.getInt16(44, true)).toBe(0);
		// setInt16 truncates toward zero rather than rounding, so 0.5 lands on
		// 16383 and not 16384. That is what every other WAV encoder does and
		// the error is one LSB, about -90 dB.
		expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff));
		expect(view.getInt16(48, true)).toBe(-0.5 * 0x8000);
		expect(view.getInt16(50, true)).toBe(0x7fff);
		expect(view.getInt16(52, true)).toBe(-0x8000);
	});

	it('clamps rather than wrapping when gain pushed a sample over 1.0', () => {
		// Unclamped, 1.5 * 0x7fff overflows Int16 and wraps to a large
		// negative — an audible click the assessor would score as a
		// mispronunciation.
		const view = new DataView(encodeWav(new Float32Array([1.5, -1.5])));
		expect(view.getInt16(44, true)).toBe(0x7fff);
		expect(view.getInt16(46, true)).toBe(-0x8000);
	});

	it('honours a non-default sample rate', () => {
		const view = new DataView(encodeWav(samples, 44100));
		expect(view.getUint32(24, true)).toBe(44100);
		expect(view.getUint32(28, true)).toBe(44100 * 2);
	});

	it('produces a valid header-only file for empty input', () => {
		const buf = encodeWav(new Float32Array([]));
		expect(buf.byteLength).toBe(44);
		expect(new DataView(buf).getUint32(40, true)).toBe(0);
	});
});
