/**
 * List AiVOOV voices for a language so you can pin voice IDs in env.
 *
 * Usage:
 *   node scripts/list-aivoov-voices.mjs              # Persian (fa-IR)
 *   node scripts/list-aivoov-voices.mjs de-DE        # German
 *   node scripts/list-aivoov-voices.mjs all          # every voice
 *
 * The API key is read from the AIVOOV_API_KEY env var, or from .env.
 *
 * NOTE: AiVOOV limits the /voices endpoint to 20 calls per DAY — run this
 * sparingly and pin the IDs you pick into env:
 *   AIVOOV_VOICE_FA=...   (voice A — learner side)
 *   AIVOOV_VOICE_FA_B=... (voice B — conversation partner)
 */
import { readFileSync } from 'node:fs';

function keyFromDotEnv() {
	try {
		const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
		return envFile.match(/^\s*AIVOOV_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/m)?.[1]?.trim() || null;
	} catch {
		return null;
	}
}

const apiKey = process.env.AIVOOV_API_KEY || keyFromDotEnv();
if (!apiKey) {
	console.error('No API key. Set AIVOOV_API_KEY in the environment or in .env');
	process.exit(1);
}

const langArg = process.argv[2] || 'fa-IR';
const url =
	langArg === 'all'
		? 'https://aivoov.com/api/v8/voices'
		: `https://aivoov.com/api/v8/voices?language_code=${encodeURIComponent(langArg)}`;

const response = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
if (!response.ok) {
	console.error(`AiVOOV /voices failed: HTTP ${response.status}`);
	console.error(await response.text());
	process.exit(1);
}

const raw = await response.json();
const voices = Array.isArray(raw) ? raw : raw?.data;
if (!Array.isArray(voices) || voices.length === 0) {
	console.log(`No voices returned for "${langArg}". Full response:`);
	console.log(JSON.stringify(raw, null, 2));
	process.exit(0);
}

console.log(`${voices.length} voice(s) for "${langArg}":\n`);
for (const v of voices) {
	const extras = Object.entries(v)
		.filter(([k]) => !['voice_id', 'name', 'language'].includes(k))
		.map(([k, val]) => `${k}=${val}`)
		.join(' ');
	console.log(`${v.voice_id}  ${v.language ?? ''}  ${v.name ?? ''}  ${extras}`);
}
console.log(
	'\nPin your picks in .env / Vercel:\n' +
		'  AIVOOV_VOICE_FA=<voice_id>    # learner side (A)\n' +
		'  AIVOOV_VOICE_FA_B=<voice_id>  # conversation partner (B)'
);
