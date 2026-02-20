<script lang="ts">
	let { data } = $props();
	const { counts } = data;
</script>

<svelte:head><title>Admin Dashboard - Misiro</title></svelte:head>

<h1>Dashboard</h1>

<div class="stats-grid">
	<div class="stat-card">
		<div class="stat-num">{counts.lessons}</div>
		<div class="stat-label">Lessons</div>
		<a href="/admin/lessons" class="stat-link">Manage →</a>
	</div>
	<div class="stat-card">
		<div class="stat-num">{counts.sentences}</div>
		<div class="stat-label">Sentences</div>
	</div>
	<div class="stat-card">
		<div class="stat-num">{counts.categories}</div>
		<div class="stat-label">Basics Categories</div>
		<a href="/admin/basics" class="stat-link">Manage →</a>
	</div>
	<div class="stat-card">
		<div class="stat-num">{counts.words}</div>
		<div class="stat-label">Vocabulary Words</div>
	</div>
	<div class="stat-card">
		<div class="stat-num">{counts.glossary}</div>
		<div class="stat-label">Glossary Entries</div>
		<a href="/admin/glossary" class="stat-link">Manage →</a>
	</div>
</div>

<style>
	h1 { color: #2ecc71; margin-bottom: 32px; }

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 20px;
	}

	.stat-card {
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
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

	.stat-link:hover { text-decoration: underline; }
</style>
