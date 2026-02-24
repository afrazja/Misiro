import type { RequestHandler } from './$types';

/**
 * Reverse proxy for Microsoft Clarity.
 *
 * Clarity's CDN (*.clarity.ms) is DNS-blocked by some ISPs (resolves to 0.0.0.0).
 * This proxy routes requests through our own domain so Vercel's serverless
 * functions (which run in US data centers) can reach clarity.ms on behalf of
 * the client.
 *
 * URL pattern:  /proxy/clarity/s/{subdomain}/{rest...}
 *   → https://{subdomain}.clarity.ms/{rest...}
 *
 * Examples:
 *   /proxy/clarity/s/www/tag/abc123         → https://www.clarity.ms/tag/abc123
 *   /proxy/clarity/s/scripts/0.8.55/clarity.js → https://scripts.clarity.ms/0.8.55/clarity.js
 *   /proxy/clarity/s/o/collect              → https://o.clarity.ms/collect
 *   /proxy/clarity/s/c/c.gif               → https://c.clarity.ms/c.gif
 */

/** Headers we copy from the upstream response */
const PASSTHROUGH_HEADERS = [
	'content-type',
	'cache-control',
	'access-control-allow-origin',
	'access-control-allow-methods',
	'access-control-allow-headers',
];

/**
 * Rewrite all *.clarity.ms URLs to route through our proxy.
 * Uses a single regex to capture the subdomain and rewrite the URL.
 */
function rewriteBody(body: string, origin: string): string {
	return body.replace(
		/https:\/\/([\w-]+)\.clarity\.ms\//g,
		`${origin}/proxy/clarity/s/$1/`
	);
}

/**
 * Parse the proxy path and build the upstream URL.
 * Expected format: s/{subdomain}/{rest...}
 */
// Allowed Clarity subdomains for security
const ALLOWED_SUBDOMAINS = new Set([
	'www', 'scripts', 'o', 'c', 'e',
	'a', 'b', 'd', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
	'm', 'n', 'p', 'q', 'r', 't', 'u', 'v', 'w', 'x', 'y', 'z'
]);

/**
 * Parse the proxy path and build the upstream URL.
 * Primary format:   s/{subdomain}/{rest...}
 * Legacy fallbacks:  tag/...  → www.clarity.ms
 *                    scripts/... → scripts.clarity.ms
 *                    collect/... → o.clarity.ms
 *                    c/...       → c.clarity.ms
 */
function buildUpstreamUrl(path: string): string | null {
	const segments = path.split('/');

	// New format: /proxy/clarity/s/{subdomain}/{rest}
	if (segments[0] === 's' && segments.length >= 3) {
		const subdomain = segments[1];
		const rest = segments.slice(2).join('/');
		if (!ALLOWED_SUBDOMAINS.has(subdomain)) return null;
		return `https://${subdomain}.clarity.ms/${rest}`;
	}

	// Legacy format: backward compatibility with v1 proxy URLs
	const prefix = segments[0];
	if (prefix === 'tag') return `https://www.clarity.ms/${segments.join('/')}`;
	if (prefix === 'scripts') return `https://scripts.clarity.ms/${segments.slice(1).join('/')}`;
	if (prefix === 'collect') return `https://o.clarity.ms/${segments.join('/')}`;
	if (prefix === 'c') return `https://c.clarity.ms/${segments.slice(1).join('/')}`;

	return null;
}

async function proxyRequest(
	params: { path?: string },
	url: URL,
	request: Request,
	method: 'GET' | 'POST'
): Promise<Response> {
	const path = params.path;
	if (!path) {
		return new Response('Not found', { status: 404 });
	}

	const upstreamUrl = buildUpstreamUrl(path);
	if (!upstreamUrl) {
		return new Response('Not found', { status: 404 });
	}

	// Forward query params
	const qs = url.search;
	const fullUrl = qs ? `${upstreamUrl}${qs}` : upstreamUrl;

	try {
		// Build upstream headers - forward all relevant client headers
		const upstreamHeaders: Record<string, string> = {};
		const forwardHeaders = [
			'user-agent', 'referer', 'origin', 'content-type',
			'accept', 'accept-encoding', 'accept-language',
		];
		for (const h of forwardHeaders) {
			const v = request.headers.get(h);
			if (v) upstreamHeaders[h] = v;
		}

		const fetchOptions: RequestInit = {
			method,
			headers: upstreamHeaders,
		};

		if (method === 'POST') {
			fetchOptions.body = await request.arrayBuffer();
			// Ensure content-type is set for POSTs
			if (!upstreamHeaders['content-type']) {
				upstreamHeaders['content-type'] = 'application/octet-stream';
			}
		}

		const upstream = await fetch(fullUrl, fetchOptions);
		const contentType = upstream.headers.get('content-type') || '';
		const origin = url.origin;

		// Build response headers
		const headers = new Headers();
		for (const h of PASSTHROUGH_HEADERS) {
			const v = upstream.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('access-control-allow-origin', '*');

		// For JS/text responses, rewrite clarity.ms URLs to route through proxy
		if (contentType.includes('javascript') || contentType.includes('text')) {
			const text = await upstream.text();
			const rewritten = rewriteBody(text, origin);

			// Cache JS scripts for 1 hour
			if (contentType.includes('javascript')) {
				headers.set('cache-control', 'public, max-age=3600, s-maxage=3600');
			}

			return new Response(rewritten, { status: upstream.status, headers });
		}

		// For binary/other responses, pass through as-is
		const body = await upstream.arrayBuffer();
		return new Response(body, { status: upstream.status, headers });
	} catch {
		if (method === 'GET') {
			// Return empty JS to avoid client-side errors
			return new Response('/* clarity proxy: upstream unavailable */', {
				status: 200,
				headers: { 'content-type': 'application/javascript', 'cache-control': 'no-cache' },
			});
		}
		return new Response('', { status: 204 });
	}
}

export const GET: RequestHandler = async ({ params, url, request }) => {
	return proxyRequest(params, url, request, 'GET');
};

export const POST: RequestHandler = async ({ params, url, request }) => {
	return proxyRequest(params, url, request, 'POST');
};

// Handle CORS preflight requests
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, POST, OPTIONS',
			'access-control-allow-headers': 'content-type',
			'access-control-max-age': '86400',
		},
	});
};
