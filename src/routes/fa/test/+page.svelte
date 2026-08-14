<script lang="ts">
	/**
	 * Free A1 self-test, Persian-first — the thing that travels.
	 *
	 * Built to survive being pasted into a Telegram channel: no signup, no
	 * microphone permission, no Supabase round-trip, no adaptive loading. The
	 * whole bank ships with the page, so it works on a slow or filtered
	 * connection and the first question is on screen immediately.
	 *
	 * That is why this is not a fork of /placement. That page is the in-app
	 * diagnostic — auth, readiness scoring, mic, adaptive item selection,
	 * 1,129 lines. Everything that makes it good inside the app makes it
	 * useless as a link someone forwards to a friend. (It is bilingual, not
	 * English-only as this comment first claimed — that came from grepping
	 * for `fa:` keys in a file that translates with inline ternaries.)
	 *
	 * Both tests map score to start day through the same startDayForScore,
	 * so they cannot disagree about what a result means.
	 *
	 * The URL is short on purpose. Shared links get retyped and truncated.
	 */
	import { QUESTIONS, bandFor, startDayFor, scoreByTopic, totalCorrect, shareText } from '$lib/data/fa-placement';
	import { PENDING_KEY, type Placement } from '$services/placement';

	type Phase = 'intro' | 'test' | 'result';

	let phase = $state<Phase>('intro');
	let idx = $state(0);
	let picked = $state<number | null>(null);
	let answers = $state<Array<number | null>>(QUESTIONS.map(() => null));
	let shareNote = $state('');

	const q = $derived(QUESTIONS[idx]);
	const isLast = $derived(idx === QUESTIONS.length - 1);
	const score = $derived(totalCorrect(answers));
	const band = $derived(bandFor(score));
	const startDay = $derived(startDayFor(score));
	const breakdown = $derived(scoreByTopic(answers));

	/** Persian-Indic digits. Latin numerals in Persian prose read as foreign. */
	function fa(n: number | string): string {
		return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
	}

	function choose(i: number) {
		if (picked !== null) return; // one shot per question
		picked = i;
		answers[idx] = i;
	}

	/**
	 * Park the recommended start day for the account that does not exist yet.
	 *
	 * This page runs signed out by design, so it cannot write a placement.
	 * data-layer's adoptPendingPlacement() claims this on the first
	 * authenticated lesson load.
	 *
	 * Called ONLY from the "start from day N" button, never on finishing the
	 * quiz. The first version fired at the end of the last question, which
	 * meant anyone who opened the test to look at it — including on a
	 * browser where someone was already signed in — had their course
	 * silently rearranged. A quiz is not consent; pressing the button that
	 * names the day is.
	 *
	 * Not clamped here: the lesson index is not loaded on this page, so the
	 * real day count is unknown. The controller clamps when it adopts.
	 */
	function rememberPlacement() {
		const pending: Placement = {
			startDay: startDayFor(score),
			source: 'self-test',
			placedAt: new Date().toISOString().slice(0, 10)
		};
		try {
			localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
		} catch {
			// Private mode or a full quota. The recommendation is still shown
			// on screen; only the automatic hand-off is lost.
		}
	}

	function next() {
		if (picked === null) return;
		if (isLast) {
			phase = 'result';
			return;
		}
		idx += 1;
		picked = null;
	}

	function restart() {
		answers = QUESTIONS.map(() => null);
		idx = 0;
		picked = null;
		shareNote = '';
		phase = 'intro';
	}

	async function share() {
		// origin is read at click time — the page is prerendered, so a build
		// time constant would bake in the wrong host on preview deploys.
		const url = `${location.origin}/fa/test`;
		const text = shareText(score, url);

		// navigator.share is the good path on the phones this gets opened on;
		// clipboard is the desktop fallback. Both can reject (no permission,
		// user dismissed the sheet) and neither is worth an error dialog.
		try {
			if (navigator.share) {
				await navigator.share({ text });
				return;
			}
		} catch {
			return; // dismissing the share sheet is not a failure
		}

		try {
			await navigator.clipboard.writeText(text);
			shareNote = 'نتیجه کپی شد — حالا می‌توانی بفرستی.';
		} catch {
			shareNote = 'کپی نشد. می‌توانی از همین صفحه اسکرین‌شات بگیری.';
		}
	}
