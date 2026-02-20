/**
 * Basics type definitions — shared between app pages and admin panel.
 */

export interface BilingualText {
	en: string;
	fa: string;
}

export interface BasicWord {
	german: string;
	en: string;
	fa: string;
	example?: string;
	example_en?: string;
	example_fa?: string;
	// legacy camelCase aliases (from static basics.ts)
	exampleEn?: string;
	exampleFa?: string;
}

export interface ConjugationForm {
	pronoun: string;
	verb: string;
	en: string;
	fa: string;
	example?: string;
	exampleEn?: string;
	exampleFa?: string;
}

export interface ConjugationTense {
	name: BilingualText;
	forms: ConjugationForm[];
}

export interface BasicSection {
	id?: string;
	heading_en: string;
	heading_fa: string;
	type: 'table' | 'grid' | 'conjugation';
	sort_order?: number;
	words?: BasicWord[];
	infinitive?: { german: string; en: string; fa: string };
	tenses?: ConjugationTense[];
}

export interface BasicCategory {
	id?: string;
	key: string;
	icon: string;
	title_en: string;
	title_fa: string;
	description_en: string;
	description_fa: string;
	type: 'grid' | 'multi' | 'table' | 'conjugation';
	sort_order?: number;
}
