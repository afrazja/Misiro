# English lesson 1: A quieter room

Entry: choose English at `/languages`, then `/practice/english`. English has a single experimental lesson, not a full beginner curriculum. German and the public landing pages remain unchanged.

## Conversation

The authored engine in `src/lib/practice/hotel.ts` runs entirely in the browser. Stages: explain the noise, identify room 204, reject/check a noisy alternative, ask about the cost of room 512, confirm the move, and recall the price question in a second situation. A replay switches the first offer between a room beside the lift and one facing the street. Optional clarification and directions follow prepared branches.

Matching uses an explicit list of phrases with case, punctuation and contraction normalization. There is no LLM, intent model, AI correction service, speech transcription or remote conversation call. Known full-phrase errors have reviewed explanations. Unmatched input is not marked as bad English. Examples are always available, and the UI explains that this is guided practice. Completion records a successfully navigated authored path, not language proficiency or pronunciation accuracy.

Optional audio playback only uses an English browser voice with `localService: true`. If none is available, the listen button is omitted. Microphone practice records at most 45 seconds for local playback. Tracks stop on stop, closing the voice panel, timeout, turn change and component disposal. A pending permission request cannot start recording after the panel closes. Audio is never uploaded, transcribed, scored or persisted. Typing and example selection work without microphone permission or speech support.

## Data and cost boundaries

- Refresh/resume: accepted replies and used hint stages in account-scoped `sessionStorage`, keyed by course and scenario. The draft is validated by replaying the engine; corrupt/out-of-order drafts are discarded. It is removed when completion saves successfully. It lasts only in the current tab session.
- Completion: verified Supabase user, active English course, validated branch-ID trail, timestamp, scenario variant and number of hint stages. Only the bounded `user_metadata.english_hotel_v1` value is written. No learner-written text is submitted with completion, no SQL migration is needed, and German progress/XP are never read or written by the pilot.
- Tracker: existing conversation/answer/hint events, with allowlisted `course: en`, `scenario: hotel-quiet-room-v1`, `page: practice`. No lesson day/attempt is attached. Here `correct` means a supported reply was understood; it is not a grammar grade. Raw text and recordings are excluded. The existing lesson funnel is still for German; no new course-level admin reporting is claimed.
- No added AI API usage or external dependencies. The app still uses its existing authentication, completion saves and analytics services.

## Validation

Test both scene variants, normal paraphrases, common corrections, negated/out-of-context input, unsupported but valid English, wrong room number, premature acceptance, recall, tampered completion trails, account checks, save failures and per-account draft isolation. Browser-check a new English selection, a complete run, refresh/resume, failed-save retry, replay, course switching, mobile, Persian/RTL, dark mode and keyboard operation. Verify no AI/speech-provider requests occur during the lesson.
