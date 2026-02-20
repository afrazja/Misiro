import { writable } from 'svelte/store';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

export interface SyncState {
	status: SyncStatus;
	pendingCount: number;
}

const initialState: SyncState = {
	status: 'synced',
	pendingCount: 0
};

export const syncStore = writable<SyncState>(initialState);
