import { describe, it, expect } from 'vitest';
import { onboardingStrings } from './onboarding-strings';

const en = onboardingStrings(false);
const fa = onboardingStrings(true);

/**
 * Both languages as flat, labelled pairs.
 *
 * NOT { ...en, ...fa } — the spread has fa overwrite en for every shared
 * key, so a loop over it never sees a single English value. The first
 * version of these tests did exactly that and passed while the English
 * side was entirely broken. Verified by re-introducing the bug.
 */
const every: Array<[string, string]> = [
	...Object.entries(en).map(([k, v]): [string, string] => [`en.${k}`, v]),
	...Object.entries(fa).map(([k, v]): [string, string] => [`fa.${k}`, v])
];

/**
 * These exist because of a specific failure: a replace-all rewrote all 37
 * English values with their own lookup tokens, so an English learner would
 * have read "{t.q1}" on screen. svelte-check passed — they are valid
 * strings — 538 tests passed, and /onboarding redirects without a session
 * so it could not be opened to look. Nothing in the pipeline could see it.
 */
describe('onboardingStrings', () => {
	it('has the same keys in both languages', () => {
		expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort());
	});

	it('never leaks a lookup token into a value', () => {
		// The exact bug. "{t.q1}" is a valid string and a broken UI.
		for (const [k, v] of every) {
			expect(v, `${k} contains a lookup token`).not.toMatch(/\{t\./);
		}
	});

	it('never contains an HTML entity', () => {
		// These were template literals where "&middot;" rendered as "·".
		// Inside a JS string it renders as the literal seven characters.
		for (const [k, v] of every) {
			expect(v, `${k} contains an HTML entity`).not.toMatch(/&[a-z]+;/i);
		}
	});

	it('has no empty value', () => {
		for (const [k, v] of every) {
			expect(v.trim().length, `${k} is empty`).toBeGreaterThan(0);
		}
	});

	it('actually translates — Persian differs from English everywhere', () => {
		// Catches a key added to one side and copy-pasted to the other,
		// which is how half-translated pages happen.
		for (const k of Object.keys(en)) {
			expect(fa[k], `${k} is identical in both languages`).not.toBe(en[k]);
		}
	});

	it('writes Persian in Persian script', () => {
		// An English sentence sitting in the fa branch passes every check
		// above except this one.
		for (const [k, v] of Object.entries(fa)) {
			expect(v, `${k} has no Persian characters`).toMatch(/[؀-ۿ]/);
		}
	});

	it('covers every step of the wizard', () => {
		// Six steps; a missing heading means a blank screen, not a fallback.
		for (const k of ['q1', 'q2', 'q3', 'q4', 'q5sub', 'q6', 'continue', 'saving']) {
			expect(Object.keys(en), `missing ${k}`).toContain(k);
		}
	});
});
