import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serviceClient } from '$lib/server/supabase-admin';
import { ownAssessments } from '$lib/server/assessments';
import { checkSchedule, assignedForm } from '$lib/analytics/assessment-schedule';
import { CHECK_PROTOCOL, AssessmentSchema } from '$lib/analytics/phase-three';
import { gradeCheck, publicItems } from '$lib/server/assessment-bank';
import { UUID } from '$lib/analytics/contract';
export const POST: RequestHandler = async ({ request, locals }) => {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Origin rejected' }, { status: 403 });
  const { data: { user }, error } = await locals.supabase.auth.getUser();
  if (error || !user) return json({ error: 'Sign in again to save your check.' }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 4000) return json({ error: 'Request too large' }, { status: 413 });
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request' }, { status: 400 }); }
  if (!body || !['start','finish'].includes(body.action)) return json({ error: 'Invalid request' }, { status: 400 });
  const db = serviceClient();
  if (!db) return json({ error: 'Checks are temporarily unavailable.' }, { status: 503 });
  try {
    const history = await ownAssessments(db, user.id), now = Date.now();
    const schedule = checkSchedule(history, now);
    if (body.action === 'start') {
      if (schedule.due === null) return json({ error: 'Your next check is not due yet.' }, { status: 409 });
      const checkpoint = schedule.due;
      const existing = history.find(a => a.checkpoint === checkpoint);
      if (existing) return json({ attempt: existing, items: publicItems(existing.form) });
      const { data: saved, error: saveError } = await db.from('analytics_assessments').insert({ user_id: user.id, protocol: CHECK_PROTOCOL, checkpoint, form: assignedForm(user.id, checkpoint), baseline_id: checkpoint === 0 ? null : schedule.baseline!.id }).select('*').single();
      // A second tab may have created the same scheduled check. Resume that record.
      if (saveError?.code === '23505') {
        const shared = (await ownAssessments(db, user.id)).find(a => a.checkpoint === checkpoint);
        if (shared) return json({ attempt: shared, items: shared.completed_at ? [] : publicItems(shared.form) });
      }
      if (saveError || !saved) throw new Error('Check could not start. Please try again.');
      const attempt = AssessmentSchema.parse(saved);
      return json({ attempt, items: publicItems(attempt.form) });
    }
    if (typeof body.id !== 'string' || !UUID.test(body.id)) return json({ error: 'Invalid check' }, { status: 400 });
    const attempt = history.find(a => a.id === body.id);
    if (!attempt) return json({ error: 'Check not found' }, { status: 404 });
    if (attempt.completed_at) return json({ result: attempt }); // Lost response: return the original score.
    if (schedule.due !== attempt.checkpoint) return json({ error: 'This check window has closed. Return to the check page for your next date.' }, { status: 409 });
    const scores = gradeCheck(attempt.form, body.answers);
    if (!scores) return json({ error: 'All 12 questions must have an answer or a skip.' }, { status: 400 });
    const { data: saved, error: saveError } = await db.from('analytics_assessments').update({ ...scores, completed_at: new Date(now).toISOString() }).eq('id', attempt.id).eq('user_id', user.id).is('completed_at', null).select('*').maybeSingle();
    if (saveError) throw new Error('Your result could not be saved. Keep this page open and retry.');
    const result = saved ?? (await ownAssessments(db, user.id)).find(a => a.id === attempt.id && a.completed_at);
    if (!result) throw new Error('Your result could not be saved. Keep this page open and retry.');
    return json({ result: AssessmentSchema.parse(result) });
  } catch { return json({ error: 'Checks are temporarily unavailable. Keep this page open and retry.' }, { status: 503 }); }
};
