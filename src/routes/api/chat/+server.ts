/**
 * AI Chat Proxy — forwards requests to Ollama/DeepSeek backend.
 * Ported from simple-proxy.js /chat route.
 * Usage: POST /api/chat with JSON body
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const TARGET_URL = env.OLLAMA_URL || 'http://localhost:11434/v1/chat/completions';
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

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
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const origin = request.headers.get('origin') || '';

	try {
		// Check content length
		const contentLength = request.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
			return new Response(JSON.stringify({ error: 'Request body too large' }), {
				status: 413,
				headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
			});
		}

		const body = await request.text();

		if (body.length > MAX_BODY_SIZE) {
			return new Response(JSON.stringify({ error: 'Request body too large' }), {
				status: 413,
				headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
			});
		}

		const response = await fetch(TARGET_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body
		});

		const data = await response.json();

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
		});
	} catch (err) {
		console.error('Chat proxy error:', (err as Error).message);
		return new Response(JSON.stringify({ error: (err as Error).message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
		});
	}
};
