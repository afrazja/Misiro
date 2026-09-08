import { writable } from 'svelte/store';

export type Language = 'en' | 'fa';
import type { TargetLanguage } from '$lib/courses';
export type { TargetLanguage } from '$lib/courses';

export interface PreferencesState {
	language: Language;
	voiceSpeed: number;
	blindMode: boolean;
	targetLanguage: TargetLanguage;
}

const initialState: PreferencesState = {
	language: 'en',
	voiceSpeed: 1.0,
	blindMode: false,
	targetLanguage: 'de'
};

export const preferencesStore = writable<PreferencesState>(initialState);
