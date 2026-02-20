<script lang="ts">
	let { data } = $props();

	type Sentence = {
		role: string;
		audio_text: string;
		target_text: string;
		translation: string;
		translation_fa: string;
	};

	let title = $state(data.lesson.title);
	let title_fa = $state(data.lesson.title_fa ?? '');
	let group = $state(data.lesson.group);
	let sentences = $state<Sentence[]>(
		data.sentences.map((s: any) => ({
			role: s.role,
			audio_text: s.audio_text ?? '',
			target_text: s.target_text ?? '',
			translation: s.translation ?? '',
			translation_fa: s.translation_fa ?? ''
		}))
	);

	let saving = $state(false);
	let saveMsg = $state('');
	let saveError = $state('');

	function addSentence() {
		sentences = [
			...sentences,
			{ role: 'received', audio_text: '', target_text: '', translation: '', translation_fa: '' }
		];
		// Scroll to bottom after tick
		setTimeout(() => {
			const last = document.querySelector('.sentence-card:last-child');
			last?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 50);
	}

	function removeSentence(i: number) {
		sentences = sentences.filter((_, idx) => idx !== i);
	}

	function moveSentence(i: number, dir: -1 | 1) {
		const arr = [...sentences];
		const j = i + dir;
		if (j < 0 || j >= arr.length) return;
		[arr[i], arr[j]] = [arr[j], arr[i]];
		sentences = arr;
	}

	async function save() {
		saving = true;
		saveMsg = '';
		saveError = '';
		try {
			const res = await fetch(`/admin/lessons/${data.lesson.day}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, title_fa, group, sentences })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? `HTTP ${res.status}`);
			}
			saveMsg = 'Saved successfully!';
			setTimeout(() => (saveMsg = ''), 3000);
		} catch (e: any) {
			saveError = e.message ?? 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Edit Day {data.lesson.day} - Misiro Admin</title></svelte:head>

<div class="editor-header">
	<a href="/admin/lessons" class="back-link">← All Lessons</a>
	<h1>Day {data.lesson.day}</h1>
	<div class="header-actions">
		{#if saveMsg}<span class="save-ok">{saveMsg}</span>{/if}
		{#if saveError}<span class="save-err">{saveError}</span>{/if}
		<button class="btn-save" onclick={save} disabled={saving}>
			{saving ? 'Saving…' : 'Save All Changes'}
		</button>
	</div>
</div>

<!-- Lesson metadata -->
<div class="meta-card">
	<h2>Lesson Info</h2>
	<div class="form-row">
		<label>
			Title (English)
			<input type="text" bind:value={title} />
		</label>
		<label>
			Title (Persian)
			<input type="text" bind:value={title_fa} dir="rtl" />
		</label>
		<label>
			Group
			<select bind:value={group}>
				<option value="basics">Basics</option>
				<option value="survival">Survival</option>
				<option value="scenarios">Scenarios</option>
				<option value="advanced">Advanced</option>
			</select>
		</label>
	</div>
</div>

<!-- Sentences -->
<div class="sentences-header">
	<h2>Sentences <span class="count">({sentences.length})</span></h2>
	<button class="btn-add" onclick={addSentence}>+ Add Sentence</button>
</div>

<div class="sentences-list">
	{#each sentences as s, i (i)}
		<div class="sentence-card" class:sent={s.role === 'sent'}>
			<div class="sentence-meta">
				<span class="sentence-num">#{i + 1}</span>
				<select bind:value={s.role} class="role-select">
					<option value="received">received (teacher)</option>
					<option value="sent">sent (student)</option>
				</select>
				<div class="move-btns">
					<button onclick={() => moveSentence(i, -1)} disabled={i === 0} title="Move up">↑</button>
					<button onclick={() => moveSentence(i, 1)} disabled={i === sentences.length - 1} title="Move down">↓</button>
				</div>
				<button class="btn-remove" onclick={() => removeSentence(i)}>✕</button>
			</div>
			<div class="sentence-fields">
				<label>
					Audio Text (German TTS)
					<input type="text" bind:value={s.audio_text} placeholder="Guten Morgen!" />
				</label>
				<label>
					Target Text (shown in chat)
					<input type="text" bind:value={s.target_text} placeholder="Guten Morgen!" />
				</label>
				<label>
					Translation (English)
					<input type="text" bind:value={s.translation} placeholder="Good morning!" />
				</label>
				<label>
					Translation (Persian)
					<input type="text" bind:value={s.translation_fa} dir="rtl" placeholder="صبح بخیر!" />
				</label>
			</div>
		</div>
	{/each}
</div>

<div class="bottom-bar">
	<button class="btn-add-bottom" onclick={addSentence}>+ Add Sentence</button>
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
	h1 { color: #2ecc71; margin: 0; }
	h2 { color: #fff; margin: 0 0 16px; font-size: 1rem; }
	.count { color: #888; font-weight: 400; }

	.back-link { color: #3498db; text-decoration: none; font-size: 0.9rem; }
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

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 16px;
		align-items: start;
	}

	label { display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; color: #aaa; }
	input, select {
		padding: 8px 12px;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 8px;
		color: #fff;
		font-size: 0.9rem;
	}
	input:focus, select:focus { outline: none; border-color: #2ecc71; }

	.sentences-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.sentences-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }

	.sentence-card {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 12px;
		padding: 16px;
		border-left: 3px solid #3498db;
	}
	.sentence-card.sent { border-left-color: #2ecc71; }

	.sentence-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}
	.sentence-num { color: #888; font-size: 0.8rem; min-width: 24px; }

	.role-select {
		padding: 4px 10px;
		font-size: 0.82rem;
		border-radius: 6px;
	}

	.move-btns { display: flex; gap: 4px; }
	.move-btns button {
		padding: 2px 8px;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 4px;
		color: #ccc;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.move-btns button:disabled { opacity: 0.3; cursor: not-allowed; }
	.move-btns button:hover:not(:disabled) { background: rgba(255,255,255,0.15); }

	.btn-remove {
		margin-left: auto;
		padding: 3px 10px;
		background: rgba(231,76,60,0.15);
		color: #e74c3c;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.btn-remove:hover { background: rgba(231,76,60,0.3); }

	.sentence-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.btn-add, .btn-add-bottom {
		padding: 8px 18px;
		background: rgba(46,204,113,0.15);
		color: #2ecc71;
		border: 1px solid rgba(46,204,113,0.3);
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.btn-add:hover, .btn-add-bottom:hover { background: rgba(46,204,113,0.25); }

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
	}

	@media (max-width: 700px) {
		.form-row { grid-template-columns: 1fr; }
		.sentence-fields { grid-template-columns: 1fr; }
	}
</style>
