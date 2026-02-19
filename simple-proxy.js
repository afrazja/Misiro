const http = require('http');
const https = require('https');

// Configuration via environment variables
const PORT = process.env.PORT || 3005;
const TARGET_URL = process.env.OLLAMA_URL || 'http://localhost:11434/v1/chat/completions';

// Allowed origins for CORS — set via env var (comma-separated) or defaults
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [
        `http://localhost:${PORT}`,
        `http://127.0.0.1:${PORT}`,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];

// Rate limiting: max requests per IP per window
const RATE_LIMIT = {
    windowMs: 60 * 1000,   // 1 minute
    maxRequests: 60         // 60 requests per minute per IP
};
const rateLimitStore = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now - record.windowStart > RATE_LIMIT.windowMs) {
        rateLimitStore.set(ip, { windowStart: now, count: 1 });
        return false;
    }

    record.count++;
    if (record.count > RATE_LIMIT.maxRequests) {
        return true;
    }
    return false;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore) {
        if (now - record.windowStart > RATE_LIMIT.windowMs * 2) {
            rateLimitStore.delete(ip);
        }
    }
}, 5 * 60 * 1000);

// Max request body size (1MB)
const MAX_BODY_SIZE = 1024 * 1024;

// Global error handling
process.on('uncaughtException', (err) => console.error('FATAL EXCEPTION:', err));
process.on('unhandledRejection', (reason) => console.error('UNHANDLED REJECTION:', reason));

function fetchGoogleAudio(url, callback) {
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    };
    https.get(url, options, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
            return fetchGoogleAudio(res.headers.location, callback);
        }

        if (res.statusCode !== 200) {
            return callback(new Error(`Google Status ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
        res.on('error', (err) => callback(err));
    }).on('error', (err) => callback(err));
}

const server = http.createServer((req, res) => {
    const rawUrl = req.url || '';
    const reqMethod = (req.method || 'GET').toUpperCase();
    const clientIP = req.socket.remoteAddress || 'unknown';

    // --- CORS ---
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (reqMethod === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- Health Check ---
    if (reqMethod === 'GET' && rawUrl === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // --- Rate limiting (for TTS and chat proxy routes only) ---
    if (rawUrl.includes('/tts') || rawUrl === '/chat') {
        if (isRateLimited(clientIP)) {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            res.end('Too many requests. Please wait.');
            return;
        }
    }

    // --- 1. TTS Proxy (/tts) ---
    if (reqMethod === 'GET' && rawUrl.includes('/tts')) {
        try {
            const u = new URL(rawUrl, 'http://localhost');
            const text = u.searchParams.get('q');
            let lang = u.searchParams.get('tl') || 'fa';
            if (lang.includes('-')) lang = lang.split('-')[0];

            if (!text) {
                res.writeHead(400);
                res.end('Missing text');
                return;
            }

            // Limit TTS text length to prevent abuse
            if (text.length > 500) {
                res.writeHead(400);
                res.end('Text too long');
                return;
            }

            const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=gtx`;

            fetchGoogleAudio(ttsUrl, (err, audioBuffer) => {
                if (err) {
                    console.error(`TTS Error:`, err.message);
                    if (!res.headersSent) res.writeHead(500);
                    res.end(err.message);
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.length,
                    'Cache-Control': 'no-cache'
                });
                res.end(audioBuffer);
            });
            return;
        } catch (e) {
            res.writeHead(500);
            res.end(e.message);
            return;
        }
    }

    // --- 2. AI Proxy (/chat) ---
    if (reqMethod === 'POST' && rawUrl === '/chat') {
        let body = '';
        let bodySize = 0;

        req.on('data', c => {
            bodySize += c.length;
            if (bodySize > MAX_BODY_SIZE) {
                res.writeHead(413, { 'Content-Type': 'text/plain' });
                res.end('Request body too large');
                req.destroy();
                return;
            }
            body += c.toString();
        });
        req.on('end', async () => {
            if (bodySize > MAX_BODY_SIZE) return;

            try {
                const response = await fetch(TARGET_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });
                const data = await response.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (err) {
                console.error(`Chat Error:`, err.message);
                if (!res.headersSent) res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // --- 404 for all other routes ---
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`Misiro API server running on port ${PORT}`);
    console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
