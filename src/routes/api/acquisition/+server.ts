import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { SOURCES } from '$lib/analytics/phase-three';
import { DAY_MS } from '$lib/analytics/contract';
import { serviceClient } from '$lib/server/supabase-admin';
const bodySchema = z.object({ user_id: z.string().uuid(), source: z.enum(SOURCES), method: z.enum(['tag','referrer','direct','unavailable']), captured_at: z.string().datetime() });
export const POST: RequestHandler = async ({ request, locals }) => {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Origin rejected' }, { status: 403 });
  const { data: { user }, error } = await locals.supabase.auth.getUser();
  if (error || !user) return json({ error: 'Sign in required' }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 2000) return json({ error: 'Request too large' }, { status: 413 });
  let body; try { body = bodySchema.safeParse(JSON.parse(raw)); } catch { return json({ error: 'Invalid entry' }, { status: 400 }); }
  const now = Date.now();
  if (!body.success || body.data.user_id !== user.id || Date.parse(body.data.captured_at) < now - 30 * DAY_MS || Date.parse(body.data.captured_at) > now + 300_000) return json({ error: 'Invalid entry' }, { status: 400 });
  const db = serviceClient();
  if (!db) return json({ error: 'Collection unavailable' }, { status: 503 });
  const signup = Date.parse(user.created_at), capture = Date.parse(body.data.captured_at);
  const { error: writeError } = await db.from('analytics_acquisition').upsert({ ...body.data,
    // A later return by an established account must never become its signup source.
    new_account: signup >= capture - 5 * 60_000 && signup <= now && now - signup <= 7 * DAY_MS
  }, { onConflict: 'user_id', ignoreDuplicates: true });
  return writeError ? json({ error: 'Collection unavailable' }, { status: 503 }) : json({ saved: true });
};
