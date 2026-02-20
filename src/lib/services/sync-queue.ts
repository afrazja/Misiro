/**
 * Sync Queue — persists failed cloud writes and retries them automatically.
 * Extracted from data-layer.js retry queue logic.
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { syncStore } from '$stores/sync';
import type { SyncStatus } from '$stores/sync';
import { getUser } from './auth';

const QUEUE_KEY = 'misiro_sync_queue';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 10_000;

let _retryTimer: ReturnType<typeof setTimeout> | null = null;

export interface SyncOperation {
	type: string;
	key: string;
	data: Record<string, any>;
	retries: number;
	createdAt: number;
}

function getQueue(): SyncOperation[] {
	try {
		const raw = localStorage.getItem(QUEUE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveQueue(queue: SyncOperation[]): void {
	localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function updateStatus(status: SyncStatus): void {
	syncStore.set({ status, pendingCount: getQueue().length });
}

export function enqueue(operation: Omit<SyncOperation, 'retries' | 'createdAt'>): void {
	const queue = getQueue();
	// Deduplicate: same type + key → replace with newer data
	const existing = queue.findIndex((q) => q.type === operation.type && q.key === operation.key);
	if (existing >= 0) {
		queue[existing] = { ...operation, retries: 0, createdAt: Date.now() };
	} else {
		queue.push({ ...operation, retries: 0, createdAt: Date.now() });
	}
	saveQueue(queue);
	updateStatus('pending');
	scheduleRetry();
}

function scheduleRetry(): void {
	if (_retryTimer) return;
	_retryTimer = setTimeout(async () => {
		_retryTimer = null;
		await flushQueue();
	}, RETRY_DELAY_MS);
}

async function executeCloudWrite(uid: string, op: SyncOperation): Promise<void> {
	const client = getSupabaseBrowserClient();

	switch (op.type) {
		case 'profile_update':
			await client
				.from('user_profiles')
				.update({ ...op.data, updated_at: new Date().toISOString() })
				.eq('id', uid);
			break;

		case 'progress_upsert':
			await client
				.from('user_progress')
				.upsert(
					{ user_id: uid, ...op.data, updated_at: new Date().toISOString() },
					{ onConflict: 'user_id' }
				);
			break;

		case 'sr_upsert':
			if (op.data.rows && op.data.rows.length > 0) {
				const rows = op.data.rows.map((r: any) => ({
					...r,
					user_id: uid,
					updated_at: new Date().toISOString()
				}));
				await client
					.from('spaced_repetition')
					.upsert(rows, { onConflict: 'user_id,day,sentence_id' });
			}
			break;

		case 'sr_single':
			await client
				.from('spaced_repetition')
				.upsert(
					{ user_id: uid, ...op.data, updated_at: new Date().toISOString() },
					{ onConflict: 'user_id,day,sentence_id' }
				);
			break;

		case 'exam_upsert':
			await client
				.from('exam_results')
				.upsert(
					{ user_id: uid, ...op.data },
					{ onConflict: 'user_id,week_number' }
				);
			break;

		default:
			console.warn('Unknown sync operation type:', op.type);
	}
}

export async function flushQueue(): Promise<void> {
	const queue = getQueue();
	if (queue.length === 0) {
		updateStatus('synced');
		return;
	}

	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		updateStatus('offline');
		scheduleRetry();
		return;
	}

	const user = await getUser();
	const uid = user?.id;
	if (!uid) {
		// Not authenticated — clear queue
		saveQueue([]);
		updateStatus('synced');
		return;
	}

	const remaining: SyncOperation[] = [];
	for (const op of queue) {
		try {
			await executeCloudWrite(uid, op);
		} catch (e) {
			op.retries = (op.retries || 0) + 1;
			if (op.retries < MAX_RETRIES) {
				remaining.push(op);
			} else {
				console.error(`Dropping failed sync after ${MAX_RETRIES} retries:`, op.type, op.key);
			}
		}
	}

	saveQueue(remaining);
	updateStatus(remaining.length > 0 ? 'pending' : 'synced');
	if (remaining.length > 0) scheduleRetry();
}

/** Cloud write helper — tries immediately, queues on failure */
export async function cloudWrite(
	type: string,
	key: string,
	data: Record<string, any>
): Promise<void> {
	const user = await getUser();
	const uid = user?.id;
	if (!uid) return;

	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		enqueue({ type, key, data });
		return;
	}

	try {
		await executeCloudWrite(uid, { type, key, data, retries: 0, createdAt: Date.now() });
	} catch (e: any) {
		console.warn(`Cloud write failed (${type}), queuing for retry:`, e.message);
		enqueue({ type, key, data });
	}
}

export function getSyncStatus(): SyncStatus {
	const queue = getQueue();
	if (queue.length > 0) return 'pending';
	if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
	return 'synced';
}

export function getPendingCount(): number {
	return getQueue().length;
}

export function clearQueue(): void {
	saveQueue([]);
	updateStatus('synced');
}

/** Initialize online/offline listeners */
export function initSyncListeners(): void {
	if (typeof window === 'undefined') return;

	window.addEventListener('online', () => {
		console.log('Network restored — flushing sync queue');
		updateStatus('pending');
		flushQueue();
	});

	window.addEventListener('offline', () => {
		updateStatus('offline');
	});

	if (!navigator.onLine) {
		updateStatus('offline');
	}
}
