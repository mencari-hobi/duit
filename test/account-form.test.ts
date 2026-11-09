import { expect, test } from 'vitest';
import { get, post, registered } from './app';

function nameInput(html: string) {
	return html.match(/<input[^>]*\bname="name"[^>]*>/)?.[0] ?? '';
}

function alertText(html: string) {
	return html.match(/<[^>]*role="alert"[^>]*>([^<]*)</)?.[1].trim();
}

test('opening the login page shows an empty name field and no alert', async () => {
	const page = await get('/login');
	const html = await page.text();

	expect(page.status).toBe(200);
	expect(nameInput(html)).toContain('value=""');
	expect(alertText(html)).toBeUndefined();
});

test('a refused registration answers 400 and shows the message beside the typed name', async () => {
	const { name } = await registered();

	const refused = await post('/register', { name, password: 'password1' });
	const html = await refused.text();

	expect(refused.status).toBe(400);
	expect(alertText(html)).toBe('That name is taken.');
	expect(nameInput(html)).toContain(`value="${name}"`);
});
