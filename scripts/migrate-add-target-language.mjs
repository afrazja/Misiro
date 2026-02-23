/**
 * One-time migration: add target_language column to user_profiles
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-add-target-language.mjs
 *
 * This script checks if the column exists and adds it if missing.
 * It uses the Supabase service key to create a helper SQL function,
 * run the migration, then drop the helper function.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 1. Check if column already exists via information_schema (PostgREST can query this)
const { data: cols, error: colErr } = await supabase
  .from('user_profiles')
  .select('target_language')
  .limit(1);

if (!colErr) {
  console.log('✅  Column target_language already exists — nothing to do.');
  process.exit(0);
}

if (!colErr.message.includes('target_language')) {
  console.error('❌  Unexpected error checking column:', colErr.message);
  process.exit(1);
}

// 2. Column doesn't exist. Try to add it via a temporary migration RPC function.
console.log('🔧  Column missing, running migration…');

// Create a helper function with SECURITY DEFINER (service role can do this)
const createFn = `
CREATE OR REPLACE FUNCTION _mirifer_run_migration()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT NULL
    CHECK (target_language IN ('de', 'fr'));
END;
$$;
`;

// We can't run raw DDL from the JS client directly, so we'll attempt it via the
// Supabase Management API if a PAT is available, or print SQL for manual execution.

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (PAT && ref) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT}`,
    },
    body: JSON.stringify({
      query: `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT NULL CHECK (target_language IN ('de', 'fr'));`
    }),
  });

  if (res.ok) {
    console.log('✅  Migration applied via Management API.');
    process.exit(0);
  }
  const body = await res.text();
  console.warn('⚠️   Management API failed:', body);
}

// Fallback: print SQL for manual execution
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Auto-migration not possible without a personal access token.
 Please run the following SQL in your Supabase SQL Editor:
 https://supabase.com/dashboard/project/${ref ?? 'YOUR_PROJECT'}/sql/new
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT NULL
  CHECK (target_language IN ('de', 'fr'));

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
process.exit(1);
