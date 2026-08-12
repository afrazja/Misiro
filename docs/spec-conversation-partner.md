# Spec — the free-response turn

**Status:** proposed, not built
**Size:** ~1 week
**Owner decision needed on:** the four open questions at the bottom

---

## Why

Every mode in the app is the same verb. Lesson, review, exam, practice and
the existing conversation mode all ask the learner to **reproduce a
sentence they were given**. Nowhere in 120 days does a learner compose
German of their own.

That is the gap behind "listen and repeat is not engaging". It is not that
the dialogues are weak — it is that the learner has no agency at any turn.
There is exactly one correct thing to say, always, and nothing they do
changes what happens next.

Two things make it worse:

- **The exam is generative.** Goethe A1 *Sprechen* Teil 2 hands you a topic
  card and expects you to ask and answer your own questions; Teil 3 is
  making a request. A learner could score full marks on all 120 days and
  still freeze, having never produced an unscripted German sentence.
- **Gamification is already in and already failed.** XP, streaks and badges
  all exist. One person in the entire dataset has ever come back the next
  day. More points on a recitation loop does not fix the recitation.

What a Persian speaker preparing for A1 in Tehran cannot get anywhere is
**somebody to speak German with**. The app has TTS, STT, pronunciation
diagnosis and a scenario per day — most of a conversation partner, aimed at
making people recite.

## What success looks like

Primary: **do people who reach the free turn come back the next day.** The
current baseline is one learner, once, ever.

Honest caveat: with six active users this is not measurable statistically.
v1 is a qualitative test — Afraz uses it, decides whether it feels like
talking to somebody, and we look at whether the handful of real users
engage with it at all. The quantitative read needs more traffic and should
not be faked before then.

Secondary, and cheap to log:
- of learners who complete a lesson, how many start the free turn
- how many complete both turns rather than bailing after one
- transcript length — are they producing more than three words

## The flow

After the completion card, one extra card. The lesson is already finished
and credited, so this can never cost a learner their completion.

```
Anna: "Und was machen Sie in Deutschland?"
      And what do you do in Germany?

      [ 🎙 Say anything you like ]   [ ⌨ type instead ]   [ skip ]
```

Learner speaks freely. Then:

```
You said:  ich arbeite in ein Restaurant

Anna: "Ah, in einem Restaurant! Und arbeiten Sie gern dort?"
      Ah, in a restaurant! And do you like working there?

      ✓ Understood.  in einem Restaurant — dative after "in"
                     [🔊 hear it]

      [ 🎙 Answer ]   [ finish ]
```

Two turns, then it ends warmly. Bounded on purpose: bounded cost, bounded
time, and a conversation that ends while it is still going well is a better
reason to return than one that fizzles.

**The opening question comes from the day's scenario**, so it is grounded in
what they just practised — Day 1 asks where they are from, Day 3 asks what
they would like to order.

## Scope

**In**
- Two turns at the end of a completed lesson
- Speech in, with typing as an equal alternative (no mic, noisy room, and
  Schreiben needs typing anyway)
- German reply, spoken via existing TTS, with translation shown
- One correction when it is worth making, in the learner's language
- Authenticated learners only
- A per-user daily cap

**Out, deliberately**
- Not replacing or gating any existing mode
- Not open-ended chat — two turns, on the day's topic
- Not feeding readiness yet. It would be the best Sprechen evidence the app
  has, but only once we trust the judgment. v1.1.
- Not for guests on `/try`. It costs money per call.
- No streaks, points or badges attached. Those are already in and already
  did not work; adding them here would confound the only signal we get.

## Architecture

Same shape as the three proxies that already exist:

```
lesson page ──> /proxy/converse ──> LLM
                     │
                     └─ 503 when unconfigured, exactly like /proxy/pronounce
```

- **`/proxy/converse`** — POST `{ day, history, utterance, lang }`, returns
  the structured reply below. Server-side key, never on the client.
- **`ConversationTurn.svelte`** — the card. Speech is NOT owned here; the
  lesson page owns the recognition singleton and forwards transcripts via
  an exported `handleVoice()`, exactly as `SentencePractice` does.
