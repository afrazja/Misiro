<script lang="ts">
	/**
	 * Goethe A1 placement mini-test — 12 original exam-format items.
	 *
	 * Hören 4 (TTS audio) · Lesen 4 (passages) · Schreiben 2 (form-fill,
	 * typed) · Sprechen 2 (mic, optional). Results feed recordDrillResult()
	 * per module, which flips the /home readiness bars from estimated to
	 * trained. Public route — works for guests too (results stay local),
	 * so it doubles as a marketing hook.
	 */
	import { onDestroy, onMount } from 'svelte';
	import { playAudioPromise, stopAllAudio, ttsIsPlaying } from '$services/tts';
	import {
		initSpeechRecognition,
		setVoiceInputHandler,
		setMicStateChangeHandler,
		toggleMic,
		getLastVoiceAlternatives,
		destroySpeechRecognition,
		type MicState
	} from '$services/speech';
	import { bestVoiceMatch, matchVoiceInput } from '$utils/text-matching';
	import {
		recordDrillResult,
		hasBeenTested,
		READINESS_LABELS,
		READINESS_MODULES,
		computeReadiness,
		type ReadinessModule
	} from '$services/readiness';
	import { isAuthenticated as checkAuth } from '$services/auth';
	import { buildExamBank, selectSitting, type SourceSentence } from '$services/exam-items';
	import { getLessonIndex, loadLesson } from '$services/lesson-loader';
	import { getLanguage, getSeenExamItems, addSeenExamItems } from '$services/data-layer';
	import type { Language } from '$stores/preferences';
	import { logError, logWarn } from '$utils/error';

	// ── Item model (self-contained; original content in official formats) ──
	// NOTE: no Persian translations of the German CONTENT here — this is an
	// assessment, and translating the statement/question hands the answer
	// over (a zero-German user would score high and get a readiness number
	// that lies to them). Persian appears only as task INSTRUCTIONS, the same
	// split the real exam makes.
	type Item =
		| {
				module: 'hoeren';
				kind: 'tf';
				audio: string;
				audioB?: string;
				statement: string;
				answer: boolean;
		  }
		| {
				module: 'hoeren';
				kind: 'choice';
				audio: string;
				audioB?: string;
				question: string;
				options: string[];
				correct: number;
		  }
		| {
				module: 'lesen';
				kind: 'tf';
				passage: string;
				statement: string;
				answer: boolean;
		  }
		| {
				module: 'lesen';
				kind: 'choice';
				passage: string;
				question: string;
				options: string[];
				correct: number;
		  }
		| {
				module: 'schreiben';
				kind: 'fill';
				info: string;
				field: string;
				answer: string;
				hintFa: string;
		  }
		| {
				module: 'sprechen';
				kind: 'speak';
				prompt: string;
				promptFa: string;
				target: string;
		  };

	const ITEMS: Item[] = [
		// ── Hören ──
		{
			module: 'hoeren',
			kind: 'tf',
			audio: 'Der Zug nach Berlin fährt um vierzehn Uhr von Gleis drei.',
			statement: 'Der Zug fährt um 14 Uhr.',
			answer: true
		},
		{
			module: 'hoeren',
			kind: 'tf',
			audio: 'Es regnet heute den ganzen Tag. Nehmen Sie einen Regenschirm mit!',
			statement: 'Heute scheint die Sonne.',
			answer: false
		},
		{
			module: 'hoeren',
			kind: 'choice',
			audio: 'Guten Tag! Was möchten Sie trinken?',
			audioB: 'Einen Kaffee mit Milch, bitte.',
			question: 'Was bestellt die Frau?',
			options: ['Tee', 'Kaffee mit Milch', 'Wasser'],
			correct: 1
		},
		{
			module: 'hoeren',
			kind: 'choice',
			audio: 'Die Apotheke ist heute bis achtzehn Uhr geöffnet.',
			question: 'Bis wann ist die Apotheke geöffnet?',
			options: ['Bis 16 Uhr', 'Bis 18 Uhr', 'Bis 20 Uhr'],
			correct: 1
		},
		// ── Lesen ──
		{
			module: 'lesen',
			kind: 'tf',
			passage: 'Geöffnet: Montag bis Freitag, 9–17 Uhr.\nSamstag und Sonntag geschlossen.',
			statement: 'Das Geschäft ist am Samstag geöffnet.',
			answer: false
		},
		{
			module: 'lesen',
			kind: 'tf',
			passage:
				'Liebe Anna,\nich komme am Freitag um 15 Uhr am Bahnhof an. Kannst du mich abholen?\nViele Grüße, Maria',
			statement: 'Maria kommt am Freitag an.',
			answer: true
		},
		{
			module: 'lesen',
			kind: 'choice',
			passage: '2-Zimmer-Wohnung in Berlin-Mitte, 650 € warm, ab 1. März frei.\nTel. 030 123456',
			question: 'Was kostet die Wohnung?',
			options: ['560 €', '650 €', '750 €'],
			correct: 1
		},
		{
			module: 'lesen',
			kind: 'choice',
			passage: 'Sprachschule International\nDeutschkurs A1: Montag und Mittwoch, 18–20 Uhr',
			question: 'Wann ist der Deutschkurs?',
			options: ['Am Wochenende', 'Montag und Mittwoch', 'Jeden Tag'],
			correct: 1
		},
		// ── Schreiben (form-fill from an info card) ──
		{
			module: 'schreiben',
			kind: 'fill',
			info: 'Sara Ahmadi kommt aus dem Iran. Sie wohnt in Teheran. Sie ist 25 Jahre alt.',
			field: 'Wohnort',
			answer: 'Teheran',
			// Instruction only — translating the field name ("Wohnort") would
			// hand over exactly the vocabulary this item tests.
			hintFa: 'فرم را با اطلاعات متن بالا کامل کن.'
		},
		{
			module: 'schreiben',
			kind: 'fill',
			info: 'Sara Ahmadi kommt aus dem Iran. Sie wohnt in Teheran. Sie ist 25 Jahre alt.',
			field: 'Alter',
			answer: '25',
			hintFa: 'فرم را با اطلاعات متن بالا کامل کن.'
		},
		// ── Sprechen (optional mic) ──
		{
			module: 'sprechen',
			kind: 'speak',
			prompt: 'Say this sentence out loud:',
			promptFa: 'این جمله را بلند بگو:',
			target: 'Ich wohne in Berlin.'
		},
		{
			module: 'sprechen',
			kind: 'speak',
			prompt: 'Say this sentence out loud:',
			promptFa: 'این جمله را بلند بگو:',
			target: 'Ich möchte einen Kaffee, bitte.'
		}
	];

	type Phase = 'intro' | 'test' | 'results';
	let phase = $state<Phase>('intro');
	let idx = $state(0);
	let answered = $state(false);
	let lastCorrect = $state(false);
	let typedAnswer = $state('');
	let micState = $state<MicState>('idle');
	let micAvailable = $state(true);
	let speakFailed = $state(false);
	let authed = $state(false);

	// per-module tallies; sprechen items the user skips are excluded entirely
	const earned: Record<ReadinessModule, number> = {
		hoeren: 0,
		lesen: 0,
		schreiben: 0,
		sprechen: 0
	};
	const possible: Record<ReadinessModule, number> = {
		hoeren: 0,
		lesen: 0,
		schreiben: 0,
		sprechen: 0
	};

	/**
	 * The sitting actually being served. First time round it is the authored
	 * 12 — those are curriculum-independent, which is what a placement test
	 * has to be. Retakes swap in a fresh set generated from lesson content,
	 * because sitting the SAME twelve twice measures memory of the answers.
	 */
	let activeItems = $state<Item[]>(ITEMS);
	let isRetake = $state(false);
	let servedIds: string[] = [];

	const item = $derived(activeItems[idx]);
	const total = $derived(activeItems.length);

	onMount(() => {
		// Independent, deliberately. Sequencing the sitting behind checkAuth()
		// meant a slow or failing Supabase auth round-trip silently prevented
		// the retake from ever loading — the test looked fine and served the
		// same twelve questions, which is the exact bug this feature fixes.
		void checkAuth()
			.then((a) => (authed = a))
			.catch(() => {
				/* the back link just points home for guests */
			});
		if (hasBeenTested()) void loadRetakeSitting();
	});

	/** Turn a generated item into the shape this page already renders. */
	function adapt(g: ReturnType<typeof selectSitting>[number]): Item | null {
		switch (g.kind) {
			case 'tf':
				return {
					module: 'hoeren',
					kind: 'tf',
					audio: g.german,
					statement: g.prompt,
					answer: g.correctIndex === 0
				};
			case 'choice':
				return {
					module: 'lesen',
					kind: 'choice',
					passage: g.german,
					question: g.prompt,
					options: g.options ?? [],
					correct: g.correctIndex ?? 0
				};
			case 'fill':
				return {
					module: 'schreiben',
					kind: 'fill',
					info: g.german,
					field: 'Missing word',
					answer: g.answer ?? '',
					hintFa: g.prompt
				};
			case 'speak':
				return {
					module: 'sprechen',
					kind: 'speak',
					prompt: g.prompt,
					promptFa: g.meaning,
					target: g.target ?? g.german
				};
			default:
				return null;
		}
	}

	/**
	 * Build the bank from lessons the learner has actually studied, and spend
	 * the sitting on whichever modules the score is least sure about.
	 */
	async function loadRetakeSitting() {
		try {
			const lang = ((await getLanguage()) === 'fa' ? 'fa' : 'en') as Language;
			const index = await getLessonIndex();
			if (!index.length) {
				logWarn('placement:retake', 'no lesson index — serving the authored set');
				return;
			}

			// A slice, not all 100 — enough for a varied bank without pulling
			// the whole curriculum over the wire for one test.
			const days = index.slice(0, 24).map((l) => l.day);
			const sentences: SourceSentence[] = [];
			for (const day of days) {
				const lesson = await loadLesson(day);
				for (const st of lesson?.sentences ?? []) {
					const german = st.role === 'received' ? st.audioText : st.targetText;
					const meaning = lang === 'fa' ? st.translationFa || st.translation : st.translation;
					if (german?.trim() && meaning?.trim()) {
						sentences.push({ day, id: st.id, german, meaning });
					}
				}
			}

			const bank = buildExamBank(sentences, lang);
			if (bank.length < 4) {
				logWarn(
					'placement:retake',
					`bank too small (${bank.length}) from ${sentences.length} sentences — serving the authored set`
				);
				return;
			}

			// Weakest evidence first: a retake should reduce uncertainty.
			//
			// Best-effort, and bounded. This is a nicety — it only decides the
			// ORDER of the questions — but computeReadiness() awaits Supabase,
			// and a request that hangs rather than rejects would leave the
			// learner staring at the authored twelve with nothing logged.
			// Nothing optional gets to block the sitting.
			const priority = await Promise.race([
				computeReadiness()
					.then((r) =>
						[...READINESS_MODULES].sort(
							(a, b) => r.modules[a].score - r.modules[b].score
						)
					)
					.catch(() => [] as ReadinessModule[]),
				new Promise<ReadinessModule[]>((resolve) => setTimeout(() => resolve([]), 2500))
			]);

			const sitting = selectSitting(bank, {
				count: 12,
				seenIds: getSeenExamItems(),
				priority
			});
			const adapted = sitting.map(adapt).filter((x): x is Item => !!x);
			if (adapted.length >= 4) {
				activeItems = adapted;
				servedIds = sitting.map((g) => g.id);
				isRetake = true;
			} else {
				logWarn('placement:retake', `only ${adapted.length} items adapted`);
			}
		} catch (e) {
			// Falling back to the authored 12 is fine; failing SILENTLY is not —
			// a retake quietly serving the same twelve is the bug this feature
			// exists to fix, and it would look identical to working.
			logError('placement:retake', e);
		}
	}

	function playItemAudio() {
		const it = item;
		if (it.module !== 'hoeren') return;
		void (async () => {
			await playAudioPromise(it.audio, 0.9, 'de-DE', undefined, 'a');
			if (it.audioB) await playAudioPromise(it.audioB, 0.9, 'de-DE', undefined, 'b');
		})();
	}

	function start() {
		micAvailable = initSpeechRecognition();
		setMicStateChangeHandler((s) => (micState = s));
		setVoiceInputHandler((transcript) => {
			const it = item;
			if (it.kind !== 'speak' || answered) return;
			const alts = getLastVoiceAlternatives();
			const { result } = bestVoiceMatch(alts.length ? alts : [transcript], it.target, 0.7);
			if (result.isMatch) {
				grade(true);
				speakFailed = false;
			} else {
				speakFailed = true;
			}
		});
		phase = 'test';
		playItemAudio();
	}

	/** Record a graded answer for the current item. */
	function grade(correct: boolean) {
		if (answered) return;
		answered = true;
		lastCorrect = correct;
		earned[item.module] += correct ? 1 : 0;
		possible[item.module] += 1;
	}

	/** Sprechen only: skip ALL remaining speaking items without counting them. */
	let skipAllSpeaking = false;
	function skipSpeaking() {
		skipAllSpeaking = true;
		answered = true;
		lastCorrect = false;
	}

	function submitTyped() {
		const it = item;
		if (it.kind !== 'fill' || !typedAnswer.trim()) return;
		const { isMatch } = matchVoiceInput(typedAnswer.trim(), it.answer, 0.85);
		grade(isMatch);
	}

	function next() {
		stopAllAudio();
		answered = false;
		speakFailed = false;
		typedAnswer = '';
		if (idx >= total - 1) {
			finish();
			return;
		}
		idx += 1;
		// Honor "skip speaking questions" — hop over any remaining speak items.
		while (skipAllSpeaking && activeItems[idx].kind === 'speak') {
			if (idx >= total - 1) {
				finish();
				return;
			}
			idx += 1;
		}
		playItemAudio();
	}

	function finish() {
		// So the next retake draws different questions.
		addSeenExamItems(servedIds);
		for (const m of ['hoeren', 'lesen', 'schreiben', 'sprechen'] as ReadinessModule[]) {
			if (possible[m] > 0) recordDrillResult(m, earned[m], possible[m]);
		}
		phase = 'results';
	}

	const pct = (m: ReadinessModule) =>
		possible[m] > 0 ? Math.round((earned[m] / possible[m]) * 100) : null;

	onDestroy(() => {
		stopAllAudio();
		destroySpeechRecognition();
	});
