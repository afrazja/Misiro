<script lang="ts">
	import type { ReturnReport } from '$lib/analytics/return-report';
	import { RETURN_WINDOWS } from '$lib/analytics/return-report';
	import { duration, rate } from '$lib/analytics/statistics';
	let { report, inspect }: { report: ReturnReport; inspect: (id: string) => void } = $props();
	let week = $state('all'), page = $state(0);
	const people = $derived(report.people.filter(p => week === 'all' || p.cohort === week));
	const pages = $derived(Math.max(1, Math.ceil(people.length / 12)));
	const currentPage = $derived(Math.min(page, pages - 1));
	const date = (ms: number | null) => ms === null ? 'Not available' : new Date(ms).toISOString().slice(0, 10);
</script>

<div class="analysis-view">
	<div class="analysis-heading"><div><span class="analysis-eyebrow">RETURN VISITS</span><h2>See whether practice becomes a habit.</h2><p>Compare weekly groups fairly, with an observation window for every learner.</p></div></div>
	<div class="analysis-metrics">
		<article><span>New tracked learners</span><strong>{report.learners}</strong><small>First learning visit in the selected period</small></article>
		<article><span>Returned within seven days</span><strong>{report.returned} <em>/ {report.eligible}</em></strong><small>{rate(report.returned, report.eligible)} · fully observed learners</small></article>
		<article><span>Not yet eligible</span><strong>{report.pending}</strong><small>Seven-day window is still open</small></article>
		<article><span>Median time to second visit</span><strong>{duration(report.secondSeconds)}</strong><small>{report.secondSamples} learners with an observed second learning visit</small></article>
	</div>
	<p class="analysis-note">Cohorts include accounts created after versioned tracking began. The date filter selects their first learning visit, so these counts can differ from the Overview’s signup-period summary. {report.withoutSecond} cohort learners have no second learning visit observed yet; they are excluded from the time-to-second-visit median.</p>
	<div class="analysis-heading"><div><h3>Weekly return cohorts</h3><p>Weeks start on Monday, UTC. Each cell shows returned / eligible; newer learners remain pending.</p></div></div>
	<div class="analysis-table"><table><caption class="sr-only">Return rates by week of first learning visit</caption><thead><tr><th>First learning week</th><th>Learners</th>{#each RETURN_WINDOWS as window}<th>{window.label}</th>{/each}</tr></thead><tbody>
		{#each report.cohorts as cohort}<tr><td><button onclick={() => { week = cohort.week; page = 0; }}>{cohort.week}</button></td><td>{cohort.learners}</td>{#each cohort.windows as window}<td class:retention-hit={window.returned > 0}><b>{window.eligible ? `${window.returned} / ${window.eligible}` : 'Not yet eligible'}</b><small>{window.eligible ? rate(window.returned, window.eligible) : 'Observation window open'}</small>{#if window.pending}<small>{window.pending} pending</small>{/if}</td>{/each}</tr>
		{:else}<tr><td colspan="6" class="analysis-empty">No eligible cohort has started learning in this period. Existing accounts and new browsing-only visits are not invented into a learning cohort.</td></tr>{/each}
	</tbody></table></div>
	<p class="analysis-note">Return requires activity in a different learning visit: 24 hours through day 7, then more than 7 through 14 days, more than 14 through 21, and more than 21 through 28. A learner enters a cell’s denominator only after its entire window has elapsed.</p>
	<div class="analysis-two-col">
		<section class="analysis-panel"><span class="analysis-eyebrow">ALL LEARNERS ACTIVE IN THE PERIOD</span><h3>Learning visits per learner</h3><p>{report.activeLearners} active learners · median {report.medianVisits ?? 'not available'} visits · median {report.medianDays ?? 'not available'} active days</p>
			{#each report.distribution as bucket}<div class="analysis-distribution"><span>{bucket.label}</span><div><span style:width={`${report.activeLearners ? 100 * bucket.learners / report.activeLearners : 0}%`}></span></div><b>{bucket.learners}</b></div>{/each}
		</section>
		<section class="analysis-panel"><span class="analysis-eyebrow">WHAT THEY RETURN TO</span><h3>Continuity of practice</h3><dl><div><dt>Learning visits resuming an unfinished lesson</dt><dd>{report.resumedVisits}</dd></div><div><dt>Learning visits that started a spaced review</dt><dd>{report.measuredVisits ? report.reviewVisits : 'Not available'}</dd></div><div><dt>Active learners outside the selected new cohort</dt><dd>{report.outsideCohort}</dd></div></dl><p class="analysis-note">These counts include established learners active in the period. Resuming requires the same attempt observed in an earlier visit. Review starts are measured only in the new release ({report.measuredVisits} learning visits with this tracking); starting a review is not proof it was completed.</p></section>
	</div>
	<div class="analysis-controls"><label>Inspect learners<select bind:value={week} onchange={() => page = 0}><option value="all">All active learners and selected cohorts</option>{#each report.cohorts as c}<option value={c.week}>First learning week: {c.week}</option>{/each}</select></label><span>{people.length} learners</span></div>
	<div class="analysis-table"><table><caption class="sr-only">Individual return patterns</caption><thead><tr><th>Learner</th><th>First observed learning</th><th>Time to second visit</th><th>Learning visits / active days</th><th>Resumed visits</th><th>Seven-day return</th></tr></thead><tbody>
		{#each people.slice(currentPage * 12, currentPage * 12 + 12) as person}<tr><td><button onclick={() => inspect(person.id)}>{person.label} →</button></td><td>{date(person.first)}<small>{person.cohort ? `Cohort ${person.cohort}` : 'Outside selected new cohort'}</small></td><td>{duration(person.secondSeconds)}<small>{person.secondSeconds === null ? 'No second learning visit observed' : 'Observed visits only'}</small></td><td>{person.learningVisits} / {person.activeDays}</td><td>{person.resumedVisits}</td><td>{!person.cohort ? 'Outside cohort' : !person.windows[0].eligible ? 'Not yet eligible' : person.windows[0].returned ? 'Returned' : 'No return observed'}</td></tr>
		{:else}<tr><td colspan="6" class="analysis-empty">No learning activity matches this view.</td></tr>{/each}
	</tbody></table></div>
	<div class="analysis-pagination"><button disabled={currentPage === 0} onclick={() => page = currentPage - 1}>Previous</button><span>Page {currentPage + 1} of {pages}</span><button disabled={currentPage + 1 >= pages} onclick={() => page = currentPage + 1}>Next</button></div>
	<details class="analysis-rules"><summary>Return definitions and limits</summary><ul><li>A learning visit contains an answer submission, a free-turn attempt, or an exam completion. Page views, sign-ins, hints and automatic audio alone do not qualify.</li><li>Visits renew after 30 minutes without tracked activity. Separate browser/device visits remain separate; they are not a count of password logins.</li><li>Time to second visit includes any second learning visit, including one before 24 hours. The seven-day return rate has a 24-hour minimum.</li><li>The same learner can return in several weekly windows. These are return-window rates, not cumulative retention.</li><li>Missing events, older untracked activity, and offline delivery can affect these results. “No return observed” does not establish why someone stopped or prove they stopped learning German.</li></ul></details>
</div>
