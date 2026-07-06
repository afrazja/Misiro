<script lang="ts">
	import { onMount } from "svelte";

	/**
	 * "Install App" button — appears only when the app is installable:
	 * - Chromium browsers: uses the captured beforeinstallprompt event.
	 * - iOS Safari (no install prompt API): shows Add-to-Home-Screen steps.
	 * Hidden entirely when already running as an installed app.
	 */

	let deferredPrompt: any = null;
	let canInstall = $state(false);
	let isIOS = $state(false);
	let showIOSHint = $state(false);

	onMount(() => {
		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(navigator as any).standalone === true;
		if (standalone) return; // already installed

		isIOS =
			/iphone|ipad|ipod/i.test(navigator.userAgent) ||
			(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

		const onBeforeInstall = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e;
			canInstall = true;
		};
		const onInstalled = () => {
			canInstall = false;
			deferredPrompt = null;
		};

		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
			window.removeEventListener("appinstalled", onInstalled);
		};
	});

	async function handleInstall() {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			await deferredPrompt.userChoice;
			deferredPrompt = null;
			canInstall = false;
		} else if (isIOS) {
			showIOSHint = !showIOSHint;
		}
	}
</script>

{#if canInstall || isIOS}
	<div class="install-wrap">
		<button class="install-btn" onclick={handleInstall}>
			📲 Install App
		</button>
		{#if showIOSHint}
			<div class="ios-hint" role="dialog" aria-label="How to install">
				<button
					class="ios-hint-close"
					onclick={() => (showIOSHint = false)}
					aria-label="Close">✕</button
				>
				<strong>Install Mirifer on your iPhone/iPad:</strong>
				<ol>
					<li>Tap the <b>Share</b> button <span class="share-glyph">⎋</span> in Safari</li>
					<li>Scroll down and tap <b>“Add to Home Screen”</b></li>
					<li>Tap <b>Add</b> — Mirifer appears like a native app</li>
				</ol>
			</div>
		{/if}
	</div>
{/if}

<style>
	.install-wrap {
		position: relative;
		display: inline-block;
	}

	.install-btn {
		background: rgba(46, 204, 113, 0.12);
		border: 1px solid rgba(46, 204, 113, 0.45);
		color: #2ecc71;
		border-radius: 50px;
		padding: 8px 16px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
	}

	.install-btn:hover {
		background: rgba(46, 204, 113, 0.25);
		transform: translateY(-1px);
	}

	.ios-hint {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		z-index: 1000;
		width: 270px;
		background: #16213e;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 14px;
		padding: 16px 18px;
		color: #ddd;
		font-size: 0.85rem;
		text-align: left;
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
	}

	.ios-hint strong {
		color: #fff;
	}

	.ios-hint ol {
		margin: 10px 0 0;
		padding-left: 18px;
		line-height: 1.7;
	}

	.ios-hint-close {
		position: absolute;
		top: 8px;
		right: 10px;
		background: none;
		border: none;
		color: #888;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.share-glyph {
		display: inline-block;
		transform: rotate(90deg);
	}
</style>
