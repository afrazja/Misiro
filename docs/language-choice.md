# Learning language selection

Learners choose a course at `/languages` before the remaining onboarding questions. Their choice is saved in existing Supabase Auth `user_metadata.target_language` when onboarding is saved. Existing learners can reopen the chooser from Home or Settings; their saved course opens automatically on subsequent visits. No SQL or new environment variables are required.

The learning language is separate from `user_profiles.language`, which controls English/Persian display and translations. Selecting a course never clears progress, reviews, vocabulary or XP. A saved French selection returns to the chooser. English opens the isolated pilot at `/practice/english`; authenticated English learners are redirected there from German learning routes.

`src/lib/courses.ts` is the course availability catalogue. German is available, English has one experimental lesson, and French is coming soon. English starts directly from the chooser without the German Goethe onboarding questions. The landing pages are unchanged. The chooser is a normal authenticated page and its page-view is recorded by the existing tracker.

## Before expanding to full English or French courses

The English pilot uses its own authored content, tab-local draft and a bounded `english_hotel_v1` Auth metadata completion record. It does not use the German curriculum, XP, progress, vocabulary, exams, review cards or lesson caches. For full courses, add course identifiers to content and learner records (including uniqueness constraints and cache keys), migrate existing records to German, scope analytics and assessments by course, and configure the new course's speech features. Test switching courses without sharing progress or stale content. Do not expose German tools to other courses by changing an availability flag alone.

## Verification

Check new German learner → language choice → onboarding → Home; returning learner → Home → Change language → Continue German; English selection → English pilot; unavailable French → chooser; and failed writes → visible retryable error. Verify English/Persian display, mobile, dark mode and keyboard use. Unit tests cover server redirects, course isolation, unavailable-course rejection, account checks and preservation of existing account data.
