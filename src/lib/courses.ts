/** Course availability is separate from the English/Persian interface language.
 * French stays unavailable until its content, audio and progress storage are ready.
 */
export const COURSES = [
	{ code: 'de', nativeName: 'Deutsch', name: { en: 'German', fa: 'آلمانی' }, available: true,
		description: { en: 'Build everyday conversation skills with listening, speaking and daily lessons.', fa: 'با شنیدن، صحبت کردن و درس‌های روزانه، مکالمه‌های روزمره را تمرین کن.' } },
	{ code: 'fr', nativeName: 'Français', name: { en: 'French', fa: 'فرانسوی' }, available: false,
		description: { en: 'French is coming to Mirifer. Lessons are not available yet.', fa: 'فرانسوی به میریفر اضافه خواهد شد. درس‌های آن هنوز آماده نیستند.' } }
] as const;

export type TargetLanguage = (typeof COURSES)[number]['code'];

export function getCourse(code: unknown) {
	return COURSES.find(course => course.code === code) ?? null;
}

export function isAvailableCourse(code: unknown): code is TargetLanguage {
	return getCourse(code)?.available === true;
}

/** These routes currently contain the German course, including deep links. */
export function needsCourse(pathname: string): boolean {
	return ['/home', '/lesson', '/lessons', '/review', '/vocabulary', '/drill', '/check-in']
		.some(route => pathname === route || pathname.startsWith(`${route}/`));
}
