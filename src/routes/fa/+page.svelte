<script lang="ts">
	/**
	 * Persian landing page.
	 *
	 * Not a translation of the English one. The English page sells "learn
	 * German through conversation" to anyone; this sells the thing only this
	 * app has for this audience — German explained in Persian, aimed at
	 * Goethe A1, with the sounds Persian speakers actually struggle with.
	 *
	 * A separate URL rather than a language toggle on `/`, because a toggle
	 * gives Google one page to index. Two URLs plus hreflang gives it two,
	 * and an Iranian searching «آموزش زبان آلمانی» is searching in Persian
	 * for a page that has to exist in Persian to be found at all.
	 *
	 * Why this page exists: 30 days of analytics show 192 visitors, 13 of
	 * them from Iran, and 10 from Google in total. The app converts badly
	 * AND nobody arrives; this is the second problem.
	 */
	import { onMount } from 'svelte';
	import * as auth from '$services/auth';

	let isAuthenticated = $state(false);

	onMount(async () => {
		try {
			isAuthenticated = await auth.isAuthenticated();
		} catch {
			// Signed out is the default and the common case.
		}
	});

	const faqs = [
		{
			q: 'آیا واقعاً رایگان است؟',
			a: 'بله. همهٔ درس‌های روزانه، تمرین مکالمه و بخش دستور زبان رایگان است. کارت بانکی لازم نیست.'
		},
		{
			q: 'چرا برای فارسی‌زبانان ساخته شده؟',
			a: 'چون مشکل‌های ما با آلمانی مشخص است. صداهای ü و ö در فارسی وجود ندارند، «ich» به «ایش» تبدیل می‌شود، و فارسی اجازهٔ خوشهٔ همخوانی در ابتدای کلمه نمی‌دهد؛ برای همین «Stadt» را «اِستات» می‌گوییم. برنامه دقیقاً همین‌ها را تشخیص می‌دهد و می‌گوید چطور درستش کنی.'
		},
		{
			q: 'برای آزمون گوته A1 مناسب است؟',
			a: 'بله. برنامه بر اساس چهار بخش آزمون — شنیدن، خواندن، نوشتن و صحبت — پیش می‌رود و آمادگی‌ات را در هر بخش جداگانه نشان می‌دهد. اگر تاریخ آزمونت را وارد کنی، شمارش معکوس هم داری.'
		},
		{
			q: 'چقدر باید هر روز وقت بگذارم؟',
			a: 'هر درس حدود ۸ تا ۱۵ دقیقه است و هر روز یک درس. مهم‌تر از طولانی بودن، هر روز بودنش است.'
		},
		{
			q: 'میکروفون لازم دارم؟',
			a: 'برای تمرین صحبت بله، ولی اجباری نیست. می‌توانی جواب‌ها را تایپ کنی و بقیهٔ درس بدون میکروفون کار می‌کند.'
		},
		{
			q: 'از صفر شروع می‌کنم، مشکلی نیست؟',
			a: 'اصلاً. درس اول با «سلام» و «صبح بخیر» شروع می‌شود. اگر هم قبلاً چیزی بلدی، در ابتدای کار سطحت را می‌پرسیم.'
		}
	];
</script>

<svelte:head>
	<title>آموزش زبان آلمانی برای فارسی‌زبانان — آمادگی آزمون گوته A1 | میریفر</title>
	<meta
		name="description"
		content="آموزش رایگان زبان آلمانی با توضیح‌های فارسی. ۱۲۰ درس روزانه، تمرین مکالمه با صدا، و آمادگی آزمون Goethe-Zertifikat A1. از روز اول آلمانی حرف بزنید."
	/>
	<link rel="canonical" href="https://www.mirifer.com/fa" />
	<!-- Tells Google these are the same page in two languages, so neither is
	     treated as duplicate content and each is served to the right search. -->
	<link rel="alternate" hreflang="fa" href="https://www.mirifer.com/fa" />
	<link rel="alternate" hreflang="en" href="https://www.mirifer.com/" />
	<link rel="alternate" hreflang="x-default" href="https://www.mirifer.com/" />
	<meta property="og:title" content="آموزش زبان آلمانی برای فارسی‌زبانان | میریفر" />
	<meta
		property="og:description"
		content="۱۲۰ درس روزانه، توضیح‌ها به فارسی، تمرین تلفظ مخصوص فارسی‌زبانان، و آمادگی آزمون گوته A1. رایگان."
	/>
	<meta property="og:locale" content="fa_IR" />
	<meta property="og:url" content="https://www.mirifer.com/fa" />
