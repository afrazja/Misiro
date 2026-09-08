<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { COURSES, isAvailableCourse } from '$lib/courses';
	import { applyDocumentLanguage, getLanguage } from '$services/data-layer';
	let { data, form }: PageProps = $props();
	let language = $state<'en' | 'fa'>('en');
	let saving = $state(false);
	const isFa = $derived(language === 'fa');
	const canReturn = $derived(isAvailableCourse(data.currentLanguage));
	onMount(() => {
		language = navigator.language.startsWith('fa') ? 'fa' : 'en';
		void getLanguage().then(saved => {
			if (saved === 'en' || saved === 'fa') language = saved;
			applyDocumentLanguage(language);
		}).catch(() => applyDocumentLanguage(language));
	});
</script>

<svelte:head>
	<title>{isFa ? 'انتخاب زبان' : 'Choose a language'} | Mirifer</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main id="main-content" class="language-page" dir={isFa ? 'rtl' : 'ltr'}>
	<AppHeader backHref={canReturn ? '/home' : undefined} backLabel={isFa ? 'خانه' : 'Home'} direction={isFa ? 'rtl' : 'ltr'} />
	<section class="introduction" aria-labelledby="language-title">
		<p class="eyebrow">{isFa ? 'مسیر یادگیری تو' : 'YOUR LEARNING JOURNEY'}</p>
		<h1 id="language-title">{isFa ? 'دوست داری چه زبانی یاد بگیری؟' : 'What would you like to learn?'}</h1>
		<p>{isFa ? 'یک زبان انتخاب کن. هر وقت خواستی، از صفحهٔ خانه به اینجا برگرد.' : 'Choose a language to get started. You can return here from your home screen anytime.'}</p>
	</section>

	{#if data.currentLanguage && !canReturn}
		<p class="notice" role="status">{isFa ? 'قبلاً فرانسوی را انتخاب کرده‌ای، اما درس‌های آن هنوز آماده نیستند. فعلاً می‌توانی آلمانی را شروع کنی.' : 'You previously chose French, but its lessons are not ready yet. You can start learning German in the meantime.'}</p>
	{/if}
	{#if form?.error}
		<p class="error" role="alert">{form.error === 'unavailable'
			? (isFa ? 'این زبان هنوز آماده نیست. لطفاً یک زبان آماده را انتخاب کن.' : 'This course is not available yet. Please choose an available language.')
			: (isFa ? 'انتخابت ذخیره نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.' : 'Your choice could not be saved. Check your connection and try again.')}</p>
	{/if}

	<form method="POST" aria-busy={saving} use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'error') form = { error: 'save_failed' };
				else await update();
			} finally { saving = false; }
		};
	}}>
		<div class="courses">
			{#each COURSES as course}
				<article class="course" class:upcoming={!course.available} aria-labelledby={`course-${course.code}`}>
					<div class="card-top">
						<span class={`flag flag-${course.code}`} aria-hidden="true"></span>
						<span class="status" class:available={course.available}>{course.available ? (isFa ? 'آمادهٔ شروع' : 'Available now') : (isFa ? 'به‌زودی' : 'Coming soon')}</span>
					</div>
					<h2 id={`course-${course.code}`}>{course.name[language]}</h2>
					<p class="native-name" lang={course.code} dir="ltr">{course.nativeName}</p>
					<p class="description">{course.description[language]}</p>
					{#if course.available}
						<button type="submit" name="language" value={course.code} disabled={saving}>
							{saving ? (isFa ? 'در حال ادامه…' : 'Continuing…') : `${data.currentLanguage === course.code ? (isFa ? 'ادامهٔ' : 'Continue') : (isFa ? 'یادگیری' : 'Learn')} ${course.name[language]}`}
							<span aria-hidden="true">{isFa ? '←' : '→'}</span>
						</button>
					{:else}
						<p class="not-ready">{isFa ? 'درس‌ها هنوز در دسترس نیستند' : 'Lessons are not available yet'}</p>
					{/if}
				</article>
			{/each}
		</div>
	</form>
	<p class="display-note">{isFa ? 'این انتخاب، زبان درس‌هاست. زبان نمایش برنامه را جداگانه در تنظیمات انتخاب می‌کنی.' : 'This is the language you will learn. Your English or Persian display language is a separate setting.'}</p>
</main>

<style>
	.language-page { max-width: 920px; margin: 0 auto; padding: 24px 24px 64px; color: var(--ink); }
	.introduction { max-width: 650px; margin: 64px auto 32px; text-align: center; }
	.eyebrow { color: var(--accent-deep); font-size: .8rem; font-weight: 600; letter-spacing: .12em; margin-bottom: 16px; }
	h1 { font-family: var(--font-display); font-weight: 500; font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.15; margin-bottom: 18px; }
	.introduction > p:last-child, .display-note { color: var(--ink-soft); line-height: 1.6; }
	.courses { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
	.course { display: flex; flex-direction: column; padding: 30px; background: var(--paper-raised); border: 1px solid var(--control-border); border-radius: 20px; box-shadow: var(--paper-shadow); }
	.upcoming { background: var(--paper-sunken); box-shadow: none; }
	.card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 28px; }
	.flag { width: 54px; height: 36px; border-radius: 6px; box-shadow: 0 0 0 1px rgb(0 0 0 / 12%); flex-shrink: 0; }
	.flag-de { background: linear-gradient(#191919 33.33%, #b62d2b 33.33% 66.66%, #f1c54b 66.66%); }
	.flag-fr { background: linear-gradient(to right, #21468b 33.33%, #fff 33.33% 66.66%, #c73e47 66.66%); }
	.status { font-size: .8rem; padding: 5px 10px; border-radius: 20px; background: var(--control); color: var(--ink-soft); }
	.status.available { background: var(--accent-wash); color: var(--accent-deep); }
	h2 { font: 500 2rem var(--font-display); margin-bottom: 4px; }
	.native-name { color: var(--ink-faint); text-align: start; margin-bottom: 18px; }
	[dir='rtl'] .native-name { text-align: right; }
	.description { color: var(--ink-soft); line-height: 1.65; margin-bottom: 28px; flex: 1; }
	button { width: 100%; min-height: 48px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 18px; border: 1px solid var(--accent); border-radius: 10px; background: var(--accent); color: var(--on-accent); font: 600 1rem var(--font-body); cursor: pointer; }
	button:hover { background: var(--accent-deep); }
	button:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
	button:disabled { cursor: wait; opacity: .7; }
	.not-ready { padding: 13px 0; color: var(--ink-faint); font-size: .9rem; }
	.display-note { max-width: 580px; margin: 28px auto 0; font-size: .9rem; text-align: center; }
	.notice, .error { padding: 16px; border-radius: 12px; margin-bottom: 24px; line-height: 1.6; }
	.notice { background: var(--attention-wash); color: var(--attention); }
	.error { border: 1px solid var(--miss); color: var(--miss); }
	@media (max-width: 640px) { .language-page { padding: 16px 16px 40px; } .introduction { margin-top: 36px; } .courses { grid-template-columns: 1fr; gap: 16px; } .course { padding: 24px; } .card-top { margin-bottom: 20px; } }
</style>
