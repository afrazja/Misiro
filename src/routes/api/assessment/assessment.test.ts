import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { phaseThreeDb } from '$lib/../test/phase-three-db';
import { CHECK_FORMS } from '$lib/server/assessment-bank';
import { serviceClient } from '$lib/server/supabase-admin';
import { POST } from './+server';
vi.mock('$lib/server/supabase-admin', () => ({serviceClient:vi.fn()}));
const uid='00000000-0000-4000-8000-000000000001';
let fixture: ReturnType<typeof phaseThreeDb>;
beforeEach(() => { fixture=phaseThreeDb(); vi.mocked(serviceClient).mockReturnValue(fixture.db as any); });
afterEach(() => vi.useRealTimers());
async function call(body: unknown, options: { user?: boolean; origin?: string } = {}) {
  const request = new Request('https://mirifer.test/api/assessment',{method:'POST',headers:{Origin:options.origin??'https://mirifer.test','Content-Type':'application/json'},body:JSON.stringify(body)});
  return POST({request,locals:{supabase:{auth:{getUser:async()=>({data:{user:options.user===false?null:{id:uid}},error:null})}}}} as any);
}
describe('server-owned assessments', () => {
  it('requires verified login and same origin before accessing the scoring store', async () => {
    expect((await call({action:'start'},{user:false})).status).toBe(401);
    expect((await call({action:'start'},{origin:'https://other.test'})).status).toBe(403);
    expect(fixture.writes).toHaveLength(0);
  });
  it('resumes an unfinished baseline and never exposes the answer keys', async () => {
    const a=await (await call({action:'start',user_id:'someone-else',checkpoint:180})).json();
    const b=await (await call({action:'start'})).json();
    expect(a.attempt).toMatchObject({user_id:uid,checkpoint:0,completed_at:null});
    expect(a.attempt.id).toBe(b.attempt.id); expect(fixture.tables.analytics_assessments).toHaveLength(1);
    expect(a.items.every((q:any)=>!('answer' in q))).toBe(true);
  });
  it('computes section scores, discards supplied scores, and makes a repeated save idempotent', async () => {
    const {attempt}=await (await call({action:'start'})).json();
    const answers=CHECK_FORMS[attempt.form as 'a'|'b'].map(q=>q.answer);
    const saved=await (await call({action:'finish',id:attempt.id,answers,listening_correct:0})).json();
    expect(saved.result).toMatchObject({listening_correct:6,reading_correct:6,skipped:0});
    const repeated=await (await call({action:'finish',id:attempt.id,answers:Array(12).fill(null)})).json();
    expect(repeated.result).toEqual(saved.result); expect(fixture.tables.analytics_assessments[0]).not.toHaveProperty('answers');
    expect((await call({action:'start'})).status).toBe(409);
  });
  it('rejects another learner’s attempt and malformed answers', async () => {
    const {attempt}=await (await call({action:'start'})).json();
    expect((await call({action:'finish',id:crypto.randomUUID(),answers:[]})).status).toBe(404);
    for(const answers of [[],Array(12).fill(9),Array(12).fill('private sentence')]) expect((await call({action:'finish',id:attempt.id,answers})).status).toBe(400);
    expect(fixture.tables.analytics_assessments[0].completed_at).toBeNull();
  });
  it('keeps failed submissions retryable and does not silently mark them complete', async () => {
    const {attempt}=await (await call({action:'start'})).json(); fixture.failWrites(true);
    const body={action:'finish',id:attempt.id,answers:Array(12).fill(null)};
    expect((await call(body)).status).toBe(503); expect(fixture.tables.analytics_assessments[0].completed_at).toBeNull();
    fixture.failWrites(false); expect((await call(body)).status).toBe(200);
  });
  it('enforces follow-up eligibility on the server and links the alternate form to its baseline', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-01T10:00:00Z'));
    const {attempt}=await (await call({action:'start'})).json(); await call({action:'finish',id:attempt.id,answers:Array(12).fill(null)});
    vi.setSystemTime(new Date('2026-09-15T09:59:59Z')); expect((await call({action:'start'})).status).toBe(409);
    vi.setSystemTime(new Date('2026-09-15T10:00:00Z')); const follow=await (await call({action:'start'})).json();
    expect(follow.attempt).toMatchObject({checkpoint:14,baseline_id:attempt.id}); expect(follow.attempt.form).not.toBe(attempt.form);
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z')); expect((await call({action:'finish',id:follow.attempt.id,answers:Array(12).fill(null)})).status).toBe(409);
  });
});
