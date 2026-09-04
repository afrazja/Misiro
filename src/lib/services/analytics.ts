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
	/**
	 * The lesson PAGE loaded. Not the same as the learner beginning it —
	 * initLesson fires this before the start overlay is even dismissed.
	 */
	| 'lesson_started'
	/**
	 * The learner pressed Start. The gap between this and lesson_started is
	 * the one the funnel could not see: on Day 1, 26 loads produced 6
	 * completions and there was no way to tell whether the other 20 bounced
	 * off the overlay or gave up on sentence four. Those need opposite fixes.
	 */
	| 'lesson_begun'
	/**
	 * A sentence was put on screen. metadata carries { index, total }, so the
	 * furthest index a learner reached is the last one they got.
	 *
	 * lesson_begun already separates "bounced off the start overlay" from
	 * "gave up inside the lesson". This is the half that was still blind:
	 * WHICH sentence. Six of twenty-six who load Day 1 finish it, and until
	 * now the other twenty could be counted but not located — and giving up
	 * on sentence one (the mic permission) and sentence eight (too long) need
	 * opposite fixes.
	 *
	 * Fires on every presentation, so a retry or a jump back writes the same
	 * index twice. That is deliberate — the query counts DISTINCT users per
	 * index, so duplicates collapse, and recording a re-presentation is more
	 * honest than pretending the learner only ever saw a sentence once.
	 *
	 * Order of ten rows a lesson, more with retries. At six completions a
	 * week that is nothing; if volume ever makes it noisy, sample it to the
	 * first few days, which is where the question actually lives.
	 */
	| 'lesson_progress'
	| 'lesson_completed'
	/**
	 * The free-response turn: offered after a completed lesson, begun when
	 * the learner actually says something, completed when they finish or
	 * skip. Instrumented from the start rather than retrofitted the way
	 * lesson_begun had to be.
	 */
	| 'free_turn_offered'
	| 'free_turn_begun'
	| 'free_turn_completed'
	| 'exam_completed'
	| 'review_started'
	| 'conversation_started'
	| 'conversation_completed';

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
