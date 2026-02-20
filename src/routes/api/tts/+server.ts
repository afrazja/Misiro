/**
 * TTS Proxy — proxies Google Translate TTS requests to avoid referer blocking.
 * Ported from api/tts.js (Vercel serverless function).
 * Usage: GET /api/tts?q=Hallo&tl=de
 */

import type { RequestHandler } from './$types';

const ALLOWED_ORIGINS = [
	'https://misiro.vercel.app',
	'http://localhost:5173',
	'http://localhost:3000',
	'http://localhost:5500',
	'http://127.0.0.1:5500'
];

function getCorsOrigin(requestOrigin: string): string {
	return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
}

function corsHeaders(origin: string): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': getCorsOrigin(origin),
		'Vary': 'Origin'
	};
}

export const OPTIONS: RequestHandler = async ({ request }) => {
	const origin = request.headers.get('origin') || '';
	return new Response(null, {
		status: 204,
		headers: {
			...corsHeaders(origin),
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};

export const GET: RequestHandler = async ({ url, request }) => {
	const origin = request.headers.get('origin') || '';
	const text = url.searchParams.get('q');
	let lang = url.searchParams.get('tl') || 'de';

	// Strip region code (de-DE → de)
	if (lang.includes('-')) lang = lang.split('-')[0];

	if (!text) {
		return new Response(JSON.stringify({ error: 'Missing q parameter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
		});
	}

	if (text.length > 500) {
		return new Response(JSON.stringify({ error: 'Text too long (max 500 chars)' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
		});
	}

	// Try multiple Google TTS URL patterns (they rotate blocking)
	const attempts: Array<{ url: string; headers: Record<string, string> }> = [
		{
			url: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`,
			headers: {
				Referer: 'https://translate.google.com/',
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		},
		{
			url: `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=gtx`,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		}
	];

	for (const attempt of attempts) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const response = await fetch(attempt.url, {
				headers: attempt.headers,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) continue;

			const audioData = await response.arrayBuffer();

			// Verify we got actual audio data (not an error page)
			if (audioData.byteLength < 100) continue;

			return new Response(audioData, {
				status: 200,
				headers: {
					'Content-Type': 'audio/mpeg',
					'Content-Length': audioData.byteLength.toString(),
					'Cache-Control': 'public, max-age=86400',
					...corsHeaders(origin)
				}
			});
		} catch (err) {
			console.error(`TTS attempt failed: ${(err as Error).message}`);
			continue;
		}
	}

	// All attempts failed
	return new Response(JSON.stringify({ error: 'TTS service unavailable' }), {
		status: 502,
		headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
	});
};
