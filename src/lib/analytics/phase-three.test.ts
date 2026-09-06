import { describe, it, expect } from 'vitest';
import { DAY_MS, type StoredEvent } from './contract';
import { CHECK_PROTOCOL, type Assessment, type PhaseThreeData, type ProductChange } from './phase-three';
import { checkSchedule, assignedForm } from './assessment-schedule';
import { classifyEntry } from './acquisition';
import { buildPhaseThreeReport, compareChange, signupOutcomes } from './phase-three-report';
import { buildReport } from './report';
import { CHECK_FORMS, gradeCheck, publicItems } from '$lib/server/assessment-bank';
const now = Date.parse('2026-09-30T12:00:00Z');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const iso = (time: number) => new Date(time).toISOString();
const ago = (days: number) => now - days * DAY_MS;
const user = (n: number, created = ago(25)) => ({ id:id(n), created_at:iso(created), is_admin:false });
const base = (n = 1, time = ago(20)): Assessment => ({ id:id(100+n), user_id:id(n), protocol:CHECK_PROTOCOL, checkpoint:0, form:'a', baseline_id:null, started_at:iso(time-60000), completed_at:iso(time), listening_correct:2, reading_correct:3, skipped:1 });
const follow = (a: Assessment, time = ago(5)): Assessment => ({ ...a, id:id(201), checkpoint:14, baseline_id:a.id, form:'b', started_at:iso(time-60000), completed_at:iso(time), listening_correct:5, reading_correct:4, skipped:0 });
const data = (assessments: Assessment[] = []): PhaseThreeData => ({ assessments, acquisition:[], changes:[], error:null });
let seq = 0;
const event = (name: StoredEvent['event_name'], n: number, time: number, visit = 500): StoredEvent => ({ event_id:id(1000+ ++seq), user_id:id(n), session_id:id(visit), attempt_id:id(700), day:1, occurred_at:iso(time), created_at:iso(time), schema_version:2, metadata:{mode:'lesson'}, event_name:name });

describe('pilot progress checks', () => {
  it('keeps answer keys server-side and scores only the twelve selected options', () => {
    for (const form of ['a','b'] as const) {
      expect(publicItems(form)).toHaveLength(12);
      expect(publicItems(form).every(q => !('answer' in q))).toBe(true);
      expect(publicItems(form).slice(0,6).every(q => q.text === null && q.audio)).toBe(true);
      expect(gradeCheck(form,CHECK_FORMS[form].map(q => q.answer))).toEqual({listening_correct:6,reading_correct:6,skipped:0});
    }
    expect(gradeCheck('a',Array(12).fill(null))).toEqual({listening_correct:0,reading_correct:0,skipped:12});
    for (const invalid of [[],Array(12).fill(true),Array(12).fill(3),Array(12).fill(-1),{score:12}]) expect(gradeCheck('a',invalid)).toBeNull();
  });
  it('opens each checkpoint at the exact baseline-relative boundary and closes it after its final day', () => {
    const b = base(); const t = Date.parse(b.completed_at!);
    expect(checkSchedule([],now).due).toBe(0);
    expect(checkSchedule([{...b,completed_at:null}],now).due).toBe(0);
    expect(checkSchedule([b],t+14*DAY_MS-1).due).toBeNull();
    expect(checkSchedule([b],t+14*DAY_MS).due).toBe(14);
    expect(checkSchedule([b],t+30*DAY_MS-1).due).toBe(14);
    expect(checkSchedule([b],t+30*DAY_MS).due).toBe(30);
    expect(checkSchedule([b],t+60*DAY_MS)).toMatchObject({due:null,missed:[14,30],nextAt:iso(t+90*DAY_MS)});
    expect(checkSchedule([b],t+210*DAY_MS)).toMatchObject({due:null,nextAt:null,missed:[14,30,90,180]});
  });
  it('does not reopen a saved checkpoint and alternates question forms reproducibly', () => {
    const b = base(); expect(checkSchedule([b,follow(b)],now).due).toBeNull();
    expect(assignedForm(id(1),0)).not.toBe(assignedForm(id(1),14));
    expect(assignedForm(id(1),0)).toBe(assignedForm(id(1),30));
    expect(assignedForm(id(1),0)).not.toBe(assignedForm(id(2),0));
  });
  it('pairs the same learner, protocol and baseline, with missing follow-ups outside the score denominator', () => {
    const a=base(), b=base(2), c=base(3,ago(3));
    const output=buildPhaseThreeReport(data([a,b,c,follow(a)]),[user(1),user(2),user(3)],[],ago(40),ago(30),now).assessments;
    expect(output.completed).toBe(3);
    expect(output.checkpoints[0]).toMatchObject({paired:1,eligible:2,pending:1,overdue:0,listeningChange:3,readingChange:1,totalChange:4});
    expect(output.rows[1].checkpoints[0].delta).toBeNull();
  });
  it('excludes mismatched baselines, out-of-window results, future results and pre-period baselines', () => {
    const b=base();
    for (const bad of [{...follow(b),baseline_id:id(999)}, {...follow(b),user_id:id(2)},follow(b,ago(7)),follow(b,now+DAY_MS)]) {
      expect(buildPhaseThreeReport(data([b,bad]),[user(1),user(2)],[],ago(50),ago(30),now).assessments.checkpoints[0].paired).toBe(0);
    }
    expect(buildPhaseThreeReport(data([base(1,ago(40))]),[user(1)],[],ago(50),ago(30),now).assessments.completed).toBe(0);
  });
  it('counts closed missing windows without inventing a score and labels prior practice', () => {
    const b=base(1,ago(35));
    const output=buildPhaseThreeReport(data([b]),[user(1,ago(45))],[event('answer_submitted',1,ago(40))],ago(50),ago(90),now).assessments;
    expect(output.checkpoints[0]).toMatchObject({overdue:1,paired:0,totalChange:null});
    expect(output.priorPractice).toBe(1);
  });
});

