<script lang="ts">
	/**
	 * The free-response turn — the one place a learner says their own words.
	 *
	 * Appears after the completion card, so the lesson is already credited
	 * and this can never cost anyone their progress. Two turns, then it ends
	 * warmly: bounded cost, and a conversation that stops while it is still
	 * going well is a better reason to come back than one that fizzles.
	 *
	 * Deliberately NOT a marking screen. There is no score, no ✓/✗ and no
	 * red. The headline is that they were understood; a correction, when the
	 * model bothers to make one, is a quiet aside. The whole point of this
	 * card is agency — grading someone's first unscripted German would
	 * rebuild the recitation loop with extra steps.
	 *
	 * Speech is NOT owned here. The lesson page owns the recognition
	 * singleton and forwards transcripts via handleVoice(), the same
	 * arrangement as SentencePractice.
	 */
	import { playAudioPromise, stopAllAudio } from '$services/tts';
	import type { Language } from '$stores/preferences';

	interface Reply {
		understood: boolean;
		reply: string;
		replyEn: string;
		replyFa: string;
		correction: string | null;
		note: string | null;
		noteFa: string | null;
		needsRepeat: boolean;
	}

	interface Props {
		/** Sets the scene for the model; comes from the day's lesson. */
		scenario: string;
		/** German the learner has met today, so the reply stays readable. */
		vocab: string[];
		/** The partner's opening line, in German. */
		opener: string;
		openerTranslation: string;
		lang: Language;
		micAvailable?: boolean;
		isListening?: boolean;
		onToggleMic?: () => void;
		/** Fired once, when they actually commit to speaking or typing. */
		onBegin?: () => void;
		onFinish?: (turnsTaken: number) => void;
	}

	let {
		scenario,
		vocab,
		opener,
		openerTranslation,
		lang,
		micAvailable = false,
		isListening = false,
		onToggleMic,
		onBegin,
		onFinish
	}: Props = $props();

	const isFa = $derived(lang === 'fa');

	type Line =
		| { who: 'partner'; german: string; translation: string }
		| { who: 'learner'; text: string; reply: Reply };

	let lines = $state<Line[]>([]);
	let typed = $state('');
	let showTyping = $state(false);
	let thinking = $state(false);
	let failed = $state(false);
	let done = $state(false);
	let begun = false;

	const MAX_TURNS = 2;
	const turnsTaken = $derived(lines.filter((l) => l.who === 'learner').length);

	const t = $derived({
		heading: isFa ? 'حالا خودت حرف بزن' : 'Now say something yourself',
		sub: isFa
			? 'هرچه می‌خواهی بگو — اشتباه اشکالی ندارد.'
			: 'Say anything you like — mistakes are fine.',
		speak: isFa ? '🎙 حرف بزن' : '🎙 Say anything you like',
		listening: isFa ? '🎙 در حال شنیدن…' : '🎙 Listening…',
		type: isFa ? '⌨ تایپ می‌کنم' : '⌨ type instead',
		send: isFa ? 'بفرست' : 'Send',
		skip: isFa ? 'رد کن' : 'Skip',
		finish: isFa ? 'تمام' : 'Finish',
		thinking: isFa ? 'در حال فکر کردن…' : 'thinking…',
		youSaid: isFa ? 'تو گفتی:' : 'You said:',
		understood: isFa ? '✓ منظورت را فهمید' : '✓ Understood',
		again: isFa ? 'دوباره بگو' : 'Say that again',
		hear: isFa ? 'شنیدن' : 'Hear it',
		trouble: isFa ? 'الان نمی‌شود ادامه داد.' : "Can't continue right now.",
		wrap: isFa ? 'گفتگوی خوبی بود!' : 'Nice conversation!'
	});

	function speak(text: string) {
		void playAudioPromise(text, 1, 'de-DE');
	}

	/** Called by the lesson page, which owns speech recognition. */
	export function handleVoice(transcript: string) {
		if (thinking || done) return;
		void send(transcript);
	}

	async function send(text: string) {
		const utterance = text.trim();
		if (!utterance || thinking || done) return;
		if (!begun) {
			begun = true;
			onBegin?.();
		}
		typed = '';
		showTyping = false;
		thinking = true;
		failed = false;
		stopAllAudio();

		// History as the server expects it: the opener counts as the
		// partner's first line.
		const history: Array<{ role: 'partner' | 'learner'; text: string }> = [
			{ role: 'partner', text: opener }
		];
		for (const l of lines) {
			if (l.who === 'partner') history.push({ role: 'partner', text: l.german });
			else history.push({ role: 'learner', text: l.text });
		}

		try {
			const res = await fetch('/proxy/converse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scenario, vocab, history, utterance })
			});
			if (!res.ok) throw new Error(String(res.status));
			const reply = (await res.json()) as Reply;

			lines = [...lines, { who: 'learner', text: utterance, reply }];
			// A repeat request does not spend one of their two turns —
			// the transcriber failing is not the learner failing.
			if (!reply.needsRepeat) {
				lines = [
					...lines,
					{ who: 'partner', german: reply.reply, translation: isFa ? reply.replyFa : reply.replyEn }
				];
			}
			speak(reply.reply);
			if (!reply.needsRepeat && turnsTaken >= MAX_TURNS) done = true;
		} catch {
			failed = true;
		} finally {
			thinking = false;
		}
	}

	function finish() {
		stopAllAudio();
		onFinish?.(turnsTaken);
	}
</script>

