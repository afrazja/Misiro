/**
 * A1 self-test, Persian-first.
 *
 * Deliberately not a fork of /placement. That page is an in-app diagnostic
 * wired to readiness scoring, auth, adaptive item selection and the
 * microphone; it is 1,129 lines and entirely in English. What has to survive
 * being pasted into a Telegram channel is the opposite: no signup, no mic
 * permission, no Supabase round-trip, and small enough to open on a slow
 * mobile connection.
 *
 * So the bank is static and self-contained. Every item is answerable from A1
 * knowledge alone, and each one targets a distinct thing the Goethe A1 exam
 * actually tests rather than trivia.
 *
 * Where a question happens to sit on a Persian-L1 difficulty, `note` says so
 * — grammatical gender and the accusative have no Persian equivalent, and
 * that is worth telling the learner instead of just marking them wrong.
 */

export type TopicId =
	| 'artikel'
	| 'verb'
	| 'wortstellung'
	| 'kasus'
	| 'negation'
	| 'alltag';

export interface Topic {
	id: TopicId;
	/** Persian label, shown in the per-topic breakdown. */
	fa: string;
}

export const TOPICS: Record<TopicId, Topic> = {
	artikel: { id: 'artikel', fa: 'حروف تعریف و جنسیت' },
	verb: { id: 'verb', fa: 'صرف فعل' },
	wortstellung: { id: 'wortstellung', fa: 'ترتیب کلمات' },
	kasus: { id: 'kasus', fa: 'حالت‌ها (آکوزاتیو)' },
	negation: { id: 'negation', fa: 'منفی کردن' },
	alltag: { id: 'alltag', fa: 'زبان روزمره' }
};

export interface Question {
	id: string;
	topic: TopicId;
	/** The Persian prompt — what the learner is being asked to do. */
	prompt: string;
	/** The German material. Rendered LTR inside the RTL page. */
	german: string;
	options: string[];
	/** Index into `options`. */
	answer: number;
	/** Persian explanation, shown after answering whether right or wrong. */
	why: string;
	/** Set when the item sits on a known Persian-L1 difficulty. */
	note?: string;
}

export const QUESTIONS: Question[] = [
	{
		id: 'q1',
		topic: 'artikel',
		prompt: 'کدام حرف تعریف درست است؟',
		german: '___ Tisch ist groß.',
		options: ['Der', 'Die', 'Das'],
		answer: 0,
		why: '«Tisch» (میز) مذکر است، پس «der Tisch». جنسیت کلمه را باید همراه خودِ کلمه حفظ کنی.',
		note: 'فارسی جنسیت دستوری ندارد، برای همین این سخت‌ترین بخش شروع آلمانی برای ماست.'
	},
	{
		id: 'q2',
		topic: 'verb',
		prompt: 'فعل را درست صرف کن:',
		german: 'Ich ___ aus dem Iran.',
		options: ['bin', 'bist', 'ist'],
		answer: 0,
		why: 'فعل «sein» با «ich» می‌شود «bin». این پرکاربردترین فعل آلمانی است.'
	},
	{
		id: 'q3',
		topic: 'verb',
		prompt: 'کدام شکل درست است؟',
		german: 'Du ___ in Berlin.',
		options: ['wohne', 'wohnst', 'wohnt'],
		answer: 1,
		why: 'با «du» به فعل «‎-st» اضافه می‌شود: du wohnst.'
	},
	{
		id: 'q4',
		topic: 'alltag',
		prompt: 'برای پرسیدن اسم کسی چه می‌گویی؟',
		german: '___ heißt du?',
		options: ['Wo', 'Wie', 'Was'],
		answer: 1,
		why: 'آلمانی می‌پرسد «Wie heißt du?» یعنی لفظاً «چطور نامیده می‌شوی؟» — نه «چه».',
		note: 'ترجمهٔ لفظی از فارسی («چه اسمی داری») اینجا جواب نمی‌دهد.'
	},
	{
		id: 'q5',
		topic: 'kasus',
		prompt: 'کدام درست است؟',
		german: 'Ich habe ___ Bruder.',
		options: ['ein', 'einen', 'eine'],
		answer: 1,
		why: 'مفعولِ مستقیم در حالت آکوزاتیو است و مذکر در آکوزاتیو می‌شود «einen».',
		note: 'فارسی برای مفعول «را» می‌گذارد؛ آلمانی به‌جایش شکل حرف تعریف را عوض می‌کند.'
	},
	{
		id: 'q6',
		topic: 'negation',
		prompt: 'جمله را منفی کن:',
		german: 'Ich habe ___ Zeit.',
		options: ['nicht', 'keine', 'kein'],
		answer: 1,
		why: 'اسمِ بدون حرف تعریف با «kein» منفی می‌شود و «Zeit» مؤنث است، پس «keine Zeit».'
	},
	{
		id: 'q7',
		topic: 'wortstellung',
		prompt: 'ترتیب درست کدام است؟',
		german: 'Morgen ___ ich nach Hamburg.',
		options: ['fahre', 'ich fahre', 'fahren'],
		answer: 0,
		why: 'فعل همیشه جایگاه دوم جمله است. چون «Morgen» اول آمده، فعل بلافاصله بعد از آن می‌آید و فاعل می‌رود بعد از فعل.',
		note: 'در فارسی فعل معمولاً آخر جمله است — این عادت باید کاملاً عوض شود.'
	},
	{
		id: 'q8',
		topic: 'verb',
		prompt: 'کدام درست است؟',
		german: 'Ich ___ einen Kaffee, bitte.',
		options: ['möchte', 'möchten', 'möchtest'],
		answer: 0,
		why: '«ich möchte» — مؤدبانه‌ترین راه سفارش دادن. در آزمون گوته خیلی به کار می‌آید.'
	},
	{
		id: 'q9',
		topic: 'artikel',
		prompt: 'شکل جمع کدام است؟',
		german: 'ein Kind → die ___',
		options: ['Kinds', 'Kinder', 'Kinden'],
		answer: 1,
		why: 'جمع «Kind» می‌شود «Kinder». جمع در آلمانی قاعدهٔ واحد ندارد و با خود کلمه حفظ می‌شود.'
	},
	{
		id: 'q10',
		topic: 'wortstellung',
		prompt: 'فعل جداشدنی را درست بگذار:',
		german: 'Ich ___ um sieben Uhr ___.',
		options: ['aufstehe / —', 'stehe / auf', 'stehe auf / —'],
		answer: 1,
		why: '«aufstehen» فعل جداشدنی است: پیشوند «auf» به آخر جمله می‌رود — «Ich stehe um sieben Uhr auf».'
	},
	{
		id: 'q11',
		topic: 'kasus',
		prompt: 'کدام ضمیر ملکی درست است؟',
		german: 'Das ist ___ Schwester.',
		options: ['mein', 'meine', 'meinen'],
		answer: 1,
		why: '«Schwester» مؤنث است، پس «meine Schwester».'
	},
	{
		id: 'q12',
		topic: 'alltag',
		prompt: 'ساعت ۷:۳۰ به آلمانی چه می‌شود؟',
		german: 'Es ist ___.',
		options: ['halb sieben', 'halb acht', 'sieben halb'],
		answer: 1,
		why: 'آلمانی «نیمِ رسیدن به هشت» را می‌گوید، نه «هفت و نیم». پس ۷:۳۰ می‌شود «halb acht».',
		note: 'این یکی تقریباً همه را اول بار می‌اندازد — منطقش برعکس فارسی است.'
	}
];

