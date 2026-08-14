import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appHtml = readFileSync(resolve(process.cwd(), 'src/app.html'), 'utf8');

/**
 * These exist because of a bug I shipped to production.
 *
 * A comment in app.html explaining the head placeholder contained the
 * literal placeholder token. SvelteKit substitutes these by plain string
 * replacement with no HTML parsing, so the entire head was injected inside
 * the comment. The injected markup carries Svelte's SSR anchors
 * (`<!--12qhfyh-->`), whose `-->` closed the comment early and spilled the
 * remaining prose onto the page as visible text above the navbar. The head
 * was also emitted twice, which re-broke the duplicate-title problem the
 * comment was describing.
 *
 * Nothing in the pipeline saw it. svelte-check does not read app.html,
 * vitest had no test for it, and the dev server injects a smaller head
 * without the SSR anchors, so a local fetch of `/` came back with exactly
 * one title and clean markup. It only appeared in a production build.
 */
describe('app.html', () => {
	for (const token of ['%sveltekit.head%', '%sveltekit.body%']) {
		it(`contains exactly one ${token}`, () => {
			const count = appHtml.split(token).length - 1;
			expect(count, `${token} appears ${count}× — a second one, even inside a comment, injects the whole head there`).toBe(1);
		});
	}

	it('has no sveltekit placeholder inside a comment', () => {
		// The specific shape of the bug: the count check above passes if the
		// only occurrence IS the one in a comment and the real slot is gone.
		for (const comment of appHtml.match(/<!--[\s\S]*?-->/g) ?? []) {
			expect(comment, 'a placeholder inside a comment is substituted, not ignored').not.toMatch(
				/%sveltekit\.\w+%/
			);
		}
	});

	it('declares no title — the fallback belongs in +layout.svelte', () => {
		// A title here is emitted before the head placeholder, so it wins over
		// every per-page title on the site.
		expect(appHtml).not.toMatch(/<title[\s>]/);
	});

	it('keeps the head placeholder last in <head>', () => {
		// Anything after it outranks per-page tags for first-wins elements.
		const head = appHtml.slice(appHtml.indexOf('<head'), appHtml.indexOf('</head>'));
		expect(head.slice(head.indexOf('%sveltekit.head%')).trim()).toBe('%sveltekit.head%');
	});
});
