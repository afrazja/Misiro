import type { RequestHandler } from './$types';

/**
 * Reverse proxy for Microsoft Clarity.
 *
 * Clarity's CDN (*.clarity.ms) is DNS-blocked by some ISPs.
 * This proxy routes requests through our own domain (Vercel serverless functions)
 * so Clarity works for ALL visitors regardless of their DNS restrictions.
 *
 * Routes:
 *   /proxy/clarity/tag/<id>            → https://www.clarity.ms/tag/<id>
 *   /proxy/clarity/scripts/...         → https://scripts.clarity.ms/...
 *   /proxy/clarity/collect             → https://o.clarity.ms/collect
 *   /proxy/clarity/c.gif               → https://c.clarity.ms/c.gif
 */

const DOMAIN_MAP: Record<string, string> = {
	tag: 'https://www.clarity.ms',
	scripts: 'https://scripts.clarity.ms',
	collect: 'https://o.clarity.ms',
	c: 'https://c.clarity.ms',
};

/** Headers we copy from the upstream response */
const PASSTHROUGH_HEADERS = [
	'content-type',
	'cache-control',
	'access-control-allow-origin',
	'access-control-allow-methods',
	'access-control-allow-headers',
];

function rewriteBody(body: string, origin: string): string {
	// Rewrite all *.clarity.ms URLs to route through our proxy
	return body
		.replace(/https:\/\/www\.clarity\.ms\//g, `${origin}/proxy/clarity/tag/`)
		.replace(/https:\/\/scripts\.clarity\.ms\//g, `${origin}/proxy/clarity/scripts/`)
		.replace(/https:\/\/o\.clarity\.ms\//g, `${origin}/proxy/clarity/collect/`)
		.replace(/https:\/\/c\.clarity\.ms\//g, `${origin}/proxy/clarity/c/`)
		// Also handle any other single-letter subdomains used by Clarity
		.replace(/https:\/\/([a-z])\.clarity\.ms\//g, `${origin}/proxy/clarity/c/`);
}

function buildUpstreamUrl(path: string): string | null {
	const segments = path.split('/');
	const prefix = segments[0];

	if (prefix === 'tag') {
		// /proxy/clarity/tag/<projectId> → https://www.clarity.ms/tag/<projectId>
		return `https://www.clarity.ms/${segments.join('/')}`;
	}
	if (prefix === 'scripts') {
		// /proxy/clarity/scripts/0.8.55/clarity.js → https://scripts.clarity.ms/0.8.55/clarity.js
		return `https://scripts.clarity.ms/${segments.slice(1).join('/')}`;
	}
	if (prefix === 'collect') {
		// /proxy/clarity/collect → https://o.clarity.ms/collect
		return `https://o.clarity.ms/${segments.join('/')}`;
	}
	if (prefix === 'c') {
		// /proxy/clarity/c/c.gif → https://c.clarity.ms/c.gif
		return `https://c.clarity.ms/${segments.slice(1).join('/')}`;
	}

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

	// Forward query params
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

		// For JS/text responses, rewrite URLs
		if (contentType.includes('javascript') || contentType.includes('text')) {
			const text = await upstream.text();
			const rewritten = rewriteBody(text, origin);

			const headers = new Headers();
			for (const h of PASSTHROUGH_HEADERS) {
				const v = upstream.headers.get(h);
				if (v) headers.set(h, v);
			}
			headers.set('access-control-allow-origin', '*');
			// Cache JS scripts for 1 hour
			if (contentType.includes('javascript')) {
				headers.set('cache-control', 'public, max-age=3600, s-maxage=3600');
			}

			return new Response(rewritten, {
				status: upstream.status,
				headers,
			});
		}

		// For binary/other responses (images, etc.), pass through as-is
		const body = await upstream.arrayBuffer();
		const headers = new Headers();
		for (const h of PASSTHROUGH_HEADERS) {
			const v = upstream.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('access-control-allow-origin', '*');

		return new Response(body, {
			status: upstream.status,
			headers,
		});
	} catch (err) {
		// If upstream is unreachable, return empty JS to avoid errors
		return new Response('/* clarity proxy: upstream unavailable */', {
			status: 200,
			headers: { 'content-type': 'application/javascript', 'cache-control': 'no-cache' },
		});
	}
};

export const POST: RequestHandler = async ({ params, url, request }) => {
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
		const body = await request.arrayBuffer();

		const upstream = await fetch(fullUrl, {
			method: 'POST',
			headers: {
				'Content-Type': request.headers.get('content-type') || 'application/octet-stream',
				'User-Agent': request.headers.get('user-agent') || '',
			},
			body,
		});

		const respBody = await upstream.arrayBuffer();
		const headers = new Headers();
		for (const h of PASSTHROUGH_HEADERS) {
			const v = upstream.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('access-control-allow-origin', '*');

		return new Response(respBody, {
			status: upstream.status,
			headers,
		});
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
