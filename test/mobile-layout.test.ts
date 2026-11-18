import type { Page } from 'playwright';
import { expect, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';
import { addHolding } from './holdings';

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
	'the financial diary page fits a 360 px wide screen and shows the whole "Add entry" button',
	{ meta: { scenario: 'S41' } },
	async () => {
		const { cookie } = await registered();

		const page = await openPage('/diary', cookie, phoneWidth);

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
			await post('/diary', { type: 'income', date, amount: '9.000.000', currency: 'IDR', category: 'salary', note: '' }, cookie);
			await addHolding(cookie, { date, amount: `${month}0.000.000`, name: 'Savings account', cls: 'Cash', source: 'Salary' });
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
		await post('/diary', { type: 'expense', date: '2026/11/02', amount: '1.250.000', currency: 'IDR', category: 'birthday/anniversary/holiday', expenseType: 'Non-fixed - Non-essential', owner: 'Extended Family', note: '' }, cookie);
		await addHolding(cookie, { date: '2026/11/05', amount: '120.000.000', name: 'Savings account at a bank with a long name', cls: 'Investments', source: 'Freelance' });

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
			await post('/diary', { type: 'income', date, amount: '125.000.000', currency: 'IDR', category: 'salary', note: '' }, cookie);
			await post('/diary', { type: 'expense', date, amount: '35.000.000', currency: 'IDR', category: 'birthday/anniversary/holiday', expenseType: 'Non-fixed - Non-essential', owner: 'Extended Family', note: '' }, cookie);
			await addHolding(cookie, { date, amount: `${month}0.000.000`, name: 'Savings account', cls: 'Cash', source: 'Salary' });
		}

		const page = await openPage('/snapshot?view=monthly', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);

test(
	'the plan on view budget with an item of each kind fits a 360 px wide screen',
	{ meta: { scenario: 'S188' } },
	async () => {
		const { cookie } = await registered();
		const items: Record<string, string>[] = [
			{ tab: 'income', amount: '18.000.000', currency: 'IDR', timeframe: 'monthly', category: 'Salary', note: '' },
			{ tab: 'expense', amount: '2.500.000', currency: 'IDR', timeframe: 'monthly', category: 'Birthday/Anniversary/Holiday', expenseType: 'Non-fixed - Non-essential', owner: 'Extended Family', note: '' },
			{ tab: 'saving', dream: 'A house with a garden by the sea', amount: '600.000.000', currency: 'IDR', months: '120' },
			{ tab: 'debt', category: 'Non-collateral loan', amount: '4.000.000', currency: 'IDR', start: '2026/01/25', end: '2099/10/25' }
		];
		for (const item of items) await post('/plan?/save', item, cookie);

		const page = await openPage('/plan?tab=budget', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);

test(
	'the financial diary asset list with an asset fits a 360 px wide screen',
	{ meta: { scenario: 'S211' } },
	async () => {
		const { cookie } = await registered();
		await post(
			'/diary',
			{ type: 'asset', date: '2026/11/12', cls: 'Foreign Exchanges', source: 'Freelance', unit: '2.000', unitCurrency: 'USD', amount: '32.000.000', currency: 'IDR', note: 'Dollar savings at a bank with a long name' },
			cookie
		);

		const page = await openPage('/diary?tab=asset&view=list', cookie, phoneWidth);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);

test(
	'the snapshot spending report with a line in each section fits a 360 px wide screen',
	{ meta: { scenario: 'S260' } },
	async () => {
		const { cookie } = await registered();
		await post('/diary', { type: 'income', date: '2026/11/05', amount: '125.000.000', currency: 'IDR', category: 'salary', note: '' }, cookie);
		await post('/diary', { type: 'expense', date: '2026/11/06', amount: '35.000.000', currency: 'IDR', category: 'birthday/anniversary/holiday', expenseType: 'Non-fixed - Non-essential', owner: 'Extended Family', note: '' }, cookie);
		await post('/diary', { type: 'asset', date: '2026/11/07', cls: 'Cash', source: 'Salary', unit: '1', unitCurrency: 'IDR', amount: '20.000.000', currency: 'IDR', note: '' }, cookie);
		await post('/plan?/save', { tab: 'debt', category: 'Non-collateral loan', amount: '4.000.000', currency: 'IDR', start: '2026/01/01', end: '2027/12/31' }, cookie);

		const page = await openPage('/snapshot?period=between&from=2026/11/01&to=2026/11/30', cookie, phoneWidth);

		expect(await page.getByRole('row', { name: /^Non-collateral loan/ }).count()).toBe(1);
		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);

test(
	'the financial diary debt payment with a debt fits a 360 px wide screen',
	{ meta: { scenario: 'S238' } },
	async () => {
		const { cookie } = await registered();
		await post(
			'/diary',
			{ type: 'debt', category: 'Non-collateral loan', amount: '20.000.000', tenor: '6', paymentType: 'Monthly', start: '2026/09/25', end: '2027/02/25', installment: '4.000.000' },
			cookie
		);

		const page = await openPage('/diary?tab=debt&view=payments', cookie, phoneWidth);

		expect(await page.getByLabel('DBT-0001 paid').count()).toBe(1);
		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
	}
);
