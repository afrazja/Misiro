import { writable } from 'svelte/store';

export type Language = 'en' | 'fa';

export interface PreferencesState {
	language: Language;
	voiceSpeed: number;
	blindMode: boolean;
}

const initialState: PreferencesState = {
	language: 'en',
	voiceSpeed: 1.0,
	blindMode: false
};

export const preferencesStore = writable<PreferencesState>(initialState);
