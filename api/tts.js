// Vercel Serverless Function: TTS Proxy
// Proxies Google Translate TTS requests to avoid referer blocking on mobile
// Usage: /api/tts?q=Hallo&tl=de

const https = require('https');

function fetchAudio(url, headers) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        });
        request.on('error', reject);
        request.setTimeout(5000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

module.exports = async function handler(req, res) {
    const text = req.query.q;
    const lang = (req.query.tl || 'de').split('-')[0];

    if (!text) {
        res.status(400).json({ error: 'Missing q parameter' });
        return;
    }

    if (text.length > 500) {
        res.status(400).json({ error: 'Text too long (max 500 chars)' });
        return;
    }

    // Try multiple Google TTS URL patterns (they rotate blocking)
    const attempts = [
        {
            url: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`,
            headers: { 'Referer': 'https://translate.google.com/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        },
        {
            url: `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=gtx`,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        }
    ];

    for (const attempt of attempts) {
        try {
            const audioData = await fetchAudio(attempt.url, attempt.headers);

            // Verify we got actual audio data (not an error page)
            if (audioData.length < 100) {
                continue; // Too small, probably an error
            }

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioData.length);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(200).send(audioData);
            return;
        } catch (err) {
            console.error(`TTS attempt failed (${attempt.url.substring(0, 60)}...): ${err.message}`);
            continue;
        }
    }

    // All attempts failed
    res.status(502).json({ error: 'TTS service unavailable' });
};
