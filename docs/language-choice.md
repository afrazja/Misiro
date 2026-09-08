# Learning language selection

Learners choose a course at `/languages` before the remaining onboarding questions. Their choice is saved in existing Supabase Auth `user_metadata.target_language` when onboarding is saved. Existing learners can reopen the chooser from Home or Settings; their saved course opens automatically on subsequent visits. No SQL or new environment variables are required.

The learning language is separate from `user_profiles.language`, which controls English/Persian display and translations. Selecting a course never clears progress, reviews, vocabulary or XP. An old French selection is redirected to the chooser because all current learning content is German.

`src/lib/courses.ts` is the course availability catalogue. German is available; French is displayed as coming soon and rejected by preference writes. The landing pages are unchanged. The chooser is a normal authenticated page and its page-view is recorded by the existing tracker.

## Before making French available

Do not enable the French flag alone. The existing curriculum, progress, vocabulary, exams, review cards and lesson caches are still German-only. First add course identifiers to content and learner records (including uniqueness constraints and cache keys), migrate existing records to German, scope analytics and assessments by course, and configure French speech recognition, audio and conversation prompts. Test switching courses without sharing progress or stale content. Then publish French lessons and enable its catalogue entry.

## Verification

Check new learner → language choice → onboarding → Home; returning learner → Home → Change language → Continue German; an old French preference → chooser; and failed writes → visible retryable error. Verify English/Persian, mobile, dark mode and keyboard use. Unit tests cover server redirects, unavailable-course rejection, account checks and preservation of existing account data.
