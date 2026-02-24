/**
 * Zod schemas for user_vocabulary Supabase table responses.
 */

import { z } from 'zod';

export const VocabularyRowSchema = z.object({
	word: z.string(),
	meaning_en: z.string(),
	meaning_fa: z.string(),
	saved_at: z.number(),
	known: z.boolean()
});

export type VocabularyRow = z.infer<typeof VocabularyRowSchema>;
