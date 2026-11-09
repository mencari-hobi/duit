import Database from 'better-sqlite3';
import { expect, inject, test } from 'vitest';
import { get, post, registered, sessionSetCookie } from './app';

test(
	'opening the home page without a session cookie redirects to login',
	{ meta: { scenario: 'S1' } },
	async () => {
		const home = await get('/');

		expect(home.status).toBe(303);
		expect(home.headers.get('location')).toBe('/login');
	}
);

test(
	'opening the home page with a session cookie matching no stored session redirects to login',
	{ meta: { scenario: 'S2' } },
	async () => {
		const home = await get('/', 'session=forged-token');

		expect(home.headers.get('location')).toBe('/login');
	}
);

test(
	'opening the home page with a session created more than 30 days ago redirects to login',
	{ meta: { scenario: 'S3' } },
	async () => {
		const { name, cookie } = await registered();
		const db = new Database(inject('databasePath'));
		db.prepare(
			'UPDATE sessions SET created_at = ? WHERE user_id = (SELECT id FROM users WHERE name = ?)'
		).run(Date.now() - 31 * 24 * 60 * 60 * 1000, name);
		db.close();

		const home = await get('/', cookie);

		expect(home.headers.get('location')).toBe('/login');
	}
);

test(
	'the session cookie set on login is HttpOnly and SameSite=Lax',
	{ meta: { scenario: 'S4' } },
	async () => {
		const { name } = await registered();

		const loggedIn = await post('/login', { name, password: 'password1' });
		const cookie = sessionSetCookie(loggedIn);

		expect(cookie).toMatch(/; HttpOnly/i);
		expect(cookie).toMatch(/; SameSite=Lax/i);
	}
);

test('the session cookie set on login lasts 30 days', async () => {
	const { name } = await registered();

	const loggedIn = await post('/login', { name, password: 'password1' });
	const cookie = sessionSetCookie(loggedIn);

	expect(cookie).toMatch(/; Max-Age=2592000(;|$)/i);
});
