<script lang="ts">
	let { data, form } = $props();

	const maxPerDay = $derived(
		data.authorized
			? Math.max(1, ...data.usage.perDay.map((d: { count: number }) => d.count))
			: 1,
	);

	function shortDate(iso: string): string {
		const d = new Date(iso + "T00:00:00");
		return `${d.getMonth() + 1}/${d.getDate()}`;
	}
</script>

<svelte:head><title>Admin Dashboard - Mirifer</title></svelte:head>

{#if !data.authorized}
	<!-- ── Admin login ─────────────────────────────────── -->
	<div class="login-wrap">
		<form method="POST" action="?/login" class="login-card">
			<h1>🔐 Admin Login</h1>
			<p class="login-sub">Restricted area — administrators only.</p>

			{#if form?.error}
				<div class="login-error">{form.error}</div>
			{/if}

			<label for="admin-email">Email</label>
			<input
				id="admin-email"
				name="email"
				type="email"
				required
				autocomplete="username"
				value={form?.email ?? ""}
			/>

			<label for="admin-password">Password</label>
			<input
				id="admin-password"
				name="password"
				type="password"
				required
				autocomplete="current-password"
			/>

			<button type="submit">Sign In</button>
		</form>
	</div>
{:else}
	<div class="dash-header">
		<h1>Dashboard</h1>
		<form method="POST" action="?/logout">
			<button type="submit" class="logout-btn">Sign out</button>
		</form>
	</div>

	<!-- ── Usage statistics ────────────────────────────── -->
	<h2 class="section-title">📈 Usage</h2>
	{#if !data.serviceRole}
		<p class="notice">
			Cross-user analytics are limited: add
			<code>SUPABASE_SERVICE_ROLE_KEY</code> to the server environment to
			see all users' activity (currently only rows visible to this
			session are counted).
		</p>
	{/if}
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-num">{data.usage.totalUsers}</div>
			<div class="stat-label">Registered Users</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.usage.activeUsers7d}</div>
			<div class="stat-label">Active Users (7d)</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.usage.lessonsCompleted7d}</div>
			<div class="stat-label">Lessons Completed (7d)</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.usage.examsCompleted7d}</div>
			<div class="stat-label">Exams Completed (7d)</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.usage.conversations7d}</div>
			<div class="stat-label">Week Talks Started (7d)</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.usage.events14d}</div>
			<div class="stat-label">Events (14d)</div>
		</div>
	</div>

	<!-- ── Activity chart ──────────────────────────────── -->
	<h2 class="section-title">📊 Activity — last 14 days</h2>
	<div class="chart">
		{#each data.usage.perDay as d}
			<div class="chart-col" title="{d.date}: {d.count} events">
				<div
					class="chart-bar"
					style="height: {Math.round((d.count / maxPerDay) * 100)}%"
				></div>
				<span class="chart-label">{shortDate(d.date)}</span>
			</div>
		{/each}
	</div>

	<!-- ── Content statistics ──────────────────────────── -->
	<h2 class="section-title">📦 Content</h2>
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-num">{data.counts.lessons}</div>
			<div class="stat-label">Lessons</div>
			<a href="/admin/lessons" class="stat-link">Manage →</a>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.counts.sentences}</div>
			<div class="stat-label">Sentences</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.counts.categories}</div>
			<div class="stat-label">Basics Categories</div>
			<a href="/admin/basics" class="stat-link">Manage →</a>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.counts.words}</div>
			<div class="stat-label">Vocabulary Words</div>
		</div>
		<div class="stat-card">
			<div class="stat-num">{data.counts.glossary}</div>
			<div class="stat-label">Glossary Entries</div>
			<a href="/admin/glossary" class="stat-link">Manage →</a>
		</div>
	</div>

	<!-- ── Admin jobs ──────────────────────────────────── -->
	<h2 class="section-title">🛠️ Admin Jobs</h2>
	<div class="jobs-grid">
		<a href="/admin/lessons" class="job-card">
			<span class="job-icon">📚</span>
			<span class="job-title">Manage Lessons</span>
			<span class="job-desc">Edit the 100-day curriculum, sentences and translations</span>
		</a>
		<a href="/admin/basics" class="job-card">
			<span class="job-icon">🔤</span>
			<span class="job-title">Manage Basics</span>
			<span class="job-desc">Grammar reference categories and word cards</span>
		</a>
		<a href="/admin/glossary" class="job-card">
			<span class="job-icon">📖</span>
			<span class="job-title">Manage Glossary</span>
			<span class="job-desc">Word-by-word meanings shown on tap in lessons</span>
		</a>
	</div>
{/if}

