import { expect, test } from 'vitest';
import { get, post, registered, sessionCookie } from './app';

test(
	'logging in with a registered name and its password opens the home page greeting that name',
	{ meta: { scenario: 'S11' } },
	async () => {
		const { name } = await registered();

		const loggedIn = await post('/login', { name, password: 'password1' });
		const home = await get(loggedIn.headers.get('location')!, sessionCookie(loggedIn));

		expect(loggedIn.status).toBe(303);
		expect(await home.text()).toContain(`Welcome, ${name}`);
	}
);