</script>

<svelte:head>
	<title>تست رایگان سطح زبان آلمانی — سنجش آمادگی آزمون گوته A1 | میریفر</title>
	<meta
		name="description"
		content="تست رایگان سطح آلمانی به فارسی. ۱۲ سؤال، کمتر از ۵ دقیقه، بدون ثبت‌نام. سطحت را بسنج و ببین برای آزمون Goethe-Zertifikat A1 کجا ایستاده‌ای."
	/>
	<link rel="canonical" href="https://www.mirifer.com/fa/test" />
	<meta property="og:title" content="تست رایگان سطح زبان آلمانی — آزمون گوته A1" />
	<meta
		property="og:description"
		content="۱۲ سؤال، کمتر از ۵ دقیقه، بدون ثبت‌نام. سطح آلمانی‌ات را رایگان بسنج."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://www.mirifer.com/fa/test" />
	<meta property="og:locale" content="fa_IR" />
</svelte:head>

<div class="wrap" lang="fa" dir="rtl">
	{#if phase === 'intro'}
		<section class="card intro">
			<span class="kicker">رایگان · بدون ثبت‌نام</span>
			<h1>سطح آلمانی‌ات را بسنج</h1>
			<p class="lede">
				{fa(QUESTIONS.length)} سؤال، کمتر از {fa(5)} دقیقه. در پایان می‌بینی کجا ایستاده‌ای و
				برای آزمون <span dir="ltr" class="ltr">Goethe-Zertifikat A1</span> از کجا باید شروع کنی.
			</p>

			<ul class="facts">
				<li><strong>بدون ثبت‌نام</strong> — نه ایمیل می‌خواهد نه کارت بانکی</li>
				<li><strong>بدون میکروفون</strong> — فقط چند گزینه</li>
				<li><strong>با توضیح فارسی</strong> — بعد از هر جواب می‌فهمی چرا</li>
			</ul>

			<button class="primary" onclick={() => (phase = 'test')}>شروع تست</button>
			<p class="sub"><a href="/fa">میریفر چیست؟</a></p>
		</section>
	{:else if phase === 'test'}
		<section class="card">
			<div class="progress" role="group" aria-label="پیشرفت تست">
				<div class="bar"><div class="fill" style="inline-size: {((idx + 1) / QUESTIONS.length) * 100}%"></div></div>
				<span class="count">{fa(idx + 1)} از {fa(QUESTIONS.length)}</span>
			</div>

			<p class="prompt">{q.prompt}</p>
			<!-- German is isolated so its punctuation and blanks do not get
			     reordered by the surrounding RTL paragraph. -->
			<p class="german" dir="ltr" lang="de">{q.german}</p>

			<div class="options">
				{#each q.options as opt, i}
					{@const isAnswer = i === q.answer}
					{@const chosen = picked === i}
					<button
						class="opt"
						class:right={picked !== null && isAnswer}
						class:wrong={chosen && !isAnswer}
						disabled={picked !== null}
						onclick={() => choose(i)}
					>
						<span dir="ltr" class="ltr">{opt}</span>
						{#if picked !== null && isAnswer}<span class="mark" aria-label="پاسخ درست">✓</span>{/if}
						{#if chosen && !isAnswer}<span class="mark" aria-label="پاسخ شما">✕</span>{/if}
					</button>
				{/each}
			</div>

			{#if picked !== null}
				<div class="why">
					<p>{q.why}</p>
					{#if q.note}<p class="note">{q.note}</p>{/if}
				</div>
				<button class="primary" onclick={next}>
					{isLast ? 'دیدن نتیجه' : 'سؤال بعدی'}
				</button>
			{/if}
		</section>
	{:else}
		<section class="card result">
			<span class="kicker">نتیجهٔ تست</span>
			<div class="score">
				<strong>{fa(score)}</strong><span class="of">از {fa(QUESTIONS.length)}</span>
			</div>
			<h1 class="band">{band.fa}</h1>
			<p class="lede">{band.blurb}</p>

			<h2 class="sec">نقاط قوت و ضعف</h2>
			<ul class="bars">
				{#each breakdown as row}
					{@const pct = (row.correct / row.total) * 100}
					<li>
						<div class="brow">
							<span>{row.topic.fa}</span>
							<span class="num">{fa(row.correct)}/{fa(row.total)}</span>
						</div>
						<div class="bar"><div class="fill" class:weak={pct < 50} style="inline-size: {pct}%"></div></div>
					</li>
				{/each}
			</ul>

			<div class="cta">
				<!-- The button carries the day, so pressing it IS the consent.
				     Nothing is stored until then: this page is built for
				     strangers to try casually, and finishing a quiz must not
				     quietly rearrange the course of whoever is signed in on
				     this browser. -->
				<p>
					بر اساس نتیجه، پیشنهاد ما شروع از <strong>روز {fa(startDay)}</strong> است —
					روزهای قبلش رد می‌شوند و هر وقت خواستی می‌توانی برگردی و ببینی‌شان.
				</p>
				<a class="primary" href="/fa" onclick={rememberPlacement}>
					شروع دوره از روز {fa(startDay)}
				</a>
				<a class="ghost-link" href="/fa">فقط می‌خواهم نگاهی بیندازم</a>
				<button class="ghost" onclick={share}>فرستادن نتیجه برای دوستان</button>
				{#if shareNote}<p class="sub" role="status">{shareNote}</p>{/if}
				<button class="link" onclick={restart}>دوباره امتحان کن</button>
			</div>
		</section>
	{/if}
</div>

<style>
	.wrap {
		max-inline-size: 640px;
		margin: 0 auto;
		padding: 32px 20px 64px;
		font-family: var(--font-body);
		color: var(--ink);
	}

	.card {
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 28px 24px;
	}

	.kicker {
		display: inline-block;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--accent);
		background: var(--paper-sunken);
		border-radius: 999px;
		padding: 4px 12px;
		margin-bottom: 14px;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 5vw, 2rem);
		line-height: 1.35;
		margin: 0 0 10px;
	}

	.lede {
		color: var(--ink-soft);
		line-height: 1.9;
		margin: 0 0 18px;
	}

	.facts {
		list-style: none;
		padding: 0;
		margin: 0 0 22px;
		display: grid;
		gap: 8px;
	}

	.facts li {
		background: var(--paper-sunken);
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 0.94rem;
		line-height: 1.7;
		color: var(--ink-soft);
	}

	.facts strong { color: var(--ink); }

	/* Latin runs inside Persian prose. Isolation stops trailing punctuation
	   from being pulled to the wrong end of the line. */
	.ltr {
		unicode-bidi: isolate;
	}

	.primary,
	.ghost,
	.link {
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		border-radius: 12px;
		min-block-size: 48px;
		inline-size: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
	}

	.primary {
		background: var(--accent);
		color: var(--on-accent);
		border: none;
		padding: 12px 20px;
	}

	.primary:hover { filter: brightness(1.06); }

	.ghost {
		background: var(--control);
		color: var(--ink);
		border: 1px solid var(--control-border);
		padding: 12px 20px;
		margin-top: 10px;
	}

	.ghost:hover { background: var(--control-hover); }

	.link {
		background: none;
		border: none;
		color: var(--ink-faint);
		text-decoration: underline;
		min-block-size: 44px;
		margin-top: 6px;
		font-weight: 600;
	}

	/* The opt-out. Has to be a real, obvious way through to the site that
	   does not set a placement — otherwise the only route onward is the
	   one that changes your course. */
	.ghost-link {
		display: flex;
		align-items: center;
		justify-content: center;
		min-block-size: 44px;
		margin-top: 10px;
		color: var(--ink-soft);
		font-weight: 600;
		font-size: 0.92rem;
		text-decoration: none;
		border: 1px solid var(--control-border);
		border-radius: 12px;
		background: var(--control);
	}

	.ghost-link:hover {
		background: var(--control-hover);
	}

	.sub {
		text-align: center;
		color: var(--ink-faint);
		font-size: 0.88rem;
		margin: 12px 0 0;
	}

	.sub a { color: var(--accent); }

	/* progress */
	.progress {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}

	.bar {
		flex: 1;
		block-size: 6px;
		background: var(--paper-sunken);
		border-radius: 999px;
		overflow: hidden;
	}

	.fill {
		block-size: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: inline-size 0.25s ease;
	}

	.count {
		font-size: 0.82rem;
		color: var(--ink-faint);
		font-variant-numeric: tabular-nums;
	}

	.prompt {
		font-weight: 700;
		margin: 0 0 10px;
		line-height: 1.8;
	}

	.german {
		font-size: 1.3rem;
		font-weight: 700;
		background: var(--paper-sunken);
		border-radius: 12px;
		padding: 16px;
		margin: 0 0 18px;
		text-align: center;
		unicode-bidi: isolate;
	}

	.options {
		display: grid;
		gap: 10px;
	}

	.opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		text-align: start;
		background: var(--control);
		color: var(--ink);
		border: 2px solid var(--control-border);
		border-radius: 12px;
		padding: 14px 16px;
		min-block-size: 52px;
		cursor: pointer;
	}

	.opt:hover:not(:disabled) { background: var(--control-hover); }
	.opt:disabled { cursor: default; }

	/* Not colour alone — the ✓ / ✕ carries the same information for anyone
	   who cannot separate the two hues. */
	.opt.right {
		border-color: #2ecc71;
		background: color-mix(in srgb, #2ecc71 14%, var(--control));
	}

	.opt.wrong {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--control));
	}

	.mark { font-size: 1.1rem; font-weight: 800; }

	.why {
		background: var(--paper-sunken);
		border-radius: 12px;
		padding: 14px 16px;
		margin: 16px 0;
	}

	.why p { margin: 0; line-height: 1.9; color: var(--ink-soft); }

	.note {
		margin-top: 10px !important;
		padding-top: 10px;
		border-top: 1px solid var(--line);
		font-size: 0.92rem;
		color: var(--ink-faint) !important;
	}

	/* result */
	.result { text-align: center; }
	.result .lede { text-align: center; }

	.score {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 8px;
		margin: 6px 0 4px;
	}

	.score strong {
		font-family: var(--font-display);
		font-size: 3.4rem;
		line-height: 1;
		color: var(--accent);
	}

	.of { color: var(--ink-faint); font-size: 1rem; }

	.band { font-size: 1.5rem; margin-bottom: 8px; }

	.sec {
		font-size: 0.86rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-faint);
		margin: 26px 0 12px;
	}

	.bars {
		list-style: none;
		padding: 0;
		margin: 0 0 26px;
		display: grid;
		gap: 14px;
		text-align: start;
	}

	.brow {
		display: flex;
		justify-content: space-between;
		font-size: 0.92rem;
		margin-bottom: 6px;
	}

	.num { color: var(--ink-faint); font-variant-numeric: tabular-nums; }

	.bars .fill { background: #2ecc71; }
	.bars .fill.weak { background: var(--accent); }

	.cta p { color: var(--ink-soft); margin: 0 0 12px; line-height: 1.8; }

	@media (max-width: 640px) {
		.wrap { padding: 20px 14px 48px; }
		.card { padding: 22px 16px; }
	}
</style>
