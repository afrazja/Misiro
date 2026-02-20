/**
 * AI Content Generator — generates German sentences using DeepSeek API.
 * Ported from ai-integration.js AIContentGenerator class.
 * Used by the Curator page for lesson content generation.
 */

import { config } from '$lib/config';

export interface GeneratedSentence {
	text: string;
	sentenceMeaning: string;
	words: Array<{ word: string; meaning: string }>;
	completed: boolean;
	isFallback?: boolean;
	errorMessage?: string;
}

const DEFAULT_MODEL = 'llama3.1:8b';

function getApiEndpoint(): string {
	return (config.apiUrl || 'http://localhost:3005') + '/chat';
}

function getMaxWordsForLevel(level: number): number {
	if (level <= 10) return 6;
	if (level <= 30) return 8;
	if (level <= 50) return 10;
	if (level <= 70) return 12;
	return 15;
}

function getLevelDifficulty(level: number): string {
	if (level <= 10) return 'Beginner - Very simple sentences';
	if (level <= 30) return 'Elementary - Simple everyday phrases';
	if (level <= 50) return 'Intermediate - More complex structures';
	if (level <= 70) return 'Upper Intermediate - Natural conversations';
	return 'Advanced - Complex grammar and vocabulary';
}

function constructSystemPrompt(level: number): string {
	return `You are an expert German language teacher.
Your goal is to generate unique, natural, and modern German sentences for a ${getLevelDifficulty(level)} level student.
ALWAYS return ONLY a raw JSON array. Do not wrap in markdown code blocks.`;
}

export function constructUserPrompt(
	scenarioName: string,
	scenarioDescription: string,
	count: number
): string {
	return `Topic: "${scenarioName}"
Specific Situation: "${scenarioDescription}"

Generate ${count} sentences that fit this specific situation.

Constraints:
1. Sentences must be unique and varied.
2. Ensure grammar is correct and natural.
3. Return ONLY a JSON array.

Format:
[
  {
    "text": "German sentence",
    "sentenceMeaning": "English translation",
    "words": [
      {"word": "GermanWord", "meaning": "EnglishMeaning"}
    ]
  }
]`;
}

async function callAPI(
	systemPrompt: string,
	userPrompt: string
): Promise<string> {
	const requestBody = {
		model: DEFAULT_MODEL,
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		],
		temperature: 1.2,
		response_format: { type: 'json_object' }
	};

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 300_000);

	try {
		const response = await fetch(getApiEndpoint(), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API call failed: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		return data.choices[0].message.content;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

function parseResponse(response: string): any[] {
	try {
		const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
		const parsed = JSON.parse(cleanJson);

		if (parsed.sentences && Array.isArray(parsed.sentences)) return parsed.sentences;
		if (Array.isArray(parsed)) return parsed;
		if (typeof parsed === 'object') {
			return Object.values(parsed).filter((v: any) => v?.text && v?.words);
		}
		if (parsed.text && parsed.words) return [parsed];

		return [];
	} catch (e) {
		console.error('JSON Parse Error', e);
		return [];
	}
}

function validateSentences(
	sentences: any[],
	maxWords: number,
	count: number,
	existingSentences: GeneratedSentence[]
): GeneratedSentence[] {
	const valid: GeneratedSentence[] = [];
	const existingTexts = new Set(existingSentences.map((s) => s.text.toLowerCase().trim()));

	for (const s of sentences) {
		if (!s.text) continue;
		const norm = s.text.toLowerCase().trim();

		if (existingTexts.has(norm)) continue;

		const words = s.text.split(' ');
		if (words.length > maxWords) {
			s.text = words.slice(0, maxWords).join(' ');
		}
		if (!s.sentenceMeaning) s.sentenceMeaning = s.text;
		if (!s.words) s.words = [];
		s.completed = false;

		valid.push(s);
		existingTexts.add(norm);

		if (valid.length >= count) break;
	}
	return valid;
}

function getFallbackSentences(): GeneratedSentence[] {
	return [
		{
			text: 'Hallo!',
			sentenceMeaning: 'Hello!',
			words: [{ word: 'Hallo', meaning: 'Hello' }],
			completed: false
		},
		{
			text: 'Danke!',
			sentenceMeaning: 'Thank you!',
			words: [{ word: 'Danke', meaning: 'Thank you' }],
			completed: false
		}
	];
}

/**
 * Generate sentences for a specific scenario and level.
 */
export async function generateScenarioSentences(
	level: number,
	scenarioName: string,
	scenarioDescription: string,
	sentenceCount: number = 5,
	existingSentences: GeneratedSentence[] = [],
	promptText: string | null = null
): Promise<GeneratedSentence[]> {
	const maxWords = getMaxWordsForLevel(level);
	const systemInstruction = constructSystemPrompt(level);
	const userPrompt =
		promptText || constructUserPrompt(scenarioName, scenarioDescription, sentenceCount);

	try {
		console.log('Asking DeepSeek...');
		const responseText = await callAPI(systemInstruction, userPrompt);
		const candidates = parseResponse(responseText);
		return validateSentences(candidates, maxWords, sentenceCount, existingSentences);
	} catch (error: any) {
		console.error('DeepSeek API Error:', error);
		const fallback = getFallbackSentences();
		(fallback as any).isFallback = true;
		(fallback as any).errorMessage = error.message;
		return fallback;
	}
}
