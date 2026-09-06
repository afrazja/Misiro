import { describe,it,expect,vi,beforeEach } from 'vitest';
import { actions } from './+page.server';
import { requireAdmin } from '$lib/server/admin-auth';
import { serviceClient } from '$lib/server/supabase-admin';
import { phaseThreeDb } from '$lib/../test/phase-three-db';
vi.mock('$lib/server/admin-auth',()=>({requireAdmin:vi.fn(),checkAdminCredentials:vi.fn(),setAdminCookie:vi.fn(),clearAdminCookie:vi.fn(),isAdminEmail:vi.fn()}));
vi.mock('$lib/server/supabase-admin',()=>({serviceClient:vi.fn()}));
let fixture:ReturnType<typeof phaseThreeDb>;
beforeEach(()=>{fixture=phaseThreeDb();vi.mocked(serviceClient).mockReturnValue(fixture.db as any);vi.mocked(requireAdmin).mockResolvedValue({authorized:true,displayName:'Admin',selfId:null});});
function event(fields:Record<string,string | undefined>={}) {
  const data={title:'Simpler first step',hypothesis:'More learners finish lesson one.',shipped_at:'2026-09-01T10:00',window_days:'7',metric:'completion',...fields};
  const form=new FormData();Object.entries(data).forEach(([k,v])=>{ if(v !== undefined) form.set(k,v); });
  return {request:new Request('https://mirifer.test/admin?/saveChange',{method:'POST',body:form}),locals:{},cookies:{}} as any;
}
describe('private change log',()=>{
  it('requires administrator authorization for both writes even with a service key',async()=>{
    vi.mocked(requireAdmin).mockRejectedValue(new Error('Not authorized'));
    await expect(actions.saveChange(event())).rejects.toThrow('Not authorized');
    await expect(actions.archiveChange(event())).rejects.toThrow('Not authorized');
    expect(fixture.writes).toHaveLength(0);
  });
  it('creates, edits and archives an entry without deleting its record',async()=>{
    expect(await actions.saveChange(event())).toHaveProperty('success');
    const id=fixture.tables.analytics_changes[0].id;
    await actions.saveChange(event({id,title:'Revised entry'}));
    expect(fixture.tables.analytics_changes).toHaveLength(1);expect(fixture.tables.analytics_changes[0]).toMatchObject({title:'Revised entry',shipped_at:'2026-09-01T10:00:00.000Z'});
    await actions.archiveChange(event({id,archived:'1'}));expect(fixture.tables.analytics_changes[0].archived).toBe(true);
    await actions.archiveChange(event({id,archived:'0'}));expect(fixture.tables.analytics_changes[0].archived).toBe(false);
  });
  it('rejects unsupported metrics, excessive text, future rollout and missing entries',async()=>{
    for(const input of [{metric:'made_up'},{title:'x'.repeat(121)},{shipped_at:'2099-01-01T10:00'},{window_days:'100'}]) expect((await actions.saveChange(event(input)) as any).status).toBe(400);
    expect((await actions.saveChange(event({id:crypto.randomUUID()})) as any).status).toBe(503);
  });
});
