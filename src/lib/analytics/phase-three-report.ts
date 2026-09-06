import { DAY_MS, type StoredEvent } from './contract';
import { CHECK_PROTOCOL, CHECK_WINDOWS, SOURCE_LABELS, type PhaseThreeData, type ProductChange, type Assessment } from './phase-three';
import type { AnalyticsUser } from './report';
import { median } from './statistics';
const at = (e: StoredEvent) => Date.parse(e.occurred_at);
const learning = new Set(['answer_submitted','free_turn_begun','exam_completed']);
const mean = (values: number[]) => values.length ? values.reduce((a,b) => a+b,0) / values.length : null;
const total = (a: Assessment) => a.listening_correct! + a.reading_correct!;
/** Outcomes relative to signup, with identical observation time for every account. */
export function signupOutcomes(user: AnalyticsUser, events: StoredEvent[], now: number) {
  const signup = Date.parse(user.created_at);
  const firstWeek = events.filter(e => e.user_id === user.id && at(e) >= signup && at(e) <= signup + 7 * DAY_MS && at(e) <= now);
  const practice = firstWeek.filter(e => learning.has(e.event_name));
  const first = practice[0];
  return { id: user.id, dayEligible: now >= signup + DAY_MS, weekEligible: now >= signup + 7 * DAY_MS,
    activation: practice.some(e => at(e) <= signup + DAY_MS), completion: firstWeek.some(e => e.event_name === 'lesson_attempt_completed'),
    return: !!first && practice.some(e => e.session_id !== first.session_id && at(e) >= at(first) + DAY_MS),
    obstacle: firstWeek.some(e => e.event_name === 'obstacle') };
}
function rates(people: ReturnType<typeof signupOutcomes>[]) {
  return Object.fromEntries((['activation','completion','return','obstacle'] as const).map(metric => {
    const eligible = people.filter(p => metric === 'activation' ? p.dayEligible : p.weekEligible);
    return [metric, { count: eligible.filter(p => p[metric]).length, eligible: eligible.length, pending: people.length - eligible.length }];
  })) as Record<keyof typeof import('./phase-three').CHANGE_METRICS, { count: number; eligible: number; pending: number }>;
}
export function compareChange(change: ProductChange, users: AnalyticsUser[], events: StoredEvent[], coverage: number | null, now: number) {
  const shipped = Date.parse(change.shipped_at), span = change.window_days * DAY_MS;
  const make = (start: number, end: number) => {
    const members = users.filter(u => Date.parse(u.created_at) >= start && Date.parse(u.created_at) < end && Date.parse(u.created_at) <= now);
    const outcomes = rates(members.map(u => signupOutcomes(u, events, now)))[change.metric];
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), readyAt: new Date(end + 7 * DAY_MS).toISOString(),
      covered: coverage !== null && coverage <= start, mature: now >= end + 7 * DAY_MS,
      signups: members.length, ...outcomes };
  };
  // The baseline's seven-day follow-up ends before rollout, avoiding exposure to the change.
  const before = make(shipped - span - 7 * DAY_MS, shipped - 7 * DAY_MS);
  const after = make(shipped, shipped + span);
  const ready = before.covered && after.covered && before.mature && after.mature && before.eligible > 0 && after.eligible > 0;
  return { ...change, before, after, ready, difference: ready ? 100 * (after.count / after.eligible - before.count / before.eligible) : null };
}
export function buildPhaseThreeReport(data: PhaseThreeData, users: AnalyticsUser[], events: StoredEvent[], coverage: number | null, since: number, now: number) {
  const allowed = new Set(users.map(u => u.id));
  const assessments = data.assessments.filter(a => allowed.has(a.user_id) && Date.parse(a.started_at) <= now && (!a.completed_at || Date.parse(a.completed_at) <= now));
  const baseline = assessments.filter(a => a.protocol === CHECK_PROTOCOL && a.checkpoint === 0 && a.completed_at && Date.parse(a.completed_at) >= since);
  const rows = baseline.map(base => {
    const completed = Date.parse(base.completed_at!);
    return { id: base.user_id, label: `Learner ${base.user_id.slice(-8)}`, baseline: base,
      priorPractice: events.some(e => e.user_id === base.user_id && learning.has(e.event_name) && at(e) < Date.parse(base.started_at)),
      checkpoints: CHECK_WINDOWS.map(w => {
        const open = completed + w.day * DAY_MS, close = completed + (w.through + 1) * DAY_MS;
        const matched = assessments.find(a => a.user_id === base.user_id && a.protocol === base.protocol && a.baseline_id === base.id && a.checkpoint === w.day && a.completed_at && Date.parse(a.completed_at) >= open && Date.parse(a.completed_at) < close);
        return { day: w.day, eligible: now >= open, closed: now >= close, result: matched ?? null,
          delta: matched ? total(matched) - total(base) : null };
      }) };
  });
  const checkpoints = CHECK_WINDOWS.map((window, i) => {
    const pairs = rows.filter(r => r.checkpoints[i].result);
    return { day: window.day, through: window.through, eligible: rows.filter(r => r.checkpoints[i].eligible).length,
      pending: rows.filter(r => !r.checkpoints[i].eligible).length,
      overdue: rows.filter(r => r.checkpoints[i].closed && !r.checkpoints[i].result).length,
      paired: pairs.length, listeningChange: mean(pairs.map(r => r.checkpoints[i].result!.listening_correct! - r.baseline.listening_correct!)),
      readingChange: mean(pairs.map(r => r.checkpoints[i].result!.reading_correct! - r.baseline.reading_correct!)),
      totalChange: mean(pairs.map(r => r.checkpoints[i].delta!)), medianElapsedDays: median(pairs.map(r => (Date.parse(r.checkpoints[i].result!.completed_at!) - Date.parse(r.baseline.completed_at!)) / DAY_MS)),
      formPairs: ['a','b'].map(form => ({ form, count: pairs.filter(r => r.baseline.form === form).length })) };
  });
  const newUsers = users.filter(u => Date.parse(u.created_at) >= since && Date.parse(u.created_at) <= now);
  const sources = newUsers.map(u => {
    const entry = data.acquisition.find(a => a.user_id === u.id && a.new_account && Date.parse(a.recorded_at) <= now);
    return { ...signupOutcomes(u, events, now), source: entry?.source ?? 'unknown', observed: !!entry,
      measured: coverage !== null && Date.parse(u.created_at) >= coverage };
  });
  const sourceGroups = [...new Set(sources.map(u => u.source))].map(source => {
    const people = sources.filter(u => u.source === source);
    return { source, label: SOURCE_LABELS[source], signups: people.length, userIds: people.map(u => u.id), untracked: people.filter(p => !p.measured).length, ...rates(people.filter(p => p.measured)) };
  }).sort((a,b) => b.signups - a.signups || a.label.localeCompare(b.label));
  return { error: data.error,
    assessments: { rows, checkpoints, completed: baseline.length, started: assessments.filter(a => a.checkpoint === 0 && Date.parse(a.started_at) >= since).length,
      unfinished: assessments.filter(a => a.checkpoint === 0 && !a.completed_at && Date.parse(a.started_at) >= since).length,
      priorPractice: rows.filter(r => r.priorPractice).length,
      baselineListening: mean(baseline.map(a => a.listening_correct!)), baselineReading: mean(baseline.map(a => a.reading_correct!)) },
    acquisition: { groups: sourceGroups, signups: newUsers.length, observed: sources.filter(s => s.observed).length, unknown: sources.filter(s => s.source === 'unknown').length,
      existingEntries: data.acquisition.filter(a => allowed.has(a.user_id) && !a.new_account && Date.parse(a.recorded_at) >= since && Date.parse(a.recorded_at) <= now).length },
    changes: data.changes.filter(c => Date.parse(c.shipped_at) >= since && Date.parse(c.shipped_at) <= now).sort((a,b) => Date.parse(b.shipped_at) - Date.parse(a.shipped_at)).map(c => compareChange(c, users, events, coverage, now))
  };
}