- **Events** — `free_turn_offered`, `free_turn_begun`, `free_turn_completed`,
  so this gets a funnel from day one rather than being retrofitted like
  `lesson_begun` was.

Degrades to nothing: no key, no card. A learner who has never seen it
cannot miss it.

## The model's contract

Structured output, so the UI renders fields rather than parsing prose:

```ts
{
  understood: boolean,        // could a German speaker follow this?
  reply: string,              // partner's next line, German, A1
  replyEn: string,
  replyFa: string,
  correction: string | null,  // their sentence rewritten, if worth it
  note: string | null,        // ONE short thing, in the learner's language
  noteFa: string | null
}
```

Rules the prompt must enforce, each for a reason:

1. **Judge comprehensibility, not correctness.** "ich arbeite in ein
   Restaurant" is a **success** — a German speaker understands it
   completely. If v1 marks that wrong we have rebuilt the recitation loop
   with extra steps.
2. **At most one correction, and only when it changes meaning or is the
   day's grammar point.** Correcting everything is how you teach someone to
   stop talking.
3. **Reply using the lesson's vocabulary plus common A1 words.** The learner
   must be able to understand the answer, or the turn is theatre. The
   day's sentences go in the prompt for exactly this.
4. **One short sentence plus at most one question.** No paragraphs.
5. **Never switch out of German in `reply`.** Translations have their own
   fields.
6. **If the transcript is empty or looks like noise, ask them to repeat** —
   do not invent a German sentence and correct it. This is the same trap as
   the pronunciation work: STT is wrong often enough that "correcting" a
   garbled transcript means correcting German the learner actually said
   fine.

Model: start on **Claude Sonnet 5** for judgment quality. At six users the
cost is rounding error, so buy quality first and evaluate **Haiku 4.5** for
latency and cost once the prompt is stable and we know what good looks like.

## Failure modes

| failure | why it matters | handling |
|---|---|---|
| STT garbles good German | learner corrected for something they said right | rule 6 — ask to repeat rather than correct |
| Model accepts broken German | app teaches a mistake | keep corrections narrow; log every turn for review |
| Model replies above A1 | learner cannot read the answer | vocabulary in prompt, short-reply rule, spot-check |
| Latency stacks on TTS | dead air after an already slow turn | stream nothing, show "Anna is thinking", cap timeout ~10s |
| Cost runs away | first per-use cost in the app | auth required, per-user daily cap, two-turn ceiling |
| Learner writes something upsetting | it is a chat box | keep it on the day's topic; do not build a general assistant |

## Cost

Roughly 800 input tokens (scenario, the day's sentences, instructions) and
150 output per turn — call it two turns per lesson. Small per conversation,
but it is the **first mechanic in the app that costs money every time
somebody uses it**, which is a real change to the shape of the thing and
worth deciding deliberately rather than discovering later.

The per-user daily cap is not optional. This is a public endpoint that
spends money.

## Rollout

1. Behind an env key, so it is dark until configured — same pattern as
   `/proxy/pronounce`.
2. Day 1 only at first. It is where 77% of people leave, so it is where a
   reason to continue is worth the most.
3. Afraz tries it and decides whether it feels like talking to somebody.
   That judgment gates everything else; the numbers cannot answer it at
   this traffic.
4. If yes: all A1 days, then wire into readiness as Sprechen evidence.
5. If no: it is one route, one component and one proxy. Deleting it is a
   day.

## Open questions

1. **Speech or typing first?** Speech is the scarce skill and the exam
   tests it; typing is lower-friction and works everywhere. I lean speech
   with typing always visible beside it, never behind a menu.
2. **Two turns, or keep going while they want to?** I lean two, hard —
   bounded cost, and ending while it is still enjoyable is the better hook.
3. **Correct at all in v1?** There is a real argument for a first version
   that only converses and never corrects, so the learner experiences
   being *understood* rather than being marked. Corrections could arrive
   in v1.1 once we see what people actually produce.
4. **Does a skipped turn still count the lesson complete?** I say yes,
   unambiguously — the completion is already granted before this card. But
   worth stating so nobody wires it as a gate later.
