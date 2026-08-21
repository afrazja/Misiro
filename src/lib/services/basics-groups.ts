/**
 * How the eighteen Basics topics are grouped on the shelf.
 *
 * The German Basics artboard files them under three headings — words and
 * things, sentence shape, verbs — and offers them as filter chips. That
 * grouping is editorial: it does not exist in `basics_categories`, which
 * only carries a flat `sort_order`. Putting it here rather than in the DB
 * keeps it one edit to change, and lets both the English and Persian
 * shelves read the same arrangement instead of drifting apart.
 *
 * An unrecognised key falls into 'words' rather than being dropped. A topic
 * missing from this map is a topic that vanishes from the page — a silent
 * content loss nobody would notice until a learner went looking for it —
 * whereas one filed under a slightly odd heading is merely untidy.
 */

export type GroupId = 'words' | 'shape' | 'verbs';

export interface Group {
	id: GroupId;
	en: string;
	fa: string;
	/** One line under the heading, explaining what belongs here. */
	noteEn: string;
	noteFa: string;
}

export const GROUPS: Group[] = [
	{
		id: 'words',
		en: 'Words & things',
		fa: 'کلمه‌ها و چیزها',
		noteEn: 'The nouns, and the small words that travel with them.',
		noteFa: 'اسم‌ها و کلمه‌های کوچکی که همراهشان می‌آیند.'
	},
	{
		id: 'shape',
		en: 'Sentence shape',
		fa: 'ساختار جمله',
		noteEn: 'Where things go, and what changes when they move.',
		noteFa: 'اینکه هر چیز کجا می‌نشیند و با جابه‌جا شدن چه تغییری می‌کند.'
	},
	{
		id: 'verbs',
		en: 'Verbs',
		fa: 'فعل‌ها',
		noteEn: 'Doing, wanting, having done, and being done to.',
		noteFa: 'انجام دادن، خواستن، انجام داده‌بودن و انجام‌شدن.'
	}
];

/** Category key → group. Keys are the ones in `basics_categories`. */
const ASSIGNMENT: Record<string, GroupId> = {
	pronounsAndSein: 'words',
	articles: 'words',
	numbers: 'words',
	colors: 'words',
	days: 'words',
	months: 'words',
	adjectives: 'words',

	wordOrder: 'shape',
	cases: 'shape',
	prepositions: 'shape',
	conjunctions: 'shape',
	questionWords: 'shape',
	negationImpersonal: 'shape',

	verbConjugation: 'verbs',
	modalVerbs: 'verbs',
	verbTenses: 'verbs',
	verbTypes: 'verbs',
	passiveKonjunktiv: 'verbs'
};

/** Every key this map knows about — the assertion surface for tests. */
export const KNOWN_KEYS = Object.keys(ASSIGNMENT);

export function groupFor(key: string): GroupId {
	return ASSIGNMENT[key] ?? 'words';
}

/**
 * Does this topic match what was typed?
 *
 * Searches the title and description in whichever language is on screen,
 * plus the key, so "wordOrder" finds Word order even when the shelf is in
 * Persian and the visible title shares no characters with the query.
 */
export function matchesQuery(
	topic: { key: string; title: string; description: string },
	query: string
): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return (
		topic.title.toLowerCase().includes(q) ||
		topic.description.toLowerCase().includes(q) ||
		topic.key.toLowerCase().includes(q)
	);
}