<section class="ct" dir={isFa ? 'rtl' : 'ltr'}>
	<header class="ct-head">
		<h3>{t.heading}</h3>
		<p class="ct-sub">{t.sub}</p>
	</header>

	<div class="ct-line partner">
		<p class="ct-de" lang="de" dir="ltr">{opener}</p>
		<p class="ct-tr">{openerTranslation}</p>
		<button class="ct-hear" onclick={() => speak(opener)} aria-label={t.hear}>🔊</button>
	</div>

	{#each lines as line, i (i)}
		{#if line.who === 'learner'}
			<div class="ct-line learner">
				<p class="ct-said"><span class="ct-label">{t.youSaid}</span> {line.text}</p>
				{#if line.reply.understood && !line.reply.needsRepeat}
					<p class="ct-ok">{t.understood}</p>
				{/if}
				<!-- A correction is an aside, never a verdict. No score, no
				     red, nothing that turns producing German into a test. -->
				{#if line.reply.correction}
					<p class="ct-fix" lang="de" dir="ltr">{line.reply.correction}</p>
				{/if}
				{#if isFa ? line.reply.noteFa : line.reply.note}
					<p class="ct-note">{isFa ? line.reply.noteFa : line.reply.note}</p>
				{/if}
			</div>
		{:else}
			<div class="ct-line partner">
				<p class="ct-de" lang="de" dir="ltr">{line.german}</p>
				<p class="ct-tr">{line.translation}</p>
				<button class="ct-hear" onclick={() => speak(line.german)} aria-label={t.hear}>🔊</button>
			</div>
		{/if}
	{/each}

	{#if thinking}
		<p class="ct-thinking">{t.thinking}</p>
	{/if}
	{#if failed}
		<p class="ct-thinking">{t.trouble}</p>
	{/if}

	{#if done}
		<p class="ct-wrap">{t.wrap}</p>
		<button class="ct-primary" onclick={finish}>{t.finish}</button>
	{:else if !thinking}
		<div class="ct-actions">
			{#if micAvailable && !showTyping}
				<button class="ct-primary" class:listening={isListening} onclick={onToggleMic}>
					{isListening ? t.listening : t.speak}
				</button>
			{/if}
			{#if showTyping || !micAvailable}
				<form
					class="ct-typing"
					onsubmit={(e) => {
						e.preventDefault();
						void send(typed);
					}}
				>
					<input
						bind:value={typed}
						lang="de"
						dir="ltr"
						placeholder="…"
						aria-label={t.speak}
					/>
					<button class="ct-primary" type="submit" disabled={!typed.trim()}>{t.send}</button>
				</form>
			{:else}
				<button class="ct-ghost" onclick={() => (showTyping = true)}>{t.type}</button>
			{/if}
			<button class="ct-ghost" onclick={finish}>{turnsTaken > 0 ? t.finish : t.skip}</button>
		</div>
	{/if}
</section>

<style>
	.ct {
		max-width: 560px;
		margin: 10px auto;
		padding: 16px 18px;
		border: 1px solid var(--line);
		border-inline-start: 3px solid var(--accent);
		border-radius: 14px;
		background: var(--paper-raised);
		text-align: start;
	}

	.ct-head h3 {
		margin: 0;
		color: var(--ink);
		font-family: var(--font-display);
		font-size: 1.05rem;
	}

	.ct-sub {
		margin: 4px 0 12px;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.ct-line {
		position: relative;
		margin: 10px 0;
		padding: 10px 12px;
		border-radius: 10px;
	}

	.ct-line.partner {
		background: var(--paper-sunken);
		padding-inline-end: 52px;
	}

	.ct-line.learner {
		background: var(--leaf-wash);
	}

	.ct-de {
		margin: 0;
		color: var(--ink);
		font-weight: 600;
	}

	.ct-tr {
		margin: 4px 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.ct-hear {
		position: absolute;
		inset-block-start: 8px;
		inset-inline-end: 8px;
		min-width: 44px;
		min-height: 44px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--control);
		cursor: pointer;
	}

	.ct-hear:hover {
		background: var(--control-hover);
		border-color: var(--accent);
	}

	.ct-said {
		margin: 0;
		color: var(--ink);
	}

	.ct-label {
		color: var(--ink-faint);
		font-size: 0.8rem;
	}

	.ct-ok {
		margin: 6px 0 0;
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 700;
	}

	/* --accent, not --leaf and certainly not --miss. This is the sentence
	   they could have said, offered alongside one that already worked. */
	.ct-fix {
		margin: 6px 0 0;
		color: var(--accent);
		font-weight: 600;
	}

	.ct-note {
		margin: 4px 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
		line-height: 1.5;
	}

	.ct-thinking,
	.ct-wrap {
		margin: 10px 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.ct-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 12px;
	}

	.ct-typing {
		display: flex;
		gap: 8px;
		flex: 1 1 240px;
	}

	.ct-typing input {
		flex: 1;
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--control);
		color: var(--ink);
		font: inherit;
	}

	.ct-primary {
		min-height: 44px;
		padding: 10px 18px;
		border: none;
		border-radius: 999px;
		background: var(--accent);
		color: var(--on-accent);
		font-weight: 700;
		cursor: pointer;
	}

	.ct-primary:disabled {
		opacity: 0.55;
		cursor: default;
	}

	.ct-primary.listening {
		background: var(--miss);
	}

	.ct-ghost {
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--control);
		color: var(--ink);
		cursor: pointer;
	}

	.ct-ghost:hover {
		background: var(--control-hover);
	}
</style>
