import { DAY_MS, type StoredEvent } from './contract';
import type { AnalyticsUser } from './report';
import { distinct, median } from './statistics';

const learningNames = new Set(['answer_submitted', 'free_turn_begun', 'exam_completed']);
const at = (e: StoredEvent) => Date.parse(e.occurred_at);
export const RETURN_WINDOWS = [
	{ label: '24h–7 days', after: 1, through: 7, inclusiveStart: true },
	{ label: 'Days 8–14', after: 7, through: 14, inclusiveStart: false },
	{ label: 'Days 15–21', after: 14, through: 21, inclusiveStart: false },
	{ label: 'Days 22–28', after: 21, through: 28, inclusiveStart: false }
];
function weekStart(timestamp: number) {
	const date = new Date(timestamp); date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
	return date.toISOString().slice(0, 10);
}

export function buildReturnReport(events: StoredEvent[], users: AnalyticsUser[], coverageStart: number | null, since: number, now: number) {
	const byUser = new Map<string, StoredEvent[]>();
	for (const e of events) {
		if (at(e) > now) continue;
		const rows = byUser.get(e.user_id) ?? []; rows.push(e); byUser.set(e.user_id, rows);
	}
	const people = users.map(user => {
		const rows = byUser.get(user.id) ?? [];
		const visits = new Map<string, StoredEvent[]>();
		const pastAttempts = new Map<string, Set<string>>();
		const finishedAttempts = new Set<string>();
		const resumedVisits = new Set<string>();
		for (const e of rows) {
			const visit = visits.get(e.session_id) ?? []; visit.push(e); visits.set(e.session_id, visit);
			if (e.attempt_id && !finishedAttempts.has(e.attempt_id) && (e.metadata.mode === 'lesson' || e.metadata.insights_version !== 3) &&
				['lesson_started', 'lesson_begun', 'lesson_resumed', 'lesson_progress', 'sentence_practice_opened', 'answer_submitted', 'lesson_attempt_completed'].includes(e.event_name)) {
				const previous = pastAttempts.get(e.attempt_id) ?? new Set<string>();
				if ([...previous].some(id => id !== e.session_id)) resumedVisits.add(e.session_id);
				previous.add(e.session_id); pastAttempts.set(e.attempt_id, previous);
				if (e.event_name === 'lesson_attempt_completed') finishedAttempts.add(e.attempt_id);
			}
		}
		const learn = [...visits.entries()].flatMap(([id, rows]) => {
			const activity = rows.filter(e => learningNames.has(e.event_name));
			return activity.length ? [{ id, first: at(activity[0]), activity,
				measured: activity.some(e => e.metadata.insights_version === 3),
				resumed: resumedVisits.has(id), review: rows.some(e => e.event_name === 'review_started') }] : [];
		}).sort((a, b) => a.first - b.first);
		const inPeriod = learn.filter(v => v.activity.some(e => at(e) >= since));
		const first = learn[0]?.first ?? null;
		const trackedNewAccount = coverageStart !== null && Date.parse(user.created_at) >= coverageStart &&
			first !== null && first >= Date.parse(user.created_at);
		return { id: user.id, label: `Learner ${user.id.slice(-8)}`, first,
			cohort: first !== null && trackedNewAccount && first >= since ? weekStart(first) : null,
			secondSeconds: learn.length >= 2 ? (learn[1].first - learn[0].first) / 1000 : null,
			learningVisits: inPeriod.length,
			activeDays: distinct(inPeriod.flatMap(v => v.activity.filter(e => at(e) >= since).map(e => new Date(e.occurred_at).toISOString().slice(0, 10)))),
			resumedVisits: inPeriod.filter(v => v.resumed).length, reviewVisits: inPeriod.filter(v => v.review).length,
			measuredVisits: inPeriod.filter(v => v.measured).length,
			windows: RETURN_WINDOWS.map(window => {
				const eligible = first !== null && now >= first + window.through * DAY_MS;
				const returned = eligible && learn.slice(1).some(v => v.activity.some(e => {
					const elapsed = at(e) - first!;
					return (window.inclusiveStart ? elapsed >= window.after * DAY_MS : elapsed > window.after * DAY_MS) && elapsed <= window.through * DAY_MS;
				}));
				return { eligible, returned };
			}) };
	});
	const cohortPeople = people.filter(p => p.cohort !== null);
	const cohorts = [...new Set(cohortPeople.map(p => p.cohort!))].sort().reverse().map(week => {
		const members = cohortPeople.filter(p => p.cohort === week);
		return { week, learners: members.length, userIds: members.map(p => p.id), windows: RETURN_WINDOWS.map((window, i) => {
			const eligible = members.filter(p => p.windows[i].eligible);
			const returned = eligible.filter(p => p.windows[i].returned);
			return { label: window.label, eligible: eligible.length, returned: returned.length,
				pending: members.length - eligible.length, userIds: returned.map(p => p.id) };
		}) };
	});
	const active = people.filter(p => p.learningVisits);
	const secondSamples = cohortPeople.flatMap(p => p.secondSeconds !== null ? [p.secondSeconds] : []);
	return { cohorts, learners: cohortPeople.length, eligible: cohortPeople.filter(p => p.windows[0].eligible).length,
		returned: cohortPeople.filter(p => p.windows[0].returned).length,
		pending: cohortPeople.filter(p => !p.windows[0].eligible).length,
		secondSeconds: median(secondSamples), secondSamples: secondSamples.length,
		withoutSecond: cohortPeople.filter(p => p.secondSeconds === null).length,
		activeLearners: active.length, medianVisits: median(active.map(p => p.learningVisits)), medianDays: median(active.map(p => p.activeDays)),
		resumedVisits: active.reduce((sum, p) => sum + p.resumedVisits, 0), reviewVisits: active.reduce((sum, p) => sum + p.reviewVisits, 0),
		measuredVisits: active.reduce((sum, p) => sum + p.measuredVisits, 0),
		outsideCohort: active.filter(p => !p.cohort).length,
		distribution: [{ label: '1 visit', min: 1, max: 1 }, { label: '2 visits', min: 2, max: 2 },
			{ label: '3–4 visits', min: 3, max: 4 }, { label: '5+ visits', min: 5, max: Infinity }].map(bucket => ({
				label: bucket.label, learners: active.filter(p => p.learningVisits >= bucket.min && p.learningVisits <= bucket.max).length })),
		people: people.filter(p => p.learningVisits || p.cohort).sort((a, b) => (b.first ?? 0) - (a.first ?? 0)) };
}
export type ReturnReport = ReturnType<typeof buildReturnReport>;
