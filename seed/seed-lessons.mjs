/**
 * seed-lessons.mjs
 * Seeds all 36 lessons and their sentences into Supabase.
 *
 * Usage:
 *   node seed/seed-lessons.mjs
 *
 * Requires environment variables:
 *   SUPABASE_URL     - your project URL (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_KEY - service role key (from Supabase dashboard > Settings > API)
 *
 * Run from the project root:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node seed/seed-lessons.mjs
 *
 * Or create a .env.seed file and load it:
 *   node --env-file=.env.seed seed/seed-lessons.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  console.error('   Run: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node seed/seed-lessons.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Load index
const index = JSON.parse(readFileSync(resolve(ROOT, 'lessons/index.json'), 'utf8'));

console.log(`📚 Seeding ${index.lessons.length} lessons...`);

let totalSentences = 0;
let skippedLessons = 0;

for (const meta of index.lessons) {
  const lessonFile = resolve(ROOT, 'lessons', meta.file);
  let lessonData;
  try {
    lessonData = JSON.parse(readFileSync(lessonFile, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠️  Could not read ${meta.file}, skipping`);
    skippedLessons++;
    continue;
  }

  // Upsert lesson row (ON CONFLICT day → update)
  const { data: lessonRow, error: lessonErr } = await supabase
    .from('lessons')
    .upsert({
      day: meta.day,
      title: meta.title,
      title_fa: meta.titleFa || null,
      group: meta.group,
      sort_order: meta.day
    }, { onConflict: 'day' })
    .select('id')
    .single();

  if (lessonErr) {
    console.error(`  ❌ Failed to upsert lesson day ${meta.day}:`, lessonErr.message);
    continue;
  }

  const lessonId = lessonRow.id;

  // Delete existing sentences for this lesson (clean re-seed)
  await supabase.from('sentences').delete().eq('lesson_id', lessonId);

  // Insert sentences
  const sentenceRows = lessonData.sentences.map((s, i) => ({
    lesson_id: lessonId,
    sentence_order: i,
    role: s.role,
    audio_text: s.audioText || null,
    target_text: s.targetText || null,
    translation: s.translation,
    translation_fa: s.translationFa || null
  }));

  const { error: sentErr } = await supabase.from('sentences').insert(sentenceRows);
  if (sentErr) {
    console.error(`  ❌ Failed to insert sentences for day ${meta.day}:`, sentErr.message);
    continue;
  }

  totalSentences += sentenceRows.length;
  console.log(`  ✅ Day ${meta.day}: "${meta.title}" — ${sentenceRows.length} sentences`);
}

console.log(`\n🎉 Done! Seeded ${index.lessons.length - skippedLessons} lessons, ${totalSentences} sentences total.`);
if (skippedLessons > 0) console.log(`⚠️  Skipped ${skippedLessons} lessons (missing files).`);
