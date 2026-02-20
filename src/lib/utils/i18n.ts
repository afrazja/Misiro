/**
 * Internationalization utilities — helpers for bilingual text.
 * Extracted from app.js getTranslation() and getTranslationLang().
 */

import type { Language } from '$stores/preferences';
import type { Sentence } from '$stores/lesson';

/**
 * Get the appropriate translation for a sentence based on current language.
 * Persian (fa) → translationFa; English (en) → translation.
 */
export function getTranslation(step: Sentence, language: Language): string {
	if (language === 'fa' && step.translationFa) {
		return step.translationFa;
	}
	return step.translation;
}

/**
 * Get the BCP-47 language code for the translation language.
 */
export function getTranslationLang(language: Language): string {
	return language === 'fa' ? 'fa-IR' : 'en-US';
}

/**
 * Get text direction for the current language.
 */
export function getTextDirection(language: Language): 'rtl' | 'ltr' {
	return language === 'fa' ? 'rtl' : 'ltr';
}

/**
 * Check if the current language is Persian (for RTL layout).
 */
export function isFarsi(language: Language): boolean {
	return language === 'fa';
}
