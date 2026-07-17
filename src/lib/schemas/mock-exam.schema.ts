/**
 * Goethe-Zertifikat A1 (Start Deutsch 1) mock-exam task model.
 *
 * This is the *exam-format* content model. It is deliberately SEPARATE from
 * the weekly-lesson exam (`stores/exam.ts` → ExamQuestion), which stays as-is
 * and drives daily-lesson practice. Mock exams reproduce the four official
 * modules and their task shapes:
 *
 *   Hören    (listening) — choice / true_false, with audio + play-count rules
 *   Lesen    (reading)   — true_false / choice over short texts & ads
 *   Schreiben (writing)  — form_fill (Teil 1) + free_write (Teil 2)
 *   Sprechen (speaking)  — speak_intro / speak_spell / speak_number (Teil 1),
 *                          speak_qa (Teil 2), speak_request (Teil 3)
 *
 * The task types are the reusable primitives; a full mock exam is a set of
 * these tagged by module + Teil. Formats are not copyrightable — every task
 * we author is original content written to the official format.
 *
 * Storage: each task is persisted as a JSONB `payload` (this discriminated
 * union) alongside denormalized `module` / `teil` / `kind` columns for
 * querying + ordering — mirroring how `basics_sections` stores composite
 * content as JSONB. `payload.id` is a stable human-authored task id (e.g.
 * "h1-1") used to key answers at runtime; it is distinct from the row UUID.
 */

import { z } from 'zod';

// ── Modules ───────────────────────────────────────────────────────────────
export const MOCK_EXAM_MODULES = ['hoeren', 'lesen', 'schreiben', 'sprechen'] as const;
export const MockExamModuleSchema = z.enum(MOCK_EXAM_MODULES);
export type MockExamModule = z.infer<typeof MockExamModuleSchema>;

// Fields shared by every task kind. Spread into each member below.
const taskBase = {
	/** Stable, human-authored id used to key answers (e.g. "h1-1"). */
	id: z.string(),
	module: MockExamModuleSchema,
	/** 1–3 — which part (Teil) of the module this task belongs to. */
	teil: z.number().int().min(1).max(3),
	/** Point value; form_fill scores per blank and ignores this. Default 1. */
	points: z.number().int().positive().default(1),
	/** Task instruction (Aufgabe) shown to the learner. */
	instruction: z.string().optional(),
	instructionFa: z.string().optional()
};

// ── Hören / Lesen: multiple choice (a/b/c) ────────────────────────────────
export const ChoiceTaskSchema = z.object({
	...taskBase,
	kind: z.literal('choice'),
	question: z.string(),
	questionFa: z.string().optional(),
	options: z.array(z.string()).min(2).max(4),
	correctIndex: z.number().int().nonnegative(),
	// Listening support:
	audioText: z.string().optional(), // spoken script (speaker A)
	audioTextB: z.string().optional(), // second speaker, for dialogues
	playLimit: z.number().int().min(1).max(2).optional(), // Hören plays: 1 or 2
	// Reading support:
	context: z.string().optional(), // short text / ad / notice to read
	contextFa: z.string().optional()
});
export type ChoiceTask = z.infer<typeof ChoiceTaskSchema>;

// ── Hören / Lesen: richtig oder falsch (true/false) ───────────────────────
export const TrueFalseTaskSchema = z.object({
	...taskBase,
	kind: z.literal('true_false'),
	statement: z.string(),
	statementFa: z.string().optional(),
	answer: z.boolean(),
	// Listening support (Hören Teil 2 — announcements, heard once):
	audioText: z.string().optional(),
	audioTextB: z.string().optional(),
	playLimit: z.number().int().min(1).max(2).optional(),
	// Reading support (Lesen Teil 1/3 — emails, signs):
	passage: z.string().optional(),
	passageFa: z.string().optional()
});
export type TrueFalseTask = z.infer<typeof TrueFalseTaskSchema>;

