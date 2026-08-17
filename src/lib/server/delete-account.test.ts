/**
 * purgeUser is the single definition of "delete everything" for both the admin
 * panel and self-service deletion, so the order and the failure modes matter:
 * avatars are the one thing auth.users' cascade does not reach.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeUser } from './delete-account';

const UID = 'user-abc';

type StorageStub = {
	list: ReturnType<typeof vi.fn>;
	remove: ReturnType<typeof vi.fn>;
};

function fakeSvc(opts: {
	files?: Array<{ name: string }> | null;
	listError?: string;
	removeError?: string;
	deleteError?: string;
	listThrows?: boolean;
}) {
	const storage: StorageStub = {
		list: vi.fn(async () => {
			if (opts.listThrows) throw new Error('network down');
			return {
				data: opts.files ?? [],
				error: opts.listError ? { message: opts.listError } : null
			};
		}),
		remove: vi.fn(async () => ({
			data: null,
			error: opts.removeError ? { message: opts.removeError } : null
		}))
	};

	const deleteUser = vi.fn(async () => ({
		data: null,
		error: opts.deleteError ? { message: opts.deleteError } : null
	}));

	const svc = {
		storage: { from: vi.fn(() => storage) },
		auth: { admin: { deleteUser } }
	} as unknown as SupabaseClient;

	return { svc, storage, deleteUser, bucketFrom: (svc as unknown as { storage: { from: ReturnType<typeof vi.fn> } }).storage.from };
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('purgeUser', () => {
	it('removes the avatar files, then deletes the account', async () => {
		const { svc, storage, deleteUser, bucketFrom } = fakeSvc({
			files: [{ name: 'avatar.png' }]
		});

		const result = await purgeUser(svc, UID);

		expect(bucketFrom).toHaveBeenCalledWith('avatars');
		expect(storage.list).toHaveBeenCalledWith(UID);
		expect(storage.remove).toHaveBeenCalledWith([`${UID}/avatar.png`]);
		expect(deleteUser).toHaveBeenCalledWith(UID);
		expect(result).toEqual({ error: null, orphanedStorage: null });
	});

	it('removes every file in the user folder, not just the first', async () => {
		const { svc, storage } = fakeSvc({
			files: [{ name: 'avatar.png' }, { name: 'avatar.webp' }]
		});

		await purgeUser(svc, UID);

		expect(storage.remove).toHaveBeenCalledWith([`${UID}/avatar.png`, `${UID}/avatar.webp`]);
	});

	it('skips the remove call when the user has no avatar', async () => {
		const { svc, storage, deleteUser } = fakeSvc({ files: [] });

		const result = await purgeUser(svc, UID);

		expect(storage.remove).not.toHaveBeenCalled();
		expect(deleteUser).toHaveBeenCalledWith(UID);
		expect(result.error).toBeNull();
	});

	it('still deletes the account when avatar removal fails, and reports it', async () => {
		const { svc, deleteUser } = fakeSvc({
			files: [{ name: 'avatar.png' }],
			removeError: 'bucket unavailable'
		});

		const result = await purgeUser(svc, UID);

		// A deletion request must complete even if a file is left behind.
		expect(deleteUser).toHaveBeenCalledWith(UID);
		expect(result.error).toBeNull();
		expect(result.orphanedStorage).toBe('bucket unavailable');
	});

	it('still deletes the account when the folder cannot be listed', async () => {
		const { svc, deleteUser } = fakeSvc({ listError: 'not found' });

		const result = await purgeUser(svc, UID);

		expect(deleteUser).toHaveBeenCalledWith(UID);
		expect(result.orphanedStorage).toBe('not found');
	});

	it('survives storage throwing outright', async () => {
		const { svc, deleteUser } = fakeSvc({ listThrows: true });

		const result = await purgeUser(svc, UID);

		expect(deleteUser).toHaveBeenCalledWith(UID);
		expect(result.error).toBeNull();
		expect(result.orphanedStorage).toBe('network down');
	});

	it('logs the user id when storage is left behind, so the orphan is traceable', async () => {
		const { svc } = fakeSvc({ files: [{ name: 'avatar.png' }], removeError: 'nope' });

		await purgeUser(svc, UID);

		expect(console.error).toHaveBeenCalledWith(expect.stringContaining(UID));
	});

	it('surfaces a failed account deletion as an error', async () => {
		const { svc } = fakeSvc({ files: [], deleteError: 'user not found' });

		const result = await purgeUser(svc, UID);

		expect(result.error).toBe('user not found');
	});
});
