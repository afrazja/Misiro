import { describe, it, expect } from 'vitest';
import { _safeNext as safeNext } from './+server';


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