</svelte:head>

<div class="fa-page" lang="fa" dir="rtl">
	<section class="hero">
		<div class="badge">🇩🇪 آلمانی برای فارسی‌زبانان</div>
		<h1>
			آلمانی را طوری یاد بگیر<br />
			<span class="grad">که واقعاً حرف بزنی</span>
		</h1>
		<p class="sub">
			توضیح‌ها به فارسی. از روز اول صحبت می‌کنی، نه بعد از ماه‌ها گرامر.
		</p>
		<div class="actions">
			{#if isAuthenticated}
				<a class="btn primary" href="/home">رفتن به درس‌ها ←</a>
			{:else}
				<a class="btn primary" href="/try">🎙️ یک درس را همین حالا امتحان کن</a>
				<a class="btn ghost" href="/login">شروع رایگان</a>
			{/if}
		</div>
		<p class="note">بدون کارت بانکی · بدون هزینه</p>
		<!-- The self-test is the page people forward to each other, so it
		     needs a route in from the landing page rather than only existing
		     at the end of a shared link. -->
		<p class="note alt">
			نمی‌دانی از کجا شروع کنی؟ <a href="/fa/test">تست رایگان سطح‌سنجی</a> — ۱۲ سؤال، بدون ثبت‌نام.
		</p>
	</section>

	<section class="stats">
		<div><strong>۱۲۰</strong><span>درس روزانه</span></div>
		<div><strong>A1 تا B1</strong><span>سه سطح کامل</span></div>
		<div><strong>۴</strong><span>مهارت آزمون گوته</span></div>
	</section>

	<!-- The section that only this app can write. Everything above is
	     something any language app could claim. -->
	<section class="band">
		<p class="eyebrow">چرا این یکی فرق دارد</p>
		<h2>ساخته شده برای مشکل‌هایی که ما داریم</h2>
		<div class="grid">
			<div class="card">
				<h3>صداهایی که در فارسی نداریم</h3>
				<p>
					ü و ö در فارسی وجود ندارند و ما ناخودآگاه آن‌ها را «او» و «اُ»
					می‌گوییم — ولی در آلمانی <span lang="de">schon</span> و
					<span lang="de">schön</span> دو کلمهٔ متفاوت‌اند. وقتی این اتفاق
					بیفتد، برنامه دقیقاً همان صدا را نام می‌برد و می‌گوید چطور
					درستش کنی.
				</p>
			</div>
			<div class="card">
				<h3>خوشهٔ همخوانی در ابتدای کلمه</h3>
				<p>
					فارسی اجازه نمی‌دهد کلمه با دو همخوان شروع شود، برای همین
					<span lang="de">Stadt</span> را «اِستات» و
					<span lang="de">sprechen</span> را «سِپرشن» می‌گوییم. این هم
					تشخیص داده می‌شود.
				</p>
			</div>
			<div class="card">
				<h3>توضیح‌ها به فارسی، نه انگلیسی</h3>
				<p>
					قاعده‌های دستوری، راهنماها و ترجمه‌ها همه فارسی‌اند. لازم
					نیست اول انگلیسی بلد باشی تا آلمانی یاد بگیری.
				</p>
			</div>
			<div class="card">
				<h3>یک چیز که از قبل بلدی</h3>
				<p>
					صدای «خ» در <span lang="de">Bach</span> برای انگلیسی‌زبان‌ها
					سخت‌ترین صدای آلمانی است. تو از قبل آن را داری. بعضی چیزها
					برای ما آسان‌تر است.
				</p>
			</div>
		</div>
	</section>

	<section class="band alt">
		<p class="eyebrow">آزمون گوته</p>
		<h2>آمادگی Goethe-Zertifikat A1</h2>
		<p class="lead">
			برنامه بر اساس چهار بخش آزمون پیش می‌رود — شنیدن، خواندن، نوشتن و
			صحبت — و آمادگی‌ات را در هر بخش جداگانه نشان می‌دهد. تاریخ آزمونت را
			وارد کن تا شمارش معکوس داشته باشی.
		</p>
		<div class="skills">
			<span>شنیدن</span><span>خواندن</span><span>نوشتن</span><span>صحبت</span>
		</div>
	</section>

	<section class="band">
		<p class="eyebrow">سؤال‌های رایج</p>
		<h2>چیزهایی که معمولاً می‌پرسند</h2>
		<div class="faq">
			{#each faqs as f (f.q)}
				<details>
					<summary>{f.q}</summary>
					<p>{f.a}</p>
				</details>
			{/each}
		</div>
	</section>

	<section class="band cta">
		<h2>اولین درس، همین حالا</h2>
		<p class="lead">سه جمله. بدون ثبت‌نام. ببین چطور است.</p>
		<div class="actions">
			<a class="btn primary" href="/try">🎙️ شروع کن</a>
		</div>
		<p class="switch"><a href="/">English version</a></p>
	</section>
</div>

<style>
	.fa-page {
		font-family: var(--font-body);
		color: var(--ink);
		background: var(--paper);
	}

	section {
		max-width: 900px;
		margin: 0 auto;
		padding: 56px 20px;
		text-align: center;
	}

	.hero {
		padding-block: 72px 40px;
	}

	.badge {
		display: inline-block;
		margin-bottom: 18px;
		padding: 6px 14px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--control);
		font-size: 0.85rem;
		font-weight: 600;
	}

	h1 {
		margin: 0 0 14px;
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 5vw, 3rem);
		line-height: 1.4;
	}

	.grad {
		color: var(--accent);
	}

	.sub {
		margin: 0 auto 26px;
		max-width: 560px;
		color: var(--ink-soft);
		font-size: 1.1rem;
		line-height: 1.8;
	}

	.actions {
		display: flex;
		gap: 12px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 12px 24px;
		border-radius: 999px;
		font-weight: 700;
		text-decoration: none;
	}

	.btn.primary {
		background: var(--accent);
		color: var(--on-accent);
	}

	.btn.primary:hover {
		filter: brightness(1.08);
	}

	.btn.ghost {
		border: 1px solid var(--control-border);
		background: var(--control);
		color: var(--ink);
	}

	.btn.ghost:hover {
		background: var(--control-hover);
	}

	.note {
		margin-top: 14px;
		color: var(--ink-faint);
		font-size: 0.85rem;
	}

	.note.alt {
		margin-top: 8px;
		font-size: 0.9rem;
	}

	.note.alt a {
		color: var(--accent);
		font-weight: 700;
	}

	.stats {
		display: flex;
		justify-content: center;
		gap: 40px;
		flex-wrap: wrap;
		padding-block: 32px;
		border-block: 1px solid var(--line);
	}

	.stats div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stats strong {
		font-family: var(--font-display);
		font-size: 1.7rem;
		color: var(--accent);
	}

	.stats span {
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.band.alt {
		background: var(--paper-sunken);
		max-width: none;
	}

	.band.alt > * {
		max-width: 900px;
		margin-inline: auto;
	}

	.eyebrow {
		margin: 0 0 6px;
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	h2 {
		margin: 0 0 18px;
		font-family: var(--font-display);
		font-size: clamp(1.4rem, 3vw, 2rem);
	}

	.lead {
		margin: 0 auto 20px;
		max-width: 620px;
		color: var(--ink-soft);
		line-height: 1.9;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
		margin-top: 26px;
		text-align: start;
	}

	.card {
		padding: 20px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--paper-raised);
	}

	.card h3 {
		margin: 0 0 8px;
		font-size: 1.02rem;
		color: var(--ink);
	}

	.card p {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.94rem;
		line-height: 1.9;
	}

	.skills {
		display: flex;
		justify-content: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.skills span {
		padding: 8px 18px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--paper-raised);
		font-weight: 600;
	}

	.faq {
		margin-top: 20px;
		text-align: start;
	}

	details {
		border-bottom: 1px solid var(--line);
	}

	summary {
		padding: 16px 4px;
		font-weight: 700;
		cursor: pointer;
		min-height: 44px;
	}

	details p {
		margin: 0;
		padding: 0 4px 16px;
		color: var(--ink-soft);
		line-height: 1.9;
	}

	.cta {
		background: var(--paper-sunken);
		max-width: none;
	}

	.switch {
		margin-top: 26px;
		font-size: 0.9rem;
	}

	.switch a {
		color: var(--ink-soft);
	}
</style>
