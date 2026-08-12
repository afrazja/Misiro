<script lang="ts">
	/**
	 * Practice mode for one sentence — the retrieval ladder.
	 *
	 * build → gap → speak, each rung harder than the last, ending on
	 * production from the translation alone. Opened from the Practice button
	 * on any sentence and exited at any point: the lesson is never lost, and
	 * a learner who bails halfway keeps the credit already earned.
	 *
	 * Speech is NOT owned here. The lesson page owns the recognition
	 * singleton and forwards transcripts via handleVoice(), so there is one
	 * owner and nothing to restore on close.
	 */
	import {
		buildDrills,
		type Drill,
		type DrillKind,
		type PracticeSentence
	} from '$services/practice-drills';
	import { isBuildCorrect } from '$services/sentence-build';
	import { bestVoiceMatch } from '$utils/text-matching';
	import { diagnose, tipFor, type SoundNote } from '$services/pronunciation';
	import { playAudioPromise, stopAllAudio, ttsIsPlaying } from '$services/tts';
	import { playTone } from '$services/audio-context';
	import type { Outcome } from '$services/word-strength';
	import type { Language } from '$stores/preferences';

	interface Props {
		sentence: PracticeSentence;
		lang: Language;
		micAvailable?: boolean;
		isListening?: boolean;
		onToggleMic?: () => void;
		onExit: () => void;
		/**
		 * (wordsCredited, outcome, guessable, kind) — the caller updates word
		 * strength and the readiness signal. `guessable` is true on
		 * multiple-choice rungs, where a wrong pick may have been a coin flip
		 * and so costs more; `kind` says which rung it was.
		 */
		onResult?: (
			german: string,
			outcome: Outcome,
			guessable: boolean,
			kind: DrillKind
		) => void;
	}

	let {
		sentence,
		lang,
		micAvailable = false,
		isListening = false,
		onToggleMic,
		onExit,
		onResult
	}: Props = $props();

	const isFa = $derived(lang === 'fa');
	const drills = $derived(buildDrills(sentence, lang));

	let index = $state(0);
	let verdict = $state<'none' | 'right' | 'wrong'>('none');
	let score = $state(0);
	let heard = $state('');

	const drill = $derived(drills[index] as Drill | undefined);
	const finished = $derived(index >= drills.length);

	// ── build rung ──
	let tray = $state<Array<{ word: string; id: number }>>([]);
	let answer = $state<Array<{ word: string; id: number }>>([]);

	// ── gap rung ──
	let picked = $state<number | null>(null);

	/** Sounds the learner got wrong on the speak rung, if any are nameable. */
	let soundNotes = $state<SoundNote[]>([]);

	// Reset the rung's own state whenever the rung changes.
	$effect(() => {
		const d = drills[index];
		verdict = 'none';
		picked = null;
		heard = '';
		soundNotes = [];
		tray = d?.kind === 'build' ? (d.tiles ?? []).map((word, id) => ({ word, id })) : [];
		answer = [];
	});

	const t = $derived({
		back: isFa ? '→ بازگشت به درس' : '← Back to lesson',
		rung: isFa ? 'مرحله' : 'Step',
		tap: isFa ? 'کلمه‌ها را به ترتیب بزنید' : 'Tap the words in order',
		check: isFa ? 'بررسی' : 'Check',
		showMe: isFa ? 'جواب را نشان بده' : 'Show me',
		next: isFa ? 'بعدی' : 'Next',
		finish: isFa ? 'پایان' : 'Finish',
		right: isFa ? 'درست بود ✓' : 'Correct ✓',
		wrong: isFa ? 'نه دقیقاً ✗' : 'Not quite ✗',
		speakNow: isFa ? '🎙 بگو' : '🎙 Say it',
		listening: isFa ? '🎙 در حال شنیدن… وقتی تمام شد بزن' : '🎙 Listening… tap when done',
		noMic: isFa ? 'میکروفون در دسترس نیست — بلند بگو و ادامه بده' : 'No mic — say it out loud, then continue',
		iSaidIt: isFa ? '✓ گفتم' : '✓ I said it',
		done: isFa ? 'تمرین این جمله تمام شد' : 'Sentence practised',
		again: isFa ? 'دوباره' : 'Again',
		heard: isFa ? 'شنیدم:' : 'Heard:',
		hearWord: isFa ? 'شنیدن تلفظ درست' : 'Hear it pronounced'
	});

	function record(german: string, outcome: Outcome, guessable = false) {
		verdict = outcome === 'correct' ? 'right' : 'wrong';
		if (outcome === 'correct') score += 1;
		onResult?.(german, outcome, guessable, drill?.kind ?? 'build');
		playTone(outcome === 'correct' ? 'success' : 'error');
	}

	function advance() {
		stopAllAudio();
		index += 1;
	}

	function restart() {
		index = 0;
		score = 0;
	}

	function speak() {
		if ($ttsIsPlaying) stopAllAudio();
		else void playAudioPromise(sentence.german, 1, 'de-DE');
	}

	// ── build ──
	function place(id: number) {
		if (verdict !== 'none') return;
		const i = tray.findIndex((x) => x.id === id);
		if (i === -1) return;
		answer = [...answer, tray[i]];
		tray = tray.filter((_, k) => k !== i);
	}

	function unplace(id: number) {
		if (verdict !== 'none') return;
		const i = answer.findIndex((x) => x.id === id);
		if (i === -1) return;
		tray = [...tray, answer[i]];
		answer = answer.filter((_, k) => k !== i);
	}

	function checkBuild() {
		const ok = isBuildCorrect(answer.map((x) => x.word), drill!.solution ?? []);
		record(sentence.german, ok ? 'correct' : 'wrong');
	}

	function revealBuild() {
		answer = (drill!.solution ?? []).map((word, id) => ({ word, id }));
		tray = [];
		record(sentence.german, 'revealed');
	}

	// ── gap ──
	function pick(i: number) {
		if (picked !== null) return;
		picked = i;
		// Credit only the blanked word: getting `den` right says nothing
		// about the rest of the sentence.
		record(drill!.options![drill!.correctIndex!], i === drill!.correctIndex ? 'correct' : 'wrong', true);
	}

	// ── speak ──
	/** Called by the lesson page, which owns speech recognition. */
	export function handleVoice(transcript: string, alternatives: string[] = []) {
		if (drill?.kind !== 'speak' || verdict !== 'none') return;
		heard = transcript;
		// Two questions, two different readings of the same audio.
		//
		// "Did they know the sentence" stays generous on purpose — best of
		// five hypotheses, because the recognizer's 2nd guess is often what
		// was actually said.
		const { result } = bestVoiceMatch(
			alternatives.length ? alternatives : [transcript],
			sentence.german,
			0.7
		);

		// "Did they say it correctly" uses the PRIMARY transcript only.
		// Best-of would be searching for the most flattering reading of the
		// audio, which is the opposite of what a pronunciation check is for.
		soundNotes = diagnose(sentence.german, transcript);

		// Strict: every word can be present and the sentence still wrong.
		// "Ich mochte" is real German. It is not this sentence.
		record(sentence.german, result.isMatch && soundNotes.length === 0 ? 'correct' : 'wrong');
	}

	function revealSpeak() {
		record(sentence.german, 'revealed');
		void playAudioPromise(sentence.german, 1, 'de-DE');
	}
