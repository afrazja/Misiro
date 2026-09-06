import { describe, it, expect, vi, beforeEach } from 'vitest';
import { phaseThreeDb } from '$lib/../test/phase-three-db';
import { serviceClient } from '$lib/server/supabase-admin';
import { POST } from './+server';
vi.mock('$lib/server/supabase-admin',()=>({serviceClient:vi.fn()}));
const uid='00000000-0000-4000-8000-000000000001';
let fixture: ReturnType<typeof phaseThreeDb>;
beforeEach(()=>{fixture=phaseThreeDb();vi.mocked(serviceClient).mockReturnValue(fixture.db as any);});
async function call(overrides: object={},options:{old?:boolean;user?:boolean;origin?:string}={}) {
  const now=Date.now(), body={user_id:uid,source:'friend',method:'tag',captured_at:new Date(now-60000).toISOString(),...overrides};
  const request=new Request('https://mirifer.test/api/acquisition',{method:'POST',headers:{Origin:options.origin??'https://mirifer.test'},body:JSON.stringify(body)});
  return POST({request,locals:{supabase:{auth:{getUser:async()=>({data:{user:options.user===false?null:{id:uid,created_at:new Date(now-(options.old?10*86400000:1000)).toISOString()}},error:null})}}}} as any);
}
describe('acquisition boundary',()=>{
  it('requires same origin and matching verified identity',async()=>{
    expect((await call({},{user:false})).status).toBe(401);expect((await call({},{origin:'https://other.test'})).status).toBe(403);
    expect((await call({user_id:crypto.randomUUID()})).status).toBe(400); expect(fixture.writes).toHaveLength(0);
  });
  it('stores the first allowlisted category once without arbitrary URL data',async()=>{
    expect((await call({url:'private',email:'private@example.com'})).status).toBe(200);await call({source:'google'});
    expect(fixture.tables.analytics_acquisition).toHaveLength(1);expect(fixture.tables.analytics_acquisition[0]).toMatchObject({source:'friend',new_account:true});
    expect(JSON.stringify(fixture.tables)).not.toContain('private');
  });
  it('keeps existing-account entries out of signup attribution and rejects stale or arbitrary captures',async()=>{
    await call({},{old:true});expect(fixture.tables.analytics_acquisition[0].new_account).toBe(false);
    expect((await call({source:'private@example.test'})).status).toBe(400);
    expect((await call({captured_at:'2020-01-01T00:00:00Z'})).status).toBe(400);
  });
  it('reports failed writes so the browser can retry',async()=>{fixture.failWrites(true);expect((await call()).status).toBe(503);expect(fixture.tables.analytics_acquisition).toHaveLength(0);});
});
