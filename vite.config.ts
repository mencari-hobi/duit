import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit({ adapter: adapter() })],
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
