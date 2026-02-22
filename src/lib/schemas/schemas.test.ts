import { describe, it, expect } from 'vitest';
import {
	LessonRowSchema,
	LessonDetailRowSchema,
	SentenceRowSchema,
	GlossaryRowSchema
} from './lesson.schema';
import {
	UserProfileLanguageRowSchema,
	UserProfileVoiceSpeedRowSchema,
	UserProfileRowSchema,
	UserProgressRowSchema,
	UserProgressFullRowSchema,
	CompletedLessonsRowSchema
} from './user.schema';
import { SRCardRowSchema } from './sr.schema';
import { ExamResultRowSchema } from './exam.schema';

// ── LessonRowSchema ───────────────────────────────────────────────────────────

describe('LessonRowSchema', () => {
	const valid = { day: 1, title: 'Intro', title_fa: null, group: 'basics', sort_order: 1 };

	it('accepts a valid lesson row', () => {
		const result = LessonRowSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('accepts missing sort_order (optional)', () => {
		const { sort_order, ...rest } = valid;
		expect(LessonRowSchema.safeParse(rest).success).toBe(true);
	});

	it('accepts null title_fa', () => {
		expect(LessonRowSchema.safeParse({ ...valid, title_fa: null }).success).toBe(true);
	});

	it('rejects day = 0 (must be positive)', () => {
		expect(LessonRowSchema.safeParse({ ...valid, day: 0 }).success).toBe(false);
	});

	it('rejects missing title', () => {
		const { title, ...rest } = valid;
		expect(LessonRowSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects non-integer day', () => {
		expect(LessonRowSchema.safeParse({ ...valid, day: 1.5 }).success).toBe(false);
	});

	it('strips unknown extra fields', () => {
		const result = LessonRowSchema.safeParse({ ...valid, extra_col: 'ignored' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect('extra_col' in result.data).toBe(false);
		}
	});
});

// ── LessonDetailRowSchema ─────────────────────────────────────────────────────

describe('LessonDetailRowSchema', () => {
	const valid = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', title: 'Day 1', title_fa: 'روز ۱' };

	it('accepts a valid lesson detail row', () => {
		expect(LessonDetailRowSchema.safeParse(valid).success).toBe(true);
	});

	it('rejects invalid UUID', () => {
		expect(LessonDetailRowSchema.safeParse({ ...valid, id: 'not-a-uuid' }).success).toBe(false);
	});

	it('accepts null title_fa', () => {
		expect(LessonDetailRowSchema.safeParse({ ...valid, title_fa: null }).success).toBe(true);
	});

	it('rejects missing id', () => {
		const { id, ...rest } = valid;
		expect(LessonDetailRowSchema.safeParse(rest).success).toBe(false);
	});
});

// ── SentenceRowSchema ─────────────────────────────────────────────────────────

describe('SentenceRowSchema', () => {
	const valid = {
		sentence_order: 0,
		role: 'sent',
		audio_text: null,
		target_text: 'Guten Morgen',
		translation: 'Good morning',
		translation_fa: null
	};

	it('accepts a valid sent sentence', () => {
		expect(SentenceRowSchema.safeParse(valid).success).toBe(true);
	});

	it('accepts a received sentence with audio_text', () => {
		const received = { ...valid, role: 'received', audio_text: 'Hallo!', target_text: null };
		expect(SentenceRowSchema.safeParse(received).success).toBe(true);
	});

	it('rejects an unknown role', () => {
		expect(SentenceRowSchema.safeParse({ ...valid, role: 'unknown' }).success).toBe(false);
	});

	it('rejects negative sentence_order', () => {
		expect(SentenceRowSchema.safeParse({ ...valid, sentence_order: -1 }).success).toBe(false);
	});

	it('rejects missing translation', () => {
		const { translation, ...rest } = valid;
		expect(SentenceRowSchema.safeParse(rest).success).toBe(false);
	});
});

// ── GlossaryRowSchema ─────────────────────────────────────────────────────────

describe('GlossaryRowSchema', () => {
	const valid = { word: 'hallo', en: 'hello', fa: 'سلام' };

	it('accepts a valid glossary row', () => {
		expect(GlossaryRowSchema.safeParse(valid).success).toBe(true);
	});

	it('rejects missing en translation', () => {
		const { en, ...rest } = valid;
		expect(GlossaryRowSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects missing fa translation', () => {
		const { fa, ...rest } = valid;
		expect(GlossaryRowSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects missing word', () => {
		const { word, ...rest } = valid;
		expect(GlossaryRowSchema.safeParse(rest).success).toBe(false);
	});
});

// ── UserProfileLanguageRowSchema ──────────────────────────────────────────────

describe('UserProfileLanguageRowSchema', () => {
	it('accepts language: "en"', () => {
		expect(UserProfileLanguageRowSchema.safeParse({ language: 'en' }).success).toBe(true);
	});

	it('accepts language: null', () => {
		expect(UserProfileLanguageRowSchema.safeParse({ language: null }).success).toBe(true);
	});

	it('rejects language as a number', () => {
		expect(UserProfileLanguageRowSchema.safeParse({ language: 42 }).success).toBe(false);
	});
});

// ── UserProfileVoiceSpeedRowSchema ────────────────────────────────────────────

describe('UserProfileVoiceSpeedRowSchema', () => {
	it('accepts voice_speed: 1.0', () => {
		expect(UserProfileVoiceSpeedRowSchema.safeParse({ voice_speed: 1.0 }).success).toBe(true);
	});

	it('accepts voice_speed: null', () => {
		expect(UserProfileVoiceSpeedRowSchema.safeParse({ voice_speed: null }).success).toBe(true);
	});

	it('rejects voice_speed as a string', () => {
		expect(UserProfileVoiceSpeedRowSchema.safeParse({ voice_speed: '1.0' }).success).toBe(false);
	});
});

// ── UserProfileRowSchema ──────────────────────────────────────────────────────

describe('UserProfileRowSchema', () => {
	const valid = {
		id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
		language: 'en',
		voice_speed: 1.0,
		display_name: 'Alice',
		avatar_url: null
	};

	it('accepts a full valid profile', () => {
		expect(UserProfileRowSchema.safeParse(valid).success).toBe(true);
	});

	it('accepts all optional fields missing', () => {
		expect(UserProfileRowSchema.safeParse({ id: valid.id }).success).toBe(true);
	});

	it('rejects invalid UUID', () => {
		expect(UserProfileRowSchema.safeParse({ ...valid, id: 'bad' }).success).toBe(false);
	});
});

// ── UserProgressRowSchema ─────────────────────────────────────────────────────

describe('UserProgressRowSchema', () => {
	const valid = { current_day: 3, current_sentence_index: 2, last_saved: 1700000000000 };

	it('accepts valid progress', () => {
		expect(UserProgressRowSchema.safeParse(valid).success).toBe(true);
	});

	it('rejects current_day = 0', () => {
		expect(UserProgressRowSchema.safeParse({ ...valid, current_day: 0 }).success).toBe(false);
	});

	it('rejects negative sentence index', () => {
		expect(UserProgressRowSchema.safeParse({ ...valid, current_sentence_index: -1 }).success).toBe(false);
	});

	it('rejects missing last_saved', () => {
		const { last_saved, ...rest } = valid;
		expect(UserProgressRowSchema.safeParse(rest).success).toBe(false);
	});
});

// ── UserProgressFullRowSchema ─────────────────────────────────────────────────

describe('UserProgressFullRowSchema', () => {
	const valid = {
		current_day: 1,
		current_sentence_index: 0,
		last_saved: 1700000000000,
		completed_lessons: { '1': { completedAt: 123, sentenceCount: 5 } }
	};

	it('accepts progress with completed_lessons', () => {
		expect(UserProgressFullRowSchema.safeParse(valid).success).toBe(true);
	});

	it('accepts null completed_lessons', () => {
		expect(UserProgressFullRowSchema.safeParse({ ...valid, completed_lessons: null }).success).toBe(true);
	});

	it('accepts missing completed_lessons', () => {
		const { completed_lessons, ...rest } = valid;
		expect(UserProgressFullRowSchema.safeParse(rest).success).toBe(true);
	});
});

// ── CompletedLessonsRowSchema ─────────────────────────────────────────────────

describe('CompletedLessonsRowSchema', () => {
	it('accepts a completed_lessons record', () => {
		const result = CompletedLessonsRowSchema.safeParse({
			completed_lessons: { '1': { completedAt: 1, sentenceCount: 5 } }
		});
		expect(result.success).toBe(true);
	});

	it('accepts null completed_lessons', () => {
		expect(CompletedLessonsRowSchema.safeParse({ completed_lessons: null }).success).toBe(true);
	});
});

// ── SRCardRowSchema ───────────────────────────────────────────────────────────

describe('SRCardRowSchema', () => {
	const valid = {
		day: 1,
		sentence_id: 2,
		ease: 2.5,
		interval_days: 3,
		next_review: 1700000000000,
		attempts: 5,
		successes: 4,
		last_review: 1699000000000
	};

	it('accepts a valid SR card', () => {
		expect(SRCardRowSchema.safeParse(valid).success).toBe(true);
	});

	it('accepts null last_review', () => {
		expect(SRCardRowSchema.safeParse({ ...valid, last_review: null }).success).toBe(true);
	});

	it('rejects ease below 1.3', () => {
		expect(SRCardRowSchema.safeParse({ ...valid, ease: 1.0 }).success).toBe(false);
	});

	it('rejects ease above 5.0', () => {
		expect(SRCardRowSchema.safeParse({ ...valid, ease: 5.1 }).success).toBe(false);
	});

	it('rejects zero interval_days', () => {
		expect(SRCardRowSchema.safeParse({ ...valid, interval_days: 0 }).success).toBe(false);
	});

	it('rejects negative attempts', () => {
		expect(SRCardRowSchema.safeParse({ ...valid, attempts: -1 }).success).toBe(false);
	});

	it('rejects day = 0', () => {
		expect(SRCardRowSchema.safeParse({ ...valid, day: 0 }).success).toBe(false);
	});

	it('strips extra fields (user_id from select *)', () => {
		const withUserId = { ...valid, user_id: 'some-uuid' };
		const result = SRCardRowSchema.safeParse(withUserId);
		expect(result.success).toBe(true);
		if (result.success) {
			expect('user_id' in result.data).toBe(false);
		}
	});
});

// ── ExamResultRowSchema ───────────────────────────────────────────────────────

describe('ExamResultRowSchema', () => {
	const valid = {
		week_number: 1,
		score: 8,
		total: 10,
		percentage: 80,
		taken_at: 1700000000000,
		wrong_answers: []
	};

	it('accepts a valid exam result', () => {
		expect(ExamResultRowSchema.safeParse(valid).success).toBe(true);
	});

	it('accepts null wrong_answers', () => {
		expect(ExamResultRowSchema.safeParse({ ...valid, wrong_answers: null }).success).toBe(true);
	});

	it('accepts missing wrong_answers (optional)', () => {
		const { wrong_answers, ...rest } = valid;
		expect(ExamResultRowSchema.safeParse(rest).success).toBe(true);
	});

	it('rejects week_number = 0', () => {
		expect(ExamResultRowSchema.safeParse({ ...valid, week_number: 0 }).success).toBe(false);
	});

	it('rejects percentage above 100', () => {
		expect(ExamResultRowSchema.safeParse({ ...valid, percentage: 101 }).success).toBe(false);
	});

	it('rejects negative score', () => {
		expect(ExamResultRowSchema.safeParse({ ...valid, score: -1 }).success).toBe(false);
	});

	it('rejects total = 0', () => {
		expect(ExamResultRowSchema.safeParse({ ...valid, total: 0 }).success).toBe(false);
	});

	it('rejects missing taken_at', () => {
		const { taken_at, ...rest } = valid;
		expect(ExamResultRowSchema.safeParse(rest).success).toBe(false);
	});
});
