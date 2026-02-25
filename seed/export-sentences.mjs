/**
 * export-sentences.mjs
 * Fetches ALL sentences from Supabase (with pagination) joined with lessons,
 * and exports them to an Excel (.xlsx) file.
 *
 * Usage:
 *   node seed/export-sentences.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { resolve } from 'path';

// ─── Supabase config ───
const SUPABASE_URL = 'https://hznsiatbwkhjwrnezcds.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnNpYXRid2toandybmV6Y2RzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ4MTI5MCwiZXhwIjoyMDg3MDU3MjkwfQ.n57OhvxGYwf2Apc1Dy4Z34bhihbhhh9Pq2trbirzHD8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const OUTPUT_PATH = 'C:/Users/afzja/OneDrive/Desktop/all-sentences.xlsx';

// ─── Fetch all sentences with pagination ───
async function fetchAllSentences() {
  const allSentences = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('sentences')
      .select(
        'sentence_order, role, audio_text, target_text, translation, difficulty, lesson_id, lessons!inner(day, title, difficulty)'
      )
      .order('sentence_order', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch sentences:', error.message);
      process.exit(1);
    }

    allSentences.push(...data);
    console.log(
      `  Fetched rows ${from}–${from + data.length - 1} (${data.length} rows, total: ${allSentences.length})`
    );

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allSentences;
}

// ─── Main ───
async function main() {
  console.log('Fetching all sentences from Supabase...\n');
  const sentences = await fetchAllSentences();
  console.log(`\nTotal sentences fetched: ${sentences.length}\n`);

  // Sort by day ascending, then sentence_order ascending
  sentences.sort((a, b) => {
    const dayA = a.lessons.day;
    const dayB = b.lessons.day;
    if (dayA !== dayB) return dayA - dayB;
    return a.sentence_order - b.sentence_order;
  });

  // Build rows for Excel
  const rows = sentences.map((s) => {
    const germanText =
      s.role === 'received'
        ? s.audio_text || s.target_text || ''
        : s.target_text || s.audio_text || '';

    return {
      Day: s.lessons.day,
      'Lesson Title': s.lessons.title,
      'Lesson Difficulty': s.lessons.difficulty,
      'Sentence Order': s.sentence_order,
      Role: s.role,
      'German Text': germanText,
      Translation: s.translation || '',
      'Sentence Difficulty': s.difficulty || '',
    };
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // ─── Formatting ───

  // Auto-width columns: measure max content length per column
  const headers = Object.keys(rows[0]);
  const colWidths = headers.map((h) => {
    let maxLen = h.length; // start with header length
    for (const row of rows) {
      const val = String(row[h] ?? '');
      if (val.length > maxLen) maxLen = val.length;
    }
    // Cap at 60 to prevent overly wide columns
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  // Bold headers: set style on each header cell
  // Note: xlsx community edition supports cell styling via '!cols' and '!rows'
  // but full cell-level bold requires the 'xlsx-style' fork.
  // We use row height for the header to make it stand out.
  ws['!rows'] = [{ hpt: 22 }]; // slightly taller header row

  XLSX.utils.book_append_sheet(wb, ws, 'All Sentences');

  // Write file
  XLSX.writeFile(wb, OUTPUT_PATH);
  console.log(`Excel file written to: ${OUTPUT_PATH}`);
  console.log(`Total rows: ${rows.length} (plus header)`);
}

main();
