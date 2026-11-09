import { expect, test } from 'vitest';
import { get } from './app';

test('the health check answers 200 with OK', { meta: { scenario: 'S16' } }, async () => {
	const response = await get('/healthcheck');

	expect(response.status).toBe(200);
	expect(await response.text()).toBe('OK');
});
