import { expect, test } from 'vitest';
import { get, post, registered } from './app';

test('logging out redirects to login', { meta: { scenario: 'S14' } }, async () => {
	const { cookie } = await registered();

	const loggedOut = await post('/?/logout', {}, cookie);

	expect(loggedOut.status).toBe(303);
	expect(loggedOut.headers.get('location')).toBe('/login');
});

test(
	'opening the home page with the session cookie captured before logout redirects to login',
	{ meta: { scenario: 'S15' } },
	async () => {
		const { cookie } = await registered();
		await post('/?/logout', {}, cookie);

		const home = await get('/', cookie);

		expect(home.headers.get('location')).toBe('/login');
	}
);

test('logging out without a session cookie redirects to login', async () => {
	const loggedOut = await post('/?/logout', {});

	expect(loggedOut.status).toBe(303);
	expect(loggedOut.headers.get('location')).toBe('/login');
});
