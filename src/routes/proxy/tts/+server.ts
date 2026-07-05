/**
 * TTS Proxy.
 * Usage: GET /proxy/tts?q=Hallo&tl=de[&voice=a|b]
 *
 * voice=a (default) → learner-side voice; voice=b → conversation partner.
 * The param is part of the URL, so switching voices also busts old cached audio.
 *
 * Strategy:
 * - German (tl=de): try ElevenLabs first (if ELEVENLABS_API_KEY is set) for a
 *   more natural voice, then fall back to Google Translate TTS if ElevenLabs
 *   fails or its quota is exhausted.
 * - All other languages: Google Translate TTS (avoids burning the ElevenLabs
 *   free-tier character quota on translation audio).
 *
 * Responses are cached aggressively (immutable, 1 year) — the audio for a given
 * sentence never changes, so repeat plays hit the browser/CDN cache instead of
 * re-spending ElevenLabs characters.
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Two-voice dialogue: voice A reads the learner's lines ("sent"), voice B the
// conversation partner's ("received"). Defaults are premade voices — the only
// kind the ElevenLabs free tier allows via API. On a paid plan, override via
// env with native German library voices (e.g. Otto FTNCalFNG5bRnkkaP5Ug /
// Mila dCnu06FiOZma2KVNUoPZ, already added to this account's My Voices).
const ELEVEN_VOICE_A = env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // George — warm male
const ELEVEN_VOICE_B = env.ELEVENLABS_VOICE_ID_B || 'EXAVITQu4vr4xnSDxMaL'; // Sarah — reassuring female
const ELEVEN_MODEL_ID = env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

/** Long-lived immutable cache — same sentence always produces the same audio. */
const AUDIO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * Generate German audio via ElevenLabs. Returns the audio bytes, or null on any
 * failure (missing key, quota exceeded, timeout) so the caller falls back.
 */
async function tryElevenLabs(text: string, voiceId: string): Promise<ArrayBuffer | null> {
	if (!env.ELEVENLABS_API_KEY) return null;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
			{
				method: 'POST',
				headers: {
					'xi-api-key': env.ELEVENLABS_API_KEY,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text,
					model_id: ELEVEN_MODEL_ID,
					// Slightly lower stability + some style for a livelier, less
					// monotone delivery — still consistent enough for learning.
					voice_settings: {
						stability: 0.5,
						similarity_boost: 0.75,
						style: 0.3,
						use_speaker_boost: true
					}
				}),
				signal: controller.signal
			}
		);
		clearTimeout(timeoutId);
		if (!response.ok) {
			// 401 (scope), 402 (quota/plan), 429 (rate limit) → fall back to Google.
			console.error(`ElevenLabs TTS failed: ${response.status}`);
			return null;
		}
		const audio = await response.arrayBuffer();
		return audio.byteLength > 100 ? audio : null;
	} catch (err) {
		clearTimeout(timeoutId);
		console.error(`ElevenLabs TTS error: ${(err as Error).message}`);
		return null;
	}
}

const ALLOWED_ORIGINS = [
	'https://mirifer.vercel.app',
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

	// German → try ElevenLabs first for a more natural voice.
	if (lang === 'de') {
		const voiceId = url.searchParams.get('voice') === 'b' ? ELEVEN_VOICE_B : ELEVEN_VOICE_A;
		const elevenAudio = await tryElevenLabs(text, voiceId);
		if (elevenAudio) {
			return new Response(elevenAudio, {
				status: 200,
				headers: {
					'Content-Type': 'audio/mpeg',
					'Content-Length': elevenAudio.byteLength.toString(),
					'Cache-Control': AUDIO_CACHE_CONTROL,
					'X-TTS-Source': 'elevenlabs',
					...corsHeaders(origin)
				}
			});
		}
		// else: fall through to Google (quota exhausted, no key, or error)
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
					'X-TTS-Source': 'google',
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
