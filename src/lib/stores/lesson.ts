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
}

export interface Lesson {
	title: string;
	titleFa?: string;
	sentences: Sentence[];
	description?: string;
	descriptionFa?: string;
	grammarFocus?: string;
	grammarFocusFa?: string;
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
