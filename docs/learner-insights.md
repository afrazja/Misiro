# Learner Insights — first release

The admin dashboard at `/admin` now provides Overview, Learner Journeys, Obstacles, and Data Quality. Lessons, users, basics, and glossary management remain in the sidebar.

## Enable live collection

1. Run `supabase-learner-insights.sql` in the existing project's Supabase SQL editor. It extends the existing events table without rewriting historical data and can be run again safely.
2. Set `SUPABASE_SERVICE_ROLE_KEY` on the server. Keep the existing `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Never put the service key in a PUBLIC variable.
3. Configure `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`, or sign in with a verified Supabase account whose profile has `is_admin = true`. Built-in fallback credentials have been removed. The migration prevents learners from changing their own admin flag.
4. Deploy the release. Leave `INSIGHTS_PREVIEW` unset in production; it only labels the isolated local preview.
5. Run the test journey below, include test accounts in the dashboard, and confirm that received events appear. Mark the test account so real learner metrics exclude it by default.

These steps have not been applied to the production database or website. This checkout has no live environment configuration.

## Local preview

Run `node scripts/preview-insights.mjs`, then open `http://localhost:5173/admin`.

Local-only login: `preview@mirifer.local` / `local-preview-only`.

The preview displays a fictional-data banner and supplies a small local Supabase API fixture. It overrides connection settings for its child process, binds to loopback, and does not read production data. Its deliberately small response cap exercises the report's pagination. The preview is for dashboard review, not a working speech service. Stop it with Ctrl+C.

## Test journey before opening collection to learners

Use a dedicated learner account, not an administrator profile:

1. Open the app and lesson 1; press Start.
2. Deny microphone permission. Verify `mic_requested` followed by `obstacle / mic_denied`.
3. Permit the microphone, retry, and submit an answer. Inspect correctness without storing the transcript.
4. Leave partway through, then return and resume. Within 30 minutes there is one visit; after 30 minutes there is a new visit. The unfinished lesson keeps its attempt ID on the same browser.
5. Finish the lesson. Verify one `lesson_attempt_completed` for the attempt. A later-visit completion does not inflate the first-visit funnel.
6. Make another learning visit 24 hours to 7 days after the first. The return-rate denominator only includes new tracked accounts whose first learning visit is at least 7 days old.
7. Test a failed delivery and retry: the event keeps its ID and appears once in the database.
8. Mark the learner as a test account; check that their activity disappears from normal metrics and returns when tests are included.

Actual microphone and cloud collection behavior still requires this check with the live project's configuration. Browser, endpoint, calculation, and database tests are complementary; a mocked speech response is not evidence that a learner's microphone works.

## Measurement definitions

| Measure | Definition |
| --- | --- |
| Visit | A tracked action after 30 minutes without tracked activity; persisted per browser and signed-in account. Token refresh is not a visit. |
| Learning visit | An answer submission, a spoken free turn, or exam completion. Page views and automatic narration alone do not qualify. |
| Attempt | One lesson run, preserved on resume; new after completion, an explicit day-picker restart, or advancing to another lesson. |
| First-visit funnel | New accounts in the selected signup period, created after version 2 collection was first observed; ordered lesson events must use the same attempt and first visit. |
| Seven-day return | A second learning visit 24 hours through 7 days after the first, with a full 7-day observation window. No eligible learners means unavailable. |
| Obstacle rate | Distinct affected learners divided by all distinct tracked visitors in the selected period. Incorrect answers and backup audio are separate. |
| Last observed step | The final received event in the selected period; not a confirmed exit or proof of why someone left. |

## Data flow and limits

`UI action → browser queue → POST /api/analytics → verified Supabase user + own-row RLS → events → private server loader → dashboard`

- Version 2 adds stable event, visit, and attempt UUIDs. The server assigns user identity, validates batches, and strips metadata to an allowlist. Event-ID uniqueness makes retries idempotent.
- No raw audio, transcripts, answer text, full URLs, or arbitrary error messages enter this analytics pipeline. Other app speech features have their own existing data flow.
- Failed events are retained on the same browser for up to 7 days, capped at 500 queued events per account. Storage denial uses memory as a fallback. Closing the browser, clearing storage, blocked requests, and queue limits can lose observations.
- Event collection is best effort. A quiet feed cannot distinguish inactivity from blocked tracking. Inspect Data Quality and run a known test journey.
- Legacy events are counted separately, never converted into invented visits. Missing keys, migrations, or failed query pages yield an unavailable report rather than partial totals.
- Reads fetch every API page, advancing by the number actually received. The current safety cap is 100,000 versioned events; exceeding it makes the report unavailable. Database aggregation should replace raw-event reads when volume approaches that cap.
- Capture and receipt times are separate. All dashboard dates and active-day boundaries use UTC. Client clock skew and delayed offline delivery can affect time-based attribution.
- Administrator profiles and manually marked test accounts are excluded by default. Private reports require verified server-side authorization; exclusions can only be changed by an administrator.
- Admin documents skip Clarity, and navigation across the admin boundary reloads the document so a public-page replay cannot continue into it. Vercel telemetry filters admin URLs. Development telemetry is disabled.
- This first release instruments signed-in visits and the main lesson flow. It does not yet cover anonymous acquisition, every exercise type, formal learning assessments, or prove a language-learning outcome.

## Verification

- Svelte/TypeScript checks: zero errors and warnings.
- All 643 automated tests pass. Tests cover visit renewal, resumable attempts, HTTP failures, stable retries, raw-content stripping, account separation, eligibility windows, ordered funnels, exclusions, pagination, ingestion authorization, and admin authorization.
- An isolated PostgreSQL 17 cluster verified running the migration twice, duplicate insert suppression, own-user access, blocked cross-user reads/writes, private exclusions, and prevention of self-assigned admin privileges.
- Browser verification exercised the actual Svelte pages with the local fixture, including sign-in, report tabs, mobile layout, and the exclusion form through the real server action.
- Production client/server bundles compile. Full Vercel packaging on this Windows host stops at `EPERM` creating the adapter's `index.func` symbolic link. Complete the production build on the normal Linux/Vercel build host; this local run does not establish a successful deployment.
