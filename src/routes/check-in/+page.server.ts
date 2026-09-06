import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ownAssessments } from '$lib/server/assessments';
import { checkSchedule } from '$lib/analytics/assessment-schedule';
export const load: PageServerLoad = async ({ locals }) => {
  const { data: { user }, error } = await locals.supabase.auth.getUser();
  if (error || !user) throw redirect(303, '/login?redirect=/check-in');
  try {
    const history = await ownAssessments(locals.supabase, user.id);
    return { history, schedule: checkSchedule(history), unavailable: false };
  } catch { return { history: [], schedule: null, unavailable: true }; }
};