// ── Schreiben Teil 1: fill in a form ──────────────────────────────────────
export const FormFieldSchema = z.object({
	label: z.string(),
	labelFa: z.string().optional(),
	/** Expected value for a blank. Omit (or "") for a pre-given field. */
	answer: z.string().optional(),
	/** Pre-filled value shown to the learner (not scored). */
	given: z.string().optional()
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormFillTaskSchema = z.object({
	...taskBase,
	kind: z.literal('form_fill'),
	/** The text the learner reads to extract the answers. */
	sourceText: z.string(),
	sourceTextFa: z.string().optional(),
	fields: z.array(FormFieldSchema).min(1)
});
export type FormFillTask = z.infer<typeof FormFillTaskSchema>;

// ── Schreiben Teil 2: short guided message (~30 words, 3 Leitpunkte) ───────
export const FreeWriteTaskSchema = z.object({
	...taskBase,
	kind: z.literal('free_write'),
	situation: z.string(),
	situationFa: z.string().optional(),
	/** The three content points the learner must address. */
	contentPoints: z.array(z.string()).length(3),
	contentPointsFa: z.array(z.string()).optional(),
	minWords: z.number().int().positive().default(30)
});
export type FreeWriteTask = z.infer<typeof FreeWriteTaskSchema>;

// ── Sprechen Teil 1: introduce yourself ───────────────────────────────────
export const SpeakIntroTaskSchema = z.object({
	...taskBase,
	kind: z.literal('speak_intro'),
	/** Prompts: Name, Alter, Land, Wohnort, Sprachen, Beruf, Hobby. */
	fields: z.array(z.string()).min(1),
	fieldsFa: z.array(z.string()).optional()
});
export type SpeakIntroTask = z.infer<typeof SpeakIntroTaskSchema>;

// ── Sprechen Teil 1: spell a word aloud (buchstabieren) ───────────────────
export const SpeakSpellTaskSchema = z.object({
	...taskBase,
	kind: z.literal('speak_spell'),
	word: z.string(),
	/** Spoken letter-name sequence, e.g. "Es A Er A" for SARA. */
	expected: z.string()
});
export type SpeakSpellTask = z.infer<typeof SpeakSpellTaskSchema>;

// ── Sprechen Teil 1: say a number / phone number aloud ────────────────────
export const SpeakNumberTaskSchema = z.object({
	...taskBase,
	kind: z.literal('speak_number'),
	digits: z.string(), // e.g. "0176 3345 21"
	/** Optional expected German words; falls back to `digits`. */
	spoken: z.string().optional()
});
export type SpeakNumberTask = z.infer<typeof SpeakNumberTaskSchema>;

// ── Sprechen Teil 2: form a question from a theme + word card ──────────────
export const SpeakQATaskSchema = z.object({
	...taskBase,
	kind: z.literal('speak_qa'),
	theme: z.string(), // e.g. "Einkaufen"
	themeFa: z.string().optional(),
	word: z.string(), // e.g. "Brot" — build a question with it
	wordFa: z.string().optional(),
	/** A model valid question, for feedback. */
	sample: z.string(),
	/** Keywords for lightweight scoring before AI grading lands. */
	keywords: z.array(z.string()).optional()
});
export type SpeakQATask = z.infer<typeof SpeakQATaskSchema>;

// ── Sprechen Teil 3: formulate a request (Bitte / Frage) ──────────────────
export const SpeakRequestTaskSchema = z.object({
	...taskBase,
	kind: z.literal('speak_request'),
	situation: z.string(),
	situationFa: z.string().optional(),
	sample: z.string(),
	keywords: z.array(z.string()).optional()
});
export type SpeakRequestTask = z.infer<typeof SpeakRequestTaskSchema>;

// ── The task union ────────────────────────────────────────────────────────
export const MockExamTaskSchema = z.discriminatedUnion('kind', [
	ChoiceTaskSchema,
	TrueFalseTaskSchema,
	FormFillTaskSchema,
	FreeWriteTaskSchema,
	SpeakIntroTaskSchema,
	SpeakSpellTaskSchema,
	SpeakNumberTaskSchema,
	SpeakQATaskSchema,
	SpeakRequestTaskSchema
]);
export type MockExamTask = z.infer<typeof MockExamTaskSchema>;
export type MockExamTaskKind = MockExamTask['kind'];

/** Kinds gradable deterministically now (no AI/STT judgement needed). */
export const OBJECTIVE_KINDS = ['choice', 'true_false', 'form_fill'] as const;
/** Kinds graded via speech recognition against an expected utterance. */
export const SPEECH_KINDS = ['speak_spell', 'speak_number'] as const;
/** Kinds needing AI / examiner judgement (free_write, open speaking). */
export const SUBJECTIVE_KINDS = ['free_write', 'speak_intro', 'speak_qa', 'speak_request'] as const;

// ── DB row schemas ────────────────────────────────────────────────────────

/** `mock_exams` — one row per full exam paper. */
export const MockExamRowSchema = z.object({
	id: z.string().uuid(),
	slug: z.string(),
	level: z.string(), // 'A1' (future: 'A2', 'B1')
	title: z.string(),
	title_fa: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	description_fa: z.string().nullable().optional(),
	sort_order: z.number().int().nullable().optional(),
	is_published: z.boolean().nullable().optional()
});
export type MockExamRow = z.infer<typeof MockExamRowSchema>;

/** `mock_exam_tasks` — one row per task; `payload` holds the task union. */
export const MockExamTaskRowSchema = z.object({
	id: z.string().uuid(),
	mock_exam_id: z.string().uuid(),
	module: MockExamModuleSchema,
	teil: z.number().int(),
	kind: z.string(),
	sort_order: z.number().int().nullable().optional(),
	payload: MockExamTaskSchema
});
export type MockExamTaskRow = z.infer<typeof MockExamTaskRowSchema>;

/** Per-module scaled score (each module is scaled to 25 → 100 total). */
export const ModuleScoreSchema = z.object({
	raw: z.number(),
	possible: z.number(),
	scaled: z.number()
});
export type ModuleScore = z.infer<typeof ModuleScoreSchema>;

/** `mock_exam_results` — one row per attempt. Separate from `exam_results`
 *  (weekly exams) so slug-based mock analytics stay clean. */
export const MockExamResultRowSchema = z.object({
	mock_exam_slug: z.string(),
	level: z.string(),
	total: z.number().int().nonnegative(), // 0–100
	passed: z.boolean(),
	module_scores: z.record(z.string(), ModuleScoreSchema),
	wrong_answers: z.array(z.unknown()).nullable().optional(),
	taken_at: z.number()
});
export type MockExamResultRow = z.infer<typeof MockExamResultRowSchema>;
