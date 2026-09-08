import { z } from 'zod';

/** Small pilot record; deliberately separate from German course tables and XP. */
export const HotelCompletionSchema = z.object({
	completedAt: z.string().datetime(), variant: z.enum(['lift', 'street']),
	hints: z.number().int().min(0).max(6)
});
export const HotelSubmissionSchema = z.object({
	variant: z.enum(['lift', 'street']),
	trail: z.array(z.string().min(1).max(30)).min(6).max(40),
	hints: z.number().int().min(0).max(6)
});
export type HotelCompletion = z.infer<typeof HotelCompletionSchema>;
