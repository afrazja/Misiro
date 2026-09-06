import { SOURCES, type Acquisition } from './phase-three';
export type Touch = Pick<Acquisition, 'source' | 'method' | 'captured_at'>;
/** Allowlisted categories only. Never retain a full URL, query value or referrer hostname. */
export function classifyEntry(href: string, referrer: string, now = Date.now()): Touch {
  const result = (source: Touch['source'], method: Touch['method']): Touch => ({ source, method, captured_at: new Date(now).toISOString() });
  try {
    const url = new URL(href);
    const tag = url.searchParams.get('utm_source')?.toLowerCase();
    if (tag) return result(SOURCES.includes(tag as Touch['source']) ? tag as Touch['source'] : 'unknown', 'tag');
    if (!referrer) return result('direct', 'direct');
    const ref = new URL(referrer);
    if (ref.origin === url.origin || ['mirifer.com','www.mirifer.com'].includes(ref.hostname)) return result('direct', 'direct');
    const domains: [string[], Touch['source']][] = [
      [['google.com','google.de','google.co.uk'], 'google'], [['bing.com'],'bing'], [['instagram.com','l.instagram.com'],'instagram'],
      [['t.me','telegram.org'],'telegram'], [['reddit.com','redd.it'],'reddit'], [['youtube.com','youtu.be'],'youtube'],
      [['facebook.com','fb.com'],'facebook'], [['linkedin.com'],'linkedin'], [['x.com','twitter.com','t.co'],'x']
    ];
    return result(domains.find(([list]) => list.some(d => ref.hostname === d || ref.hostname.endsWith('.' + d)))?.[1] ?? 'other_referral', 'referrer');
  } catch { return result('unknown', 'unavailable'); }
}
