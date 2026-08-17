<script lang="ts">
	import { enhance } from "$app/forms";

	let { data, form } = $props();

	type Row = {
		id: string;
		email: string;
		displayName: string | null;
		isAdmin: boolean;
		language: string | null;
		currentDay: number | null;
		created_at: string;
		last_sign_in_at: string | null;
		email_confirmed_at: string | null;
		protected: boolean;
	};

	let search = $state("");
	/** Which row has a panel open, and which one. Only ever one at a time. */
	let openPanel = $state<{ id: string; kind: "password" | "delete" } | null>(
		null,
	);
	let busy = $state(false);

	// A completed action re-runs load; drop the panel so the fresh row shows.
	$effect(() => {
		if (form?.success) openPanel = null;
	});

	const users = $derived((data.users ?? []) as Row[]);

	const filtered = $derived(
		users.filter((u) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return (
				u.email.toLowerCase().includes(q) ||
				(u.displayName ?? "").toLowerCase().includes(q)
			);
		}),
	);

	function toggle(id: string, kind: "password" | "delete") {
		openPanel =
			openPanel?.id === id && openPanel.kind === kind ? null : { id, kind };
	}

	function shortDate(iso: string | null): string {
		if (!iso) return "—";
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	function relative(iso: string | null): string {
		if (!iso) return "never";
		const days = Math.floor(
			(Date.now() - new Date(iso).getTime()) / 86_400_000,
		);
		if (days <= 0) return "today";
		if (days === 1) return "yesterday";
		if (days < 30) return `${days}d ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}
</script>

<svelte:head><title>Users - Mirifer Admin</title></svelte:head>

<div class="page-header">
	<h1>
		Users
		{#if data.serviceRole}<span class="count">({users.length})</span>{/if}
	</h1>
	{#if data.serviceRole}
		<div class="search-wrap">
			<input
				type="search"
				bind:value={search}
				placeholder="Search by email or name…"
				class="search-input"
			/>
			{#if search}<span class="search-count"
					>{filtered.length} match{filtered.length === 1
						? ""
						: "es"}</span
				>{/if}
		</div>
	{/if}
</div>

{#if form?.success}
	<div class="banner ok" role="status">✓ {form.success}</div>
{:else if form?.error}
	<div class="banner err" role="alert">⚠ {form.error}</div>
{/if}

{#if !data.serviceRole}
	<div class="notice">
		<strong>User management is unavailable.</strong>
		<p>
			Listing accounts, resetting passwords and deleting users all require
			the Supabase <em>service role</em> key — the anon key cannot read
			<code>auth.users</code> at all.
		</p>
		<p>
			Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to the server environment
			(Vercel → Project → Settings → Environment Variables), then redeploy.
			Find the key in Supabase → Project Settings → API →
			<code>service_role</code>. Never give it a
			<code>PUBLIC_</code> prefix.
		</p>
	</div>
{:else if data.loadError}
	<div class="banner err" role="alert">
		⚠ Could not list users: {data.loadError}
	</div>
{:else}
	{#if data.truncated}
		<div class="notice small">
			Showing the first {users.length} accounts only — there are more. Narrow
			the list with search, or raise <code>MAX_PAGES</code> in
			<code>+page.server.ts</code>.
		</div>
	{/if}

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Email</th>
					<th>Name</th>
					<th>Day</th>
					<th>Joined</th>
					<th>Last sign-in</th>
					<th class="right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as u (u.id)}
					<tr class:row-open={openPanel?.id === u.id}>
						<td class="email-cell">
							{u.email}
							{#if u.isAdmin}<span class="badge admin">admin</span
								>{/if}
							{#if !u.email_confirmed_at}<span
									class="badge warn"
									title="This user has not confirmed their email address"
									>unconfirmed</span
								>{/if}
							{#if u.id === data.selfId}<span class="badge self"
									>you</span
								>{/if}
						</td>
						<td>{u.displayName ?? "—"}</td>
						<td>{u.currentDay ?? "—"}</td>
						<td class="dim">{shortDate(u.created_at)}</td>
						<td class="dim" title={u.last_sign_in_at ?? "never"}>
							{relative(u.last_sign_in_at)}
						</td>
						<td class="actions-cell">
							<button
								class="btn-pw"
								onclick={() => toggle(u.id, "password")}
								aria-expanded={openPanel?.id === u.id &&
									openPanel.kind === "password"}
							>
								Password
							</button>
							<button
								class="btn-delete"
								onclick={() => toggle(u.id, "delete")}
								disabled={u.protected}
								aria-expanded={openPanel?.id === u.id &&
									openPanel.kind === "delete"}
								title={u.protected
									? "Protected account — cannot be deleted from here"
									: `Permanently delete ${u.email}`}
							>
								Delete
							</button>
						</td>
					</tr>

					{#if openPanel?.id === u.id && openPanel.kind === "password"}
						<tr class="panel-row">
							<td colspan="6">
								<form
									method="POST"
									action="?/setPassword"
									class="panel"
									use:enhance={() => {
										busy = true;
										return async ({ update }) => {
											await update();
											busy = false;
										};
									}}
								>
									<input
										type="hidden"
										name="userId"
										value={u.id}
									/>
									<div class="panel-head">
										Set a new password for <strong
											>{u.email}</strong
										>
									</div>
									<div class="panel-fields">
										<label>
											New password
											<input
												type="password"
												name="password"
												required
												minlength="6"
												autocomplete="new-password"
												placeholder="Min. 6 characters"
											/>
										</label>
										<label>
											Confirm
											<input
												type="password"
												name="confirm"
												required
												minlength="6"
												autocomplete="new-password"
												placeholder="Repeat password"
											/>
										</label>
										<button
											type="submit"
											class="btn-primary"
											disabled={busy}
										>
											{busy ? "…" : "Update password"}
										</button>
										<button
											type="button"
											class="btn-cancel"
											onclick={() => (openPanel = null)}
											>Cancel</button
										>
									</div>
									<p class="panel-note">
										The user is <strong>not</strong> emailed
										about this — send them the new password
										yourself. Their existing sessions stay
										signed in until they expire.
									</p>
								</form>
							</td>
						</tr>
					{/if}

					{#if openPanel?.id === u.id && openPanel.kind === "delete"}
						<tr class="panel-row danger">
							<td colspan="6">
								<form
									method="POST"
									action="?/deleteUser"
									class="panel"
									use:enhance={() => {
										busy = true;
										return async ({ update }) => {
											await update();
											busy = false;
										};
									}}
								>
									<input
										type="hidden"
										name="userId"
										value={u.id}
									/>
									<div class="panel-head danger-text">
										⚠ Permanently delete {u.email}
									</div>
									<p class="panel-note">
										This cannot be undone. It removes the
										account and everything cascading from
										it: profile, lesson progress,
										spaced-repetition cards, exam results
										and analytics events.
									</p>
									<div class="panel-fields">
										<label class="grow">
											Type <code>{u.email}</code> to confirm
											<input
												type="text"
												name="confirmEmail"
												required
												autocomplete="off"
												placeholder={u.email}
											/>
										</label>
										<button
											type="submit"
											class="btn-danger"
											disabled={busy}
										>
											{busy ? "…" : "Delete permanently"}
										</button>
										<button
											type="button"
											class="btn-cancel"
											onclick={() => (openPanel = null)}
											>Cancel</button
										>
									</div>
								</form>
							</td>
						</tr>
					{/if}
				{/each}

				{#if filtered.length === 0}
					<tr>
						<td colspan="6" class="empty">
							{users.length === 0
								? "No registered users yet."
								: `No users match “${search}”.`}
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
		flex-wrap: wrap;
		gap: 12px;
	}
	h1 {
		color: #2ecc71;
		margin: 0;
	}
	.count {
		color: #888;
		font-weight: 400;
		font-size: 1rem;
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.search-input {
		width: 260px;
		padding: 9px 16px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #fff;
		font-size: 0.9rem;
	}
	.search-input:focus {
		outline: none;
		border-color: #2ecc71;
	}
	.search-count {
		color: #888;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	/* ── Banners ── */
	.banner {
		border-radius: 10px;
		padding: 12px 16px;
		font-size: 0.9rem;
		margin-bottom: 18px;
	}
	.banner.ok {
		background: rgba(46, 204, 113, 0.12);
		border: 1px solid rgba(46, 204, 113, 0.45);
		color: #7ee2a8;
	}
	.banner.err {
		background: rgba(231, 76, 60, 0.12);
		border: 1px solid rgba(231, 76, 60, 0.5);
		color: #ff8a9b;
	}

	.notice {
		background: rgba(255, 213, 79, 0.08);
		border: 1px solid rgba(255, 213, 79, 0.35);
		border-radius: 12px;
		padding: 16px 20px;
		color: #ffd54f;
		font-size: 0.88rem;
		line-height: 1.55;
	}
	.notice.small {
		font-size: 0.82rem;
		padding: 10px 16px;
		margin-bottom: 16px;
	}
	.notice p {
		margin: 8px 0 0;
	}
	.notice code,
	.panel-fields code {
		background: rgba(255, 255, 255, 0.12);
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 0.85em;
	}

	/* ── Table ── */
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th {
		text-align: left;
		padding: 10px 14px;
		color: #888;
		font-size: 0.78rem;
		text-transform: uppercase;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		white-space: nowrap;
	}
	th.right {
		text-align: right;
	}
	td {
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.9rem;
		vertical-align: middle;
	}
	tr:hover > td {
		background: rgba(255, 255, 255, 0.03);
	}
	.row-open > td {
		background: rgba(255, 255, 255, 0.05);
	}
	.email-cell {
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
	}
	.dim {
		color: #999;
		white-space: nowrap;
	}
	.empty {
		color: #777;
		text-align: center;
		padding: 32px;
	}

	.badge {
		display: inline-block;
		margin-left: 8px;
		padding: 1px 8px;
		border-radius: 20px;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		vertical-align: middle;
	}
	.badge.admin {
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
	}
	.badge.warn {
		background: rgba(255, 213, 79, 0.18);
		color: #ffd54f;
	}
	.badge.self {
		background: rgba(52, 152, 219, 0.2);
		color: #3498db;
	}

	.actions-cell {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	/* ── Panels ── */
	.panel-row > td {
		background: rgba(255, 255, 255, 0.04);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	.panel-row.danger > td {
		background: rgba(231, 76, 60, 0.07);
	}
	.panel {
		padding: 6px 0 10px;
	}
	.panel-head {
		font-size: 0.9rem;
		color: #ddd;
		margin-bottom: 12px;
	}
	.danger-text {
		color: #ff8a9b;
		font-weight: 700;
	}
	.panel-fields {
		display: flex;
		gap: 12px;
		align-items: flex-end;
		flex-wrap: wrap;
	}
	.panel-fields label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 0.8rem;
		color: #aaa;
	}
	.panel-fields label.grow {
		flex: 1;
		min-width: 240px;
	}
	.panel-fields input {
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: #fff;
		font-size: 0.9rem;
	}
	.panel-fields input:focus {
		outline: none;
		border-color: #2ecc71;
	}
	.panel-note {
		color: #999;
		font-size: 0.82rem;
		line-height: 1.5;
		margin: 12px 0 0;
		max-width: 70ch;
	}
	.panel-row.danger .panel-note {
		margin: 0 0 12px;
	}

	/* ── Buttons ── */
	.btn-primary {
		padding: 9px 18px;
		background: #2ecc71;
		color: #000;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		cursor: pointer;
		font-size: 0.88rem;
		white-space: nowrap;
	}
	.btn-primary:hover:not(:disabled) {
		background: #27ae60;
	}

	.btn-danger {
		padding: 9px 18px;
		background: #e74c3c;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		cursor: pointer;
		font-size: 0.88rem;
		white-space: nowrap;
	}
	.btn-danger:hover:not(:disabled) {
		background: #c0392b;
	}

	.btn-pw {
		padding: 4px 12px;
		background: rgba(52, 152, 219, 0.2);
		color: #3498db;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.btn-pw:hover {
		background: rgba(52, 152, 219, 0.35);
	}

	.btn-delete {
		padding: 4px 12px;
		background: rgba(231, 76, 60, 0.2);
		color: #e74c3c;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.btn-delete:hover:not(:disabled) {
		background: rgba(231, 76, 60, 0.35);
	}

	.btn-cancel {
		padding: 9px 16px;
		background: rgba(255, 255, 255, 0.08);
		color: #aaa;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.88rem;
	}
	.btn-cancel:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	@media (max-width: 700px) {
		.search-input {
			width: 100%;
		}
		.search-wrap {
			width: 100%;
		}
		.panel-fields label.grow {
			min-width: 100%;
		}
	}
</style>
