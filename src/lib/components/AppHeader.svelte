<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title,
		subtitle,
		icon,
		backHref,
		backLabel = "Home",
		onBack,
		leading,
		actions,
		secondary,
		secondaryLabel = "Page controls",
		sticky = false,
		direction = "ltr",
	}: {
		title?: string;
		subtitle?: string;
		icon?: string;
		backHref?: string;
		backLabel?: string;
		onBack?: () => void;
		leading?: Snippet;
		actions?: Snippet;
		secondary?: Snippet;
		secondaryLabel?: string;
		sticky?: boolean;
		direction?: "ltr" | "rtl";
	} = $props();
</script>

<div class="header-stack" class:sticky dir={direction}>
	<header class="app-header" class:connected={secondary}>
		<div class="leading">
			{#if leading}
				{@render leading()}
			{:else if onBack}
				<button class="back-control" type="button" onclick={onBack} aria-label={backLabel}>
					<span class="back-arrow" aria-hidden="true">&larr;</span>
					<span>{backLabel}</span>
				</button>
			{:else if backHref}
				<a class="back-control" href={backHref} aria-label={backLabel}>
					<span class="back-arrow" aria-hidden="true">&larr;</span>
					<span>{backLabel}</span>
				</a>
			{:else}
				<a class="brand" href="/home" aria-label="Mirifer home">
					<span class="brand-mark" aria-hidden="true">M</span>
					<span>Mirifer</span>
				</a>
			{/if}
		</div>

		{#if title}
			<div class="identity">
				<div class="title-row">
					{#if icon}<span class="title-icon" aria-hidden="true">{icon}</span>{/if}
					<h1>{title}</h1>
				</div>
				{#if subtitle}<p>{subtitle}</p>{/if}
			</div>
		{/if}

		<div class="actions">
			{#if actions}{@render actions()}{/if}
		</div>
	</header>

	{#if secondary}
		<div class="secondary-toolbar" role="toolbar" aria-label={secondaryLabel}>
			{@render secondary()}
		</div>
	{/if}
</div>

<style>
	.header-stack {
		width: 100%;
		flex-shrink: 0;
	}

	.header-stack.sticky {
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.app-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 16px;
		width: 100%;
		min-height: 68px;
		padding: 12px 16px;
		background: color-mix(in srgb, var(--paper-raised) 94%, var(--paper));
		border: 1px solid var(--line);
		border-radius: 16px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.header-stack.sticky .app-header {
		border-radius: 0 0 16px 16px;
	}

	.app-header.connected,
	.header-stack.sticky .app-header.connected {
		border-radius: 0;
	}

	.secondary-toolbar {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 52px;
		padding: 8px 16px;
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-top: 0;
		border-radius: 0 0 16px 16px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.secondary-toolbar > :global(*) {
		width: 100%;
	}

	.leading,
	.actions {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.leading {
		grid-column: 1;
		justify-content: flex-start;
	}

	.actions {
		grid-column: 3;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}

	.identity {
		grid-column: 2;
		min-width: 0;
		text-align: center;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	h1 {
		margin: 0;
		color: var(--ink);
		font-family: var(--font-display);
		font-size: clamp(1.1rem, 2vw, 1.35rem);
		font-weight: 700;
		line-height: 1.15;
		white-space: nowrap;
	}

	.identity p {
		margin: 3px 0 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.25;
	}

	.title-icon {
		font-size: 1.05rem;
		line-height: 1;
	}

	.back-control,
	.brand {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 40px;
		padding: 8px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
		line-height: 1;
		text-decoration: none;
		cursor: pointer;
		transition: border-color 0.18s, background 0.18s, color 0.18s, transform 0.18s;
	}

	.back-control:hover,
	.brand:hover {
		border-color: var(--accent);
		background: var(--accent-wash);
		color: var(--accent-deep);
	}

	.back-control:active,
	.brand:active {
		transform: translateY(1px);
	}

	[dir="rtl"] .back-arrow {
		transform: rotate(180deg);
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--accent);
		color: white;
		font-family: var(--font-display);
		font-size: 0.82rem;
	}

	.actions :global(select),
	.actions :global(button),
	.actions :global(a) {
		min-height: 40px;
	}

	@media (max-width: 760px) {
		.app-header {
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 8px;
			min-height: 60px;
			padding: 9px 10px;
			border-radius: 14px;
		}

		.header-stack.sticky .app-header {
			border-radius: 0 0 14px 14px;
		}

		.app-header.connected,
		.header-stack.sticky .app-header.connected {
			border-radius: 0;
		}

		.secondary-toolbar {
			min-height: 48px;
			padding: 8px 10px;
			border-radius: 0 0 14px 14px;
		}

		h1 {
			max-width: 42vw;
			overflow: hidden;
			font-size: 1.05rem;
			text-overflow: ellipsis;
		}

		.identity p {
			display: none;
		}

		.back-control,
		.brand {
			min-height: 40px;
			padding: 8px 10px;
			font-size: 0.8rem;
		}

		.brand > span:last-child {
			display: none;
		}

	}

	@media (max-width: 440px) {
		.back-control {
			width: 40px;
			padding-inline: 8px;
		}

		.back-control > span:last-child {
			display: none;
		}
	}
</style>
