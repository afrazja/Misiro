import { CHECK_PROTOCOL, CHECK_WINDOWS, type Assessment } from './phase-three';
import { DAY_MS } from './contract';
export function checkSchedule(rows: Assessment[], now = Date.now()) {
  const current = rows.filter(a => a.protocol === CHECK_PROTOCOL);
  const baseline = current.find(a => a.checkpoint === 0);
  if (!baseline?.completed_at) return { due: 0 as number | null, nextAt: null as string | null, baseline: baseline ?? null, missed: [] as number[] };
  const start = Date.parse(baseline.completed_at);
  const missing = CHECK_WINDOWS.filter(w => !current.some(a => a.checkpoint === w.day && a.completed_at));
  const due = missing.find(w => now >= start + w.day * DAY_MS && now < start + (w.through + 1) * DAY_MS);
  const next = missing.find(w => now < start + w.day * DAY_MS);
  return { due: due?.day ?? null, nextAt: next ? new Date(start + next.day * DAY_MS).toISOString() : null, baseline,
    missed: missing.filter(w => now >= start + (w.through + 1) * DAY_MS).map(w => w.day) };
}
export function assignedForm(userId: string, checkpoint: number): 'a' | 'b' {
  const seed = parseInt(userId.replaceAll('-', '').slice(-8), 16) % 2;
  const position = [0,14,30,90,180].indexOf(checkpoint);
  return (seed + Math.max(0, position)) % 2 ? 'b' : 'a';
}
