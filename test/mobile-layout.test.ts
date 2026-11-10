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

test(
	'the records page with entries fits a 360 px wide screen',
	{ meta: { scenario: 'S104' } },
	async () => {
		const { cookie } = await registered();
		await post('/add', { type: 'expense', date: '2026/11/02', amount: '1.250.000', currency: 'IDR', category: 'birthday/anniversary/holiday', expenseType: 'Non-fixed - Non-essential', owner: 'Extended Family', note: '' }, cookie);
		await post('/add', { type: 'asset', date: '2026/11/05', amount: '120.000.000', currency: 'IDR', name: 'Savings account at a bank with a long name', cls: 'Investments', source: 'Freelance', note: '' }, cookie);

		const page = await openPage('/records', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);

test(
	'the report with three months of entries fits a 360 px wide screen',
	{ meta: { scenario: 'S120' } },
	async () => {
		const { cookie } = await registered();
		for (const month of ['09', '10', '11']) {
			const date = `2026/${month}/05`;
			await post('/add', { type: 'income', date, amount: '125.000.000', currency: 'IDR', category: 'salary', note: '' }, cookie);
			await post('/add', { type: 'expense', date, amount: '35.000.000', currency: 'IDR', category: 'birthday/anniversary/holiday', expenseType: 'Non-fixed - Non-essential', owner: 'Extended Family', note: '' }, cookie);
			await post('/add', { type: 'asset', date, amount: `${month}0.000.000`, currency: 'IDR', name: 'Savings account', cls: 'Cash', source: 'Salary', note: '' }, cookie);
		}

		const page = await openPage('/report', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);

test(
	'the assets page with an asset, a liability, and a sold asset fits a 360 px wide screen',
	{ meta: { scenario: 'S167' } },
	async () => {
		const { cookie } = await registered();
		const asset = { type: 'asset', date: '2026/11/05', currency: 'IDR', note: '' };
		await post('/add', { ...asset, amount: '120.000.000', market: '135.500.000', name: 'Savings account at a bank with a long name', cls: 'Investments', source: 'Freelance' }, cookie);
		await post('/add', { ...asset, amount: '300.000.000', name: 'Mortgage loan', cls: 'Liability', term: 'Long term' }, cookie);
		await post('/add', { ...asset, amount: '150.000.000', name: 'Car', cls: 'Other', source: 'Salary' }, cookie);
		await post('/add', { type: 'income', date: '2026/11/06', amount: '140.000.000', currency: 'IDR', category: 'sales of asset', asset: 'Car', note: '' }, cookie);

		const page = await openPage('/assets', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);
