# Learner Insights — passes one and two

The admin dashboard at `/admin` provides Overview, Learner Journeys, Lesson Analysis, Return Visits, Obstacles, and Data Quality. Lesson editing, users, basics, and glossary management remain in the sidebar.

## Enable live collection

1. Run `supabase-learner-insights.sql` in the existing project's Supabase SQL editor. It extends the existing events table without rewriting historical data and can be run again safely.
2. Set `SUPABASE_SERVICE_ROLE_KEY` on the server. Keep the existing `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Never put the service key in a PUBLIC variable.
3. Configure `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`, or sign in with a verified Supabase account whose profile has `is_admin = true`. Built-in fallback credentials have been removed. The migration prevents learners from changing their own admin flag.
4. Deploy the release. Leave `INSIGHTS_PREVIEW` unset in production; it only labels the isolated local preview.
5. Run the test journey below, include test accounts in the dashboard, and confirm that received events appear. Mark the test account so real learner metrics exclude it by default.

Environment variables and the database migration must be configured in the production services; they are not supplied by this checkout. Confirm live collection with the test journey after deployment.

## Pass two deployment and interpretation

Pass two uses the same events table and private server configuration as pass one. **No new SQL migration or environment variable is required.** Deploy the code through the linked GitHub/Vercel project. The stored event schema stays at version 2; new clients add `metadata.insights_version = 3` and a bounded authored-dialogue identifier.

- **Lesson Analysis** groups attempts by day and dialogue version. Its date filter selects the first recorded Start; all subsequent events through the snapshot contribute to the attempt outcome. Attempts without a Start are reported separately and excluded from the completion denominator. Recent unfinished attempts are not declared abandoned.
- Sentence reach counts an observed dialogue sentence or sentence-practice panel. First-answer accuracy uses attempts whose first observed answer has a known result. Retry, skip and obstacle counts show their reached-learner denominator. This is the app's practice answer check, not an independent assessment of proficiency.
- Hints, reveals and replays use reached attempts carrying the new measurement capability. Reveals include leaving blind mode and requesting an answer in sentence practice. Replay counts cover the main Replay button, excluding automatic narration, word audio and automatic replay after a wrong answer. Older events cannot establish zero use of these controls.
- Active time samples foreground, focused dialogue intervals every 15 seconds and at sentence/context boundaries. It stops after 60 seconds without interaction and excludes hidden tabs, suspended intervals, exams, reviews, the practice panel and the grammar/completion screen. Missing delivery can lose time. Lesson medians use completed attempts with samples; sentence medians use reached attempts with samples, including unfinished attempts. Sample counts are always shown.
- The dialogue identifier covers ordered sentence content, roles, translations, hints and difficulty. A changed identifier starts a fresh tracked attempt. Current authored text is matched on the server with the same function. Unknown, mixed, and older versions remain separate; original text is unavailable when the current catalog no longer matches. No learner text is sent as analytics metadata.
- **Return Visits** groups new tracked accounts by the UTC Monday week of their first learning visit. The selected period filters that first learning visit, whereas Overview filters signup dates. Existing accounts outside that cohort remain visible in practice-frequency and individual-history reports.
- Return cells use a different learning visit with activity 24 hours through day 7, more than 7 through 14, more than 14 through 21, or more than 21 through 28. Each learner must have the whole observation window before entering its denominator. These are separate windows, not cumulative rates. Time to the second visit includes returns before 24 hours and only learners with an observed second visit; the number without a second visit is also shown.
- Cross-visit resumption requires the same attempt in an earlier distinct visit. Spaced-review starts are captured after actual review questions load. Empty-transcript timeouts have their own event and do not count as answer attempts or create a learning visit.

Pass three (learning assessments, acquisition sources, and changes/results) is outside this release.

## Local preview

Run `node scripts/preview-insights.mjs`, then open `http://localhost:5173/admin`.

Local-only login: `preview@mirifer.local` / `local-preview-only`.

For collection verification, the same isolated fixture accepts learner login `learner@mirifer.local` / `local-preview-only` at `/login`. Open `/lesson` after signing in. It supports the real browser → Svelte endpoint → local fixture → private report path. Normal progress reads can fall back to local storage; this fixture is not a production database or speech service. Include test accounts in the admin report when inspecting this learner.

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
- This release instruments signed-in visits, the main lesson flow, sentence-support actions and spaced-review starts. It does not yet cover anonymous acquisition, every exercise type, formal learning assessments, or prove a language-learning outcome.

## Verification

- Svelte/TypeScript checks: zero errors and warnings.
- The automated suite covers visit renewal, resumable attempts, HTTP failures, stable retries, raw-content stripping, account separation, eligibility windows, ordered funnels, exclusions, pagination, ingestion authorization, and admin authorization. Pass-two tests add version separation, incomplete attempt cohorts, first-answer denominators, sentence timing, weekly return boundaries, old-account exclusions, and active-time suspension/idle limits.
- An isolated PostgreSQL 17 cluster verified running the migration twice, duplicate insert suppression, own-user access, blocked cross-user reads/writes, private exclusions, and prevention of self-assigned admin privileges.
- Browser verification exercises the actual Svelte pages with the local fixture: admin/learner sign-in, report tabs, mobile layout, learner drill-down, test exclusions, and opening a lesson → Start → Next → hint/reveal/replay → leave → resume → complete. Delivery of the new action and time events was checked in the fixture and reflected in the private report with one attempt and one visit across a short return.
- Seven-day and later return windows are verified with timestamped fixtures and boundary tests; newly collected production activity still needs its actual observation window to elapse.
- Full Vercel packaging on this Windows host can stop at `EPERM` when creating the adapter's `index.func` symbolic link. Production deployment must be confirmed by the normal Linux/Vercel build and live-site verification.
