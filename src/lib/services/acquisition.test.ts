import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
let service:typeof import('./acquisition');
beforeEach(async()=>{vi.resetModules();localStorage.clear();window.history.replaceState(null,'','/?utm_source=friend');service=await import('./acquisition');});
afterEach(()=>vi.unstubAllGlobals());
describe('first-entry capture',()=>{
  it('preserves the first source through navigation and retries a failed save without overwriting it',async()=>{
    service.captureAcquisition();window.history.replaceState(null,'','/login?utm_source=google');service.captureAcquisition();
    const fetcher=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValue({ok:true});vi.stubGlobal('fetch',fetcher);
    await service.collectAcquisition('learner');await service.collectAcquisition('learner');await service.collectAcquisition('learner');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({source:'friend',method:'tag',user_id:'learner'});
    expect(localStorage.getItem('mirifer_entry_v1')).toBeNull();
  });
  it('never collects admin entry URLs and replaces an expired browser capture',async()=>{
    window.history.replaceState(null,'','/admin?utm_source=google');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    service.captureAcquisition();await service.collectAcquisition('admin');expect(localStorage.length).toBe(0);expect(fetcher).not.toHaveBeenCalled();
    localStorage.setItem('mirifer_entry_v1',JSON.stringify({source:'google',method:'tag',captured_at:'2020-01-01T00:00:00Z'}));
    window.history.replaceState(null,'','/?utm_source=friend');service.captureAcquisition();
    expect(JSON.parse(localStorage.getItem('mirifer_entry_v1')!).source).toBe('friend');
  });
});
