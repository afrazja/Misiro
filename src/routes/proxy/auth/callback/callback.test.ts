import { describe, it, expect } from 'vitest';
import { _safeNext as safeNext, _safeStartDay as safeStartDay } from './+server';
import { TOTAL_DAYS } from '$services/curriculum';

/**
 * `place` carries a level-test result through email confirmation, so a test
 * taken on a laptop survives a confirmation opened on a phone. It arrives in
 * a URL the learner can edit and is written straight to their profile, so it
 * has to be a real day first.
 */
describe('safeStartDay', () => {
	it('accepts a day inside the curriculum', () => {
		expect(safeStartDay('31')).toBe(31);
		expect(safeStartDay('1')).toBe(1);
		expect(safeStartDay(String(TOTAL_DAYS))).toBe(TOTAL_DAYS);
	});

	it('refuses a day past the end of the course', () => {
		expect(safeStartDay(String(TOTAL_DAYS + 1))).toBeNull();
		expect(safeStartDay('9999')).toBeNull();
	});

	it('refuses zero and negatives', () => {
		expect(safeStartDay('0')).toBeNull();
		expect(safeStartDay('-5')).toBeNull();
	});

	it('refuses anything that is not a plain integer', () => {
		// Number() is lenient — it happily reads ' 31 ', '3e1', '0x1f' and
		// '31.0'. The digits-only guard runs first for exactly that reason.
		for (const bad of ['31.5', '3e1', '0x1f', ' 31', '31 ', '+31', '31abc', 'abc', '', 'NaN', 'Infinity']) {
			expect(safeStartDay(bad), `accepted ${JSON.stringify(bad)}`).toBeNull();
		}
	});

	it('returns null when absent', () => {
		expect(safeStartDay(null)).toBeNull();
	});
});

/**
 * An auth callback is the one place an open redirect really hurts: the
 * session cookie is set moments before the redirect fires, so sending the
 * browser somewhere else hands a freshly minted session to that site.
 * `next` arrives in a URL the learner can edit, so it is untrusted input.
 */
describe('safeNext', () => {
	it('accepts a same-origin path', () => {
		expect(safeNext('/home')).toBe('/home');
		expect(safeNext('/lesson?day=3')).toBe('/lesson?day=3');
	});

	it('refuses an absolute URL to another site', () => {
		expect(safeNext('https://evil.example/steal')).toBeNull();
		expect(safeNext('http://evil.example')).toBeNull();
	});

	it('refuses a protocol-relative URL', () => {
		// "//evil.example" looks like a path and is not one — the browser
		// reads it as a full URL on the current scheme.
		expect(safeNext('//evil.example')).toBeNull();
		expect(safeNext('//evil.example/x')).toBeNull();
	});

	it('refuses a scheme that is not http', () => {
		expect(safeNext('javascript:alert(1)')).toBeNull();
		expect(safeNext('data:text/html,x')).toBeNull();
	});

	it('returns null for nothing, so the caller falls back', () => {
		expect(safeNext(null)).toBeNull();
		expect(safeNext('')).toBeNull();
	});
});
