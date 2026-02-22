/**
 * Zod schemas for exam_results Supabase table responses.
 */

import { z } from 'zod';

export const ExamResultRowSchema = z.object({
	week_number: z.number().int().positive(),
	score: z.number().int().nonnegative(),
	total: z.number().int().positive(),
	percentage: z.number().min(0).max(100),
	taken_at: z.number(),
	wrong_answers: z.array(z.unknown()).nullable().optional()
});

export type ExamResultRow = z.infer<typeof ExamResultRowSchema>;
