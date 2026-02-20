<script lang="ts">
	let { data } = $props();

	type Entry = { id: string; word: string; en: string; fa: string };

	let entries = $state<Entry[]>(data.entries.map((e: any) => ({ ...e })));
	let search = $state('');
	let editingId = $state<string | null>(null);
	let editBuf = $state<Entry | null>(null);
	let saving = $state(false);
	let msg = $state('');
	let msgErr = $state(false);

	// Add form
	let showAdd = $state(false);
	let newWord = $state('');
	let newEn = $state('');
	let newFa = $state('');
	let adding = $state(false);

	const filtered = $derived(
		entries.filter(
			(e) =>
				!search ||
				e.word.toLowerCase().includes(search.toLowerCase()) ||
				e.en.toLowerCase().includes(search.toLowerCase()) ||
				(e.fa ?? '').includes(search)
		)
	);

	function startEdit(e: Entry) {
		editingId = e.id;
		editBuf = { ...e };
	}

	function cancelEdit() {
		editingId = null;
		editBuf = null;
	}

	async function saveEdit() {
		if (!editBuf) return;
		saving = true;
		try {
			const res = await fetch('/admin/glossary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'update', entry: editBuf })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Error');
			// Update local state
			entries = entries.map((e) => (e.id === editBuf!.id ? { ...editBuf! } : e));
			showMsg('Saved!', false);
			editingId = null;
			editBuf = null;
		} catch (e: any) {
			showMsg(e.message, true);
		} finally {
			saving = false;
		}
	}

	async function deleteEntry(id: string, word: string) {
		if (!confirm(`Delete "${word}" from glossary?`)) return;
		saving = true;
		try {
			const res = await fetch('/admin/glossary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', entry: { id } })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Error');
			entries = entries.filter((e) => e.id !== id);
			showMsg('Deleted.', false);
		} catch (e: any) {
			showMsg(e.message, true);
		} finally {
			saving = false;
		}
	}

	async function addEntry() {
		if (!newWord.trim() || !newEn.trim()) return;
		adding = true;
		try {
			const res = await fetch('/admin/glossary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'add', entry: { word: newWord.trim(), en: newEn.trim(), fa: newFa.trim() } })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Error');
			const { entry } = await res.json();
			entries = [...entries, entry].sort((a, b) => a.word.localeCompare(b.word));
			newWord = '';
			newEn = '';
			newFa = '';
			showAdd = false;
			showMsg('Added!', false);
		} catch (e: any) {
			showMsg(e.message, true);
		} finally {
			adding = false;
		}
	}

	function showMsg(text: string, isErr: boolean) {
		msg = text;
		msgErr = isErr;
		setTimeout(() => (msg = ''), 3000);
	}
</script>

<svelte:head><title>Glossary - Misiro Admin</title></svelte:head>

