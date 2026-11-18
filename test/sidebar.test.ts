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
	'opening plan, diary, records, or snapshot without a session cookie redirects to login',
	{ meta: { scenario: 'S19' } },
	async () => {
		for (const path of ['/plan', '/diary', '/records', '/snapshot']) {
			const response = await get(path);

			expect(response.headers.get('location')).toBe('/login');
		}
	}
);

test(
	'each sidebar menu item opens its page',
	{ meta: { scenario: 'S20' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/snapshot', cookie);
		const menu = page.getByRole('navigation', { name: 'Menu' });

		for (const [label, path] of [
			['Dashboard', '/'],
			['Financial Plan', '/plan'],
			['Financial Diary', '/diary'],
			['Financial Snapshot', '/snapshot'],
			['Records', '/records']
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
			['Financial Plan', null],
			['Financial Diary', null],
			['Financial Snapshot', null],
			['Records', 'page']
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
	'on a 360 px wide screen, choosing Financial Diary in the open sidebar opens diary with the sidebar hidden',
	{ meta: { scenario: 'S23' } },
	async () => {
		const { page, menu } = await phoneWithMenuOpen();

		await menu.getByRole('link', { name: 'Financial Diary' }).click();
		await page.waitForURL((url) => url.pathname === '/diary');

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

test(
	'opening add with an entry to edit redirects to diary with the same entry',
	{ meta: { scenario: 'S140' } },
	async () => {
		const { cookie } = await registered();

		const response = await get('/add?edit=e42', cookie);

		expect(response.headers.get('location')).toBe('/diary?edit=e42');
	}
);

test('opening report redirects to snapshot', { meta: { scenario: 'S141' } }, async () => {
	const { cookie } = await registered();

	const response = await get('/report', cookie);

	expect(response.headers.get('location')).toBe('/snapshot');
});
