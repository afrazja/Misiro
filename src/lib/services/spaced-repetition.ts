/**
 * Spaced Repetition Service — SM-2 inspired algorithm.
 * Each sentence gets ease, interval, and next review date.
 * Extracted from app.js SR functions.
 */

import { loadSRData, saveSRData, recordSRAttempt as dataLayerRecordSR } from './data-layer';
import type { SRCard } from './data-layer';

const SR_MIN_EASE = 1.3;
const SR_INITIAL_INTERVAL = 1; // 1 day

function getSRKey(day: number, sentenceId: number): string {
	return `${day}:${sentenceId}`;
}

/**
 * Record a practice attempt and update the SR card.
 * Uses SM-2 algorithm: ease factor 1.3–5.0, intervals 1→3→interval*ease days.
 */
export async function recordSRAttempt(
	day: number,
	sentenceId: number,
	wasCorrect: boolean
): Promise<void> {
	const srData = await loadSRData();
	const key = getSRKey(day, sentenceId);
	const now = Date.now();

	if (!srData[key]) {
		srData[key] = {
			ease: 2.5,
			interval: SR_INITIAL_INTERVAL,
			nextReview: 0,
			attempts: 0,
			successes: 0
		};
	}

	const card = srData[key];
	card.attempts++;

	if (wasCorrect) {
		card.successes++;
		if (card.interval === 1) {
			card.interval = 3;
		} else {
			card.interval = Math.round(card.interval * card.ease);
		}
		card.ease = Math.max(SR_MIN_EASE, card.ease + 0.1);
	} else {
		card.interval = SR_INITIAL_INTERVAL;
		card.ease = Math.max(SR_MIN_EASE, card.ease - 0.2);
	}

	// Set next review date (interval days from now)
	card.nextReview = now + card.interval * 24 * 60 * 60 * 1000;
	card.lastReview = now;

	srData[key] = card;
	await saveSRData(srData);

	// Also sync individual card to cloud
	await dataLayerRecordSR(day, sentenceId, card);
}

/**
 * Get all items due for review (nextReview <= now, at least 1 attempt).
 * Sorted by lowest ease first (hardest items reviewed first).
 */
export async function getDueReviewItems(): Promise<
	Array<{
		key: string;
		day: number;
		sentenceId: number;
		ease: number;
		interval: number;
		attempts: number;
		successes: number;
	}>
> {
	const srData = await loadSRData();
	const now = Date.now();
	const due: Array<{
		key: string;
		day: number;
		sentenceId: number;
		ease: number;
		interval: number;
		attempts: number;
		successes: number;
	}> = [];

	for (const key in srData) {
		const card = srData[key];
		if (card.nextReview <= now && card.attempts > 0) {
			const [day, sentenceId] = key.split(':').map(Number);
			due.push({
				key,
				day,
				sentenceId,
				ease: card.ease,
				interval: card.interval,
				attempts: card.attempts,
				successes: card.successes
			});
		}
	}

	// Sort: lowest ease first (hardest items first)
	due.sort((a, b) => a.ease - b.ease);
	return due;
}

/**
 * Get count of items due for review.
 */
export async function getDueCount(): Promise<number> {
	return (await getDueReviewItems()).length;
}

export type { SRCard };
