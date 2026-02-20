import { writable } from 'svelte/store';

export interface Sentence {
	id: number;
	role: 'received' | 'sent';
	audioText?: string;
	targetText?: string;
	translation: string;
	translationFa?: string;
}

export interface Lesson {
	title: string;
	titleFa?: string;
	sentences: Sentence[];
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
