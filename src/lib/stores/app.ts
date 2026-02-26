import { writable } from 'svelte/store';

export interface CompletedLesson {
	completedAt: number;
	sentenceCount: number;
}

export interface AppState {
	currentDay: number;
	currentSentenceIndex: number;
	sessionID: number;
	completedLessons: Record<number, CompletedLesson>;
	isListening: boolean;
	xp: number;
}

const initialState: AppState = {
	currentDay: 1,
	currentSentenceIndex: 0,
	sessionID: 0,
	completedLessons: {},
	isListening: false,
	xp: 0
};

export const appStore = writable<AppState>(initialState);
