<script lang="ts">
	/**
	 * Guest demo lesson — 3 sentences, no account, no writes.
	 *
	 * The activation funnel starts here: a visitor hears real German, taps
	 * words for meanings, says a sentence out loud, and hits a win screen
	 * BEFORE being asked to sign up. Progress is intentionally not saved —
	 * saving it is the signup hook.
	 */
	import { onDestroy } from 'svelte';
	import { playAudioPromise, stopAllAudio, ttsIsPlaying } from '$services/tts';
	import {
		initSpeechRecognition,
		setVoiceInputHandler,
		setMicStateChangeHandler,
		toggleMic,
		getLastVoiceAlternatives,
		isSpeechSupported,
		destroySpeechRecognition,
		type MicState
	} from '$services/speech';

	type Gloss = { word: string; en: string; fa: string };
	type DemoSentence = {
		german: string;
		en: string;
		fa: string;
		glosses: Gloss[];
	};

	const SENTENCES: DemoSentence[] = [
		{
			german: 'Hallo! Wie geht’s?',
			en: 'Hello! How’s it going?',
			fa: 'سلام! چطوری؟',
			glosses: [
				{ word: 'Hallo', en: 'hello', fa: 'سلام' },
				{ word: 'Wie', en: 'how', fa: 'چطور' },
				{ word: 'geht’s', en: 'is it going', fa: 'پیش می‌ره' }
			]
		},
		{
			german: 'Ich lerne Deutsch.',
			en: 'I’m learning German.',
			fa: 'دارم آلمانی یاد می‌گیرم.',
			glosses: [
				{ word: 'Ich', en: 'I', fa: 'من' },
				{ word: 'lerne', en: '(I) learn', fa: 'یاد می‌گیرم' },
				{ word: 'Deutsch', en: 'German', fa: 'آلمانی' }
			]
		},
		{
			german: 'Schön, dich kennenzulernen!',
			en: 'Nice to meet you!',
			fa: 'از آشنایی با تو خوشحالم!',
			glosses: [
				{ word: 'Schön', en: 'nice', fa: 'خوب' },
				{ word: 'dich', en: 'you', fa: 'تو را' },
				{ word: 'kennenzulernen', en: 'to get to know', fa: 'آشنا شدن' }
			]
		}
	];

	type Phase = 'intro' | 'practice' | 'done';

	let phase = $state<Phase>('intro');
	let step = $state(0); // index into SENTENCES
	let openGloss = $state<Gloss | null>(null);
	let micState = $state<MicState>('idle');
	let attemptFailed = $state(false);
	let stepDone = $state(false); // ✓ shown, waiting for advance
	let micAvailable = $state(true);

	const current = $derived(SENTENCES[step]);

	/** "geht’s" → "geht es", strip punctuation, lowercase. */
	function normalize(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[’']s\b/g, ' es')
			.replace(/ß/g, 'ss')
			.replace(/[^\p{L}\p{N}\s]/gu, ' ')
			.split(/\s+/)
			.filter(Boolean);
	}

	function matches(transcripts: string[], target: string): boolean {
		const targetTokens = normalize(target);
		for (const t of transcripts) {
			const heard = new Set(normalize(t));
			const hit = targetTokens.filter((w) => heard.has(w));
			if (hit.length / targetTokens.length >= 0.6) return true;
		}
		return false;
	}

	function playCurrent(rate = 0.9): void {
		void playAudioPromise(current.german, rate, 'de-DE');
	}

	function start(): void {
		micAvailable = initSpeechRecognition() && isSpeechSupported();
		setMicStateChangeHandler((s) => (micState = s));
		setVoiceInputHandler((transcript) => {
			const alts = getLastVoiceAlternatives();
			if (matches(alts.length ? alts : [transcript], current.german)) {
				attemptFailed = false;
				stepDone = true;
			} else {
				attemptFailed = true;
			}
		});
		phase = 'practice';
		playCurrent();
	}

	function advance(): void {
		stopAllAudio();
		openGloss = null;
		attemptFailed = false;
		stepDone = false;
		if (step < SENTENCES.length - 1) {
			step += 1;
			playCurrent();
		} else {
			phase = 'done';
		}
	}

	function tapWord(g: Gloss): void {
		openGloss = openGloss?.word === g.word ? null : g;
	}

	/** Words of the current sentence, mapped to their gloss entries. */
	const words = $derived(
		current.german.split(/\s+/).map((raw) => {
			const clean = raw.replace(/[.,!?]/g, '');
			const gloss = current.glosses.find(
				(g) => g.word.toLowerCase() === clean.toLowerCase()
			);
			return { raw, gloss };
		})
	);

	onDestroy(() => {
		stopAllAudio();
		destroySpeechRecognition();
	});
</script>

<svelte:head>
	<title>Try a Free German Lesson – No Signup | Mirifer</title>
	<meta
		name="description"
		content="Speak your first German sentence in 2 minutes. Hear it, tap words for meanings in English and Persian, say it out loud. No account needed."
	/>
</svelte:head>

<div class="demo-page">
	<header class="demo-header">
		<a href="/" class="back">← Mirifer</a>
		{#if phase === 'practice'}
			<div class="dots" aria-label="Progress">
				{#each SENTENCES as _, i}
					<span class="dot" class:active={i === step} class:done={i < step}></span>
				{/each}
			</div>
		{/if}
	</header>

	{#if phase === 'intro'}
		<section class="card intro">
			<div class="intro-badge">۲ دقیقه · 2 minutes</div>
			<h1>Say your first German sentence</h1>
			<p class="sub">
				Three real sentences. Hear them, tap any word for its meaning, and say
				them out loud. No account, no signup — just German.
			</p>
			<p class="sub fa" dir="rtl">
				سه جملهٔ واقعی آلمانی — گوش کن، روی هر کلمه بزن تا معنی‌اش را ببینی، و
				بلند تکرار کن. بدون ثبت‌نام.
			</p>
			<button class="btn-primary big" onclick={start}>▶ Start — it’s free</button>
		</section>
	{:else if phase === 'practice'}
		<section class="card lesson">
			<p class="step-label">Sentence {step + 1} of {SENTENCES.length} — tap any word 👇</p>

			<div class="bubble">
				<p class="german">
					{#each words as w, i}
						{#if w.gloss}<button
								class="word"
								class:hit={stepDone}
								class:open={openGloss?.word === w.gloss.word}
								onclick={() => tapWord(w.gloss!)}>{w.raw}</button
							>{:else}<span>{w.raw}</span>{/if}{#if i < words.length - 1}{' '}{/if}
					{/each}
				</p>
				<p class="translation">{current.en}</p>
				<p class="translation fa" dir="rtl">{current.fa}</p>

				{#if openGloss}
					<div class="gloss">
						<strong>{openGloss.word}</strong>
						<span>{openGloss.en}</span>
						<span dir="rtl">{openGloss.fa}</span>
					</div>
				{/if}
			</div>

			<div class="controls">
				<button class="btn-ghost" onclick={() => playCurrent()} disabled={$ttsIsPlaying}>
					🔊 {$ttsIsPlaying ? 'Playing…' : 'Hear it again'}
				</button>

				{#if stepDone}
					<div class="success">
						<span class="check">✓ {step === SENTENCES.length - 1 ? 'Perfekt!' : 'Sehr gut!'}</span>
						<button class="btn-primary" onclick={advance}>
							{step < SENTENCES.length - 1 ? 'Next sentence →' : 'Finish 🎉'}
						</button>
					</div>
				{:else}
					{#if micAvailable}
						<button
							class="btn-mic"
							class:listening={micState === 'listening'}
							onclick={toggleMic}
						>
							{#if micState === 'listening'}🎙 Listening… tap when done
							{:else if micState === 'processing'}⏳ Checking…
							{:else}🎙 Say it out loud{/if}
						</button>
					{/if}
					{#if attemptFailed}
						<p class="retry">
							Almost! Listen once more and try again — or just move on.
						</p>
					{/if}
					<button class="skip" onclick={() => (stepDone = true)}>
						{micAvailable ? 'I said it — continue ✓' : '✓ I said it out loud'}
					</button>
				{/if}
			</div>
		</section>
	{:else}
		<section class="card win">
			<div class="win-emoji">🎉</div>
			<h1>Du sprichst Deutsch!</h1>
			<p class="sub">
				You just spoke three real German sentences. That’s more than most
				people manage in their first month of a grammar course.
			</p>
			<p class="sub fa" dir="rtl">
				همین الان سه جملهٔ واقعی آلمانی گفتی! روز اول ۹ جملهٔ دیگر هم دارد —
				رایگان ادامه بده.
			</p>
			<div class="win-stats">
				<div><strong>3</strong><span>sentences spoken</span></div>
				<div><strong>9</strong><span>more in Day 1</span></div>
				<div><strong>100</strong><span>days to fluency</span></div>
			</div>
			<a class="btn-primary big" href="/login?mode=signup">
				Create a free account — save your progress
			</a>
			<p class="fine">
				No credit card · English &amp; فارسی ·
				<a href="/login">I already have an account</a>
			</p>
		</section>
	{/if}
</div>

<style>
	.demo-page {
		min-height: 100vh;
		background: var(--paper);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16px;
	}

	.demo-header {
		width: 100%;
		max-width: 560px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 4px 20px;
	}

	.back {
		color: var(--ink-soft);
		text-decoration: none;
		font-weight: 600;
	}

	.dots {
		display: flex;
		gap: 8px;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--line);
		transition: background 0.2s;
	}

	.dot.active {
		background: var(--accent);
	}

	.dot.done {
		background: var(--leaf);
	}

	.card {
		width: 100%;
		max-width: 560px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 16px;
		box-shadow: var(--paper-shadow);
		padding: 28px 24px;
	}

	/* ── Intro ── */
	.intro {
		text-align: center;
		margin-top: 6vh;
	}

	.intro-badge {
		display: inline-block;
		background: var(--accent-wash);
		color: var(--accent-deep);
		border-radius: 999px;
		padding: 4px 14px;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 14px;
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.8rem;
		margin-bottom: 10px;
		color: var(--ink);
	}

	.sub {
		color: var(--ink-soft);
		line-height: 1.6;
		margin-bottom: 10px;
	}

	/* ── Lesson ── */
	.step-label {
		color: var(--ink-faint);
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 12px;
	}

	.bubble {
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-left: 4px solid var(--accent);
		border-radius: 12px;
		padding: 18px 16px;
		margin-bottom: 18px;
	}

	.german {
		font-size: 1.45rem;
		font-weight: 700;
		color: var(--ink);
		margin-bottom: 8px;
		line-height: 1.5;
	}

	.word {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		border-bottom: 2px dotted var(--ink-faint);
		padding: 0 1px;
	}

	.word.open {
		background: var(--accent-wash);
		border-bottom-color: var(--accent);
		border-radius: 4px;
	}

	.word.hit {
		color: var(--leaf);
		border-bottom-color: var(--leaf);
	}

	.translation {
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	.translation.fa {
		margin-top: 2px;
	}

	.gloss {
		margin-top: 12px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 12px;
		display: flex;
		gap: 12px;
		align-items: baseline;
		flex-wrap: wrap;
	}

	.gloss strong {
		color: var(--accent-deep);
	}

	.gloss span {
		color: var(--ink-soft);
	}

	/* ── Controls ── */
	.controls {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: stretch;
	}

	.btn-primary {
		background: var(--accent);
		color: #fff8f0;
		border: none;
		border-radius: 10px;
		padding: 13px 22px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		transition: background 0.15s;
	}

	.btn-primary:hover {
		background: var(--accent-deep);
	}

	.btn-primary.big {
		font-size: 1.1rem;
		padding: 15px 28px;
		margin-top: 8px;
	}

	.btn-ghost {
		background: var(--paper-raised);
		border: 1.5px solid var(--line);
		color: var(--ink);
		border-radius: 10px;
		padding: 11px 18px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-ghost:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.btn-mic {
		background: var(--leaf);
		color: #f2f8f4;
		border: none;
		border-radius: 10px;
		padding: 13px 18px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-mic.listening {
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(47, 111, 79, 0.35);
		}
		50% {
			box-shadow: 0 0 0 10px rgba(47, 111, 79, 0);
		}
	}

	.retry {
		color: var(--accent-deep);
		font-size: 0.9rem;
		text-align: center;
	}

	.skip {
		background: none;
		border: none;
		color: var(--ink-faint);
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 4px;
	}

	.success {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
	}

	.check {
		color: var(--leaf);
		font-weight: 800;
		font-size: 1.2rem;
	}

	/* ── Win ── */
	.win {
		text-align: center;
		margin-top: 4vh;
	}

	.win-emoji {
		font-size: 3rem;
		margin-bottom: 8px;
	}

	.win-stats {
		display: flex;
		justify-content: center;
		gap: 24px;
		margin: 18px 0 20px;
	}

	.win-stats div {
		display: flex;
		flex-direction: column;
	}

	.win-stats strong {
		font-family: var(--font-display);
		font-size: 1.6rem;
		color: var(--accent-deep);
	}

	.win-stats span {
		color: var(--ink-faint);
		font-size: 0.8rem;
	}

	.fine {
		margin-top: 14px;
		color: var(--ink-faint);
		font-size: 0.85rem;
	}

	.fine a {
		color: var(--ink-soft);
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 1.5rem;
		}

		.german {
			font-size: 1.25rem;
		}

		.win-stats {
			gap: 16px;
		}
	}
</style>
