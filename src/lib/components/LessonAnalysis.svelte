<script lang="ts">
	import type { LessonReport } from '$lib/analytics/lesson-report';
	import { duration, rate } from '$lib/analytics/statistics';
	let { report, inspect }: { report: LessonReport; inspect: (id: string) => void } = $props();
	let search = $state(''), sort = $state('activity'), selectedKey = $state(''), selectedIndex = $state(0), page = $state(0);
	let detail = $state<HTMLElement>();
	const filtered = $derived(report.lessons.filter(l => `${l.day} ${l.title} ${l.version}`.toLowerCase().includes(search.toLowerCase()))
		.toSorted((a, b) => sort === 'activity' ? b.attempts - a.attempts || a.day - b.day : sort === 'difficulty' ? b.retries - a.retries || a.day - b.day : a.day - b.day));
	const selected = $derived(filtered.find(l => l.key === selectedKey) ?? filtered[0]);
	const sentence = $derived(selected?.sentences.find(s => s.index === selectedIndex) ?? selected?.sentences[0]);
	const pages = $derived(Math.max(1, Math.ceil(filtered.length / 12)));
	const currentPage = $derived(Math.min(page, pages - 1));
	const versionLabel = (l: LessonReport['lessons'][number]) => l.version === 'unknown' ? 'Version not recorded' : l.version === 'mixed' ? 'Mixed versions' : l.contentMatches ? 'Current dialogue' : 'Earlier / unmatched dialogue';
	function choose(key: string) { selectedKey = key; selectedIndex = 0; detail?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
</script>

<div class="analysis-view">
	<div class="analysis-heading"><div><span class="analysis-eyebrow">LESSON ANALYSIS</span><h2>Find the sentence worth fixing.</h2><p>Compare lesson attempts, then inspect the steps learners actually reached.</p></div></div>
	<div class="analysis-metrics">
		<article><span>Learners who started</span><strong>{report.learners}</strong><small>Distinct learners in the attempt cohort</small></article>
		<article><span>Attempts started</span><strong>{report.started}</strong><small>First observed Start in the selected period</small></article>
		<article><span>Attempts completed</span><strong>{report.completed} <em>/ {report.started}</em></strong><small>{rate(report.completed, report.started)} · through the report snapshot</small></article>
		<article><span>Resumed on another visit</span><strong>{report.resumed}</strong><small>Same unfinished attempt, a different visit</small></article>
	</div>
	<p class="analysis-note">Completion includes skipping and is a practice measure. Recent attempts may still be in progress. Follow-up activity is included through the snapshot, even when an attempt spans several visits.</p>
	{#if report.catalogError}<p class="analysis-notice">{report.catalogError}</p>{/if}
	{#if report.missingStart || report.inconsistentAttempts}<p class="analysis-notice">{report.missingStart} attempts with activity in this period have no recorded Start; {report.inconsistentAttempts} have inconsistent lesson IDs. They are excluded from these attempt cohorts.</p>{/if}
	<div class="analysis-controls">
		<label>Find a lesson<input aria-label="Find a lesson" placeholder="Day, title or content version" bind:value={search} oninput={() => page = 0} /></label>
		<label>Sort by<select bind:value={sort} onchange={() => page = 0}><option value="activity">Most attempts</option><option value="difficulty">Most retries</option><option value="day">Lesson order</option></select></label>
		<span class="analysis-muted">{filtered.length} lesson versions</span>
	</div>
	<div class="analysis-table"><table><caption class="sr-only">Lesson comparison by content version</caption><thead><tr><th>Lesson / content</th><th>Learners</th><th>Finished / started</th><th>Resumed</th><th>Median active time</th><th>Retries / skips</th><th>Technical obstacles</th></tr></thead><tbody>
		{#each filtered.slice(currentPage * 12, currentPage * 12 + 12) as l}
			<tr class:chosen={selected?.key === l.key}><td><button onclick={() => choose(l.key)}>Day {l.day} · {l.title}</button><small>{versionLabel(l)}</small></td><td>{l.learners}</td><td><b>{l.completed} / {l.attempts}</b><small>{rate(l.completed, l.attempts)}</small></td><td>{l.resumed}</td><td>{duration(l.activeSeconds)}<small>{l.activeSamples} completed attempts with time samples</small></td><td>{l.retries} / {l.skips}</td><td>{l.obstacleLearners} learners</td></tr>
		{:else}<tr><td colspan="7" class="analysis-empty">No lessons match this filter.</td></tr>{/each}
	</tbody></table></div>
	<div class="analysis-pagination"><button disabled={currentPage === 0} onclick={() => page = currentPage - 1}>Previous</button><span>Page {currentPage + 1} of {pages}</span><button disabled={currentPage + 1 >= pages} onclick={() => page = currentPage + 1}>Next</button></div>
	{#if selected}
		<section class="analysis-detail" bind:this={detail} aria-label="Selected lesson analysis">
			<div class="analysis-heading"><div><span class="analysis-eyebrow">DAY {selected.day} / SENTENCE DETAIL</span><h2>{selected.title}</h2><p>{versionLabel(selected)} · <code>{selected.version}</code></p></div><span class="analysis-badge">{selected.completed} / {selected.attempts} attempts finished</span></div>
			{#if !selected.contentMatches}<p class="analysis-notice">This activity does not match the current dialogue. Original sentence text is unavailable; positions and measured events remain visible. Results from different versions are kept separate.</p>{/if}
			<p class="analysis-note">Reach means the sentence or its practice panel was displayed. Each learner is counted once per sentence. First-answer accuracy uses answered attempts, and reflects the app’s existing answer check with the text potentially visible. Retries and skips use learners who reached that sentence.</p>
			<div class="analysis-table"><table><caption class="sr-only">Sentence difficulty in the selected lesson</caption><thead><tr><th>Sentence</th><th>Reached</th><th>First answer correct</th><th>Retried</th><th>Skipped</th><th>Technical obstacle</th><th>Last observed here</th></tr></thead><tbody>
				{#each selected.sentences as s}<tr class:chosen={sentence?.index === s.index}><td><button onclick={() => selectedIndex = s.index}>Sentence {s.index + 1}</button><span class="analysis-german" lang="de">{s.text ?? 'Original text unavailable'}</span><small>{s.role === 'received' ? 'Listening / shadowing' : s.role === 'sent' ? 'Spoken response' : 'Role unavailable'}</small></td><td>{s.reached} learners<small>{s.reachedAttempts} attempts</small></td><td>{s.firstCorrect} / {s.answeredAttempts}<small>{rate(s.firstCorrect, s.answeredAttempts)} · answered attempts</small></td><td>{s.repeated} / {s.reached}<small>{s.retries} extra answers</small></td><td>{s.skips.learners} / {s.reached}<small>{s.skips.count} skips</small></td><td>{s.obstacles.learners} / {s.reached}<small>{s.obstacles.count} occurrences</small></td><td>{s.lastObserved} unfinished attempts<small>No events for at least 30 minutes</small></td></tr>
				{:else}<tr><td colspan="7" class="analysis-empty">No sentence content or recorded positions are available.</td></tr>{/each}
			</tbody></table></div>
			{#if sentence}
				<div class="analysis-panel">
					<span class="analysis-eyebrow">SENTENCE {sentence.index + 1} / SUPPORT USED</span>
					<h3 lang="de">{sentence.text ?? 'Original sentence text unavailable'}</h3>{#if sentence.translation}<p>{sentence.translation}</p>{/if}
					<div class="analysis-metrics">
						<article><span>Opened a hint</span><strong>{sentence.measured ? `${sentence.hints.learners} / ${sentence.measured}` : 'Not available'}</strong><small>{sentence.hints.count} recorded opens</small></article>
						<article><span>Revealed an answer</span><strong>{sentence.measured ? `${sentence.reveals.learners} / ${sentence.measured}` : 'Not available'}</strong><small>{sentence.reveals.count} practice reveals or exits from blind mode</small></article>
						<article><span>Requested an audio replay</span><strong>{sentence.measured ? `${sentence.replays.learners} / ${sentence.measured}` : 'Not available'}</strong><small>{sentence.replays.count} presses of the main Replay button</small></article>
						<article><span>Median observed active time</span><strong>{duration(sentence.activeSeconds)}</strong><small>{sentence.activeSamples} reached attempts with samples, including unfinished attempts</small></article>
					</div>
					<p class="analysis-note">Support rates cover {sentence.measured} learners with the new measurements, out of {sentence.reached} who reached this sentence. Older events cannot establish zero hints or replays. Automatic narration, error-response playback, and word audio are excluded.</p>
					<div class="analysis-examples"><b>Inspect the evidence</b>{#each (sentence.exampleIds.length ? sentence.exampleIds : sentence.userIds).slice(0, 5) as id}<button onclick={() => inspect(id)}>Learner {id.slice(-8)} →</button>{:else}<span>No learner journey recorded for this sentence.</span>{/each}</div>
				</div>
			{/if}
		</section>
	{/if}
	<details class="analysis-rules"><summary>How to read these measurements</summary><ul><li>“Last observed here” is an investigation lead, not a confirmed exit or the reason someone left.</li><li>Active time sums sampled foreground dialogue intervals, stops after 60 seconds without interaction, and excludes hidden tabs, review/exam modes and the practice panel. Browser suspension or blocked delivery can lose time. It is not total elapsed lesson time.</li><li>Only completed attempts with new time samples enter the median; the sample count is shown. No duration is reconstructed from old start and finish timestamps.</li><li>Content identifiers cover sentence order, German, translations, hints and difficulty. Current sentence text is shown only when its identifier matches the events. Older versions are not silently combined.</li></ul></details>
</div>
