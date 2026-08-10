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
	import { buildDrills, type Drill, type PracticeSentence } from '$services/practice-drills';
	import { isBuildCorrect } from '$services/sentence-build';
	import { bestVoiceMatch } from '$utils/text-matching';
	import { playAudioPromise, stopAllAudio, ttsIsPlaying } from '$services/tts';
	import { playTone } from '$services/audio-context';
	import type { Language } from '$stores/preferences';

	interface Props {
		sentence: PracticeSentence;
		lang: Language;
		micAvailable?: boolean;
		isListening?: boolean;
		onToggleMic?: () => void;
		onExit: () => void;
		/** (germanCredited, correct) — the caller updates word strength. */
		onResult?: (german: string, correct: boolean) => void;
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

	// Reset the rung's own state whenever the rung changes.
	$effect(() => {
		const d = drills[index];
		verdict = 'none';
		picked = null;
		heard = '';
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
		heard: isFa ? 'شنیدم:' : 'Heard:'
	});

	function record(german: string, correct: boolean) {
		verdict = correct ? 'right' : 'wrong';
		if (correct) score += 1;
		onResult?.(german, correct);
		playTone(correct ? 'success' : 'error');
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
		else void playAudioPromise(sentence.german, 0.85, 'de-DE');
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
		record(sentence.german, isBuildCorrect(answer.map((x) => x.word), drill!.solution ?? []));
	}

	function revealBuild() {
		answer = (drill!.solution ?? []).map((word, id) => ({ word, id }));
		tray = [];
		record(sentence.german, false);
	}

	// ── gap ──
	function pick(i: number) {
		if (picked !== null) return;
		picked = i;
		// Credit only the blanked word: getting `den` right says nothing
		// about the rest of the sentence.
		record(drill!.options![drill!.correctIndex!], i === drill!.correctIndex);
	}

	// ── speak ──
	/** Called by the lesson page, which owns speech recognition. */
	export function handleVoice(transcript: string, alternatives: string[] = []) {
		if (drill?.kind !== 'speak' || verdict !== 'none') return;
		heard = transcript;
		const { result } = bestVoiceMatch(
			alternatives.length ? alternatives : [transcript],
			sentence.german,
			0.7
		);
		record(sentence.german, result.isMatch);
	}

	function revealSpeak() {
		record(sentence.german, false);
		void playAudioPromise(sentence.german, 0.8, 'de-DE');
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
					<button class="pr-primary" onclick={() => record(sentence.german, true)}>
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
		border: 2px dashed var(--control-edge);
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
		border-bottom: 3px solid var(--control-edge);
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
