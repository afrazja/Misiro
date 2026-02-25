import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'production',
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: false, // We already have a static manifest at static/site.webmanifest
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp3}']
			}
		})
	]
});
