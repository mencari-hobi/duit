import adapter from '@sveltejs/adapter-node';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit({ adapter: adapter() })],
	test: {
		reporters: ['default', './test/scenario-records.ts'],
		projects: [
			{ extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'] } },
			{
				extends: true,
				test: { name: 'app', include: ['test/**/*.test.ts'], globalSetup: ['test/server.ts'] }
			}
		]
	}
});
