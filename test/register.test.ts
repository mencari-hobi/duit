import { expect, test } from 'vitest';
import { get, post, sessionCookie, uniqueName } from './app';

test(
	'registering a new name with an 8-character password opens the home page greeting that name',
	{ meta: { scenario: 'S5' } },
	async () => {
		const name = uniqueName();

		const registered = await post('/register', { name, password: 'abcd1234' });
		const home = await get(registered.headers.get('location')!, sessionCookie(registered));

		expect(registered.status).toBe(303);
		expect(await home.text()).toContain(`Welcome, ${name}`);
	}
);
