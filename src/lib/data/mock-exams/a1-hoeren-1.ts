/**
 * Original Goethe A1 Hören (listening) content — sample paper 1.
 *
 * Written to the Start Deutsch 1 format (original content; formats are not
 * copyrightable). This is the reviewable Day-2 draft AND the seed that will
 * be inserted into `mock_exam_tasks` (payload column). Every task validates
 * against MockExamTaskSchema (see mock-exam-hoeren.test.ts).
 *
 * Representative subset — 2 items per Teil. Full paper = 15 (Teil 1: 6,
 * Teil 2: 4, Teil 3: 5); this extends once the style is approved.
 *
 * Structure:
 *   Teil 1 — short dialogues, 3-option multiple choice, heard TWICE
 *   Teil 2 — public announcements (Durchsagen), richtig/falsch, heard ONCE
 *   Teil 3 — phone messages / short dialogues, multiple choice, heard TWICE
 */

import type { MockExamTask } from '$lib/schemas';

const TEIL1_INSTRUCTION = 'Hören Sie das Gespräch und wählen Sie die richtige Antwort. Sie hören den Text zweimal.';
const TEIL1_INSTRUCTION_FA = 'به گفتگو گوش دهید و پاسخ درست را انتخاب کنید. متن را دو بار می‌شنوید.';
const TEIL2_INSTRUCTION = 'Hören Sie die Durchsage. Richtig oder falsch? Sie hören den Text einmal.';
const TEIL2_INSTRUCTION_FA = 'به اعلان گوش دهید. درست یا نادرست؟ متن را یک بار می‌شنوید.';
const TEIL3_INSTRUCTION = 'Hören Sie die Nachricht und wählen Sie die richtige Antwort. Sie hören den Text zweimal.';
const TEIL3_INSTRUCTION_FA = 'به پیام گوش دهید و پاسخ درست را انتخاب کنید. متن را دو بار می‌شنوید.';

export const a1Hoeren1: MockExamTask[] = [
	// ── Teil 1 — dialogues, MC, heard twice ──────────────────────────────────
	{
		kind: 'choice',
		id: 'h1-1',
		module: 'hoeren',
		teil: 1,
		points: 1,
		playLimit: 2,
		instruction: TEIL1_INSTRUCTION,
		instructionFa: TEIL1_INSTRUCTION_FA,
		audioText: 'Entschuldigung, wann fährt der nächste Zug nach Köln?',
		audioTextB: 'Um zehn Uhr zwanzig, von Gleis drei.',
		question: 'Wann fährt der Zug nach Köln?',
		questionFa: 'قطار کلن چه ساعتی حرکت می‌کند؟',
		options: ['um 10:20 Uhr', 'um 10:30 Uhr', 'um 3:20 Uhr'],
		correctIndex: 0
	},
	{
		kind: 'choice',
		id: 'h1-2',
		module: 'hoeren',
		teil: 1,
		points: 1,
		playLimit: 2,
		instruction: TEIL1_INSTRUCTION,
		instructionFa: TEIL1_INSTRUCTION_FA,
		audioText: 'Guten Tag, was kostet das Brot?',
		audioTextB: 'Das Brot kostet ein Euro achtzig.',
		question: 'Was kostet das Brot?',
		questionFa: 'قیمت نان چند است؟',
		options: ['1,80 €', '1,18 €', '8,10 €'],
		correctIndex: 0
	},

	// ── Teil 2 — announcements, richtig/falsch, heard once ────────────────────
	{
		kind: 'true_false',
		id: 'h2-1',
		module: 'hoeren',
		teil: 2,
		points: 1,
		playLimit: 1,
		instruction: TEIL2_INSTRUCTION,
		instructionFa: TEIL2_INSTRUCTION_FA,
		audioText: 'Liebe Kundinnen und Kunden, unser Supermarkt schließt heute um zwanzig Uhr. Bitte kommen Sie zur Kasse.',
		statement: 'Der Supermarkt schließt um 20 Uhr.',
		statementFa: 'سوپرمارکت ساعت ۲۰ بسته می‌شود.',
		answer: true
	},
	{
		kind: 'true_false',
		id: 'h2-2',
		module: 'hoeren',
		teil: 2,
		points: 1,
		playLimit: 1,
		instruction: TEIL2_INSTRUCTION,
		instructionFa: TEIL2_INSTRUCTION_FA,
		audioText: 'Information für die Reisenden: Der Zug nach München hat heute zehn Minuten Verspätung.',
		statement: 'Der Zug nach München fährt pünktlich.',
		statementFa: 'قطار مونیخ سر وقت حرکت می‌کند.',
		answer: false
	},

	// ── Teil 3 — messages / dialogues, MC, heard twice ────────────────────────
	{
		kind: 'choice',
		id: 'h3-1',
		module: 'hoeren',
		teil: 3,
		points: 1,
		playLimit: 2,
		instruction: TEIL3_INSTRUCTION,
		instructionFa: TEIL3_INSTRUCTION_FA,
		audioText: 'Hallo Anna, hier ist Tom. Können wir uns morgen um drei Uhr am Café treffen? Bis dann!',
		question: 'Wann möchte Tom Anna treffen?',
		questionFa: 'تام می‌خواهد چه زمانی آنا را ببیند؟',
		options: ['morgen um 15 Uhr', 'heute um 15 Uhr', 'morgen um 14 Uhr'],
		correctIndex: 0
	},
	{
		kind: 'choice',
		id: 'h3-2',
		module: 'hoeren',
		teil: 3,
		points: 1,
		playLimit: 2,
		instruction: TEIL3_INSTRUCTION,
		instructionFa: TEIL3_INSTRUCTION_FA,
		audioText: 'Was machst du am Wochenende, Lena?',
		audioTextB: 'Am Samstag gehe ich schwimmen. Und am Sonntag besuche ich meine Eltern.',
		question: 'Was macht Lena am Samstag?',
		questionFa: 'لنا روز شنبه چه کار می‌کند؟',
		options: ['Sie geht schwimmen.', 'Sie besucht ihre Eltern.', 'Sie arbeitet.'],
		correctIndex: 0
	}
];
