import { expect, test } from 'vitest';
import { get, post, registered } from './app';

test('opening the login page shows an empty name field and no alert', async () => {
	const page = await get('/login');
	const html = await page.text();

	expect(page.status).toBe(200);
	expect(html).toMatch(/<input name="name"[^>]*value=""/);
	expect(html).not.toContain('role="alert"');
});

test('a refused registration answers 400 and shows the message beside the typed name', async () => {
	const { name } = await registered();

	const refused = await post('/register', { name, password: 'password1' });
	const html = await refused.text();

	expect(refused.status).toBe(400);
	expect(html).toContain('<p role="alert">That name is taken.</p>');
	expect(html).toContain(`value="${name}"`);
});
