const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'ollama'; // Not needed for local
const TARGET_URL = 'http://localhost:11434/v1/chat/completions';
const PORT = 3005;

// Allowed origins for CORS (localhost only)
const ALLOWED_ORIGINS = [
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

    // --- CORS (restricted to allowed origins) ---
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Same-origin requests (no Origin header) — allow for static files
        res.setHeader('Access-Control-Allow-Origin', `http://localhost:${PORT}`);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (reqMethod === 'OPTIONS') {
        res.writeHead(204);
        res.end();
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
            if (bodySize > MAX_BODY_SIZE) return; // Already responded with 413

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

    // --- 3. Static Files ---
    // Resolve and sanitize file path to prevent directory traversal
    const requestedPath = decodeURIComponent(rawUrl.split('?')[0]);
    const safePath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = path.join('.', safePath);
    if (filePath === '.' || filePath === './') filePath = './index.html';

    // Ensure the resolved path stays within the project directory
    const resolvedPath = path.resolve(filePath);
    const projectRoot = path.resolve('.');
    if (!resolvedPath.startsWith(projectRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const mimes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'Not Found' : 'Internal Error');
        } else {
            res.writeHead(200, { 'Content-Type': mimes[ext] || 'text/html' });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Misiro Server Running on Port ${PORT}\n`);
});
