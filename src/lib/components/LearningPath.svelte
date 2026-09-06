<script lang="ts">
 import type { LessonMeta } from '$services/lesson-loader';
 import { isUnlocked } from '$services/lesson-access';
 let { lessons, completed = {}, currentDay = 1, language = 'en', loading = false }: {
  lessons: LessonMeta[]; completed?: Record<number, unknown>; currentDay?: number;
  language?: 'en' | 'fa'; loading?: boolean;
 } = $props();
 const sorted = $derived([...lessons].sort((a,b) => a.day-b.day));
 const finished = $derived(sorted.filter(day => completed[day.day]).length);
 function title(meta: LessonMeta) {
  return (language === 'fa' && meta.titleFa ? meta.titleFa : meta.title).replace(/^(?:(?:Day|روز)\s*)?[0-9۰-۹٠-٩]+\s*[:.\-–]\s*/i, '');
 }
</script>
<section class="learning-path" id="learning-path" aria-labelledby="path-heading">
 <header>
  <div><span class="eyebrow">{language === 'fa' ? 'روز به روز' : 'DAY BY DAY'}</span>
   <h2 id="path-heading">{language === 'fa' ? 'مسیر یادگیری تو' : 'Your learning path'}</h2>
   <p>{language === 'fa' ? 'درس‌های باز را انتخاب کن یا درس‌های تمام‌شده را دوباره تمرین کن.' : 'Choose an available lesson or revisit one you’ve completed.'}</p>
  </div>
  {#if lessons.length}<span class="progress">{language === 'fa' ? `${finished} از ${lessons.length} کامل شده` : `${finished} of ${lessons.length} completed`}</span>{/if}
 </header>
 {#if loading}<p role="status">{language === 'fa' ? 'در حال بارگذاری درس‌ها…' : 'Loading lessons…'}</p>
 {:else if !lessons.length}<p role="status">{language === 'fa' ? 'درس‌ها بارگذاری نشدند. صفحه را تازه کن.' : 'Lessons couldn’t be loaded. Please refresh to try again.'}</p>
 {:else}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll through locked days too.) -->
  <div class="lesson-list" tabindex="0" role="region" aria-label={language === 'fa' ? 'همه روزهای درس' : 'All lesson days'}>
   <ol>
    {#each sorted as meta (meta.day)}
     {@const available = isUnlocked(meta.day, completed)}
     {@const done = !!completed[meta.day]}
     {#snippet row()}
      <span class="day-number" aria-hidden="true">{done ? '✓' : available ? meta.day : '🔒'}</span>
      <span class="lesson-copy"><span class="day-label">{language === 'fa' ? 'روز' : 'Day'} {meta.day}</span><strong>{title(meta)}</strong>
       {#if !available}<span class="unlock-hint">{language === 'fa' ? `برای باز شدن، روز ${meta.day - 1} را تمام کن` : `Complete Day ${meta.day - 1} to unlock`}</span>{/if}
      </span>
      <span class="state">{done ? (language === 'fa' ? 'کامل شده' : 'Completed') : available ? (language === 'fa' ? 'آماده شروع' : 'Available') : (language === 'fa' ? 'قفل' : 'Locked')}{#if available}<span aria-hidden="true">{language === 'fa' ? ' ←' : ' →'}</span>{/if}</span>
     {/snippet}
     <li class:done class:next={available && !done && meta.day === currentDay}>
      {#if available}<a href={`/lesson?day=${meta.day}`} aria-current={meta.day === currentDay && !done ? 'step' : undefined}>{@render row()}</a>
      {:else}<div class="locked" aria-disabled="true">{@render row()}</div>{/if}
     </li>
    {/each}
   </ol>
  </div>
 {/if}
</section>
<style>
 .learning-path { padding:28px; border:1px solid var(--line); border-radius:18px; background:var(--paper-raised); scroll-margin-top:24px; }
 header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:22px; }
 .eyebrow { color:var(--accent); font-size:.72rem; font-weight:700; letter-spacing:.12em; }
 h2 { margin:6px 0 8px; color:var(--ink); font-family:var(--font-display); font-size:1.6rem; }
 p { margin:0; color:var(--ink-soft); line-height:1.6; }
 .progress { flex-shrink:0; padding:7px 11px; border-radius:var(--radius-pill); background:var(--accent-wash); color:var(--accent); font-size:.8rem; }
 .lesson-list { max-height:520px; overflow-y:auto; scrollbar-gutter:stable; border-top:1px solid var(--line); }
 ol { list-style:none; padding:0; margin:0; }
 li { border-bottom:1px solid var(--line); }
 li:last-child { border-bottom:0; }
 a,.locked { display:flex; align-items:center; gap:16px; padding:16px 10px; min-height:84px; color:var(--ink); text-decoration:none; border-radius:8px; }
 a:hover { background:var(--control-hover); }
 a:focus-visible { outline:2px solid var(--accent); outline-offset:-2px; }
 .next a { background:var(--accent-wash); }
 .day-number { display:grid; place-items:center; flex-shrink:0; width:38px; height:38px; border:1px solid var(--line); border-radius:50%; font-size:.9rem; color:var(--ink-soft); }
 .done .day-number { background:var(--accent); color:var(--on-brand); border-color:var(--accent); }
 .lesson-copy { display:flex; flex:1; min-width:0; flex-direction:column; gap:4px; }
 .day-label { color:var(--ink-soft); font-size:.75rem; }
 strong { font-size:.98rem; font-weight:600; overflow-wrap:anywhere; }
 .unlock-hint { font-size:.75rem; color:var(--ink-soft); }
 .state { font-size:.75rem; color:var(--accent); white-space:nowrap; }
 .locked .state { color:var(--ink-soft); }
 @media(max-width:600px) { .learning-path { padding:20px 16px; } header { flex-direction:column; gap:12px; } a,.locked { flex-wrap:wrap; gap:10px; padding:14px 4px; } .state { width:100%; padding-inline-start:48px; } h2 { font-size:1.4rem; } }
</style>
