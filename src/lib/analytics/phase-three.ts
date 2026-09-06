import { z } from 'zod';
export const CHECK_PROTOCOL = 'de-check-v1';
export const CHECKPOINTS = [0, 14, 30, 90, 180] as const;
export const CHECK_WINDOWS = [{ day: 14, through: 29 }, { day: 30, through: 59 }, { day: 90, through: 119 }, { day: 180, through: 209 }] as const;
export const SOURCES = ['direct','google','bing','instagram','telegram','reddit','youtube','facebook','linkedin','x','friend','email','other_referral','unknown'] as const;
export const SOURCE_LABELS: Record<typeof SOURCES[number], string> = { direct: 'Direct / no referrer', google: 'Google', bing: 'Bing', instagram: 'Instagram', telegram: 'Telegram', reddit: 'Reddit', youtube: 'YouTube', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X / Twitter', friend: 'Friend invitation', email: 'Email', other_referral: 'Other referral', unknown: 'Unknown' };
export const CHANGE_METRICS = { activation: 'Practised within 24 hours', completion: 'Finished a lesson within 7 days', return: 'Returned to learning within 7 days of signup', obstacle: 'Encountered a technical obstacle within 7 days' } as const;
const timestamp = z.string().refine(v => Number.isFinite(Date.parse(v)), 'Invalid timestamp');
export const AssessmentSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), protocol: z.literal(CHECK_PROTOCOL),
  checkpoint: z.number().int().refine(v => CHECKPOINTS.includes(v as typeof CHECKPOINTS[number])),
  form: z.enum(['a','b']), baseline_id: z.string().uuid().nullable(),
  started_at: timestamp, completed_at: timestamp.nullable(),
  listening_correct: z.number().int().min(0).max(6).nullable(), reading_correct: z.number().int().min(0).max(6).nullable(), skipped: z.number().int().min(0).max(12).nullable()
}).refine(a => a.checkpoint === 0 ? a.baseline_id === null : a.baseline_id !== null)
  .refine(a => !a.completed_at || (Date.parse(a.completed_at) >= Date.parse(a.started_at) && a.listening_correct !== null && a.reading_correct !== null && a.skipped !== null && a.listening_correct + a.reading_correct + a.skipped <= 12));
export type Assessment = z.infer<typeof AssessmentSchema>;
export const AcquisitionSchema = z.object({ user_id: z.string().uuid(), source: z.enum(SOURCES), method: z.enum(['tag','referrer','direct','unavailable']), captured_at: timestamp, recorded_at: timestamp, new_account: z.boolean() });
export type Acquisition = z.infer<typeof AcquisitionSchema>;
export const ChangeInputSchema = z.object({ title: z.string().trim().min(1).max(120), hypothesis: z.string().trim().min(1).max(600), shipped_at: timestamp, window_days: z.coerce.number().pipe(z.union([z.literal(7),z.literal(14),z.literal(30)])), metric: z.enum(['activation','completion','return','obstacle']) });
export const ChangeSchema = ChangeInputSchema.extend({ id: z.string().uuid(), created_at: timestamp, updated_at: timestamp, archived: z.boolean() });
export type ProductChange = z.infer<typeof ChangeSchema>;
export interface PhaseThreeData { assessments: Assessment[]; acquisition: Acquisition[]; changes: ProductChange[]; error: string | null; }
export const unavailablePhaseThree = (): PhaseThreeData => ({ assessments: [], acquisition: [], changes: [], error: 'Phase three data is unavailable. Apply supabase-insights-pass-three.sql and refresh. Earlier reports remain available.' });
