import { writable } from 'svelte/store';

export interface Sentence {
	id: number;
	role: 'received' | 'sent';
	audioText?: string;
	targetText?: string;
	translation: string;
	translationFa?: string;
	hint?: string;
	hintFa?: string;
	difficulty?: string;
}

/** Example line in a grammar moment — German plus optional glosses. */
export interface GrammarExample {
	de: string;
	en?: string;
	fa?: string;
}

/**
 * The end-of-lesson "grammar moment": one rule, consolidated after the
 * learner has already used it in conversation. `basicsKey` deep-links into
 * a Basics category for the full reference.
 */
export interface GrammarNote {
	title: string;
	titleFa?: string;
	explanation: string;
	explanationFa?: string;
	examples?: GrammarExample[];
	basicsKey?: string;
}

export interface Lesson {
	title: string;
	titleFa?: string;
	sentences: Sentence[];
	description?: string;
	descriptionFa?: string;
	grammarFocus?: string;
	grammarFocusFa?: string;
	grammarNote?: GrammarNote;
	difficulty?: string;
}

export interface LessonState {
	currentLesson: Lesson | null;
	glossary: Record<string, { en: string; fa: string }>;
	isLoading: boolean;
}

const initialState: LessonState = {
	currentLesson: null,
	glossary: {},
	isLoading: false
};

export const lessonStore = writable<LessonState>(initialState);