</script>

<svelte:head>
	<title>Goethe A1 Placement Test – Free | Mirifer</title>
	<meta
		name="description"
		content="Find out how ready you are for the Goethe A1 exam in 8 minutes. Listening, reading, writing and speaking — free, no account needed."
	/>
</svelte:head>

<main class="placement-page">
	<header class="pt-header">
		<a href={authed ? '/home' : '/'} class="back">← Mirifer</a>
		{#if phase === 'test'}
			<span class="pt-progress">{idx + 1} / {total}</span>
		{/if}
	</header>

	<span id="main-content" tabindex="-1" class="sr-only"></span>

	{#if phase === 'intro'}
		<section class="card intro">
			<div class="badge">🎓 Goethe A1 · Start Deutsch 1</div>
			<h1>{isRetake ? 'Check your progress' : 'How ready are you?'}</h1>
			{#if isRetake}
				<!-- Say plainly that the questions are new. Otherwise a returning
				     learner assumes it is the same test and does not bother. -->
				<p class="sub">
					{total} fresh questions, drawn from the German you have been
					studying — different from last time, so this measures what you
					know now rather than what you remember answering.
				</p>
				<p class="sub fa" dir="rtl">
					{total} سؤال تازه از درس‌هایی که خوانده‌ای — با دفعهٔ قبل فرق دارد،
					تا آنچه الان بلدی سنجیده شود، نه آنچه جوابش را به یاد داری.
				</p>
			{:else}
				<p class="sub">
					12 quick questions in the real exam format — listening, reading,
					writing, speaking. Takes about 8 minutes.
				</p>
				<p class="sub fa" dir="rtl">
					۱۲ سؤال کوتاه دقیقاً در قالب آزمون گوته — شنیدن، خواندن، نوشتن و صحبت
					کردن. حدود ۸ دقیقه.
				</p>
			{/if}
			<p class="intro-note fa" dir="rtl">
				⚠️ سؤال‌ها فقط به آلمانی‌اند — بدون ترجمه، تا نمره‌ات واقعی باشد.
				اگر چیزی را نفهمیدی، حدس بزن یا رد شو؛ همین هم بخشی از سنجش است.
			</p>
			<button class="btn-primary big" onclick={start}>▶ Start the test</button>
			<p class="fine">Speaking questions are optional — you can skip them.</p>
		</section>
	{:else if phase === 'test'}
		<section class="card">
			<p class="module-tag mod-{item.module}">
				{READINESS_LABELS[item.module].de} · {READINESS_LABELS[item.module].fa}
			</p>

			{#if item.module === 'hoeren'}
				<!-- Hoeren items start playing on their own, so this must stay
				     live while it plays — a disabled button is no way to stop
				     audio you did not start (WCAG 1.4.2). -->
				<button
					class="btn-ghost"
					onclick={() => ($ttsIsPlaying ? stopAllAudio() : playItemAudio())}
				>
					{$ttsIsPlaying ? '⏹ Stop' : '🔊 Play again'}
				</button>
			{/if}

			{#if 'passage' in item}
				<pre class="passage" lang="de">{item.passage}</pre>
			{/if}

			{#if item.kind === 'fill'}
				<pre class="passage" lang="de">{item.info}</pre>
				<p class="question">{item.field}: ______</p>
				<p class="hint fa" dir="rtl">{item.hintFa}</p>
				{#if !answered}
					<div class="fill-row">
						<input
							class="fill-input"
							type="text"
							bind:value={typedAnswer}
							placeholder={item.field + '…'}
							onkeydown={(e) => e.key === 'Enter' && submitTyped()}
						/>
						<button class="btn-primary" onclick={submitTyped} disabled={!typedAnswer.trim()}
							>Check</button
						>
					</div>
				{/if}
			{:else if item.kind === 'tf'}
				<p class="task-instruction fa" dir="rtl">
					{item.module === 'hoeren'
						? 'گوش کن — این جمله درست است یا غلط؟'
						: 'متن را بخوان — این جمله درست است یا غلط؟'}
				</p>
				<p class="question" lang="de">{item.statement}</p>
				{#if !answered}
					<div class="tf-row">
						<button class="btn-choice" onclick={() => grade(item.kind === 'tf' && item.answer === true)}
							>Richtig ✓</button
						>
						<button class="btn-choice" onclick={() => grade(item.kind === 'tf' && item.answer === false)}
							>Falsch ✗</button
						>
					</div>
				{/if}
			{:else if item.kind === 'choice'}
				<p class="task-instruction fa" dir="rtl">
					{item.module === 'hoeren'
						? 'گوش کن و پاسخ درست را انتخاب کن.'
						: 'متن را بخوان و پاسخ درست را انتخاب کن.'}
				</p>
				<p class="question" lang="de">{item.question}</p>
				{#if !answered}
					<div class="choice-col">
						{#each item.options as opt, i (opt)}
							<button
								class="btn-choice"
								onclick={() => grade(item.kind === 'choice' && i === item.correct)}
								>{String.fromCharCode(97 + i)}) {opt}</button
							>
						{/each}
					</div>
				{/if}
			{:else if item.kind === 'speak'}
				<p class="question">{item.prompt}</p>
				<p class="hint fa" dir="rtl">{item.promptFa}</p>
				<p class="speak-target" lang="de">„{item.target}"</p>
				<button
					class="btn-ghost"
					onclick={() =>
						$ttsIsPlaying
							? stopAllAudio()
							: playAudioPromise(item.kind === 'speak' ? item.target : '', 0.85, 'de-DE')}
					>{$ttsIsPlaying ? '⏹ Stop' : '🔊 Hear it first'}</button
				>
				{#if !answered}
					{#if micAvailable}
						<button
							class="btn-mic"
							class:listening={micState === 'listening'}
							onclick={toggleMic}
						>
							{#if micState === 'listening'}🎙 Listening… tap when done
							{:else if micState === 'processing'}⏳ Checking…
							{:else}🎙 Say it{/if}
						</button>
						{#if speakFailed}
							<p class="retry">Not quite — try once more, or skip.</p>
						{/if}
					{/if}
					<button class="skip" onclick={skipSpeaking}>Skip speaking questions</button>
				{/if}
			{/if}

			{#if answered}
				<div class="feedback" class:ok={lastCorrect}>
					{#if item.kind === 'speak' && !lastCorrect && possible.sprechen === 0}
						<span>Skipped — speaking won't count.</span>
					{:else if lastCorrect}
						<span>✓ Richtig!</span>
					{:else}
						<span>
							✗ {item.kind === 'tf'
								? `Answer: ${item.answer ? 'Richtig' : 'Falsch'}`
								: item.kind === 'choice'
									? `Answer: ${item.options[item.correct]}`
									: item.kind === 'fill'
										? `Answer: ${item.answer}`
										: ''}
						</span>
					{/if}
					<button class="btn-primary" onclick={next}>
						{idx < total - 1 ? 'Next →' : 'See results 🎓'}
					</button>
				</div>
			{/if}
		</section>
	{:else}
		<section class="card results">
			<h1>Your starting point</h1>
			<div class="result-bars">
				{#each ['hoeren', 'lesen', 'schreiben', 'sprechen'] as const as m (m)}
					<div class="result-row">
						<span class="result-label">{READINESS_LABELS[m].en} · {READINESS_LABELS[m].fa}</span>
						{#if pct(m) !== null}
							<div class="result-bar">
								<div class="result-fill" style="width:{pct(m)}%"></div>
							</div>
							<span class="result-num">{pct(m)}%</span>
						{:else}
							<span class="result-skip">skipped</span>
						{/if}
					</div>
				{/each}
			</div>
			<p class="sub">
				Your readiness score on the dashboard now uses these results — every
				lesson and review moves it toward the 60/100 pass mark.
			</p>
			<p class="sub fa" dir="rtl">
				نمرهٔ آمادگی در داشبورد از همین نتایج ساخته می‌شود — هر درس و مرور،
				تو را به نمرهٔ قبولی (۶۰ از ۱۰۰) نزدیک‌تر می‌کند.
			</p>
			{#if authed}
				<a class="btn-primary big" href="/home">See your readiness →</a>
			{:else}
				<a class="btn-primary big" href="/login?mode=signup"
					>Create a free account — start your plan</a
				>
				<p class="fine"><a href="/try">Or try a free lesson first</a></p>
			{/if}
		</section>
	{/if}
</main>

<style>
	.placement-page {
		min-height: 100vh;
		background: var(--paper);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16px;
	}

	.pt-header {
		width: 100%;
		max-width: 620px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 4px 18px;
	}

	.back {
		/* 44px minimum touch target — this was a bare 26px-tall link. */
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 10px 4px;
		color: var(--ink-soft);
		text-decoration: none;
		font-weight: 600;
	}

	.pt-progress {
		color: var(--ink-faint);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.card {
		width: 100%;
		max-width: 620px;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 16px;
		box-shadow: var(--paper-shadow);
		padding: 26px 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.intro,
	.results {
		text-align: center;
		margin-top: 5vh;
	}

	.badge {
		align-self: center;
		background: var(--accent-wash);
		color: var(--accent-deep);
		border-radius: 999px;
		padding: 4px 14px;
		font-size: 0.85rem;
		font-weight: 700;
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.7rem;
		color: var(--ink);
	}

	.sub {
		color: var(--ink-soft);
		line-height: 1.6;
	}

	.fine {
		color: var(--ink-faint);
		font-size: 0.85rem;
	}

	.intro-note {
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 10px 14px;
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.7;
		text-align: right;
	}

	.fine a {
		color: var(--ink-soft);
	}

	.module-tag {
		align-self: flex-start;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: 999px;
		padding: 3px 12px;
	}

	.mod-hoeren {
		background: var(--accent-wash);
		color: var(--accent-deep);
	}
	.mod-lesen {
		background: var(--leaf-wash);
		color: var(--leaf);
	}
	.mod-schreiben {
		background: var(--paper-sunken);
		color: var(--ink-soft);
	}
	.mod-sprechen {
		background: var(--info-wash);
		color: var(--info);
	}

	.passage {
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-left: 4px solid var(--accent);
		border-radius: 10px;
		padding: 14px 16px;
		white-space: pre-wrap;
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--ink);
		line-height: 1.6;
	}

	.question {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--ink);
	}

	.hint {
		color: var(--ink-soft);
		font-size: 0.92rem;
	}

	/* Persian task instruction — tells the user WHAT TO DO. Never translates
	   the German being tested (that would hand over the answer). */
	.task-instruction {
		color: var(--ink-faint);
		font-size: 0.88rem;
		border-inline-start: 3px solid var(--line);
		padding-inline-start: 10px;
	}

	.speak-target {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--accent-deep);
	}

	.tf-row {
		display: flex;
		gap: 10px;
	}

	.choice-col {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.fill-row {
		display: flex;
		gap: 8px;
	}

	.fill-input {
		flex: 1;
		background: var(--paper-raised);
		border: 2px solid var(--line);
		border-radius: 10px;
		padding: 11px 14px;
		font-size: 1rem;
		font-family: var(--font-body);
		color: var(--ink);
	}

	.fill-input:focus {
		border-color: var(--accent);
		outline: none;
	}

	.btn-choice {
		flex: 1;
		background: var(--paper-raised);
		border: 1.5px solid var(--line);
		border-radius: 10px;
		padding: 12px 16px;
		font-size: 1rem;
		font-weight: 600;
		color: var(--ink);
		cursor: pointer;
		text-align: left;
	}

	.btn-choice:hover {
		border-color: var(--accent);
		background: var(--accent-wash);
	}

	.btn-primary {
		background: var(--accent);
		color: var(--on-accent);
		border: none;
		border-radius: 10px;
		padding: 12px 20px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		text-align: center;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn-primary.big {
		font-size: 1.08rem;
		padding: 14px 26px;
	}

	.btn-ghost {
		align-self: flex-start;
		background: var(--paper-raised);
		border: 1.5px solid var(--line);
		border-radius: 10px;
		padding: 9px 16px;
		font-weight: 600;
		color: var(--ink);
		cursor: pointer;
	}

	.btn-ghost:disabled {
		opacity: 0.6;
	}

	.btn-mic {
		background: var(--leaf);
		color: var(--on-accent);
		border: none;
		border-radius: 10px;
		padding: 12px 18px;
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
			box-shadow: 0 0 0 0 rgba(88, 214, 141, 0.35);
		}
		50% {
			box-shadow: 0 0 0 10px rgba(88, 214, 141, 0);
		}
	}

	.retry {
		color: var(--accent-deep);
		font-size: 0.9rem;
	}

	.skip {
		background: none;
		border: none;
		color: var(--ink-faint);
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.9rem;
		align-self: center;
	}

	.feedback {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		background: var(--accent-wash);
		border-radius: 12px;
		padding: 12px 16px;
		font-weight: 700;
		color: var(--accent-deep);
		flex-wrap: wrap;
	}

	.feedback.ok {
		background: var(--leaf-wash);
		color: var(--leaf);
	}

	.result-bars {
		display: flex;
		flex-direction: column;
		gap: 10px;
		text-align: left;
	}

	.result-row {
		display: grid;
		grid-template-columns: 150px 1fr 46px;
		align-items: center;
		gap: 10px;
	}

	.result-label {
		font-size: 0.88rem;
		color: var(--ink-soft);
		font-weight: 600;
	}

	.result-bar {
		height: 10px;
		background: var(--paper-sunken);
		border-radius: 6px;
		overflow: hidden;
	}

	.result-fill {
		height: 100%;
		background: var(--leaf);
		border-radius: 6px;
	}

	.result-num {
		font-size: 0.85rem;
		color: var(--ink-soft);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.result-skip {
		grid-column: 2 / 4;
		color: var(--ink-faint);
		font-size: 0.85rem;
	}

	@media (max-width: 640px) {
		.result-row {
			grid-template-columns: 110px 1fr 40px;
		}
	}
</style>
