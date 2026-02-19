// Vercel Serverless Function: TTS Proxy
// Proxies Google Translate TTS requests to avoid referer blocking on mobile
// Usage: /api/tts?q=Hallo&tl=de

const https = require('https');

module.exports = async function handler(req, res) {
    const text = req.query.q;
    const lang = (req.query.tl || 'de').split('-')[0];

    if (!text) {
        res.status(400).json({ error: 'Missing q parameter' });
        return;
    }

    // Limit text length to prevent abuse
    if (text.length > 500) {
        res.status(400).json({ error: 'Text too long (max 500 chars)' });
        return;
    }

    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

    try {
        const audioData = await new Promise((resolve, reject) => {
            const request = https.get(googleUrl, {
                headers: {
                    'Referer': 'https://translate.google.com/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Google TTS returned ${response.statusCode}`));
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

        // Set headers for audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioData.length);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(audioData);
    } catch (err) {
        console.error('TTS proxy error:', err.message);
        res.status(502).json({ error: 'TTS service unavailable' });
    }
};
