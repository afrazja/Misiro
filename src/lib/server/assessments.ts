import type { SupabaseClient } from '@supabase/supabase-js';
import { AssessmentSchema, CHECK_PROTOCOL } from '$lib/analytics/phase-three';
export async function ownAssessments(db: SupabaseClient, userId: string) {
  const result = await db.from('analytics_assessments').select('*').eq('user_id', userId).eq('protocol', CHECK_PROTOCOL).order('started_at');
  if (result.error || !result.data) throw new Error('Progress checks are temporarily unavailable. Please try again later.');
  return result.data.map(row => AssessmentSchema.parse(row));
}
