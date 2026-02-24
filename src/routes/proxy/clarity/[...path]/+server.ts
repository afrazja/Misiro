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
function buildUpstreamUrl(path: string): string | null {
	const segments = path.split('/');

	if (segments[0] !== 's' || segments.length < 3) {
		return null;
	}

	const subdomain = segments[1];
	const rest = segments.slice(2).join('/');

	// Only allow known Clarity subdomains for security
	const allowedSubdomains = ['www', 'scripts', 'o', 'c', 'e', 'a', 'b', 'd', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
	if (!allowedSubdomains.includes(subdomain)) {
		return null;
	}

	return `https://${subdomain}.clarity.ms/${rest}`;
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
		const fetchOptions: RequestInit = {
			method,
			headers: {
				'User-Agent': request.headers.get('user-agent') || '',
				'Referer': request.headers.get('referer') || '',
			},
		};

		if (method === 'POST') {
			fetchOptions.body = await request.arrayBuffer();
			(fetchOptions.headers as Record<string, string>)['Content-Type'] =
				request.headers.get('content-type') || 'application/octet-stream';
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
