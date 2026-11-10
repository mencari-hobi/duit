import { expect, test } from 'vitest';
import { get, registered } from './app';
import { openPage } from './browser';

const phoneWidth = 360;

async function phoneWithMenuOpen() {
	const { cookie } = await registered();
	const page = await openPage('/', cookie, phoneWidth);
	const menu = page.getByRole('navigation', { name: 'Menu' });
	await page.getByRole('button', { name: 'Menu' }).click();
	await expect.poll(() => menu.isVisible()).toBe(true);
	return { page, menu };
}

test(
	'opening add, assets, records, or report without a session cookie redirects to login',
	{ meta: { scenario: 'S19' } },
	async () => {
		for (const path of ['/add', '/assets', '/records', '/report']) {
			const response = await get(path);

			expect(response.headers.get('location')).toBe('/login');
		}
	}
);

test(
	'each sidebar menu item opens its page, assets included',
	{ meta: { scenario: 'S20' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/report', cookie);
		const menu = page.getByRole('navigation', { name: 'Menu' });

		for (const [label, path] of [
			['Dashboard', '/'],
			['Add', '/add'],
			['Assets', '/assets'],
			['Records', '/records'],
			['Report', '/report']
		]) {
			await menu.getByRole('link', { name: label }).click();
			await page.waitForURL((url) => url.pathname === path);
			await expect.poll(() => page.getByRole('heading', { level: 1 }).isVisible()).toBe(true);
		}
	}
);

test(
	'on records, the records menu item has aria-current="page" and the other items lack it',
	{ meta: { scenario: 'S21' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/records', cookie);
		const links = page.getByRole('navigation', { name: 'Menu' }).getByRole('link');

		const marks = await links.evaluateAll((items) =>
			items.map((item) => [item.textContent?.trim(), item.getAttribute('aria-current')])
		);

		expect(marks).toEqual([
			['Dashboard', null],
			['Add', null],
			['Assets', null],
			['Records', 'page'],
			['Report', null]
		]);
	}
);

test(
	'on a 360 px wide screen, the sidebar menu stays hidden until a tap on Menu shows it',
	{ meta: { scenario: 'S22' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/', cookie, phoneWidth);
		const menu = page.getByRole('navigation', { name: 'Menu' });

		expect(await menu.isVisible()).toBe(false);
		await page.getByRole('button', { name: 'Menu' }).click();

		await expect.poll(() => menu.isVisible()).toBe(true);
	}
);

test(
	'on a 360 px wide screen, choosing Add in the open sidebar opens add with the sidebar hidden',
	{ meta: { scenario: 'S23' } },
	async () => {
		const { page, menu } = await phoneWithMenuOpen();

		await menu.getByRole('link', { name: 'Add' }).click();
		await page.waitForURL((url) => url.pathname === '/add');

		await expect.poll(() => menu.isVisible()).toBe(false);
	}
);

test(
	'on a 1280 px wide screen, the sidebar menu shows on page load with the Menu button hidden',
	{ meta: { scenario: 'S24' } },
	async () => {
		const { cookie } = await registered();

		const page = await openPage('/', cookie, 1280);

		expect(await page.getByRole('navigation', { name: 'Menu' }).isVisible()).toBe(true);
		expect(await page.getByRole('button', { name: 'Menu' }).isVisible()).toBe(false);
	}
);

test('on a 360 px wide screen, a tap on Close hides the open sidebar menu', async () => {
	const { page, menu } = await phoneWithMenuOpen();

	await page.getByRole('button', { name: 'Close', exact: true }).click();

	await expect.poll(() => menu.isVisible()).toBe(false);
});

test('on a 360 px wide screen, a tap on the dimmed backdrop hides the open sidebar menu', async () => {
	const { page, menu } = await phoneWithMenuOpen();

	await page.getByRole('button', { name: 'Close the menu' }).click({ position: { x: 340, y: 400 } });

	await expect.poll(() => menu.isVisible()).toBe(false);
});

test('on a 360 px wide screen, pressing Enter on the focused Menu button hides the open sidebar menu', async () => {
	const { page, menu } = await phoneWithMenuOpen();

	await page.getByRole('button', { name: 'Menu', exact: true }).press('Enter');

	await expect.poll(() => menu.isVisible()).toBe(false);
});
