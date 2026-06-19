import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/supabase/client', () => ({
	getSupabaseBrowserClient: vi.fn()
}));
vi.mock('./auth', () => ({
	getUser: vi.fn()
}));

import { trackEvent } from './analytics';
import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { getUser } from './auth';

function mockClientCapturingInsert() {
	const insert = vi.fn().mockResolvedValue({ error: null });
	const sb = { from: vi.fn(() => ({ insert })) };
	vi.mocked(getSupabaseBrowserClient).mockReturnValue(sb as any);
	return { sb, insert };
}

describe('trackEvent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('inserts an event row for an authenticated user', async () => {
		vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);
		const { sb, insert } = mockClientCapturingInsert();

		await trackEvent('lesson_started', { day: 4 });

		expect(sb.from).toHaveBeenCalledWith('events');
		expect(insert).toHaveBeenCalledWith({
			user_id: 'user-123',
			event_name: 'lesson_started',
			day: 4,
			metadata: {}
		});
	});

	it('passes through metadata and defaults day to null', async () => {
		vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
		const { insert } = mockClientCapturingInsert();

		await trackEvent('lesson_completed', { day: 2, metadata: { sentenceCount: 9 } });

		expect(insert).toHaveBeenCalledWith({
			user_id: 'u1',
			event_name: 'lesson_completed',
			day: 2,
			metadata: { sentenceCount: 9 }
		});
	});

	it('does nothing when no user is signed in', async () => {
		vi.mocked(getUser).mockResolvedValue(null);
		const { sb } = mockClientCapturingInsert();

		await trackEvent('lesson_started', { day: 1 });

		expect(sb.from).not.toHaveBeenCalled();
	});

	it('never throws if the insert fails', async () => {
		vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
		const insert = vi.fn().mockRejectedValue(new Error('network down'));
		vi.mocked(getSupabaseBrowserClient).mockReturnValue({ from: vi.fn(() => ({ insert })) } as any);

		await expect(trackEvent('lesson_started', { day: 1 })).resolves.toBeUndefined();
	});

	it('never throws if getUser rejects', async () => {
		vi.mocked(getUser).mockRejectedValue(new Error('auth error'));

		await expect(trackEvent('review_started')).resolves.toBeUndefined();
	});
});
