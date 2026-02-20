<script lang="ts">
	let { data } = $props();

	type Word = {
		id?: string;
		german: string;
		en: string;
		fa: string;
		example: string;
		example_en: string;
		example_fa: string;
	};

	type Section = {
		id?: string;
		heading_en: string;
		heading_fa: string;
		type: string;
		sort_order?: number;
		infinitive?: any;
		tenses?: any;
		words: Word[];
	};

	// Category metadata
	let icon = $state(data.category.icon);
	let title_en = $state(data.category.title_en);
	let title_fa = $state(data.category.title_fa);
	let description_en = $state(data.category.description_en);
	let description_fa = $state(data.category.description_fa);

	// Flat words (grid/table categories)
	let words = $state<Word[]>(
		data.words.map((w: any) => ({
			id: w.id,
			german: w.german ?? '',
			en: w.en ?? '',
			fa: w.fa ?? '',
			example: w.example ?? '',
			example_en: w.example_en ?? '',
			example_fa: w.example_fa ?? ''
		}))
	);

	// Sections (multi categories)
	let sections = $state<Section[]>(
		data.sections.map((s: any) => ({
			id: s.id,
			heading_en: s.heading_en ?? '',
			heading_fa: s.heading_fa ?? '',
			type: s.type ?? 'grid',
			sort_order: s.sort_order ?? 0,
			infinitive: s.infinitive ?? null,
			tenses: s.tenses ?? null,
			words: (s.words ?? []).map((w: any) => ({
				id: w.id,
				german: w.german ?? '',
				en: w.en ?? '',
				fa: w.fa ?? '',
				example: w.example ?? '',
				example_en: w.example_en ?? '',
				example_fa: w.example_fa ?? ''
			}))
		}))
	);

	let saving = $state(false);
	let saveMsg = $state('');
	let saveError = $state('');

	function emptyWord(): Word {
		return { german: '', en: '', fa: '', example: '', example_en: '', example_fa: '' };
	}

	function addWord() {
		words = [...words, emptyWord()];
	}

	function removeWord(i: number) {
		words = words.filter((_, idx) => idx !== i);
	}

	function addSectionWord(si: number) {
		sections = sections.map((s, idx) =>
			idx === si ? { ...s, words: [...s.words, emptyWord()] } : s
		);
	}

	function removeSectionWord(si: number, wi: number) {
		sections = sections.map((s, idx) =>
			idx === si ? { ...s, words: s.words.filter((_, j) => j !== wi) } : s
		);
	}

	async function save() {
		saving = true;
		saveMsg = '';
		saveError = '';
		try {
			const res = await fetch(`/admin/basics/${data.category.key}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: { icon, title_en, title_fa, description_en, description_fa },
					words: data.category.type !== 'multi' ? words : undefined,
					sections: data.category.type === 'multi' ? sections : undefined
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? `HTTP ${res.status}`);
			}
			saveMsg = 'Saved!';
			setTimeout(() => (saveMsg = ''), 3000);
		} catch (e: any) {
			saveError = e.message ?? 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Edit {data.category.title_en} - Misiro Admin</title></svelte:head>

<div class="editor-header">
	<a href="/admin/basics" class="back-link">← All Categories</a>
	<h1>{data.category.icon} {data.category.title_en}</h1>
	<div class="header-actions">
		{#if saveMsg}<span class="save-ok">{saveMsg}</span>{/if}
		{#if saveError}<span class="save-err">{saveError}</span>{/if}
		<button class="btn-save" onclick={save} disabled={saving}>
			{saving ? 'Saving…' : 'Save All Changes'}
		</button>
	</div>
</div>

<!-- Category metadata -->
<div class="meta-card">
	<h2>Category Info</h2>
	<div class="form-grid">
		<label>
			Icon (emoji)
			<input type="text" bind:value={icon} style="width: 80px;" />
		</label>
		<label>
			Title (English)
			<input type="text" bind:value={title_en} />
		</label>
		<label>
			Title (Persian)
			<input type="text" bind:value={title_fa} dir="rtl" />
		</label>
		<label>
			Description (English)
			<input type="text" bind:value={description_en} />
		</label>
		<label>
			Description (Persian)
			<input type="text" bind:value={description_fa} dir="rtl" />
		</label>
	</div>
</div>

<!-- Flat word list (grid / table types) -->
{#if data.category.type !== 'multi'}
	<div class="section-header">
		<h2>Words <span class="count">({words.length})</span></h2>
		<button class="btn-add" onclick={addWord}>+ Add Word</button>
	</div>

	<div class="words-table-wrap">
		<table class="words-table">
			<thead>
				<tr>
					<th>German</th>
					<th>English</th>
					<th>Persian</th>
					<th>Example (DE)</th>
					<th>Example (EN)</th>
					<th>Example (FA)</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each words as w, i (i)}
					<tr>
						<td><input type="text" bind:value={w.german} placeholder="das Haus" /></td>
						<td><input type="text" bind:value={w.en} placeholder="house" /></td>
						<td><input type="text" bind:value={w.fa} dir="rtl" placeholder="خانه" /></td>
						<td><input type="text" bind:value={w.example} placeholder="Das Haus ist groß." /></td>
						<td><input type="text" bind:value={w.example_en} placeholder="The house is big." /></td>
						<td><input type="text" bind:value={w.example_fa} dir="rtl" placeholder="خانه بزرگ است." /></td>
						<td>
							<button class="btn-rm" onclick={() => removeWord(i)}>✕</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

<!-- Multi-section type -->
{:else}
	<h2>Sections</h2>
	{#each sections as sec, si (si)}
		<div class="section-card">
			<div class="section-meta">
				<div class="section-labels">
					<label>
						Heading (EN)
						<input type="text" bind:value={sec.heading_en} />
					</label>
					<label>
						Heading (FA)
						<input type="text" bind:value={sec.heading_fa} dir="rtl" />
					</label>
					<div class="section-type-badge">{sec.type}</div>
				</div>
			</div>

			{#if sec.type === 'conjugation'}
				<div class="json-note">
					<p>This section uses JSONB data. Edit raw JSON below.</p>
					<label>
						Infinitive JSON
						<textarea
							rows="3"
							bind:value={() => JSON.stringify(sec.infinitive ?? {}, null, 2), (v) => {
								try { sec.infinitive = JSON.parse(v); } catch {}
							}}
						></textarea>
					</label>
					<label>
						Tenses JSON
						<textarea
							rows="10"
							bind:value={() => JSON.stringify(sec.tenses ?? [], null, 2), (v) => {
								try { sec.tenses = JSON.parse(v); } catch {}
							}}
						></textarea>
					</label>
				</div>
			{:else}
				<div class="section-words-header">
					<span class="count">{sec.words.length} words</span>
					<button class="btn-add" onclick={() => addSectionWord(si)}>+ Add Word</button>
				</div>
				<div class="words-table-wrap">
					<table class="words-table">
						<thead>
							<tr>
								<th>German</th>
								<th>English</th>
								<th>Persian</th>
								<th>Example (DE)</th>
								<th>Example (EN)</th>
								<th>Example (FA)</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each sec.words as w, wi (wi)}
								<tr>
									<td><input type="text" bind:value={w.german} placeholder="das Haus" /></td>
									<td><input type="text" bind:value={w.en} placeholder="house" /></td>
									<td><input type="text" bind:value={w.fa} dir="rtl" placeholder="خانه" /></td>
									<td><input type="text" bind:value={w.example} /></td>
									<td><input type="text" bind:value={w.example_en} /></td>
									<td><input type="text" bind:value={w.example_fa} dir="rtl" /></td>
									<td>
										<button class="btn-rm" onclick={() => removeSectionWord(si, wi)}>✕</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/each}
{/if}

<div class="bottom-bar">
	<div></div>
	<button class="btn-save" onclick={save} disabled={saving}>
		{saving ? 'Saving…' : 'Save All Changes'}
	</button>
</div>

<style>
	.editor-header {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}
	h1 { color: #2ecc71; margin: 0; font-size: 1.5rem; }
	h2 { color: #fff; margin: 0 0 16px; font-size: 1rem; }
	.count { color: #888; font-weight: 400; font-size: 0.9rem; }

	.back-link { color: #3498db; text-decoration: none; font-size: 0.9rem; white-space: nowrap; }
	.back-link:hover { text-decoration: underline; }

	.header-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
	.save-ok { color: #2ecc71; font-size: 0.9rem; }
	.save-err { color: #e74c3c; font-size: 0.9rem; }

	.meta-card {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 16px;
		padding: 20px;
		margin-bottom: 24px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		gap: 16px;
		align-items: start;
	}
	.form-grid label:nth-child(4),
	.form-grid label:nth-child(5) {
		grid-column: span 1;
	}

	label { display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; color: #aaa; }
	input, select, textarea {
		padding: 7px 10px;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 8px;
		color: #fff;
		font-size: 0.88rem;
		font-family: inherit;
		resize: vertical;
	}
	input:focus, select:focus, textarea:focus { outline: none; border-color: #2ecc71; }

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.words-table-wrap { overflow-x: auto; margin-bottom: 24px; }
	.words-table { width: 100%; border-collapse: collapse; min-width: 700px; }
	.words-table th {
		text-align: left;
		padding: 8px 10px;
		color: #888;
		font-size: 0.78rem;
		text-transform: uppercase;
		border-bottom: 1px solid rgba(255,255,255,0.08);
	}
	.words-table td { padding: 6px 6px; border-bottom: 1px solid rgba(255,255,255,0.04); }
	.words-table td input { width: 100%; min-width: 80px; padding: 5px 8px; }
	.words-table tr:hover td { background: rgba(255,255,255,0.02); }

	.section-card {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
	}

	.section-meta { margin-bottom: 12px; }
	.section-labels { display: flex; gap: 16px; align-items: end; flex-wrap: wrap; }
	.section-labels label { flex: 1; min-width: 180px; }

	.section-type-badge {
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(155,89,182,0.2);
		color: #9b59b6;
		white-space: nowrap;
		align-self: flex-end;
		margin-bottom: 6px;
	}

	.section-words-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.json-note { margin-top: 8px; }
	.json-note p { color: #888; font-size: 0.82rem; margin: 0 0 10px; }
	.json-note label { margin-bottom: 10px; }
	.json-note textarea { font-family: monospace; font-size: 0.78rem; width: 100%; }

	.btn-add {
		padding: 6px 14px;
		background: rgba(46,204,113,0.15);
		color: #2ecc71;
		border: 1px solid rgba(46,204,113,0.3);
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.btn-add:hover { background: rgba(46,204,113,0.25); }

	.btn-rm {
		padding: 3px 8px;
		background: rgba(231,76,60,0.15);
		color: #e74c3c;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.btn-rm:hover { background: rgba(231,76,60,0.3); }

	.btn-save {
		padding: 10px 24px;
		background: #2ecc71;
		color: #000;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		cursor: pointer;
		font-size: 0.95rem;
	}
	.btn-save:hover:not(:disabled) { background: #27ae60; }
	.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

	.bottom-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 16px;
		border-top: 1px solid rgba(255,255,255,0.08);
		margin-top: 8px;
	}
</style>