describe('signup attribution and comparable outcomes', () => {
  it('classifies tags before referrers without retaining private text or hostname lookalikes', () => {
    expect(classifyEntry('https://www.mirifer.com/?utm_source=friend&email=private@example.test','https://google.com/search?q=private',now)).toMatchObject({source:'friend',method:'tag'});
    expect(classifyEntry('https://www.mirifer.com/?utm_source=private@example.test','',now)).toMatchObject({source:'unknown',method:'tag'});
    expect(classifyEntry('https://www.mirifer.com/','https://evilgoogle.com/',now).source).toBe('other_referral');
    expect(classifyEntry('https://www.mirifer.com/','https://www.google.com/',now).source).toBe('google');
    expect(classifyEntry('https://www.mirifer.com/','https://mirifer.com/home',now).source).toBe('direct');
    expect(JSON.stringify(classifyEntry('https://www.mirifer.com/','https://unknown.test/private?email=a@b.test',now))).not.toContain('unknown.test');
  });
  it('keeps old-account entry observations out of signup sources and unknown separate from direct', () => {
    const d=data(); d.acquisition=[{user_id:id(1),source:'google',method:'tag',captured_at:iso(ago(2)),recorded_at:iso(ago(2)),new_account:false}];
    const r=buildPhaseThreeReport(d,[user(1),user(2)],[],ago(40),ago(30),now).acquisition;
    expect(r).toMatchObject({signups:2,observed:0,unknown:2,existingEntries:1});
    expect(r.groups[0].source).toBe('unknown');
  });
  it('does not give old untracked accounts zero-percent outcome rates', () => {
    const r=buildPhaseThreeReport(data(),[user(1,ago(20)),user(2,ago(1))],[],ago(10),ago(30),now).acquisition.groups[0];
    expect(r.untracked).toBe(1); expect(r.completion).toEqual({count:0,eligible:0,pending:1});
  });
  it('uses signup-relative follow-up, distinct learning visits and exact eligibility boundaries', () => {
    const u=user(1,ago(7)); const signup=Date.parse(u.created_at);
    const activity=[event('answer_submitted',1,signup+1000), event('answer_submitted',1,signup+DAY_MS+1000,501),event('lesson_attempt_completed',1,signup+7*DAY_MS)];
    expect(signupOutcomes(u,activity,now)).toMatchObject({dayEligible:true,weekEligible:true,activation:true,return:true,completion:true});
    expect(signupOutcomes(u,activity,now-1)).toMatchObject({weekEligible:false,completion:false});
    expect(signupOutcomes(u,[activity[0],{...activity[1],session_id:activity[0].session_id}],now).return).toBe(false);
    expect(signupOutcomes(u,[event('page_viewed',1,signup+1000),event('audio_replayed',1,signup+DAY_MS,501)],now).activation).toBe(false);
  });
  it('honours test exclusions across all phase-three user reports', () => {
    const b=base(), p=data([b,follow(b)]); p.acquisition=[{user_id:id(1),source:'google',method:'tag',captured_at:iso(ago(25)),recorded_at:iso(ago(25)),new_account:true}];
    const r=buildReport({now,days:30,users:[user(1)],events:[],exclusions:[id(1)],selfId:null,installedAt:iso(ago(50)),includeTests:false,legacyCount:0,phaseThree:p});
    expect(r.phaseThree.assessments.completed).toBe(0); expect(r.phaseThree.acquisition.signups).toBe(0);
  });
});

describe('change comparisons', () => {
  const change: ProductChange = {id:id(900),title:'Shorter first lesson',hypothesis:'More completions',shipped_at:iso(ago(14)),window_days:7,metric:'completion',created_at:iso(ago(14)),updated_at:iso(ago(14)),archived:false};
  const users=[user(1,ago(28)),user(2,ago(14))];
  const events=[event('lesson_attempt_completed',2,ago(8))];
  it('ends baseline follow-up before rollout and waits for complete after follow-up', () => {
    const r=compareChange(change,users,events,ago(50),now);
    expect(r.before.start).toBe(iso(ago(28))); expect(r.before.end).toBe(iso(ago(21)));
    expect(r.after.start).toBe(iso(ago(14))); expect(r.after.end).toBe(iso(ago(7)));
    expect(r).toMatchObject({ready:true,difference:100});
    expect(compareChange(change,users,events,ago(50),now-1)).toMatchObject({ready:false,difference:null});
  });
  it('refuses a comparison without baseline coverage or an eligible group', () => {
    expect(compareChange(change,users,events,ago(27),now)).toMatchObject({ready:false,difference:null});
    expect(compareChange(change,[],[],ago(50),now)).toMatchObject({ready:false,difference:null});
  });
  it('excludes boundary signups and outcomes that spill beyond individual follow-up', () => {
    const extra=[...users,user(3,ago(21)),user(4,ago(7))];
    const r=compareChange(change,extra,[event('lesson_attempt_completed',1,ago(20)),event('lesson_attempt_completed',2,ago(6))],ago(50),now);
    expect(r.before.signups).toBe(1); expect(r.after.signups).toBe(1); expect(r.difference).toBe(0);
  });
});
