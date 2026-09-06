<script lang="ts">
	const backgroundFilterId = $props.id();
	let { tone = "auto" }: { tone?: "auto" | "light" } = $props();
</script>

<!-- Keep the approved artwork's colors while letting the surrounding surface show through. -->
<svg
	class="brand-logo"
	class:light={tone === "light"}
	viewBox="168 344 1216 344"
	width="184"
	height="52"
	role="img"
	aria-label="Mirifer"
>
	<defs>
		<filter id={backgroundFilterId} color-interpolation-filters="sRGB">
			<!-- Only near-white pixels lose opacity; the green tile and colored M stay opaque. -->
			<feColorMatrix
				type="matrix"
				values="1 0 0 0 0
					0 1 0 0 0
					0 0 1 0 0
					-1.8071 -6.0792 -0.6137 0 8.166667"
			/>
		</filter>
	</defs>
	<!-- Separate crops let the wordmark adapt to dark surfaces without recoloring the M tile. -->
	<svg x="168" y="344" width="356" height="344" viewBox="168 344 356 344">
		<image href="/brand/mirifer-logo-white.webp" width="1536" height="1024" filter={`url(#${backgroundFilterId})`} />
	</svg>
	<svg class="wordmark" x="524" y="344" width="860" height="344" viewBox="524 344 860 344">
		<image href="/brand/mirifer-logo-white.webp" width="1536" height="1024" filter={`url(#${backgroundFilterId})`} />
	</svg>
</svg>

<style>
	.brand-logo {
		display: block;
		inline-size: var(--brand-logo-width, var(--landing-logo-width, 184px));
		max-inline-size: 100%;
		block-size: auto;
		flex: none;
		overflow: hidden;
		border-radius: 8px;
	}

	.light .wordmark,
	:global(:root[data-theme='dark']) .wordmark {
		filter: brightness(0) invert(1);
	}
</style>
