import type { Page } from 'playwright';
import { expect, test } from 'vitest';
import { post, registered } from './app';
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

test(
	'the dashboard with a year of entries fits a 360 px wide screen, and every chart fits its card',
	{ meta: { scenario: 'S86' } },
	async () => {
		const { cookie } = await registered();
		for (let month = 1; month <= 12; month++) {
			const date = `2026/${String(month).padStart(2, '0')}/05`;
			await post('/add', { type: 'income', date, amount: '9.000.000', currency: 'IDR', category: 'salary', note: '' }, cookie);
			await post('/add', { type: 'asset', date, amount: `${month}0.000.000`, currency: 'IDR', name: 'Savings account', cls: 'Cash', source: 'Salary', note: '' }, cookie);
		}

		const page = await openPage('/', cookie, phoneWidth);
		await page.locator('[data-chart] svg').first().waitFor();

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
		const overflowing = await page.evaluate(() =>
			[...document.querySelectorAll<HTMLElement>('[data-chart]')]
				.filter((chart) => chart.offsetParent !== null)
				.filter((chart) => chart.scrollWidth > chart.clientWidth || chart.getBoundingClientRect().right > 360)
				.map((chart) => chart.dataset.chart)
		);
		expect(overflowing).toEqual([]);
	}
);
