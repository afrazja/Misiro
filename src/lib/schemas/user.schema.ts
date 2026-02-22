/**
 * Zod schemas for user-related Supabase table responses.
 * Covers user_profiles and user_progress tables.
 */

import { z } from 'zod';

// ── user_profiles table ───────────────────────────────────────────────────────

export const UserProfileRowSchema = z.object({
	id: z.string().uuid(),
	language: z.string().nullable().optional(),
	voice_speed: z.number().nullable().optional(),
	display_name: z.string().nullable().optional(),
	avatar_url: z.string().nullable().optional()
});

export type UserProfileRow = z.infer<typeof UserProfileRowSchema>;

// Partial profile for specific column selections
export const UserProfileLanguageRowSchema = z.object({
	language: z.string().nullable()
});

export const UserProfileVoiceSpeedRowSchema = z.object({
	voice_speed: z.number().nullable()
});

// ── user_progress table ───────────────────────────────────────────────────────

export const UserProgressRowSchema = z.object({
	current_day: z.number().int().positive(),
	current_sentence_index: z.number().int().nonnegative(),
	last_saved: z.number()
});

export type UserProgressRow = z.infer<typeof UserProgressRowSchema>;

// Progress row including the completed_lessons JSON column
export const UserProgressFullRowSchema = z.object({
	current_day: z.number().int().positive(),
	current_sentence_index: z.number().int().nonnegative(),
	last_saved: z.number(),
	completed_lessons: z.record(z.string(), z.unknown()).nullable().optional()
});

export type UserProgressFullRow = z.infer<typeof UserProgressFullRowSchema>;

export const CompletedLessonsRowSchema = z.object({
	completed_lessons: z.record(z.string(), z.unknown()).nullable()
});

export type CompletedLessonsRow = z.infer<typeof CompletedLessonsRowSchema>;
