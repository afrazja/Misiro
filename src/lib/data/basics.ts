/**
 * German Basics — Single Source of Truth for vocabulary data.
 * Ported from basics.js basicsData object.
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
	heading: BilingualText;
	type: 'table' | 'grid' | 'conjugation';
	words?: BasicWord[];
	infinitive?: { german: string; en: string; fa: string };
	tenses?: ConjugationTense[];
}

export interface BasicCategory {
	icon: string;
	title: BilingualText;
	description: BilingualText;
	type: 'grid' | 'multi' | 'table' | 'conjugation';
	words?: BasicWord[];
	sections?: BasicSection[];
}

export type BasicsDataMap = Record<string, BasicCategory>;

export const basicsData: BasicsDataMap = {
	pronounsAndSein: {
		icon: '\u{1F464}',
		title: { en: 'Pronouns, Possessives & Verb: Sein', fa: '\u0636\u0645\u0627\u06CC\u0631\u060C \u0645\u0644\u06A9\u06CC \u0648 \u0641\u0639\u0644 \u0628\u0648\u062F\u0646' },
		description: {
			en: 'Personal/object pronouns, possessives & to be',
			fa: '\u0636\u0645\u0627\u06CC\u0631 \u0634\u062E\u0635\u06CC/\u0645\u0641\u0639\u0648\u0644\u06CC\u060C \u0645\u0644\u06A9\u06CC \u0648 \u0641\u0639\u0644 \u0628\u0648\u062F\u0646'
		},
		type: 'multi',
		sections: [
			{
				heading: { en: 'Personal Pronouns', fa: '\u0636\u0645\u0627\u06CC\u0631 \u0634\u062E\u0635\u06CC' },
				type: 'table',
				words: [
					{ german: 'ich', en: 'I', fa: '\u0645\u0646', example: 'Ich bin hier.', exampleEn: 'I am here.', exampleFa: '\u0645\u0646 \u0627\u06CC\u0646\u062C\u0627 \u0647\u0633\u062A\u0645.' },
					{ german: 'du', en: 'you (informal)', fa: '\u062A\u0648', example: 'Du bist nett.', exampleEn: 'You are nice.', exampleFa: '\u062A\u0648 \u0645\u0647\u0631\u0628\u0627\u0646\u06CC.' },
					{ german: 'er', en: 'he', fa: '\u0627\u0648 (\u0645\u0630\u06A9\u0631)', example: 'Er ist gro\u00DF.', exampleEn: 'He is tall.', exampleFa: '\u0627\u0648 \u0642\u062F \u0628\u0644\u0646\u062F \u0627\u0633\u062A.' },
					{ german: 'sie', en: 'she', fa: '\u0627\u0648 (\u0645\u0624\u0646\u062B)', example: 'Sie ist sch\u00F6n.', exampleEn: 'She is beautiful.', exampleFa: '\u0627\u0648 \u0632\u06CC\u0628\u0627\u0633\u062A.' },
					{ german: 'es', en: 'it', fa: '\u0622\u0646', example: 'Es ist kalt.', exampleEn: 'It is cold.', exampleFa: '\u0647\u0648\u0627 \u0633\u0631\u062F \u0627\u0633\u062A.' },
					{ german: 'wir', en: 'we', fa: '\u0645\u0627', example: 'Wir sind Freunde.', exampleEn: 'We are friends.', exampleFa: '\u0645\u0627 \u062F\u0648\u0633\u062A \u0647\u0633\u062A\u06CC\u0645.' },
					{ german: 'ihr', en: 'you (plural)', fa: '\u0634\u0645\u0627 (\u062C\u0645\u0639)', example: 'Ihr seid toll.', exampleEn: 'You are great.', exampleFa: '\u0634\u0645\u0627 \u0639\u0627\u0644\u06CC \u0647\u0633\u062A\u06CC\u062F.' },
					{ german: 'sie', en: 'they', fa: '\u0622\u0646\u0647\u0627', example: 'Sie sind hier.', exampleEn: 'They are here.', exampleFa: '\u0622\u0646\u0647\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0647\u0633\u062A\u0646\u062F.' },
					{ german: 'Sie', en: 'you (formal)', fa: '\u0634\u0645\u0627 (\u0631\u0633\u0645\u06CC)', example: 'Sind Sie Herr M\u00FCller?', exampleEn: 'Are you Mr. M\u00FCller?', exampleFa: '\u0634\u0645\u0627 \u0622\u0642\u0627\u06CC \u0645\u0648\u0644\u0631 \u0647\u0633\u062A\u06CC\u062F\u061F' }
				]
			},
			{
				heading: { en: 'Object Pronouns & Possessives', fa: '\u0636\u0645\u0627\u06CC\u0631 \u0645\u0641\u0639\u0648\u0644\u06CC \u0648 \u0645\u0644\u06A9\u06CC' },
				type: 'table',
				words: [
					{ german: 'mich', en: 'me (accusative)', fa: '\u0645\u0631\u0627', example: 'Das Geschenk ist f\u00FCr mich.', exampleEn: 'The gift is for me.', exampleFa: '\u0647\u062F\u06CC\u0647 \u0628\u0631\u0627\u06CC \u0645\u0646 \u0627\u0633\u062A.' },
					{ german: 'dich', en: 'you (accusative)', fa: '\u062A\u0648 \u0631\u0627', example: 'Der Brief ist f\u00FCr dich.', exampleEn: 'The letter is for you.', exampleFa: '\u0646\u0627\u0645\u0647 \u0628\u0631\u0627\u06CC \u062A\u0648\u0633\u062A.' },
					{ german: 'ihn', en: 'him', fa: '\u0627\u0648 \u0631\u0627', example: 'Ich nehme ihn ins Kino mit.', exampleEn: "I'm taking him to the cinema.", exampleFa: '\u0627\u0648 \u0631\u0627 \u0628\u0647 \u0633\u06CC\u0646\u0645\u0627 \u0645\u06CC\u200C\u0628\u0631\u0645.' },
					{ german: 'uns', en: 'us', fa: '\u0645\u0627 \u0631\u0627', example: 'Sie sahen uns aus der Ferne.', exampleEn: 'They saw us from afar.', exampleFa: '\u0622\u0646\u0647\u0627 \u0645\u0627 \u0631\u0627 \u0627\u0632 \u062F\u0648\u0631 \u062F\u06CC\u062F\u0646\u062F.' },
					{ german: 'mir', en: 'me (dative)', fa: '\u0628\u0647 \u0645\u0646', example: 'Es ist ein Geschenk von mir.', exampleEn: 'It is a gift from me.', exampleFa: '\u0627\u06CC\u0646 \u0647\u062F\u06CC\u0647\u200C\u0627\u06CC \u0627\u0632 \u0637\u0631\u0641 \u0645\u0646 \u0627\u0633\u062A.' },
					{ german: 'sich', en: 'oneself/themselves', fa: '\u062E\u0648\u062F', example: 'Meine Tochter zieht sich an.', exampleEn: 'My daughter gets dressed.', exampleFa: '\u062F\u062E\u062A\u0631\u0645 \u0644\u0628\u0627\u0633 \u0645\u06CC\u200C\u067E\u0648\u0634\u062F.' },
					{ german: 'mein', en: 'my (masc/neut)', fa: '\u0645\u0627\u0644 \u0645\u0646', example: 'Es ist mein Hut.', exampleEn: 'It is my hat.', exampleFa: '\u0627\u06CC\u0646 \u06A9\u0644\u0627\u0647 \u0645\u0646 \u0627\u0633\u062A.' },
					{ german: 'meine', en: 'my (fem/pl)', fa: '\u0645\u0627\u0644 \u0645\u0646', example: 'Meine Familie ist toll.', exampleEn: 'My family is great.', exampleFa: '\u062E\u0627\u0646\u0648\u0627\u062F\u0647 \u0645\u0646 \u0639\u0627\u0644\u06CC \u0627\u0633\u062A.' },
					{ german: 'dein', en: 'your (masc/neut)', fa: '\u0645\u0627\u0644 \u062A\u0648', example: 'Dein Hund ist sehr klug.', exampleEn: 'Your dog is very smart.', exampleFa: '\u0633\u06AF \u062A\u0648 \u062E\u06CC\u0644\u06CC \u0628\u0627\u0647\u0648\u0634 \u0627\u0633\u062A.' },
					{ german: 'deine', en: 'your (fem/pl)', fa: '\u0645\u0627\u0644 \u062A\u0648', example: 'Deine Schwester ist nett.', exampleEn: 'Your sister is nice.', exampleFa: '\u062E\u0648\u0627\u0647\u0631\u062A \u0645\u0647\u0631\u0628\u0627\u0646 \u0627\u0633\u062A.' }
				]
			},
			{
				heading: { en: 'Verb: Sein (To Be)', fa: '\u0641\u0639\u0644 \u0628\u0648\u062F\u0646' },
				type: 'conjugation',
				infinitive: { german: 'sein', en: 'to be', fa: '\u0628\u0648\u062F\u0646' },
				tenses: [
					{
						name: { en: 'Present (Pr\u00E4sens)', fa: '\u062D\u0627\u0644 (Pr\u00E4sens)' },
						forms: [
							{ pronoun: 'ich', verb: 'bin', en: 'I am', fa: '\u0645\u0646 \u0647\u0633\u062A\u0645', example: 'Ich bin Deutschlehrer.', exampleEn: 'I am a German teacher.', exampleFa: '\u0645\u0646 \u0645\u0639\u0644\u0645 \u0622\u0644\u0645\u0627\u0646\u06CC \u0647\u0633\u062A\u0645.' },
							{ pronoun: 'du', verb: 'bist', en: 'you are', fa: '\u062A\u0648 \u0647\u0633\u062A\u06CC', example: 'Du bist eine ruhige Person.', exampleEn: 'You are a quiet person.', exampleFa: '\u062A\u0648 \u0622\u062F\u0645 \u0622\u0631\u0627\u0645\u06CC \u0647\u0633\u062A\u06CC.' },
							{ pronoun: 'er/sie/es', verb: 'ist', en: 'he/she/it is', fa: '\u0627\u0648/\u0622\u0646 \u0647\u0633\u062A', example: 'Er ist gro\u00DF.', exampleEn: 'He is tall.', exampleFa: '\u0627\u0648 \u0642\u062F \u0628\u0644\u0646\u062F \u0627\u0633\u062A.' },
							{ pronoun: 'wir', verb: 'sind', en: 'we are', fa: '\u0645\u0627 \u0647\u0633\u062A\u06CC\u0645', example: 'Wir sind Br\u00FCder.', exampleEn: 'We are brothers.', exampleFa: '\u0645\u0627 \u0628\u0631\u0627\u062F\u0631 \u0647\u0633\u062A\u06CC\u0645.' },
							{ pronoun: 'ihr', verb: 'seid', en: 'you are', fa: '\u0634\u0645\u0627 \u0647\u0633\u062A\u06CC\u062F', example: 'Ihr seid toll.', exampleEn: 'You are great.', exampleFa: '\u0634\u0645\u0627 \u0639\u0627\u0644\u06CC \u0647\u0633\u062A\u06CC\u062F.' },
							{ pronoun: 'sie/Sie', verb: 'sind', en: 'they/you are', fa: '\u0622\u0646\u0647\u0627/\u0634\u0645\u0627 \u0647\u0633\u062A\u0646\u062F', example: 'Sie sind hier.', exampleEn: 'They are here.', exampleFa: '\u0622\u0646\u0647\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0647\u0633\u062A\u0646\u062F.' }
						]
					},
					{
						name: { en: 'Simple Past (Pr\u00E4teritum)', fa: '\u06AF\u0630\u0634\u062A\u0647 \u0633\u0627\u062F\u0647 (Pr\u00E4teritum)' },
						forms: [
							{ pronoun: 'ich', verb: 'war', en: 'I was', fa: '\u0645\u0646 \u0628\u0648\u062F\u0645', example: 'Ich war m\u00FCde.', exampleEn: 'I was tired.', exampleFa: '\u0645\u0646 \u062E\u0633\u062A\u0647 \u0628\u0648\u062F\u0645.' },
							{ pronoun: 'du', verb: 'warst', en: 'you were', fa: '\u062A\u0648 \u0628\u0648\u062F\u06CC', example: 'Du warst sehr nett.', exampleEn: 'You were very nice.', exampleFa: '\u062A\u0648 \u062E\u06CC\u0644\u06CC \u0645\u0647\u0631\u0628\u0627\u0646 \u0628\u0648\u062F\u06CC.' },
							{ pronoun: 'er/sie/es', verb: 'war', en: 'he/she/it was', fa: '\u0627\u0648/\u0622\u0646 \u0628\u0648\u062F', example: 'Es war kalt.', exampleEn: 'It was cold.', exampleFa: '\u0647\u0648\u0627 \u0633\u0631\u062F \u0628\u0648\u062F.' },
							{ pronoun: 'wir', verb: 'waren', en: 'we were', fa: '\u0645\u0627 \u0628\u0648\u062F\u06CC\u0645', example: 'Wir waren in Berlin.', exampleEn: 'We were in Berlin.', exampleFa: '\u0645\u0627 \u062F\u0631 \u0628\u0631\u0644\u06CC\u0646 \u0628\u0648\u062F\u06CC\u0645.' },
							{ pronoun: 'ihr', verb: 'wart', en: 'you were', fa: '\u0634\u0645\u0627 \u0628\u0648\u062F\u06CC\u062F', example: 'Ihr wart toll.', exampleEn: 'You were great.', exampleFa: '\u0634\u0645\u0627 \u0639\u0627\u0644\u06CC \u0628\u0648\u062F\u06CC\u062F.' },
							{ pronoun: 'sie/Sie', verb: 'waren', en: 'they/you were', fa: '\u0622\u0646\u0647\u0627/\u0634\u0645\u0627 \u0628\u0648\u062F\u0646\u062F', example: 'Sie waren Freunde.', exampleEn: 'They were friends.', exampleFa: '\u0622\u0646\u0647\u0627 \u062F\u0648\u0633\u062A \u0628\u0648\u062F\u0646\u062F.' }
						]
					},
					{
						name: { en: 'Present Perfect (Perfekt)', fa: '\u0645\u0627\u0636\u06CC \u0646\u0642\u0644\u06CC (Perfekt)' },
						forms: [
							{ pronoun: 'ich', verb: 'bin gewesen', en: 'I have been', fa: '\u0645\u0646 \u0628\u0648\u062F\u0647\u200C\u0627\u0645', example: 'Ich bin in Paris gewesen.', exampleEn: 'I have been to Paris.', exampleFa: '\u0645\u0646 \u062F\u0631 \u067E\u0627\u0631\u06CC\u0633 \u0628\u0648\u062F\u0647\u200C\u0627\u0645.' },
							{ pronoun: 'du', verb: 'bist gewesen', en: 'you have been', fa: '\u062A\u0648 \u0628\u0648\u062F\u0647\u200C\u0627\u06CC', example: 'Du bist dort gewesen.', exampleEn: 'You have been there.', exampleFa: '\u062A\u0648 \u0622\u0646\u062C\u0627 \u0628\u0648\u062F\u0647\u200C\u0627\u06CC.' },
							{ pronoun: 'er/sie/es', verb: 'ist gewesen', en: 'he/she/it has been', fa: '\u0627\u0648 \u0628\u0648\u062F\u0647 \u0627\u0633\u062A', example: 'Es ist sch\u00F6n gewesen.', exampleEn: 'It has been nice.', exampleFa: '\u062E\u0648\u0628 \u0628\u0648\u062F\u0647 \u0627\u0633\u062A.' },
							{ pronoun: 'wir', verb: 'sind gewesen', en: 'we have been', fa: '\u0645\u0627 \u0628\u0648\u062F\u0647\u200C\u0627\u06CC\u0645', example: 'Wir sind dort gewesen.', exampleEn: 'We have been there.', exampleFa: '\u0645\u0627 \u0622\u0646\u062C\u0627 \u0628\u0648\u062F\u0647\u200C\u0627\u06CC\u0645.' },
							{ pronoun: 'ihr', verb: 'seid gewesen', en: 'you have been', fa: '\u0634\u0645\u0627 \u0628\u0648\u062F\u0647\u200C\u0627\u06CC\u062F', example: 'Ihr seid da gewesen.', exampleEn: 'You have been there.', exampleFa: '\u0634\u0645\u0627 \u0622\u0646\u062C\u0627 \u0628\u0648\u062F\u0647\u200C\u0627\u06CC\u062F.' },
							{ pronoun: 'sie/Sie', verb: 'sind gewesen', en: 'they/you have been', fa: '\u0622\u0646\u0647\u0627 \u0628\u0648\u062F\u0647\u200C\u0627\u0646\u062F', example: 'Sie sind krank gewesen.', exampleEn: 'They have been sick.', exampleFa: '\u0622\u0646\u0647\u0627 \u0645\u0631\u06CC\u0636 \u0628\u0648\u062F\u0647\u200C\u0627\u0646\u062F.' }
						]
					}
				]
			}
		]
	},
	articles: {
		icon: '\u{1F4DD}',
		title: { en: 'Articles', fa: '\u062D\u0631\u0648\u0641 \u062A\u0639\u0631\u06CC\u0641' },
		description: { en: 'German has 3 genders - learn the articles!', fa: '\u0622\u0644\u0645\u0627\u0646\u06CC \u06F3 \u062C\u0646\u0633\u06CC\u062A \u062F\u0627\u0631\u062F - \u062D\u0631\u0648\u0641 \u062A\u0639\u0631\u06CC\u0641 \u0631\u0627 \u06CC\u0627\u062F \u0628\u06AF\u06CC\u0631\u06CC\u062F!' },
		type: 'grid',
		words: [
			{ german: 'der', en: 'the (masculine)', fa: '\u0627\u06CC\u0646 (\u0645\u0630\u06A9\u0631)', example: 'Der Mann ist gro\u00DF.', exampleEn: 'The man is tall.', exampleFa: '\u0645\u0631\u062F \u0642\u062F \u0628\u0644\u0646\u062F \u0627\u0633\u062A.' },
			{ german: 'die', en: 'the (feminine)', fa: '\u0627\u06CC\u0646 (\u0645\u0624\u0646\u062B)', example: 'Die Frau liest ein Buch.', exampleEn: 'The woman reads a book.', exampleFa: '\u0632\u0646 \u06CC\u06A9 \u06A9\u062A\u0627\u0628 \u0645\u06CC\u200C\u062E\u0648\u0627\u0646\u062F.' },
			{ german: 'das', en: 'the (neuter)', fa: '\u0627\u06CC\u0646 (\u062E\u0646\u062B\u06CC)', example: 'Das Kind spielt drau\u00DFen.', exampleEn: 'The child plays outside.', exampleFa: '\u0628\u0686\u0647 \u0628\u06CC\u0631\u0648\u0646 \u0628\u0627\u0632\u06CC \u0645\u06CC\u200C\u06A9\u0646\u062F.' },
			{ german: 'ein', en: 'a/an (masc/neut)', fa: '\u06CC\u06A9 (\u0645\u0630\u06A9\u0631/\u062E\u0646\u062B\u06CC)', example: 'Ich lese ein Buch.', exampleEn: 'I am reading a book.', exampleFa: '\u0645\u0646 \u06CC\u06A9 \u06A9\u062A\u0627\u0628 \u0645\u06CC\u200C\u062E\u0648\u0627\u0646\u0645.' },
			{ german: 'eine', en: 'a/an (feminine)', fa: '\u06CC\u06A9 (\u0645\u0624\u0646\u062B)', example: 'Das ist eine sch\u00F6ne Blume.', exampleEn: 'That is a beautiful flower.', exampleFa: '\u0622\u0646 \u06CC\u06A9 \u06AF\u0644 \u0632\u06CC\u0628\u0627\u0633\u062A.' }
		]
	},
	conjunctions: {
		icon: '\u{1F517}',
		title: { en: 'Conjunctions', fa: '\u062D\u0631\u0648\u0641 \u0631\u0628\u0637' },
		description: { en: 'Connect words, phrases, and clauses', fa: '\u06A9\u0644\u0645\u0627\u062A\u060C \u0639\u0628\u0627\u0631\u0627\u062A \u0648 \u062C\u0645\u0644\u0627\u062A \u0631\u0627 \u0628\u0647 \u0647\u0645 \u0648\u0635\u0644 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F' },
		type: 'grid',
		words: [
			{ german: 'und', en: 'and', fa: '\u0648', example: 'Ich und du.', exampleEn: 'Me and you.', exampleFa: '\u0645\u0646 \u0648 \u062A\u0648.' },
			{ german: 'oder', en: 'or', fa: '\u06CC\u0627', example: 'Ja oder nein?', exampleEn: 'Yes or no?', exampleFa: '\u0628\u0644\u0647 \u06CC\u0627 \u0646\u0647\u061F' },
			{ german: 'aber', en: 'but', fa: '\u0627\u0645\u0627', example: 'Klein, aber fein.', exampleEn: 'Small but fine.', exampleFa: '\u06A9\u0648\u0686\u06A9\u060C \u0627\u0645\u0627 \u062E\u0648\u0628.' },
			{ german: 'denn', en: 'because/for', fa: '\u0632\u06CC\u0631\u0627', example: 'Ich bleibe, denn es regnet.', exampleEn: "I stay because it's raining.", exampleFa: '\u0645\u06CC\u200C\u0645\u0627\u0646\u0645 \u0632\u06CC\u0631\u0627 \u0628\u0627\u0631\u0627\u0646 \u0645\u06CC\u200C\u0628\u0627\u0631\u062F.' },
			{ german: 'sondern', en: 'but rather', fa: '\u0628\u0644\u06A9\u0647', example: 'Nicht ich, sondern er.', exampleEn: 'Not me, but him.', exampleFa: '\u0646\u0647 \u0645\u0646\u060C \u0628\u0644\u06A9\u0647 \u0627\u0648.' },
			{ german: 'doch', en: 'however/yet', fa: '\u0628\u0627 \u0627\u06CC\u0646 \u062D\u0627\u0644', example: 'Es ist teuer, doch gut.', exampleEn: "It's expensive, yet good.", exampleFa: '\u06AF\u0631\u0627\u0646 \u0627\u0633\u062A\u060C \u0628\u0627 \u0627\u06CC\u0646 \u062D\u0627\u0644 \u062E\u0648\u0628 \u0627\u0633\u062A.' },
			{ german: 'also', en: 'so/therefore', fa: '\u067E\u0633/\u0628\u0646\u0627\u0628\u0631\u0627\u06CC\u0646', example: 'Also gut!', exampleEn: 'Alright then!', exampleFa: '\u062E\u0628 \u0628\u0627\u0634\u0647!' },
			{ german: 'sowohl...als auch', en: 'both...and', fa: '\u0647\u0645...\u0647\u0645', example: 'Sowohl Deutsch als auch Englisch.', exampleEn: 'Both German and English.', exampleFa: '\u0647\u0645 \u0622\u0644\u0645\u0627\u0646\u06CC \u0647\u0645 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC.' },
			{ german: 'entweder...oder', en: 'either...or', fa: '\u06CC\u0627...\u06CC\u0627', example: 'Entweder heute oder morgen.', exampleEn: 'Either today or tomorrow.', exampleFa: '\u06CC\u0627 \u0627\u0645\u0631\u0648\u0632 \u06CC\u0627 \u0641\u0631\u062F\u0627.' },
			{ german: 'weder...noch', en: 'neither...nor', fa: '\u0646\u0647...\u0646\u0647', example: 'Weder hier noch dort.', exampleEn: 'Neither here nor there.', exampleFa: '\u0646\u0647 \u0627\u06CC\u0646\u062C\u0627 \u0646\u0647 \u0622\u0646\u062C\u0627.' },
			{ german: 'nicht nur...sondern auch', en: 'not only...but also', fa: '\u0646\u0647 \u062A\u0646\u0647\u0627...\u0628\u0644\u06A9\u0647', example: 'Nicht nur sch\u00F6n, sondern auch klug.', exampleEn: 'Not only beautiful but also smart.', exampleFa: '\u0646\u0647 \u062A\u0646\u0647\u0627 \u0632\u06CC\u0628\u0627\u060C \u0628\u0644\u06A9\u0647 \u0628\u0627\u0647\u0648\u0634 \u0647\u0645.' },
			{ german: 'deshalb', en: 'therefore', fa: '\u0628\u0647 \u0647\u0645\u06CC\u0646 \u062F\u0644\u06CC\u0644', example: 'Deshalb bin ich hier.', exampleEn: "That's why I'm here.", exampleFa: '\u0628\u0647 \u0647\u0645\u06CC\u0646 \u062F\u0644\u06CC\u0644 \u0645\u0646 \u0627\u06CC\u0646\u062C\u0627 \u0647\u0633\u062A\u0645.' }
		]
	},
	numbers: {
		icon: '\u{1F522}',
		title: { en: 'Numbers 1-20', fa: '\u0627\u0639\u062F\u0627\u062F \u06F1 \u062A\u0627 \u06F2\u06F0' },
		description: { en: 'Learn to count in German', fa: '\u0634\u0645\u0631\u062F\u0646 \u0628\u0647 \u0622\u0644\u0645\u0627\u0646\u06CC \u0631\u0627 \u06CC\u0627\u062F \u0628\u06AF\u06CC\u0631\u06CC\u062F' },
		type: 'grid',
		words: [
			{ german: 'eins', en: '1', fa: '\u06F1', example: 'Ich habe eins.', exampleEn: 'I have one.', exampleFa: '\u0645\u0646 \u06CC\u06A9\u06CC \u062F\u0627\u0631\u0645.' },
			{ german: 'zwei', en: '2', fa: '\u06F2', example: 'Ich habe zwei Hunde.', exampleEn: 'I have two dogs.', exampleFa: '\u0645\u0646 \u062F\u0648 \u0633\u06AF \u062F\u0627\u0631\u0645.' },
			{ german: 'drei', en: '3', fa: '\u06F3', example: 'Drei Kinder spielen.', exampleEn: 'Three children are playing.', exampleFa: '\u0633\u0647 \u0628\u0686\u0647 \u0628\u0627\u0632\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F.' },
			{ german: 'vier', en: '4', fa: '\u06F4', example: 'Ein Tisch hat vier Beine.', exampleEn: 'A table has four legs.', exampleFa: '\u06CC\u06A9 \u0645\u06CC\u0632 \u0686\u0647\u0627\u0631 \u067E\u0627\u06CC\u0647 \u062F\u0627\u0631\u062F.' },
			{ german: 'f\u00FCnf', en: '5', fa: '\u06F5', example: 'F\u00FCnf Finger an einer Hand.', exampleEn: 'Five fingers on a hand.', exampleFa: '\u067E\u0646\u062C \u0627\u0646\u06AF\u0634\u062A \u062F\u0631 \u06CC\u06A9 \u062F\u0633\u062A.' },
			{ german: 'sechs', en: '6', fa: '\u06F6', example: 'Es ist sechs Uhr.', exampleEn: "It is six o'clock.", exampleFa: '\u0633\u0627\u0639\u062A \u0634\u0634 \u0627\u0633\u062A.' },
			{ german: 'sieben', en: '7', fa: '\u06F7', example: 'Die Woche hat sieben Tage.', exampleEn: 'A week has seven days.', exampleFa: '\u06CC\u06A9 \u0647\u0641\u062A\u0647 \u0647\u0641\u062A \u0631\u0648\u0632 \u062F\u0627\u0631\u062F.' },
			{ german: 'acht', en: '8', fa: '\u06F8', example: 'Ich arbeite acht Stunden.', exampleEn: 'I work eight hours.', exampleFa: '\u0645\u0646 \u0647\u0634\u062A \u0633\u0627\u0639\u062A \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u0645.' },
			{ german: 'neun', en: '9', fa: '\u06F9', example: 'Der Kurs beginnt um neun.', exampleEn: 'The course starts at nine.', exampleFa: '\u062F\u0648\u0631\u0647 \u0633\u0627\u0639\u062A \u0646\u0647 \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F.' },
			{ german: 'zehn', en: '10', fa: '\u06F1\u06F0', example: 'Ich z\u00E4hle bis zehn.', exampleEn: 'I count to ten.', exampleFa: '\u0645\u0646 \u062A\u0627 \u062F\u0647 \u0645\u06CC\u200C\u0634\u0645\u0627\u0631\u0645.' },
			{ german: 'elf', en: '11', fa: '\u06F1\u06F1', example: 'Ein Team hat elf Spieler.', exampleEn: 'A team has eleven players.', exampleFa: '\u06CC\u06A9 \u062A\u06CC\u0645 \u06CC\u0627\u0632\u062F\u0647 \u0628\u0627\u0632\u06CC\u06A9\u0646 \u062F\u0627\u0631\u062F.' },
			{ german: 'zw\u00F6lf', en: '12', fa: '\u06F1\u06F2', example: 'Ein Jahr hat zw\u00F6lf Monate.', exampleEn: 'A year has twelve months.', exampleFa: '\u06CC\u06A9 \u0633\u0627\u0644 \u062F\u0648\u0627\u0632\u062F\u0647 \u0645\u0627\u0647 \u062F\u0627\u0631\u062F.' },
			{ german: 'dreizehn', en: '13', fa: '\u06F1\u06F3', example: 'Er ist dreizehn Jahre alt.', exampleEn: 'He is thirteen years old.', exampleFa: '\u0627\u0648 \u0633\u06CC\u0632\u062F\u0647 \u0633\u0627\u0644\u0647 \u0627\u0633\u062A.' },
			{ german: 'vierzehn', en: '14', fa: '\u06F1\u06F4', example: 'In vierzehn Tagen.', exampleEn: 'In fourteen days.', exampleFa: '\u062F\u0631 \u0686\u0647\u0627\u0631\u062F\u0647 \u0631\u0648\u0632.' },
			{ german: 'f\u00FCnfzehn', en: '15', fa: '\u06F1\u06F5', example: 'Der Bus kommt in f\u00FCnfzehn Minuten.', exampleEn: 'The bus comes in fifteen minutes.', exampleFa: '\u0627\u062A\u0648\u0628\u0648\u0633 \u062F\u0631 \u067E\u0627\u0646\u0632\u062F\u0647 \u062F\u0642\u06CC\u0642\u0647 \u0645\u06CC\u200C\u0622\u06CC\u062F.' },
			{ german: 'sechzehn', en: '16', fa: '\u06F1\u06F6', example: 'Sie ist sechzehn.', exampleEn: 'She is sixteen.', exampleFa: '\u0627\u0648 \u0634\u0627\u0646\u0632\u062F\u0647 \u0633\u0627\u0644\u0647 \u0627\u0633\u062A.' },
			{ german: 'siebzehn', en: '17', fa: '\u06F1\u06F7', example: 'Siebzehn Sch\u00FCler in der Klasse.', exampleEn: 'Seventeen students in the class.', exampleFa: '\u0647\u0641\u062F\u0647 \u062F\u0627\u0646\u0634\u200C\u0622\u0645\u0648\u0632 \u062F\u0631 \u06A9\u0644\u0627\u0633.' },
			{ german: 'achtzehn', en: '18', fa: '\u06F1\u06F8', example: 'Mit achtzehn ist man erwachsen.', exampleEn: 'At eighteen you are an adult.', exampleFa: '\u062F\u0631 \u0647\u062C\u062F\u0647 \u0633\u0627\u0644\u06AF\u06CC \u0628\u0632\u0631\u06AF\u0633\u0627\u0644 \u0647\u0633\u062A\u06CC\u062F.' },
			{ german: 'neunzehn', en: '19', fa: '\u06F1\u06F9', example: 'Neunzehn Euro bitte.', exampleEn: 'Nineteen euros please.', exampleFa: '\u0646\u0648\u0632\u062F\u0647 \u06CC\u0648\u0631\u0648 \u0644\u0637\u0641\u0627\u064B.' },
			{ german: 'zwanzig', en: '20', fa: '\u06F2\u06F0', example: 'Er ist zwanzig Jahre alt.', exampleEn: 'He is twenty years old.', exampleFa: '\u0627\u0648 \u0628\u06CC\u0633\u062A \u0633\u0627\u0644\u0647 \u0627\u0633\u062A.' }
		]
	},
	colors: {
		icon: '\u{1F3A8}',
		title: { en: 'Colors', fa: '\u0631\u0646\u06AF\u200C\u0647\u0627' },
		description: { en: 'Basic colors in German', fa: '\u0631\u0646\u06AF\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u0647 \u0628\u0647 \u0622\u0644\u0645\u0627\u0646\u06CC' },
		type: 'grid',
		words: [
			{ german: 'rot', en: 'red', fa: '\u0642\u0631\u0645\u0632', example: 'Die Rose ist rot.', exampleEn: 'The rose is red.', exampleFa: '\u06AF\u0644 \u0631\u0632 \u0642\u0631\u0645\u0632 \u0627\u0633\u062A.' },
			{ german: 'blau', en: 'blue', fa: '\u0622\u0628\u06CC', example: 'Der Himmel ist blau.', exampleEn: 'The sky is blue.', exampleFa: '\u0622\u0633\u0645\u0627\u0646 \u0622\u0628\u06CC \u0627\u0633\u062A.' },
			{ german: 'gr\u00FCn', en: 'green', fa: '\u0633\u0628\u0632', example: 'Das Gras ist gr\u00FCn.', exampleEn: 'The grass is green.', exampleFa: '\u0686\u0645\u0646 \u0633\u0628\u0632 \u0627\u0633\u062A.' },
			{ german: 'gelb', en: 'yellow', fa: '\u0632\u0631\u062F', example: 'Die Sonne ist gelb.', exampleEn: 'The sun is yellow.', exampleFa: '\u062E\u0648\u0631\u0634\u06CC\u062F \u0632\u0631\u062F \u0627\u0633\u062A.' },
			{ german: 'orange', en: 'orange', fa: '\u0646\u0627\u0631\u0646\u062C\u06CC', example: 'Die Orange ist orange.', exampleEn: 'The orange is orange.', exampleFa: '\u067E\u0631\u062A\u0642\u0627\u0644 \u0646\u0627\u0631\u0646\u062C\u06CC \u0627\u0633\u062A.' },
			{ german: 'lila', en: 'purple', fa: '\u0628\u0646\u0641\u0634', example: 'Ihre Bluse ist lila.', exampleEn: 'Her blouse is purple.', exampleFa: '\u0628\u0644\u0648\u0632 \u0627\u0648 \u0628\u0646\u0641\u0634 \u0627\u0633\u062A.' },
			{ german: 'rosa', en: 'pink', fa: '\u0635\u0648\u0631\u062A\u06CC', example: 'Das Baby tr\u00E4gt rosa.', exampleEn: 'The baby wears pink.', exampleFa: '\u0646\u0648\u0632\u0627\u062F \u0635\u0648\u0631\u062A\u06CC \u067E\u0648\u0634\u06CC\u062F\u0647.' },
			{ german: 'schwarz', en: 'black', fa: '\u0633\u06CC\u0627\u0647', example: 'Die Katze ist schwarz.', exampleEn: 'The cat is black.', exampleFa: '\u06AF\u0631\u0628\u0647 \u0633\u06CC\u0627\u0647 \u0627\u0633\u062A.' },
			{ german: 'wei\u00DF', en: 'white', fa: '\u0633\u0641\u06CC\u062F', example: 'Der Schnee ist wei\u00DF.', exampleEn: 'The snow is white.', exampleFa: '\u0628\u0631\u0641 \u0633\u0641\u06CC\u062F \u0627\u0633\u062A.' },
			{ german: 'grau', en: 'gray', fa: '\u062E\u0627\u06A9\u0633\u062A\u0631\u06CC', example: 'Der Elefant ist grau.', exampleEn: 'The elephant is gray.', exampleFa: '\u0641\u06CC\u0644 \u062E\u0627\u06A9\u0633\u062A\u0631\u06CC \u0627\u0633\u062A.' },
			{ german: 'braun', en: 'brown', fa: '\u0642\u0647\u0648\u0647\u200C\u0627\u06CC', example: 'Der B\u00E4r ist braun.', exampleEn: 'The bear is brown.', exampleFa: '\u062E\u0631\u0633 \u0642\u0647\u0648\u0647\u200C\u0627\u06CC \u0627\u0633\u062A.' }
		]
	},
	days: {
		icon: '\u{1F4C5}',
		title: { en: 'Days of the Week', fa: '\u0631\u0648\u0632\u0647\u0627\u06CC \u0647\u0641\u062A\u0647' },
		description: { en: 'Monday to Sunday', fa: '\u062F\u0648\u0634\u0646\u0628\u0647 \u062A\u0627 \u06CC\u06A9\u0634\u0646\u0628\u0647' },
		type: 'grid',
		words: [
			{ german: 'Montag', en: 'Monday', fa: '\u062F\u0648\u0634\u0646\u0628\u0647', example: 'Am Montag gehe ich arbeiten.', exampleEn: 'On Monday I go to work.', exampleFa: '\u062F\u0648\u0634\u0646\u0628\u0647 \u0645\u0646 \u0633\u0631 \u06A9\u0627\u0631 \u0645\u06CC\u200C\u0631\u0648\u0645.' },
			{ german: 'Dienstag', en: 'Tuesday', fa: '\u0633\u0647\u200C\u0634\u0646\u0628\u0647', example: 'Dienstag habe ich Deutschkurs.', exampleEn: 'On Tuesday I have German class.', exampleFa: '\u0633\u0647\u200C\u0634\u0646\u0628\u0647 \u06A9\u0644\u0627\u0633 \u0622\u0644\u0645\u0627\u0646\u06CC \u062F\u0627\u0631\u0645.' },
			{ german: 'Mittwoch', en: 'Wednesday', fa: '\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647', example: 'Mittwoch ist die Mitte der Woche.', exampleEn: 'Wednesday is the middle of the week.', exampleFa: '\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647 \u0648\u0633\u0637 \u0647\u0641\u062A\u0647 \u0627\u0633\u062A.' },
			{ german: 'Donnerstag', en: 'Thursday', fa: '\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647', example: 'Am Donnerstag gehen wir einkaufen.', exampleEn: 'On Thursday we go shopping.', exampleFa: '\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647 \u062E\u0631\u06CC\u062F \u0645\u06CC\u200C\u0631\u0648\u06CC\u0645.' },
			{ german: 'Freitag', en: 'Friday', fa: '\u062C\u0645\u0639\u0647', example: 'Freitag ist mein Lieblingstag.', exampleEn: 'Friday is my favorite day.', exampleFa: '\u062C\u0645\u0639\u0647 \u0631\u0648\u0632 \u0645\u0648\u0631\u062F \u0639\u0644\u0627\u0642\u0647 \u0645\u0646 \u0627\u0633\u062A.' },
			{ german: 'Samstag', en: 'Saturday', fa: '\u0634\u0646\u0628\u0647', example: 'Am Samstag schlafe ich lange.', exampleEn: 'On Saturday I sleep in.', exampleFa: '\u0634\u0646\u0628\u0647 \u0632\u06CC\u0627\u062F \u0645\u06CC\u200C\u062E\u0648\u0627\u0628\u0645.' },
			{ german: 'Sonntag', en: 'Sunday', fa: '\u06CC\u06A9\u0634\u0646\u0628\u0647', example: 'Sonntag ist Ruhetag.', exampleEn: 'Sunday is a rest day.', exampleFa: '\u06CC\u06A9\u0634\u0646\u0628\u0647 \u0631\u0648\u0632 \u0627\u0633\u062A\u0631\u0627\u062D\u062A \u0627\u0633\u062A.' }
		]
	},
	months: {
		icon: '\u{1F5D3}\uFE0F',
		title: { en: 'Months', fa: '\u0645\u0627\u0647\u200C\u0647\u0627' },
		description: { en: 'January to December', fa: '\u0698\u0627\u0646\u0648\u06CC\u0647 \u062A\u0627 \u062F\u0633\u0627\u0645\u0628\u0631' },
		type: 'grid',
		words: [
			{ german: 'Januar', en: 'January', fa: '\u0698\u0627\u0646\u0648\u06CC\u0647', example: 'Im Januar schneit es oft.', exampleEn: 'It often snows in January.', exampleFa: '\u062F\u0631 \u0698\u0627\u0646\u0648\u06CC\u0647 \u0627\u063A\u0644\u0628 \u0628\u0631\u0641 \u0645\u06CC\u200C\u0628\u0627\u0631\u062F.' },
			{ german: 'Februar', en: 'February', fa: '\u0641\u0648\u0631\u06CC\u0647', example: 'Februar ist kurz.', exampleEn: 'February is short.', exampleFa: '\u0641\u0648\u0631\u06CC\u0647 \u06A9\u0648\u062A\u0627\u0647 \u0627\u0633\u062A.' },
			{ german: 'M\u00E4rz', en: 'March', fa: '\u0645\u0627\u0631\u0633', example: 'Im M\u00E4rz wird es w\u00E4rmer.', exampleEn: 'It gets warmer in March.', exampleFa: '\u062F\u0631 \u0645\u0627\u0631\u0633 \u0647\u0648\u0627 \u06AF\u0631\u0645\u200C\u062A\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F.' },
			{ german: 'April', en: 'April', fa: '\u0622\u0648\u0631\u06CC\u0644', example: 'April macht was er will.', exampleEn: 'April does what it wants.', exampleFa: '\u0622\u0648\u0631\u06CC\u0644 \u0647\u0631 \u06A9\u0627\u0631\u06CC \u062F\u0644\u0634 \u0628\u062E\u0648\u0627\u0647\u062F \u0645\u06CC\u200C\u06A9\u0646\u062F.' },
			{ german: 'Mai', en: 'May', fa: '\u0645\u0647', example: 'Im Mai bl\u00FChen die Blumen.', exampleEn: 'Flowers bloom in May.', exampleFa: '\u062F\u0631 \u0645\u0627\u0647 \u0645\u0647 \u06AF\u0644\u200C\u0647\u0627 \u0634\u06A9\u0648\u0641\u0627 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.' },
			{ german: 'Juni', en: 'June', fa: '\u0698\u0648\u0626\u0646', example: 'Im Juni beginnt der Sommer.', exampleEn: 'Summer starts in June.', exampleFa: '\u062F\u0631 \u0698\u0648\u0626\u0646 \u062A\u0627\u0628\u0633\u062A\u0627\u0646 \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F.' },
			{ german: 'Juli', en: 'July', fa: '\u0698\u0648\u0626\u06CC\u0647', example: 'Juli ist sehr hei\u00DF.', exampleEn: 'July is very hot.', exampleFa: '\u0698\u0648\u0626\u06CC\u0647 \u062E\u06CC\u0644\u06CC \u06AF\u0631\u0645 \u0627\u0633\u062A.' },
			{ german: 'August', en: 'August', fa: '\u0627\u0648\u062A', example: 'Im August machen wir Urlaub.', exampleEn: 'In August we go on vacation.', exampleFa: '\u062F\u0631 \u0627\u0648\u062A \u0628\u0647 \u062A\u0639\u0637\u06CC\u0644\u0627\u062A \u0645\u06CC\u200C\u0631\u0648\u06CC\u0645.' },
			{ german: 'September', en: 'September', fa: '\u0633\u067E\u062A\u0627\u0645\u0628\u0631', example: 'Die Schule beginnt im September.', exampleEn: 'School starts in September.', exampleFa: '\u0645\u062F\u0631\u0633\u0647 \u062F\u0631 \u0633\u067E\u062A\u0627\u0645\u0628\u0631 \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F.' },
			{ german: 'Oktober', en: 'October', fa: '\u0627\u06A9\u062A\u0628\u0631', example: 'Im Oktober fallen die Bl\u00E4tter.', exampleEn: 'Leaves fall in October.', exampleFa: '\u062F\u0631 \u0627\u06A9\u062A\u0628\u0631 \u0628\u0631\u06AF\u200C\u0647\u0627 \u0645\u06CC\u200C\u0631\u06CC\u0632\u0646\u062F.' },
			{ german: 'November', en: 'November', fa: '\u0646\u0648\u0627\u0645\u0628\u0631', example: 'November ist oft neblig.', exampleEn: 'November is often foggy.', exampleFa: '\u0646\u0648\u0627\u0645\u0628\u0631 \u0627\u063A\u0644\u0628 \u0645\u0647\u200C\u0622\u0644\u0648\u062F \u0627\u0633\u062A.' },
			{ german: 'Dezember', en: 'December', fa: '\u062F\u0633\u0627\u0645\u0628\u0631', example: 'Im Dezember feiern wir Weihnachten.', exampleEn: 'In December we celebrate Christmas.', exampleFa: '\u062F\u0631 \u062F\u0633\u0627\u0645\u0628\u0631 \u06A9\u0631\u06CC\u0633\u0645\u0633 \u0631\u0627 \u062C\u0634\u0646 \u0645\u06CC\u200C\u06AF\u06CC\u0631\u06CC\u0645.' }
		]
	},
	prepositions: {
		icon: '\u{1F4CD}',
		title: { en: 'Prepositions', fa: '\u062D\u0631\u0648\u0641 \u0627\u0636\u0627\u0641\u0647' },
		description: { en: 'Words describing relationships in space, time, and logic', fa: '\u06A9\u0644\u0645\u0627\u062A\u06CC \u06A9\u0647 \u0631\u0627\u0628\u0637\u0647 \u0645\u06A9\u0627\u0646\u060C \u0632\u0645\u0627\u0646 \u0648 \u0645\u0646\u0637\u0642 \u0631\u0627 \u062A\u0648\u0635\u06CC\u0641 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F' },
		type: 'grid',
		words: [
			{ german: 'f\u00FCr', en: 'for', fa: '\u0628\u0631\u0627\u06CC', example: 'Das ist f\u00FCr dich.', exampleEn: 'This is for you.', exampleFa: '\u0627\u06CC\u0646 \u0628\u0631\u0627\u06CC \u062A\u0648\u0633\u062A.' },
			{ german: 'bis', en: 'until', fa: '\u062A\u0627', example: 'Ich arbeite bis acht Uhr.', exampleEn: "I work until eight o'clock.", exampleFa: '\u0645\u0646 \u062A\u0627 \u0633\u0627\u0639\u062A \u0647\u0634\u062A \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u0645.' },
			{ german: 'in', en: 'in', fa: '\u062F\u0631', example: 'Ich komme in zwei Stunden zur\u00FCck.', exampleEn: "I'll be back in two hours.", exampleFa: '\u062F\u0648 \u0633\u0627\u0639\u062A \u062F\u06CC\u06AF\u0631 \u0628\u0631\u0645\u06CC\u200C\u06AF\u0631\u062F\u0645.' },
			{ german: 'aus', en: 'from/out of', fa: '\u0627\u0632', example: 'Ich komme aus Berlin.', exampleEn: 'I come from Berlin.', exampleFa: '\u0645\u0646 \u0627\u0647\u0644 \u0628\u0631\u0644\u06CC\u0646 \u0647\u0633\u062A\u0645.' },
			{ german: 'mit', en: 'with', fa: '\u0628\u0627', example: 'Sie spielen mit einem Hund.', exampleEn: 'They play with a dog.', exampleFa: '\u0622\u0646\u0647\u0627 \u0628\u0627 \u06CC\u06A9 \u0633\u06AF \u0628\u0627\u0632\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F.' },
			{ german: 'nach', en: 'to/after', fa: '\u0628\u0647/\u0628\u0639\u062F \u0627\u0632', example: 'Ich fahre nach Genf.', exampleEn: "I'm going to Geneva.", exampleFa: '\u0645\u0646 \u0628\u0647 \u0698\u0646\u0648 \u0645\u06CC\u200C\u0631\u0648\u0645.' },
			{ german: 'auf', en: 'on', fa: '\u0631\u0648\u06CC', example: 'Das Buch liegt auf dem Tisch.', exampleEn: 'The book is on the table.', exampleFa: '\u06A9\u062A\u0627\u0628 \u0631\u0648\u06CC \u0645\u06CC\u0632 \u0627\u0633\u062A.' },
			{ german: '\u00FCber', en: 'over/about', fa: '\u0628\u0627\u0644\u0627\u06CC/\u062F\u0631\u0628\u0627\u0631\u0647', example: 'Das Flugzeug fliegt \u00FCber den Berg.', exampleEn: 'The plane flies over the mountain.', exampleFa: '\u0647\u0648\u0627\u067E\u06CC\u0645\u0627 \u0627\u0632 \u0628\u0627\u0644\u0627\u06CC \u06A9\u0648\u0647 \u067E\u0631\u0648\u0627\u0632 \u0645\u06CC\u200C\u06A9\u0646\u062F.' },
			{ german: 'dann', en: 'then', fa: '\u0633\u067E\u0633', example: 'Ich gehe dann mal los.', exampleEn: "I'll get going then.", exampleFa: '\u067E\u0633 \u0645\u0646 \u062F\u06CC\u06AF\u0631 \u0645\u06CC\u200C\u0631\u0648\u0645.' },
			{ german: 'vielleicht', en: 'maybe', fa: '\u0634\u0627\u06CC\u062F', example: 'Vielleicht komme ich morgen.', exampleEn: "Maybe I'll come tomorrow.", exampleFa: '\u0634\u0627\u06CC\u062F \u0641\u0631\u062F\u0627 \u0628\u06CC\u0627\u06CC\u0645.' },
			{ german: 'auch', en: 'also/too', fa: '\u0647\u0645\u0686\u0646\u06CC\u0646', example: 'Er hat auch viel Talent.', exampleEn: 'He also has a lot of talent.', exampleFa: '\u0627\u0648 \u0647\u0645\u0686\u0646\u06CC\u0646 \u0627\u0633\u062A\u0639\u062F\u0627\u062F \u0632\u06CC\u0627\u062F\u06CC \u062F\u0627\u0631\u062F.' },
			{ german: 'nicht', en: 'not', fa: '\u0646\u0647/\u0646\u06CC\u0633\u062A', example: 'Mein Name ist nicht Hendrik.', exampleEn: 'My name is not Hendrik.', exampleFa: '\u0627\u0633\u0645 \u0645\u0646 \u0647\u0646\u062F\u0631\u06CC\u06A9 \u0646\u06CC\u0633\u062A.' }
		]
	}
};

/** Count total words/forms in a category */
export function basicsWordCount(cat: BasicCategory): number {
	if (!cat) return 0;
	if (cat.words) return cat.words.length;
	if (cat.type === 'multi' && cat.sections) {
		let count = 0;
		for (const s of cat.sections) {
			if (s.words) count += s.words.length;
			if (s.type === 'conjugation' && s.tenses) {
				for (const t of s.tenses) count += t.forms.length;
			}
		}
		return count;
	}
	return 0;
}

/** Get all category keys */
export function getCategoryKeys(): string[] {
	return Object.keys(basicsData);
}