<div class="page-header">
	<h1>Glossary <span class="count">({entries.length} entries)</span></h1>
	<div class="header-right">
		{#if msg}<span class="msg" class:err={msgErr}>{msg}</span>{/if}
		<button class="btn-primary" onclick={() => (showAdd = !showAdd)}>
			{showAdd ? '✕ Cancel' : '+ Add Entry'}
		</button>
	</div>
</div>

{#if showAdd}
	<div class="add-form">
		<h2>New Glossary Entry</h2>
		<div class="add-row">
			<label>
				German Word / Key
				<input type="text" bind:value={newWord} placeholder="Danke" />
			</label>
			<label>
				English
				<input type="text" bind:value={newEn} placeholder="Thank you" />
			</label>
			<label>
				Persian
				<input type="text" bind:value={newFa} dir="rtl" placeholder="ممنون" />
			</label>
			<button class="btn-primary" onclick={addEntry} disabled={adding || !newWord || !newEn}>
				{adding ? '…' : 'Add'}
			</button>
		</div>
	</div>
{/if}

<div class="search-bar">
	<input
		type="search"
		bind:value={search}
		placeholder="Search by word, English, or Persian…"
		class="search-input"
	/>
	{#if search}<span class="search-count">{filtered.length} results</span>{/if}
</div>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th>German / Key</th>
				<th>English</th>
				<th>Persian</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each filtered as e (e.id)}
				{#if editingId === e.id && editBuf}
					<tr class="editing-row">
						<td><input type="text" bind:value={editBuf.word} /></td>
						<td><input type="text" bind:value={editBuf.en} /></td>
						<td><input type="text" bind:value={editBuf.fa} dir="rtl" /></td>
						<td class="actions-cell">
							<button class="btn-save-inline" onclick={saveEdit} disabled={saving}>
								{saving ? '…' : 'Save'}
							</button>
							<button class="btn-cancel" onclick={cancelEdit}>Cancel</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="word-cell">{e.word}</td>
						<td>{e.en}</td>
						<td dir="rtl" class="fa-text">{e.fa ?? '—'}</td>
						<td class="actions-cell">
							<button class="btn-edit-inline" onclick={() => startEdit(e)}>Edit</button>
							<button class="btn-delete" onclick={() => deleteEntry(e.id, e.word)}>Delete</button>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
		flex-wrap: wrap;
		gap: 12px;
	}
	h1 { color: #2ecc71; margin: 0; }
	h2 { color: #2ecc71; margin: 0 0 14px; font-size: 1rem; }
	.count { color: #888; font-weight: 400; font-size: 1rem; }

	.header-right { display: flex; align-items: center; gap: 12px; }
	.msg { font-size: 0.9rem; color: #2ecc71; }
	.msg.err { color: #e74c3c; }

	.add-form {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 14px;
		padding: 20px;
		margin-bottom: 20px;
	}
	.add-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr auto;
		gap: 12px;
		align-items: end;
	}

	label { display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; color: #aaa; }
	input, select {
		padding: 7px 10px;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 8px;
		color: #fff;
		font-size: 0.9rem;
	}
	input:focus { outline: none; border-color: #2ecc71; }
	input[type="search"] { width: 100%; }

	.search-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
	.search-input {
		flex: 1;
		max-width: 400px;
		padding: 9px 16px;
		border-radius: 20px;
	}
	.search-count { color: #888; font-size: 0.85rem; }

	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th {
		text-align: left;
		padding: 10px 14px;
		color: #888;
		font-size: 0.78rem;
		text-transform: uppercase;
		border-bottom: 1px solid rgba(255,255,255,0.08);
	}
	td {
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255,255,255,0.05);
		font-size: 0.9rem;
	}
	tr:hover td { background: rgba(255,255,255,0.03); }
	.editing-row td { background: rgba(46,204,113,0.05); }

	.word-cell { font-weight: 600; color: #fff; }
	.fa-text { font-size: 0.9rem; }
	.actions-cell { display: flex; gap: 8px; align-items: center; }

	.editing-row td input { width: 100%; }

	.btn-primary {
		padding: 8px 18px;
		background: #2ecc71;
		color: #000;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		cursor: pointer;
		font-size: 0.9rem;
		white-space: nowrap;
	}
	.btn-primary:hover:not(:disabled) { background: #27ae60; }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-edit-inline {
		padding: 4px 12px;
		background: rgba(52,152,219,0.2);
		color: #3498db;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.btn-edit-inline:hover { background: rgba(52,152,219,0.35); }

	.btn-save-inline {
		padding: 4px 12px;
		background: rgba(46,204,113,0.2);
		color: #2ecc71;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.btn-save-inline:hover:not(:disabled) { background: rgba(46,204,113,0.35); }
	.btn-save-inline:disabled { opacity: 0.5; }

	.btn-cancel {
		padding: 4px 12px;
		background: rgba(255,255,255,0.08);
		color: #aaa;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.btn-cancel:hover { background: rgba(255,255,255,0.15); }

	.btn-delete {
		padding: 4px 12px;
		background: rgba(231,76,60,0.2);
		color: #e74c3c;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.btn-delete:hover { background: rgba(231,76,60,0.35); }

	@media (max-width: 600px) {
		.add-row { grid-template-columns: 1fr; }
	}
</style>