<style>
	h1 {
		color: #2ecc71;
		margin-bottom: 32px;
	}

	.dash-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.logout-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: #aaa;
		border-radius: 20px;
		padding: 8px 18px;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.logout-btn:hover {
		border-color: #e94560;
		color: #e94560;
	}

	.section-title {
		color: #fff;
		font-size: 1.05rem;
		margin: 34px 0 16px;
	}

	.notice {
		background: rgba(255, 213, 79, 0.08);
		border: 1px solid rgba(255, 213, 79, 0.35);
		border-radius: 10px;
		padding: 12px 16px;
		color: #ffd54f;
		font-size: 0.85rem;
	}

	.notice code {
		background: rgba(255, 255, 255, 0.1);
		padding: 1px 6px;
		border-radius: 4px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 20px;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
	}

	.stat-num {
		font-size: 2.5rem;
		font-weight: 700;
		color: #2ecc71;
	}

	.stat-label {
		color: #aaa;
		margin-top: 6px;
		font-size: 0.95rem;
	}

	.stat-link {
		display: inline-block;
		margin-top: 12px;
		color: #3498db;
		font-size: 0.85rem;
		text-decoration: none;
	}

	.stat-link:hover {
		text-decoration: underline;
	}

	/* ── Chart ── */
	.chart {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		height: 160px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
	}

	.chart-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		height: 100%;
		gap: 6px;
	}

	.chart-bar {
		width: 100%;
		max-width: 34px;
		min-height: 2px;
		border-radius: 6px 6px 2px 2px;
		background: linear-gradient(180deg, #2ecc71, #27ae60);
	}

	.chart-label {
		font-size: 0.65rem;
		color: #777;
		white-space: nowrap;
	}

	/* ── Admin jobs ── */
	.jobs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 20px;
	}

	.job-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 22px;
		text-decoration: none;
		transition: all 0.2s;
	}

	.job-card:hover {
		border-color: rgba(46, 204, 113, 0.5);
		transform: translateY(-2px);
	}

	.job-icon {
		font-size: 1.6rem;
	}

	.job-title {
		color: #fff;
		font-weight: 700;
	}

	.job-desc {
		color: #999;
		font-size: 0.85rem;
	}

	/* ── Login ── */
	.login-wrap {
		display: flex;
		justify-content: center;
		padding-top: 8vh;
	}

	.login-card {
		width: 100%;
		max-width: 380px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 20px;
		padding: 32px;
		display: flex;
		flex-direction: column;
	}

	.login-card h1 {
		margin: 0 0 6px;
		font-size: 1.4rem;
	}

	.login-sub {
		color: #999;
		font-size: 0.9rem;
		margin: 0 0 20px;
	}

	.login-error {
		background: rgba(233, 69, 96, 0.15);
		border: 1px solid rgba(233, 69, 96, 0.5);
		color: #ff8a9b;
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 0.85rem;
		margin-bottom: 16px;
	}

	.login-card label {
		font-size: 0.8rem;
		color: #aaa;
		margin: 10px 0 6px;
	}

	.login-card input {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 10px;
		padding: 12px 14px;
		color: #fff;
		font-size: 0.95rem;
	}

	.login-card input:focus {
		outline: none;
		border-color: #2ecc71;
	}

	.login-card button {
		margin-top: 22px;
		background: linear-gradient(135deg, #2ecc71, #27ae60);
		color: #fff;
		border: none;
		border-radius: 50px;
		padding: 13px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.login-card button:hover {
		filter: brightness(1.08);
	}
</style>
