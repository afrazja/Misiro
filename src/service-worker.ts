/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker — makes Mirifer installable as a PWA and keeps the app
 * shell working offline.
 *
 * Strategy:
 *  - Precache the built app shell (JS/CSS) and essential static files.
 *  - Cache-first for immutable build assets.
 *  - Network-first for pages and data (the app has its own localStorage
 *    offline layer for lesson state) with cache fallback when offline.
 *  - Never intercept /proxy/* (TTS audio uses HTTP caching; STT and
 *    analytics must always hit the network) or cross-origin requests
 *    (Supabase handles its own auth/data).
 */

const sw = self as unknown as ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `mirifer-${version}`;

// Static files worth precaching (skip marketing images & dev generators)
const PRECACHE_FILES = files.filter(
	(f) => !/generate-|WhatsApp|og-image|phone-preview|sitemap|robots/.test(f)
);

const ASSETS = [...build, ...PRECACHE_FILES];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Same-origin only; leave Supabase/analytics/proxies alone
	if (url.origin !== sw.location.origin) return;
	if (url.pathname.startsWith('/proxy/')) return;

	// Immutable build assets & precached statics: cache-first
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const cached = await cache.match(url.pathname);
				return cached ?? fetch(request);
			})
		);
		return;
	}

	// Pages & everything else: network-first, fall back to cache offline
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(request);
				// Cache successful page navigations for offline revisits
				if (response.ok && request.mode === 'navigate') {
					cache.put(request, response.clone());
				}
				return response;
			} catch {
				const cached = await cache.match(request);
				if (cached) return cached;
				// Last resort for navigations: the app home shell
				if (request.mode === 'navigate') {
					const home = await cache.match('/home');
					if (home) return home;
				}
				return new Response('Offline', { status: 503, statusText: 'Offline' });
			}
		})()
	);
});
