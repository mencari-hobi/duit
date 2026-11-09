import type { Page } from 'playwright';
import { expect, test } from 'vitest';
import { registered } from './app';
import { openPage } from './browser';

const phoneWidth = 360;

function pageWidth(page: Page) {
	return page.evaluate(() => document.documentElement.scrollWidth);
}

async function expectWholeOnScreen(page: Page, button: string) {
	const box = (await page.getByRole('button', { name: button }).boundingBox())!;
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(phoneWidth);
}

test(
	'the login page fits a 360 px wide screen and shows the whole "Log in" button',
	{ meta: { scenario: 'S17' } },
	async () => {
		const page = await openPage('/login', '', phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
		await expectWholeOnScreen(page, 'Log in');
	}
);

test(
	'the home page fits a 360 px wide screen and shows the whole "Log out" button',
	{ meta: { scenario: 'S18' } },
	async () => {
		const { cookie } = await registered();

		const page = await openPage('/', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
		await expectWholeOnScreen(page, 'Log out');
	}
);

test(
	'the add page fits a 360 px wide screen and shows the whole "Add entry" button',
	{ meta: { scenario: 'S41' } },
	async () => {
		const { cookie } = await registered();

		const page = await openPage('/add', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
		await expectWholeOnScreen(page, 'Add entry');
	}
);
