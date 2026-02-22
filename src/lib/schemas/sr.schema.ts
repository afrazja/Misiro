/**
 * Zod schemas for spaced_repetition Supabase table responses.
 */

import { z } from 'zod';

export const SRCardRowSchema = z.object({
	day: z.number().int().positive(),
	sentence_id: z.number().int().positive(),
	ease: z.number().min(1.3).max(5.0),
	interval_days: z.number().int().positive(),
	next_review: z.number(),
	attempts: z.number().int().nonnegative(),
	successes: z.number().int().nonnegative(),
	last_review: z.number().nullable()
});

export type SRCardRow = z.infer<typeof SRCardRowSchema>;
