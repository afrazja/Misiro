<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const GROUP_LABELS: Record<string, string> = {
		basics: 'Basics',
		survival: 'Survival',
		scenarios: 'Scenarios',
		advanced: 'Advanced'
	};

	let showAddForm = $state(false);
	let deleting = $state<number | null>(null);
</script>

<svelte:head><title>Lessons - Misiro Admin</title></svelte:head>

<div class="page-header">
	<h1>Lessons</h1>
	<button class="btn-primary" onclick={() => (showAddForm = !showAddForm)}>
		{showAddForm ? '✕ Cancel' : '+ Add Lesson'}
	</button>
</div>

{#if form?.message}
	<div class="alert alert-error">{form.message}</div>
{/if}

{#if showAddForm}
	<form
		method="POST"
		action="?/createLesson"
		class="add-form"
		use:enhance={() => {
			return ({ result, update }) => {
				if (result.type === 'success') showAddForm = false;
				update();
			};
		}}
	>
		<h2>New Lesson</h2>
		<div class="form-row">
			<label>
				Day #
				<input type="number" name="day" min="1" max="999" required placeholder="37" />
			</label>
			<label>
				Group
				<select name="group">
					<option value="basics">Basics</option>
					<option value="survival">Survival</option>
					<option value="scenarios">Scenarios</option>
					<option value="advanced">Advanced</option>
				</select>
			</label>
		</div>
		<div class="form-row">
			<label>
				Title (English)
				<input type="text" name="title" required placeholder="At the Supermarket" />
			</label>
			<label>
				Title (Persian)
				<input type="text" name="title_fa" placeholder="در سوپرمارکت" dir="rtl" />
			</label>
		</div>
		<button type="submit" class="btn-primary">Create Lesson</button>
	</form>
{/if}

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th>Day</th>
				<th>Title</th>
				<th>Persian Title</th>
				<th>Group</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.lessons as lesson (lesson.id)}
				<tr>
					<td class="day-cell">Day {lesson.day}</td>
					<td>{lesson.title}</td>
					<td dir="rtl" class="fa-text">{lesson.title_fa ?? '—'}</td>
					<td><span class="badge badge-{lesson.group}">{GROUP_LABELS[lesson.group] ?? lesson.group}</span></td>
					<td class="actions-cell">
						<a href="/admin/lessons/{lesson.day}" class="btn-edit">Edit</a>
						<form
							method="POST"
							action="?/deleteLesson"
							use:enhance={() => {
								deleting = lesson.day;
								return ({ update }) => {
									deleting = null;
									update();
								};
							}}
							onsubmit={(e) => {
								if (!confirm(`Delete Day ${lesson.day}: "${lesson.title}"? This also deletes all its sentences.`)) e.preventDefault();
							}}
						>
							<input type="hidden" name="day" value={lesson.day} />
							<button type="submit" class="btn-delete" disabled={deleting === lesson.day}>
								{deleting === lesson.day ? '…' : 'Delete'}
							</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
	}
	h1 { color: #2ecc71; margin: 0; }

	.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
	.alert-error { background: rgba(231,76,60,0.2); border: 1px solid rgba(231,76,60,0.4); color: #e74c3c; }

	.add-form {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 16px;
		padding: 24px;
		margin-bottom: 24px;
	}
	.add-form h2 { color: #2ecc71; margin: 0 0 20px; font-size: 1.1rem; }

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-bottom: 16px;
	}
	label { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #aaa; }
	input, select {
		padding: 8px 12px;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 8px;
		color: #fff;
		font-size: 0.95rem;
	}
	input:focus, select:focus { outline: none; border-color: #2ecc71; }

	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th {
		text-align: left;
		padding: 10px 14px;
		color: #888;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(255,255,255,0.08);
	}
	td {
		padding: 12px 14px;
		border-bottom: 1px solid rgba(255,255,255,0.05);
		font-size: 0.9rem;
	}
	tr:hover td { background: rgba(255,255,255,0.03); }

	.day-cell { color: #2ecc71; font-weight: 600; white-space: nowrap; }
	.fa-text { font-size: 0.9rem; }

	.badge {
		display: inline-block;
		padding: 3px 10px;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.badge-basics { background: rgba(52,152,219,0.2); color: #3498db; }
	.badge-survival { background: rgba(231,76,60,0.2); color: #e74c3c; }
	.badge-scenarios { background: rgba(155,89,182,0.2); color: #9b59b6; }
	.badge-advanced { background: rgba(241,196,15,0.2); color: #f1c40f; }

	.actions-cell { display: flex; gap: 8px; align-items: center; }

	.btn-primary {
		padding: 8px 18px;
		background: #2ecc71;
		color: #000;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.btn-primary:hover { background: #27ae60; }

	.btn-edit {
		padding: 5px 14px;
		background: rgba(52,152,219,0.2);
		color: #3498db;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.85rem;
	}
	.btn-edit:hover { background: rgba(52,152,219,0.35); }

	.btn-delete {
		padding: 5px 14px;
		background: rgba(231,76,60,0.2);
		color: #e74c3c;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.btn-delete:hover:not(:disabled) { background: rgba(231,76,60,0.35); }
	.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
