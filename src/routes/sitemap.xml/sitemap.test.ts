import { describe, it, expect } from 'vitest';
import { _buildSitemap } from './+server';

const KEYS = ['articles', 'cases', 'numbers'];
const xml = _buildSitemap(KEYS, '2026-08-14');

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

describe('sitemap', () => {
	it('is well-formed enough to parse', () => {
		// Not a full XML parse, but an unbalanced urlset or a stray & is the
		// realistic failure and Search Console rejects the whole file for it.
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect((xml.match(/<url>/g) ?? []).length).toBe((xml.match(/<\/url>/g) ?? []).length);
		expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
		// A bare & anywhere would be a parse error.
		expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
	});

	it('lists both language landing pages', () => {
		expect(locs).toContain('https://www.mirifer.com/');
		expect(locs).toContain('https://www.mirifer.com/fa');
	});

	it('lists the free test and both basics indexes', () => {
		expect(locs).toContain('https://www.mirifer.com/fa/test');
		expect(locs).toContain('https://www.mirifer.com/fa/basics');
		expect(locs).toContain('https://www.mirifer.com/basics');
	});

	it('emits both language variants of every category', () => {
		for (const k of KEYS) {
			expect(locs).toContain(`https://www.mirifer.com/fa/basics/${k}`);
			expect(locs).toContain(`https://www.mirifer.com/basics/${k}`);
		}
	});

	it('has no duplicate loc', () => {
		// A repeated URL is the usual symptom of a page being added to both
		// the static list and the generated one.
		expect(new Set(locs).size, `duplicates in ${locs.join(', ')}`).toBe(locs.length);
	});

	it('never claims the legal pages changed today', () => {
		// They are pinned. Stamping every crawl with today's date is false and
		// teaches Google to ignore the dates on the pages that do change.
		for (const path of ['/privacy', '/terms']) {
			const block = xml.slice(xml.indexOf(`<loc>https://www.mirifer.com${path}</loc>`));
			const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1];
			expect(lastmod, `${path} lastmod`).toBe('2026-02-24');
		}
	});

	it('pairs every hreflang reciprocally', () => {
		// Google discards one-directional annotations, so a block that names
		// an alternate must be named back by that alternate's own block.
		const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
		const altsOf = new Map<string, string[]>();

		for (const b of blocks) {
			const loc = /<loc>([^<]+)<\/loc>/.exec(b)?.[1] ?? '';
			const alts = [...b.matchAll(/hreflang="[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
			if (alts.length) altsOf.set(loc, alts);
		}

		for (const [loc, alts] of altsOf) {
			expect(alts, `${loc} omits itself from its own alternates`).toContain(loc);
			for (const a of alts) {
				expect(altsOf.get(a), `${a} is named by ${loc} but names no alternates back`).toBeDefined();
				expect(altsOf.get(a), `${a} does not name ${loc} back`).toContain(loc);
			}
		}
	});

	it('tags the fa alternates fa and the en alternates en', () => {
		expect(xml).toMatch(/hreflang="fa" href="https:\/\/www\.mirifer\.com\/fa"/);
		expect(xml).toMatch(/hreflang="en" href="https:\/\/www\.mirifer\.com\/"/);
		expect(xml).toMatch(/hreflang="fa" href="https:\/\/www\.mirifer\.com\/fa\/basics\/articles"/);
		expect(xml).toMatch(/hreflang="en" href="https:\/\/www\.mirifer\.com\/basics\/articles"/);
	});

	it('survives an empty category list', () => {
		// Supabase failing must degrade to the static pages, not to a 500.
		const bare = _buildSitemap([], '2026-08-14');
		expect(bare).toContain('<loc>https://www.mirifer.com/fa</loc>');
		expect(bare).not.toContain('/fa/basics/');
	});
});
