/**
 * Add difficulty column to sentences table via Supabase Management API.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node seed/add-sentence-difficulty-column.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

async function runSQL(sql) {
  // Use the PostgREST approach: create a temporary function, call it, drop it
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!resp.ok) {
    // If exec_sql doesn't exist, try alternative approach
    return null;
  }
  return await resp.json();
}

async function main() {
  console.log('🔧 Adding difficulty column to sentences table...\n');

  // Try to add the column by doing an update with the new column
  // If the column doesn't exist, we need to use the SQL API
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  // Test if column already exists by trying to query it
  const { data, error } = await sb.from('sentences').select('difficulty').limit(1);

  if (!error) {
    console.log('✅ Column "difficulty" already exists on sentences table.');
    console.log('   Current value:', data?.[0]?.difficulty ?? 'NULL');
    return;
  }

  if (error.message.includes('difficulty')) {
    console.log('❌ Column does not exist. Please run this SQL in the Supabase dashboard SQL editor:');
    console.log('');
    console.log("  ALTER TABLE sentences ADD COLUMN difficulty TEXT CHECK (difficulty IN ('A1','A2','B1'));");
    console.log('');
    console.log('Then re-run classify-sentences.mjs');
  } else {
    console.log('Unexpected error:', error.message);
  }
}

main();
