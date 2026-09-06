<div class="lesson-preview" role="img" aria-label="Lesson preview: a German speaking exercise with audio controls and a bilingual lesson script.">
	<div class="lesson-card">
		<div class="lc-top">
			<span class="lc-level">A2</span>
			<span class="lc-star">☆</span>
		</div>
		<p class="lc-en">What do you do when it rains?</p>
		<p class="lc-de" lang="de">
			<span class="lc-said">Was</span> machst du, wenn es regnet?
		</p>
		<div class="lc-actions">
			<span class="lc-btn lc-ghost">▮▮▮▮</span>
			<span class="lc-btn lc-leaf">Say it</span>
			<span class="lc-btn lc-deep">Next →</span>
		</div>
	</div>
	<div class="script-peek">
		<div class="sp-head">
			<span>Lesson script</span><span class="sp-count">1 / 10</span>
		</div>
		<p class="sp-de" lang="de">Wenn es regnet, bleibe ich zu Hause.</p>
		<p class="sp-en">When it rains, I stay home.</p>
		<p class="sp-de dim" lang="de">Was hast du gemacht, als du ein Kind warst?</p>
		<p class="sp-en dim">What did you do when you were a child?</p>
	</div>
</div>

<style>
	/* ── Hero visual ─────────────────────────────────── */
	.lesson-preview {
		position: relative;
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 48px 36px;
		background-image:
			linear-gradient(var(--line) 1px, transparent 1px),
			linear-gradient(90deg, var(--line) 1px, transparent 1px);
		background-size: 46px 46px;
	}

	.lesson-card {
		background: var(--paper-raised);
		border-radius: 18px;
		box-shadow: 0 22px 48px -22px rgba(16, 26, 21, 0.32);
		padding: 24px 24px 20px;
	}

	.lc-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.lc-level {
		background: var(--info-wash);
		color: var(--info);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 500;
		padding: 4px 9px;
		border-radius: var(--radius-badge);
	}

	.lc-star {
		color: var(--ink-faint);
	}

	.lc-en {
		font-size: 1.05rem;
		color: var(--ink-soft);
		margin: 14px 0 6px;
	}

	.lc-de {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--ink-faint);
		unicode-bidi: isolate;
	}

	/* The word already said, marked as understood. */
	.lc-said {
		color: var(--accent);
	}

	.lc-actions {
		display: flex;
		gap: 8px;
		margin-top: 20px;
		flex-wrap: wrap;
	}

	.lc-btn {
		font-size: 0.85rem;
		font-weight: 500;
		padding: 9px 17px;
		border-radius: var(--radius-pill);
	}

	.lc-ghost {
		border: 1px solid var(--accent);
		color: var(--accent);
		font-family: var(--font-mono);
	}

	.lc-leaf {
		background: var(--leaf);
		color: #fff;
	}

	.lc-deep {
		background: var(--accent);
		color: var(--on-accent);
	}

	.script-peek {
		margin-top: 16px;
		background: var(--paper-raised);
		border-radius: 14px;
		padding: 16px 18px;
		box-shadow: 0 10px 26px -18px rgba(16, 26, 21, 0.3);
	}

	.sp-head {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: var(--type-label);
		letter-spacing: var(--tracking-label);
		text-transform: uppercase;
		color: var(--ink-faint);
		margin-bottom: 10px;
	}

	.sp-de {
		font-weight: 600;
		font-size: 0.92rem;
		margin: 0;
		color: var(--ink);
		unicode-bidi: isolate;
	}

	.sp-en {
		font-size: 0.85rem;
		margin: 2px 0 10px;
		color: var(--ink-faint);
	}

	.sp-de.dim,
	.sp-en.dim {
		opacity: 0.45;
	}

	@media (max-width: 640px) {
		.lesson-preview { padding: 24px 16px; }
		.lesson-card { padding: 20px 16px; }
		.lc-actions { gap: 6px; }
		.lc-btn { padding: 9px 12px; }
	}
</style>
