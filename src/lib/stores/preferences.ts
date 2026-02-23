import { writable } from 'svelte/store';

export type Language = 'en' | 'fa';
export type TargetLanguage = 'de' | 'fr';

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
