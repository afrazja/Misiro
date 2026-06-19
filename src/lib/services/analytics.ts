/**
 * Analytics — fire-and-forget event tracking.
 *
 * Writes a timestamped row to the Supabase `events` table for each meaningful
 * user action. Used to power precise activation/retention analytics (see
 * analytics/insights.sql) beyond the "last_active" approximation.
 *
 * Design rules:
 *  - Best-effort: never throws, never blocks the lesson flow. Callers fire it
 *    with `void trackEvent(...)`.
 *  - Only tracks authenticated users (the events table is user-scoped via RLS).
 *  - No-ops during SSR and when Supabase is not configured.
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { getUser } from './auth';
import { logWarn } from '$utils/error';

export type AnalyticsEvent =
	| 'lesson_started'
	| 'lesson_completed'
	| 'exam_completed'
	| 'review_started';

interface TrackOptions {
	/** Optional lesson day the event relates to. */
	day?: number;
	/** Optional extra context stored as JSONB. */
	metadata?: Record<string, unknown>;
}

/**
 * Record an analytics event. Safe to call without awaiting.
 */
export async function trackEvent(event: AnalyticsEvent, opts: TrackOptions = {}): Promise<void> {
	if (typeof window === 'undefined') return;

	try {
		const user = await getUser();
		if (!user) return; // only signed-in users (RLS requires user_id)

		const sb = getSupabaseBrowserClient();
		if (!sb) return;

		await sb.from('events').insert({
			user_id: user.id,
			event_name: event,
			day: opts.day ?? null,
			metadata: opts.metadata ?? {}
		});
	} catch (e) {
		// Analytics must never disrupt the app — swallow and log at warn level.
		logWarn('analytics:trackEvent', `Failed to record "${event}": ${(e as Error)?.message ?? e}`);
	}
}
