/**
 * seed-glossary.mjs
 * Seeds the glossary into Supabase.
 *
 * Usage:
 *   node seed/seed-glossary.mjs
 *
 * Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
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
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const glossary = JSON.parse(readFileSync(resolve(ROOT, 'lessons/glossary.json'), 'utf8'));
const entries = Object.entries(glossary);

console.log(`📖 Seeding ${entries.length} glossary entries...`);

const rows = entries.map(([word, { en, fa }]) => ({ word, en, fa }));

const { error } = await supabase
  .from('glossary')
  .upsert(rows, { onConflict: 'word' });

if (error) {
  console.error('❌ Failed to seed glossary:', error.message);
  process.exit(1);
}

console.log(`✅ Seeded ${rows.length} glossary entries.`);
