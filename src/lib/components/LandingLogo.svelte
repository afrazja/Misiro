<script lang="ts">
	const backgroundFilterId = $props.id();
</script>

<!-- Keep the approved artwork's colors while letting the surrounding surface show through. -->
<svg
	class="landing-logo"
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
	<image
		href="/brand/mirifer-logo-white.webp"
		width="1536"
		height="1024"
		filter={`url(#${backgroundFilterId})`}
	/>
</svg>

<style>
	.landing-logo {
		display: block;
		inline-size: var(--landing-logo-width, 184px);
		max-inline-size: 100%;
		block-size: auto;
		flex: none;
		overflow: hidden;
		border-radius: 8px;
	}
</style>
