import { describe, it, expect, vi } from 'vitest';
import { load, actions } from './+page.server';

function fixture(target = 'en') {
	const user = { id: 'learner-1', user_metadata: { target_language: target, display_name: 'Learner', exam_settings: { goal: 'planned' } } };
	const supabase = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }), updateUser: vi.fn().mockResolvedValue({ error: null }) }, from: vi.fn() };
	const body = new FormData();
	body.set('result', JSON.stringify({ variant: 'lift', trail: ['noise', 'room204', 'quieter', 'price', 'accept', 'recall-price'], hints: 2 }));
	return { supabase, body, event: () => ({ locals: { supabase }, request: new Request('https://mirifer.test/practice/english?/complete', { method: 'POST', body }) }) as any };
}
describe('English pilot persistence', () => {
	it('requires a verified account and the English course', async () => {
		const f = fixture(); f.supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
		await expect(load(f.event())).rejects.toMatchObject({ location: '/login' });
		expect(await actions.complete(f.event())).toMatchObject({ status: 401 });
		await expect(load(fixture('de').event())).rejects.toMatchObject({ location: '/languages' });
		expect(await actions.complete(fixture('de').event())).toMatchObject({ status: 409 });
	});
	it('writes only a bounded English completion record, without German progress or learner text', async () => {
		const f = fixture(); expect(await actions.complete(f.event())).toMatchObject({ completed: { variant: 'lift', hints: 2 } });
		expect(f.supabase.auth.updateUser).toHaveBeenCalledExactlyOnceWith({ data: { english_hotel_v1: { variant: 'lift', hints: 2, completedAt: expect.any(String) } } });
		expect(f.supabase.from).not.toHaveBeenCalled();
	});
	it('rejects incomplete paths, invalid hints and malformed data', async () => {
		for (const result of ['not json', JSON.stringify({ variant: 'lift', trail: ['accept'], hints: 0 }), JSON.stringify({ variant: 'lift', trail: ['noise', 'room204', 'quieter', 'price', 'accept', 'recall-price'], hints: -1 })]) {
			const f = fixture(); f.body.set('result', result);
			expect(await actions.complete(f.event())).toMatchObject({ status: 400 });
			expect(f.supabase.auth.updateUser).not.toHaveBeenCalled();
		}
	});
	it('reports save failures so completion can be retried', async () => {
		const f = fixture(); f.supabase.auth.updateUser.mockResolvedValue({ error: { message: 'offline' } });
		expect(await actions.complete(f.event())).toMatchObject({ status: 503 });
		f.supabase.auth.updateUser.mockRejectedValue(new Error('network'));
		expect(await actions.complete(f.event())).toMatchObject({ status: 503 });
	});
});
