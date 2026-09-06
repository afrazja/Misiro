import type { Sentence } from '$stores/lesson';

export interface LessonContent {
	day: number;
	title: string;
	version: string;
	sentences: Sentence[];
}

/** Stable identifier of authored dialogue, not learner text. Identical in browser/server. */
export function lessonVersion(sentences: Sentence[]): string {
	const source = JSON.stringify(sentences.map(s => [s.id, s.role, s.audioText ?? '', s.targetText ?? '',
		s.translation, s.translationFa ?? '', s.hint ?? '', s.hintFa ?? '', s.difficulty ?? '']));
	let a = 0x811c9dc5, b = 0x9e3779b9;
	for (let i = 0; i < source.length; i++) {
		a = Math.imul(a ^ source.charCodeAt(i), 0x01000193);
		b = Math.imul(b ^ source.charCodeAt(i), 0x85ebca6b);
	}
	return `d1-${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