export interface Band {
	/** Lowest score, inclusive, that lands in this band. */
	min: number;
	fa: string;
	blurb: string;
	/** Which day of the course to point them at. */
	startDay: number;
}

/**
 * Ordered high to low so `bandFor` can return the first match.
 *
 * The bands never say "you failed". Someone who scores 2 is exactly the
 * person this course is for, and the copy has to read that way or the
 * result is not something anyone forwards to a friend.
 */
export const BANDS: Band[] = [
	{
		min: 11,
		fa: 'نزدیک پایان A1',
		blurb: 'پایه‌ات محکم است. با تمرین مکالمه و بخش گفتاری، برای آزمون گوته A1 آماده می‌شوی.',
		startDay: 60
	},
	{
		min: 8,
		fa: 'A1.2',
		blurb: 'بیشتر ساختارهای پایه را بلدی. حالا وقت جمله‌های طولانی‌تر و حالت‌هاست.',
		startDay: 35
	},
	{
		min: 5,
		fa: 'A1.1',
		blurb: 'شروع خوبی داشته‌ای. با تمرین روزانه‌ی صرف فعل و ترتیب کلمات سریع جلو می‌روی.',
		startDay: 15
	},
	{
		min: 0,
		fa: 'تازه شروع کرده‌ای',
		blurb: 'دقیقاً همان‌جایی هستی که این دوره برایش ساخته شده. از روز اول شروع کن.',
		startDay: 1
	}
];

export function bandFor(score: number): Band {
	// BANDS is ordered high→low, so the first satisfied minimum is the match.
	return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

/** Correct answers per topic, for the breakdown bars on the result card. */
export function scoreByTopic(
	answers: Array<number | null>
): Array<{ topic: Topic; correct: number; total: number }> {
	const acc = new Map<TopicId, { correct: number; total: number }>();

	QUESTIONS.forEach((q, i) => {
		const row = acc.get(q.topic) ?? { correct: 0, total: 0 };
		row.total += 1;
		if (answers[i] === q.answer) row.correct += 1;
		acc.set(q.topic, row);
	});

	// Weakest first — the breakdown is there to say what to work on.
	return [...acc.entries()]
		.map(([id, row]) => ({ topic: TOPICS[id], ...row }))
		.sort((a, b) => a.correct / a.total - b.correct / b.total);
}

export function totalCorrect(answers: Array<number | null>): number {
	return QUESTIONS.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
}

/**
 * The message the learner shares. Carries the URL, because a screenshot
 * without one is a dead end for everyone who sees it.
 */
export function shareText(score: number, url: string): string {
	const band = bandFor(score);
	return `سطح آلمانی من: ${band.fa} (${score} از ${QUESTIONS.length})\n\nتو هم تست رایگان سطح A1 رو امتحان کن:\n${url}`;
}
