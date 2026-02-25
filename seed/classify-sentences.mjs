/**
 * classify-sentences.mjs
 * Fetches all sentences, classifies each by CEFR level (A1/A2/B1),
 * and updates the difficulty column in Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node seed/classify-sentences.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// CEFR CLASSIFICATION HEURISTICS
// ============================================================

// A1 vocabulary — basic greetings, introductions, simple daily life
const A1_VERBS = new Set([
  'bin', 'bist', 'ist', 'sind', 'seid',
  'habe', 'hast', 'hat', 'haben', 'habt',
  'heiße', 'heißt', 'heißen',
  'komme', 'kommst', 'kommt', 'kommen',
  'wohne', 'wohnst', 'wohnt', 'wohnen',
  'gehe', 'gehst', 'geht', 'gehen',
  'mache', 'machst', 'macht', 'machen',
  'brauche', 'braucht', 'brauchen',
  'spreche', 'sprichst', 'spricht', 'sprechen',
  'lerne', 'lernst', 'lernt', 'lernen',
  'trinke', 'trinkst', 'trinkt', 'trinken',
  'esse', 'isst', 'essen', 'esst',
  'kaufe', 'kaufst', 'kauft', 'kaufen',
  'nehme', 'nimmst', 'nimmt', 'nehmen',
  'möchte', 'möchtest', 'möchten', 'möchtet',
  'danke', 'bitte', 'ja', 'nein',
]);

const A1_PATTERNS = [
  /^(hallo|guten (tag|morgen|abend)|tschüss|auf wiedersehen|danke|bitte)/i,
  /^ich (bin|heiße|komme|wohne|lerne|spreche|brauche|möchte|habe|nehme|trinke)\b/i,
  /^(wie|wo|was|wer) (heißen|heißt|ist|sind|wohnst|kommst)\b/i,
  /^(das ist|hier ist|es ist|es gibt)\b/i,
  /^(ja|nein|danke|bitte|entschuldigung|tschüss)\b/i,
  /^(mein|dein|ihr|sein) name/i,
  /^ich bin \w+\.?$/i,  // "Ich bin Sarah."
  /^(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\b/i,
  /^(guten|gute) (tag|morgen|abend|nacht)/i,
  /^willkommen\b/i,
  /^freut mich/i,
];

// A2 indicators — modal verbs, Perfekt, separable verbs, weil/dass/wenn
const A2_PATTERNS = [
  /\b(kann|kannst|können|könnt|muss|musst|müssen|müsst|will|willst|wollen|wollt|soll|sollst|sollen|sollt|darf|darfst|dürfen|dürft)\b/i,
  /\b(habe|hast|hat|haben|habt|bin|bist|ist|sind|seid)\s+\S*(ge\w+t|ge\w+en)\b/i, // Perfekt
  /\b(weil|dass|wenn|ob|als)\b/i, // subordinating conjunctions
  /\b(auf|an|ein|aus|mit|um|ab|vor|nach|zu)(ge\w+|zu\w+)\b/i, // separable verbs
  /\b(gestern|letzte|letzten|letztes|vorher|danach|nachher)\b/i, // past time markers
  /\b(besser|schlechter|größer|kleiner|mehr|weniger|lieber|am liebsten|am besten)\b/i, // comparatives
  /\b(würde|würdest|würden|würdet)\b/i, // Konjunktiv II simple
  /\b(trotzdem|deshalb|deswegen|außerdem|zuerst|dann|danach|schließlich)\b/i, // connectors
  /\b(sich|mich|dich|uns|euch)\s+\w+(en|t|e)\b/i, // reflexive verbs
];

// B1 indicators — relative clauses, passive, Konjunktiv II, complex structures
const B1_PATTERNS = [
  /\b(der|die|das|dem|den|dessen|deren)\s+(ich|du|er|sie|es|wir|ihr|man)\s+\w+/i, // relative clauses
  /\b(wird|werden|wurde|wurden)\s+\S*(ge\w+t|ge\w+en)\b/i, // passive voice
  /\b(hätte|hättest|hätten|hättet|wäre|wärst|wären|wärt)\b/i, // Konjunktiv II
  /\b(könnte|könntest|könnten|könntet|müsste|müsstest|müssten|sollte|solltest|sollten|dürfte)\b/i, // Konjunktiv II modals
  /\b(obwohl|obgleich|nachdem|bevor|seitdem|während|damit|sodass|falls|sofern)\b/i, // complex conjunctions
  /\b(anstatt|statt)\s+(zu|dass)\b/i,
  /\b(um\s+zu\s+\w+en)\b/i, // um...zu infinitive
  /\b(je\s+\w+er.*desto|je\s+\w+er.*umso)\b/i, // je...desto
  /\b(einerseits|andererseits|im Gegensatz|im Vergleich|hinsichtlich)\b/i, // discourse markers
  /\bnicht nur.*sondern auch\b/i,
];

function classifySentence(germanText) {
  if (!germanText) return 'A1';

  const text = germanText.trim();
  const wordCount = text.split(/\s+/).length;

  // Check B1 patterns first (most complex)
  let b1Score = 0;
  for (const pattern of B1_PATTERNS) {
    if (pattern.test(text)) b1Score++;
  }
  if (b1Score >= 1) return 'B1';

  // Check A2 patterns
  let a2Score = 0;
  for (const pattern of A2_PATTERNS) {
    if (pattern.test(text)) a2Score++;
  }

  // Check A1 patterns
  let a1Score = 0;
  for (const pattern of A1_PATTERNS) {
    if (pattern.test(text)) a1Score++;
  }

  // Check if most words are basic A1 vocab
  const words = text.toLowerCase().replace(/[.,!?;:'"()]/g, '').split(/\s+/);
  const a1VerbCount = words.filter(w => A1_VERBS.has(w)).length;

  // Classification logic
  if (a2Score >= 2) return 'A2';
  if (a2Score >= 1 && wordCount > 8) return 'A2';

  // Long complex sentences without specific patterns likely A2
  if (wordCount > 12 && a1Score === 0) return 'A2';
  if (wordCount > 16) return 'B1';

  // Short simple sentences with A1 verbs
  if (a1Score >= 1) return 'A1';
  if (wordCount <= 6 && a1VerbCount >= 1) return 'A1';
  if (wordCount <= 4) return 'A1';

  // Default: medium sentences without strong signals
  if (wordCount <= 8) return 'A1';
  return 'A2';
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('📊 Fetching all sentences with lesson info...\n');

  // Fetch ALL sentences using pagination (Supabase default limit is 1000)
  let allSentences = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('sentences')
      .select('id, sentence_order, role, audio_text, target_text, translation, lesson_id, lessons!inner(day, difficulty)')
      .order('sentence_order', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('❌ Failed to fetch sentences:', error.message);
      process.exit(1);
    }

    allSentences = allSentences.concat(data);
    console.log(`  Fetched ${data.length} sentences (total so far: ${allSentences.length})`);

    if (data.length < pageSize) break; // No more pages
    from += pageSize;
  }

  const sentences = allSentences;
  console.log(`\nFound ${sentences.length} sentences across all lessons.\n`);

  // Group by day for readable output
  const byDay = {};
  for (const s of sentences) {
    const day = s.lessons.day;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  }

  // Classify each sentence
  const updates = [];
  const stats = { A1: 0, A2: 0, B1: 0 };

  for (const day of Object.keys(byDay).map(Number).sort((a, b) => a - b)) {
    const daySentences = byDay[day];
    console.log(`\n📅 Day ${day} (lesson difficulty: ${daySentences[0].lessons.difficulty}):`);

    for (const s of daySentences) {
      // Use audio_text for received, target_text for sent, fallback to either
      const germanText = s.role === 'received'
        ? (s.audio_text || s.target_text || '')
        : (s.target_text || s.audio_text || '');

      const level = classifySentence(germanText);
      stats[level]++;
      updates.push({ id: s.id, difficulty: level });

      const marker = level === 'A1' ? '🟢' : level === 'A2' ? '🔵' : '🟣';
      console.log(`  ${marker} ${level} | ${germanText.substring(0, 70)}${germanText.length > 70 ? '...' : ''}`);
    }
  }

  console.log(`\n\n📊 Classification Summary:`);
  console.log(`  🟢 A1: ${stats.A1} sentences (${Math.round(stats.A1/sentences.length*100)}%)`);
  console.log(`  🔵 A2: ${stats.A2} sentences (${Math.round(stats.A2/sentences.length*100)}%)`);
  console.log(`  🟣 B1: ${stats.B1} sentences (${Math.round(stats.B1/sentences.length*100)}%)`);

  // Batch update in chunks of 50
  console.log(`\n💾 Updating ${updates.length} sentences in Supabase...`);

  let updated = 0;
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    const promises = chunk.map(u =>
      supabase.from('sentences').update({ difficulty: u.difficulty }).eq('id', u.id)
    );
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error(`  ❌ ${errors.length} errors in chunk ${Math.floor(i/50) + 1}`);
      errors.forEach(e => console.error('    ', e.error.message));
    }
    updated += chunk.length - errors.length;
  }

  console.log(`\n✅ Done! Updated ${updated} of ${updates.length} sentences.`);
}

main();
