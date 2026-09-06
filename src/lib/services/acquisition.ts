import { classifyEntry, type Touch } from '$lib/analytics/acquisition';
import { DAY_MS } from '$lib/analytics/contract';
const KEY = 'mirifer_entry_v1';
let memory: Touch | null = null;
const busy = new Set<string>();
const delivered = new Set<string>();
export function captureAcquisition() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
  try { memory = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* use memory */ }
  if (!memory || !Number.isFinite(Date.parse(memory.captured_at)) || Date.parse(memory.captured_at) < Date.now() - 30 * DAY_MS || Date.parse(memory.captured_at) > Date.now()) {
    memory = classifyEntry(window.location.href, document.referrer);
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* memory fallback */ }
  }
}
export async function collectAcquisition(userId: string) {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin') || busy.has(userId) || delivered.has(userId)) return;
  try { if (localStorage.getItem(`${KEY}:${userId}`)) return; } catch { /* use memory */ }
  captureAcquisition();
  if (!memory) return;
  busy.add(userId);
  try {
    const response = await fetch('/api/acquisition', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, ...memory }) });
    if (!response.ok) return; // Retry on the next signed-in navigation; never block learning.
    delivered.add(userId);
    try { localStorage.setItem(`${KEY}:${userId}`, '1'); localStorage.removeItem(KEY); } catch { /* memory fallback */ }
    memory = null;
  } catch { /* next navigation retries */ } finally { busy.delete(userId); }
}
