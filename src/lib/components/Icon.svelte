<script lang="ts">
	/**
	 * Hand-drawn-feel stroke icons (24×24, currentColor) — replaces the
	 * emoji-as-icons look. Add names sparingly; keep strokes consistent.
	 */
	let {
		name,
		size = 20,
	}: {
		name:
			| "book"
			| "letters"
			| "refresh"
			| "bookmark"
			| "gear"
			| "flame"
			| "star"
			| "play"
			| "arrow-right"
			| "download"
			| "mic"
			| "chat";
		size?: number;
	} = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === "book"}
		<path d="M12 6.5C10.6 5 8.6 4.2 6.2 4.2c-1 0-1.9.14-2.7.4V18.8c.8-.26 1.7-.4 2.7-.4 2.4 0 4.4.8 5.8 2.3 1.4-1.5 3.4-2.3 5.8-2.3 1 0 1.9.14 2.7.4V4.6c-.8-.26-1.7-.4-2.7-.4-2.4 0-4.4.8-5.8 2.3Z" />
		<path d="M12 6.5v14.2" />
	{:else if name === "letters"}
		<path d="M3.5 17.5 7.2 7h.6l3.7 10.5" />
		<path d="M4.9 14h5.2" />
		<path d="M14 12.7c.8-.8 2-1 3-.6 1 .4 1.6 1.3 1.6 2.4v3h-.2c-.6 0-4.9.8-4.9-1.6 0-1.9 3-1.9 5.1-1.6" />
	{:else if name === "refresh"}
		<path d="M20 11.5A8 8 0 0 0 6.3 6.3L4.5 8" />
		<path d="M4.5 4.5V8H8" />
		<path d="M4 12.5a8 8 0 0 0 13.7 5.2l1.8-1.7" />
		<path d="M19.5 19.5V16H16" />
	{:else if name === "bookmark"}
		<path d="M7 3.8h10a1 1 0 0 1 1 1v15.4l-6-3.6-6 3.6V4.8a1 1 0 0 1 1-1Z" />
	{:else if name === "gear"}
		<!-- A hub with EIGHT TEETH. The previous version was a hub with eight
		     straight rays, which is a sun — and it sat next to the theme
		     toggle, so the dashboard appeared to offer two of them. -->
		<circle cx="12" cy="12" r="3.2" />
		<path
			d="M12 1.9a1.35 1.35 0 0 1 1.35 1.35v.62a1.35 1.35 0 0 0 .83 1.25 1.35 1.35 0 0 0 1.47-.27l.44-.44a1.35 1.35 0 1 1 1.91 1.91l-.44.44a1.35 1.35 0 0 0-.27 1.47 1.35 1.35 0 0 0 1.25.83h.62a1.35 1.35 0 1 1 0 2.7h-.62a1.35 1.35 0 0 0-1.25.83 1.35 1.35 0 0 0 .27 1.47l.44.44a1.35 1.35 0 1 1-1.91 1.91l-.44-.44a1.35 1.35 0 0 0-1.47-.27 1.35 1.35 0 0 0-.83 1.25v.62a1.35 1.35 0 1 1-2.7 0v-.62a1.35 1.35 0 0 0-.83-1.25 1.35 1.35 0 0 0-1.47.27l-.44.44a1.35 1.35 0 1 1-1.91-1.91l.44-.44a1.35 1.35 0 0 0 .27-1.47 1.35 1.35 0 0 0-1.25-.83h-.62a1.35 1.35 0 1 1 0-2.7h.62a1.35 1.35 0 0 0 1.25-.83 1.35 1.35 0 0 0-.27-1.47l-.44-.44A1.35 1.35 0 1 1 7.65 5.4l.44.44a1.35 1.35 0 0 0 1.47.27h.06a1.35 1.35 0 0 0 .83-1.25v-.62A1.35 1.35 0 0 1 12 1.9Z"
		/>
	{:else if name === "flame"}
		<path d="M12 21c-3.6 0-6.2-2.4-6.2-5.8 0-2.6 1.6-4.4 3-6 1.2-1.4 2.4-2.8 2.7-4.9.1-.6 1-.7 1.2-.1.6 1.6 1.6 2.9 2.5 4.2 1.3 1.8 3 3.6 3 6.8 0 3.4-2.6 5.8-6.2 5.8Z" />
		<path d="M12 21c-1.7 0-2.9-1.2-2.9-2.9 0-1.9 1.6-2.8 2.9-4.6 1.3 1.8 2.9 2.7 2.9 4.6 0 1.7-1.2 2.9-2.9 2.9Z" />
	{:else if name === "star"}
		<path d="m12 3.4 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.4Z" />
	{:else if name === "play"}
		<path d="M8 5.5v13l10-6.5-10-6.5Z" />
	{:else if name === "arrow-right"}
		<path d="M4 12h16M14 6l6 6-6 6" />
	{:else if name === "download"}
		<path d="M12 3.5v11M7.5 10.5l4.5 4 4.5-4" />
		<path d="M4.5 17v2.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V17" />
	{:else if name === "mic"}
		<rect x="9.2" y="3.2" width="5.6" height="10" rx="2.8" />
		<path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
	{:else if name === "chat"}
		<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
	{/if}
</svg>
