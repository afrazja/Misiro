import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.test.ts']
	},
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			$components: fileURLToPath(new URL('./src/lib/components', import.meta.url)),
			$services: fileURLToPath(new URL('./src/lib/services', import.meta.url)),
			$stores: fileURLToPath(new URL('./src/lib/stores', import.meta.url)),
			$data: fileURLToPath(new URL('./src/lib/data', import.meta.url)),
			$utils: fileURLToPath(new URL('./src/lib/utils', import.meta.url)),
			'$env/dynamic/public': fileURLToPath(new URL('./src/test/env.mock.ts', import.meta.url))
		}
	}
});
