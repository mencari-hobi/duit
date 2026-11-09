import { expect, test } from 'vitest';
import { get, post, registered } from './app';
import { openPage } from './browser';

test(
	'setting the default currency to USD, then reloading the page, shows USD in the Default currency field',
	{ meta: { scenario: 'S25' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/', cookie);
		const currency = page.getByRole('combobox', { name: 'Default currency' });
		await currency.click();
		await page.getByPlaceholder('Search currency').fill('USD');
		await page.getByRole('option', { name: /^USD/ }).click();
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');

		await page.reload();

		expect(await currency.textContent()).toContain('USD');
	}
);

test(
	'setting the reporting start day to 25, then reloading the page, shows 25 in the Reporting start day field',
	{ meta: { scenario: 'S29' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/', cookie);
		await page.getByLabel('Reporting start day').fill('25');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');

		await page.reload();

		expect(await page.getByLabel('Reporting start day').inputValue()).toBe('25');
	}
);

test('saving the code ABC returns status 400 and shows "Pick a currency from the list."', async () => {
	const { cookie } = await registered();

	const saved = await post('/?/settings', { currency: 'ABC', startDay: '1' }, cookie);

	expect(saved.status).toBe(400);
	expect(await saved.text()).toMatch(/role="alert"[^>]*>\s*Pick a currency from the list\./);
});

test('saving settings without a session cookie redirects to login', async () => {
	const saved = await post('/?/settings', { currency: 'USD', startDay: '1' });

	expect(saved.status).toBe(303);
	expect(saved.headers.get('location')).toBe('/login');
});

test('a new account sees the hint that a report month is a calendar month', async () => {
	const { cookie } = await registered();

	const home = await get('/', cookie);

	expect(await home.text()).toContain('A report month is a calendar month.');
});

test('after saving the reporting start day 25, the hint shows that a report month runs from day 25 to day 24', async () => {
	const { cookie } = await registered();
	await post('/?/settings', { currency: 'IDR', startDay: '25' }, cookie);

	const home = await get('/', cookie);

	expect(await home.text()).toContain(
		'A report month runs from day 25 to day 24 of the next month.'
	);
});