</script>

<section class="practice" dir={isFa ? 'rtl' : 'ltr'}>
	<header class="pr-head">
		<button class="pr-back" onclick={onExit}>{t.back}</button>
		{#if !finished}
			<span class="pr-rung">{t.rung} {index + 1}/{drills.length}</span>
		{/if}
	</header>

	{#if finished}
		<div class="pr-done">
			<span class="pr-tick" aria-hidden="true">✓</span>
			<h3>{t.done}</h3>
			<p class="pr-score">{score} / {drills.length}</p>
			<p class="pr-sentence" lang="de" dir="ltr">{sentence.german}</p>
			<div class="pr-done-actions">
				<button class="pr-primary" onclick={restart}>{t.again}</button>
				<button class="pr-ghost" onclick={onExit}>{t.back}</button>
			</div>
		</div>
	{:else if drill}
		<p class="pr-prompt">{drill.prompt}</p>

		{#if drill.kind === 'build'}
			<div
				class="pr-slot"
				class:right={verdict === 'right'}
				class:wrong={verdict === 'wrong'}
				dir="ltr"
			>
				{#if answer.length === 0}
					<span class="pr-hint">{t.tap}</span>
				{:else}
					{#each answer as tile (tile.id)}
						<button
							class="pr-tile placed"
							lang="de"
							disabled={verdict !== 'none'}
							onclick={() => unplace(tile.id)}>{tile.word}</button
						>
					{/each}
				{/if}
			</div>
			{#if tray.length}
				<div class="pr-tray" dir="ltr">
					{#each tray as tile (tile.id)}
						<button class="pr-tile" lang="de" onclick={() => place(tile.id)}
							>{tile.word}</button
						>
					{/each}
				</div>
			{/if}

		{:else if drill.kind === 'gap'}
			<p class="pr-masked" lang="de" dir="ltr">
				{#each drill.masked ?? [] as tok}
					{#if tok === null}
						<span
							class="pr-blank"
							class:right={picked !== null && picked === drill.correctIndex}
							class:wrong={picked !== null && picked !== drill.correctIndex}
							>{picked !== null ? drill.options![drill.correctIndex!] : '____'}</span
						>
					{:else}
						<span>{tok}</span>
					{/if}
					{' '}
				{/each}
			</p>
			<div class="pr-options">
				{#each drill.options ?? [] as opt, i}
					<button
						class="pr-option"
						class:right={picked !== null && i === drill.correctIndex}
						class:wrong={picked === i && i !== drill.correctIndex}
						disabled={picked !== null}
						lang="de"
						onclick={() => pick(i)}
					>
						{opt}
						{#if picked !== null && i === drill.correctIndex}
							<span aria-hidden="true">✓</span>
						{:else if picked === i}
							<span aria-hidden="true">✗</span>
						{/if}
					</button>
				{/each}
			</div>

		{:else}
			<!-- The top rung: the German is nowhere on screen until it is over. -->
			<p class="pr-meaning" dir={isFa ? 'rtl' : 'ltr'}>{drill.meaning}</p>
			{#if verdict === 'none'}
				{#if micAvailable}
					<button class="pr-mic" class:listening={isListening} onclick={onToggleMic}>
						{isListening ? t.listening : t.speakNow}
					</button>
				{:else}
					<p class="pr-hint">{t.noMic}</p>
					<button class="pr-primary" onclick={() => record(sentence.german, 'correct')}>
						{t.iSaidIt}
					</button>
				{/if}
				<button class="pr-ghost" onclick={revealSpeak}>{t.showMe}</button>
			{:else}
				<p class="pr-sentence" lang="de" dir="ltr">{sentence.german}</p>
				<button class="pr-ghost" onclick={speak}>
					{$ttsIsPlaying ? '⏹' : '🔊'}
				</button>
			{/if}
			{#if heard}
				<p class="pr-heard">{t.heard} „{heard}"</p>
			{/if}
		{/if}

		{#if verdict === 'none' && drill.kind === 'build'}
			<div class="pr-actions">
				<button class="pr-primary" disabled={tray.length > 0} onclick={checkBuild}>
					{t.check}
				</button>
				<button class="pr-ghost" onclick={revealBuild}>{t.showMe}</button>
			</div>
		{/if}

		{#if verdict !== 'none'}
			<p class="pr-verdict" class:wrong={verdict === 'wrong'}>
				{verdict === 'right' ? t.right : t.wrong}
			</p>

			<!-- A bare ✗ on a word the learner is certain they said right
			     teaches nothing, so strictness only ships with the diagnosis. -->
			{#each soundNotes as note (note.contrast.id)}
				<div class="pr-sound">
					<p class="pr-sound-head">
						<span class="pr-sound-label" lang="de" dir="ltr">{note.contrast.label}</span>
						<span class="pr-sound-diff" lang="de" dir="ltr">
							<span class="said">{note.heard}</span>
							<span aria-hidden="true">→</span>
							<span class="want">{note.target}</span>
						</span>
						<button
							class="pr-sound-play"
							onclick={() => playAudioPromise(note.target, 0.7, 'de-DE')}
							aria-label={t.hearWord}
						>🔊</button>
					</p>
					<p class="pr-sound-tip">{tipFor(note, lang)}</p>
					<p class="pr-sound-pair" lang="de" dir="ltr">
						{note.contrast.pair.wrong} &middot; {note.contrast.pair.right}
						<span class="pr-sound-gloss" dir={isFa ? 'rtl' : 'ltr'}>
							{isFa ? note.contrast.pair.glossFa : note.contrast.pair.gloss}
						</span>
					</p>
				</div>
			{/each}
			<button class="pr-primary" onclick={advance}>
				{index < drills.length - 1 ? t.next : t.finish}
			</button>
		{/if}
	{/if}
</section>

<style>
	.practice {
		background: var(--paper-raised);
		border: 2px solid var(--leaf-edge);
		border-radius: 16px;
		padding: 18px;
		text-align: center;
		box-shadow: var(--paper-shadow);
	}

	.pr-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 14px;
	}

	.pr-back {
		min-height: 44px;
		padding: 10px 14px;
		border: 2px solid var(--control-edge);
		border-radius: 12px;
		background: var(--control);
		color: var(--ink);
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}

	.pr-rung {
		color: var(--ink-soft);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	.pr-prompt {
		color: var(--ink-soft);
		font-size: 0.95rem;
		margin: 0 0 14px;
	}

	.pr-slot {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 8px;
		min-height: 60px;
		padding: 12px;
		/* Dashed edge is the whole affordance here, and --paper-sunken is
		   near-black in dark — so the outline needs a mid-tone, not the wall. */
		border: 2px dashed var(--ink-faint);
		border-radius: 12px;
		background: var(--paper-sunken);
	}

	.pr-slot.right {
		border-style: solid;
		border-color: var(--leaf);
	}
	.pr-slot.wrong {
		border-style: solid;
		border-color: var(--miss);
	}

	.pr-tray {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 14px;
	}

	.pr-tile {
		min-height: 44px;
		padding: 10px 16px;
		border: 2px solid var(--control-edge);
		border-radius: 10px;
		background: var(--control);
		color: var(--ink);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--control-edge);
	}

	.pr-tile.placed {
		background: var(--leaf-wash);
		border-color: var(--leaf);
		box-shadow: none;
	}

	.pr-tile:not(:disabled):active {
		transform: translateY(3px);
		box-shadow: none;
	}

	.pr-masked {
		font-family: var(--font-display);
		font-size: 1.3rem;
		color: var(--ink);
		margin: 0 0 18px;
	}

	.pr-blank {
		display: inline-block;
		min-width: 68px;
		padding: 0 6px;
		border-bottom: 3px solid var(--ink-faint);
		font-weight: 700;
	}

	.pr-blank.right {
		color: var(--leaf);
		border-color: var(--leaf);
	}
	.pr-blank.wrong {
		color: var(--miss);
		border-color: var(--miss);
	}

	.pr-options {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
	}

	.pr-option {
		min-height: 48px;
		min-width: 92px;
		padding: 12px 18px;
		border: 2px solid var(--control-edge);
		border-radius: 12px;
		background: var(--control);
		color: var(--ink);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--control-edge);
	}

	.pr-option.right {
		background: var(--leaf);
		border-color: var(--leaf-edge);
		box-shadow: 0 3px 0 var(--leaf-edge);
		color: var(--on-accent);
	}

	.pr-option.wrong {
		background: var(--miss);
		border-color: var(--miss-edge);
		box-shadow: 0 3px 0 var(--miss-edge);
		color: var(--on-accent);
	}

	.pr-meaning {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--ink);
		margin: 0 0 20px;
	}

	.pr-mic {
		min-height: 52px;
		width: 100%;
		max-width: 320px;
		padding: 14px 20px;
		border: 2px solid var(--accent-edge);
		border-radius: 14px;
		background: var(--accent);
		color: var(--on-accent);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.pr-mic.listening {
		background: var(--miss);
		border-color: var(--miss-edge);
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.72;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pr-mic.listening {
			animation: none;
		}
	}

	.pr-sentence {
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--ink);
		margin: 10px 0;
	}

	.pr-heard {
		color: var(--ink-faint);
		font-size: 0.85rem;
		margin: 8px 0 0;
	}

	.pr-hint {
		color: var(--ink-faint);
		font-size: 0.9rem;
	}

	.pr-actions,
	.pr-done-actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.pr-primary {
		min-height: 44px;
		margin-top: 16px;
		padding: 12px 28px;
		border: 2px solid var(--leaf-edge);
		border-radius: 12px;
		background: var(--leaf);
		color: var(--on-accent);
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--leaf-edge);
	}

	.pr-primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
	}

	.pr-ghost {
		min-height: 44px;
		margin-top: 16px;
		padding: 12px 16px;
		border: none;
		background: none;
		color: var(--ink-soft);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
	}

	.pr-verdict {
		margin: 14px 0 0;
		color: var(--leaf);
		font-weight: 700;
	}

	/* ── Sound coaching ──
	   Gold rather than --miss: the verdict above already says "wrong". This
	   block is the way out of it, and colouring help like a failure makes a
	   strict check feel like punishment. */
	.pr-sound {
		margin: 12px 0 0;
		padding: 12px 14px;
		/* Gold is inherently light — 1.67:1 on white — so it cannot be the
		   only thing marking the card's edge in light mode. It stays as the
		   accent; a real border does the boundary work. */
		border: 1px solid var(--control-border);
		border-inline-start: 3px solid var(--gold);
		border-radius: 10px;
		background: var(--paper-sunken);
		text-align: start;
	}

	.pr-sound-head {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin: 0;
	}

	.pr-sound-label {
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--gold);
		color: #3b2c00;
		font-weight: 800;
		font-size: 0.9rem;
	}

	.pr-sound-diff {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.95rem;
	}

	.pr-sound-diff .said {
		color: var(--miss);
		text-decoration: line-through;
	}

	/* --accent, not --leaf. --leaf measures 4.28:1 on --paper-sunken in light
	   mode, under the 4.5 body text needs; --accent clears 6.7 there and 8.6
	   in dark. It also reads better semantically — --leaf means "you got it
	   right", and nothing here went right. */
	.pr-sound-diff .want {
		color: var(--accent);
		font-weight: 700;
	}

	.pr-sound-play {
		margin-inline-start: auto;
		min-width: 44px;
		min-height: 44px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--control);
		cursor: pointer;
		font-size: 1rem;
	}

	.pr-sound-play:hover {
		background: var(--control-hover);
		border-color: var(--accent);
	}

	.pr-sound-tip {
		margin: 8px 0 0;
		color: var(--ink);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.pr-sound-pair {
		margin: 8px 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.pr-sound-gloss {
		color: var(--ink-faint);
	}

	.pr-verdict.wrong {
		color: var(--miss);
	}

	.pr-done {
		padding: 10px 0;
	}

	.pr-tick {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--leaf);
		color: var(--on-accent);
		font-size: 1.8rem;
	}

	.pr-done h3 {
		font-family: var(--font-display);
		color: var(--ink);
		margin: 12px 0 4px;
	}

	.pr-score {
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
		margin: 0;
	}
</style>
