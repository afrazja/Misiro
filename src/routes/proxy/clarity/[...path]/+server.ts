import type { RequestHandler } from './$types';

/**
 * Reverse proxy for Microsoft Clarity script loading.
 *
 * Clarity's CDN (*.clarity.ms) is DNS-blocked by some ISPs (resolves to 0.0.0.0).
 * This proxy routes SCRIPT LOADING requests through our own domain so the
 * Clarity JS can initialize for all visitors. Data collection (POST /collect)
 * goes directly to Clarity's servers — works natively for visitors without
 * DNS blocks.
 *
 * URL pattern:  /proxy/clarity/s/{subdomain}/{rest...}
 *   → https://{subdomain}.clarity.ms/{rest...}
 *
 * Only GET requests for scripts are proxied and URL-rewritten.
 * POST requests (data collection) are passed through without rewriting.
 */

/** Headers we copy from the upstream response */
const PASSTHROUGH_HEADERS = [
	'content-type',
	'cache-control',
	'access-control-allow-origin',
	'access-control-allow-methods',
	'access-control-allow-headers',
];

// Allowed Clarity subdomains for security
const ALLOWED_SUBDOMAINS = new Set([
	'www', 'scripts', 'o', 'c', 'e',
	'a', 'b', 'd', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
	'm', 'n', 'p', 'q', 'r', 't', 'u', 'v', 'w', 'x', 'y', 'z'
]);

/**
 * Rewrite *.clarity.ms script URLs to route through our proxy.
 * Only rewrites script-loading URLs (tag, scripts, gif).
 * Collect/upload URLs are left as-is so they go directly to Clarity.
 */
function rewriteBody(body: string, origin: string): string {
	// Rewrite script/tag URLs through our proxy
	return body
		.replace(/https:\/\/www\.clarity\.ms\/tag\//g, `${origin}/proxy/clarity/s/www/tag/`)
		.replace(/https:\/\/scripts\.clarity\.ms\//g, `${origin}/proxy/clarity/s/scripts/`)
		.replace(/https:\/\/c\.clarity\.ms\/c\.gif/g, `${origin}/proxy/clarity/s/c/c.gif`);
	// Note: upload/collect URLs (o.clarity.ms, m.clarity.ms, etc.) are NOT rewritten
	// so data collection goes directly to Clarity's servers.
}

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

export const GET: RequestHandler = async ({ params, url, request }) => {
	const path = params.path;
	if (!path) {
		return new Response('Not found', { status: 404 });
	}

	const upstreamUrl = buildUpstreamUrl(path);
	if (!upstreamUrl) {
		return new Response('Not found', { status: 404 });
	}

	const qs = url.search;
	const fullUrl = qs ? `${upstreamUrl}${qs}` : upstreamUrl;

	try {
		const upstream = await fetch(fullUrl, {
			headers: {
				'User-Agent': request.headers.get('user-agent') || '',
				'Referer': request.headers.get('referer') || '',
			},
		});

		const contentType = upstream.headers.get('content-type') || '';
		const origin = url.origin;

		// Build response headers
		const headers = new Headers();
		for (const h of PASSTHROUGH_HEADERS) {
			const v = upstream.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('access-control-allow-origin', '*');

		// For JS responses, rewrite script URLs to route through proxy
		if (contentType.includes('javascript')) {
			const text = await upstream.text();
			const rewritten = rewriteBody(text, origin);
			// Short cache to allow quick updates; increase once stable
			headers.set('cache-control', 'public, max-age=60, s-maxage=60');
			return new Response(rewritten, { status: upstream.status, headers });
		}

		// For other responses (images, etc.), pass through as-is
		const body = await upstream.arrayBuffer();
		return new Response(body, { status: upstream.status, headers });
	} catch {
		return new Response('/* clarity proxy: upstream unavailable */', {
			status: 200,
			headers: { 'content-type': 'application/javascript', 'cache-control': 'no-cache' },
		});
	}
};

// POST handler for collect endpoint (legacy URLs only, passes through to upstream)
export const POST: RequestHandler = async ({ params, url, request }) => {
	const path = params.path;
	if (!path) return new Response('', { status: 404 });

	const upstreamUrl = buildUpstreamUrl(path);
	if (!upstreamUrl) return new Response('', { status: 404 });

	const qs = url.search;
	const fullUrl = qs ? `${upstreamUrl}${qs}` : upstreamUrl;

	try {
		const upstream = await fetch(fullUrl, {
			method: 'POST',
			headers: {
				'Content-Type': request.headers.get('content-type') || 'application/octet-stream',
				'User-Agent': request.headers.get('user-agent') || '',
				'Origin': request.headers.get('origin') || '',
			},
			body: request.body,
		});

		const headers = new Headers();
		for (const h of PASSTHROUGH_HEADERS) {
			const v = upstream.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('access-control-allow-origin', '*');

		return new Response(upstream.body, { status: upstream.status, headers });
	} catch {
		return new Response('', { status: 204 });
	}
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
