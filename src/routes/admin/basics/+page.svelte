<script lang="ts">
	let { data } = $props();

	const TYPE_LABELS: Record<string, string> = {
		grid: 'Word Grid',
		table: 'Table',
		multi: 'Multi-section'
	};
</script>

<svelte:head><title>Basics - Misiro Admin</title></svelte:head>

<h1>Basics Categories</h1>
<p class="subtitle">Click a category to edit its words and content.</p>

<div class="categories-grid">
	{#each data.categories as cat (cat.id)}
		<a href="/admin/basics/{cat.key}" class="cat-card">
			<div class="cat-icon">{cat.icon}</div>
			<div class="cat-info">
				<div class="cat-title">{cat.title_en}</div>
				<div class="cat-title-fa" dir="rtl">{cat.title_fa}</div>
				<div class="cat-meta">
					<span class="badge">{TYPE_LABELS[cat.type] ?? cat.type}</span>
					<span class="cat-key">{cat.key}</span>
				</div>
			</div>
			<div class="cat-arrow">→</div>
		</a>
	{/each}
</div>

<style>
	h1 { color: #2ecc71; margin-bottom: 6px; }
	.subtitle { color: #888; margin-bottom: 28px; font-size: 0.9rem; }

	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 16px;
	}

	.cat-card {
		display: flex;
		align-items: center;
		gap: 16px;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 14px;
		padding: 18px;
		text-decoration: none;
		color: #fff;
		transition: all 0.2s;
	}
	.cat-card:hover {
		border-color: #2ecc71;
		background: rgba(46,204,113,0.08);
		transform: translateY(-2px);
	}

	.cat-icon { font-size: 2rem; min-width: 40px; text-align: center; }

	.cat-info { flex: 1; }
	.cat-title { font-weight: 600; font-size: 1rem; margin-bottom: 2px; }
	.cat-title-fa { font-size: 0.85rem; color: #aaa; margin-bottom: 6px; }
	.cat-meta { display: flex; align-items: center; gap: 8px; }

	.badge {
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.72rem;
		background: rgba(46,204,113,0.15);
		color: #2ecc71;
		font-weight: 600;
	}
	.cat-key { color: #666; font-size: 0.75rem; font-family: monospace; }

	.cat-arrow { color: #555; font-size: 1.2rem; transition: transform 0.2s; }
	.cat-card:hover .cat-arrow { transform: translateX(4px); color: #2ecc71; }
</style>
