/**
 * Practice streak: consecutive calendar days with at least one completed
 * lesson, counting back from today (or yesterday, so the streak doesn't
 * break before today's session is done).
 *
 * The single source of truth — the home dashboard and the lesson
 * completion card must always agree.
 */
export function computeStreak(
	completedLessons: Record<string | number, { completedAt: number }> | null | undefined
): number {
	const entries = Object.values(completedLessons ?? {});
	if (!entries.length) return 0;

	const days = new Set(
		entries
			.filter((e) => e && e.completedAt)
			.map((e) => new Date(e.completedAt).toDateString())
	);

	let streak = 0;
	const check = new Date();

	// Allow today or yesterday as the start
	if (!days.has(check.toDateString())) {
		check.setDate(check.getDate() - 1);
	}

	while (days.has(check.toDateString())) {
		streak++;
		check.setDate(check.getDate() - 1);
	}
	return streak;
}
