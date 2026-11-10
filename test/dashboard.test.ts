import type { Page } from 'playwright';
import { expect, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';

function addIncome(cookie: string, date: string, amount: string) {
	return post('/add', { type: 'income', date, amount, currency: 'IDR', category: 'salary', note: '' }, cookie);
}

function addExpense(cookie: string, date: string, amount: string) {
	return post(
		'/add',
		{
			type: 'expense',
			date,
			amount,
			currency: 'IDR',
			category: 'grocery',
			expenseType: 'Non-fixed - Essential',
			owner: 'Personal',
			note: ''
		},
		cookie
	);
}

async function twoMonths() {
	const { cookie } = await registered();
	await addIncome(cookie, '2026/10/05', '9.000.000');
	await addExpense(cookie, '2026/10/06', '3.000.000');
	await addIncome(cookie, '2026/11/05', '10.000.000');
	await addExpense(cookie, '2026/11/06', '4.000.000');
	return cookie;
}

const incomeChart = (page: Page) =>
	page.locator('[data-slot="card"]').filter({ hasText: 'Income vs expense' });

test(
	'income of 10.000.000 and expenses of 4.000.000 in 2026/11 read under cash flow with a 60% savings rate',
	{ meta: { scenario: 'S67' } },
	async () => {
		const { cookie } = await registered();
		await addIncome(cookie, '2026/11/05', '10.000.000');
		await addExpense(cookie, '2026/11/06', '4.000.000');

		const page = await openPage('/', cookie);
		const cashFlow = page.getByRole('region', { name: 'Cash flow · 2026/11' });

		const text = await cashFlow.textContent();
		expect(text).toMatch(/Income.*10\.000\.000/s);
		expect(text).toMatch(/Expenses.*4\.000\.000/s);
		expect(text).toMatch(/Net cash flow.*6\.000\.000/s);
		expect(text).toContain('Savings rate 60%');
	}
);

test(
	'entries in 2026/10 and 2026/11 give the income vs expense chart both months',
	{ meta: { scenario: 'S76' } },
	async () => {
		const cookie = await twoMonths();

		const page = await openPage('/', cookie);

		await expect.poll(() => incomeChart(page).textContent()).toMatch(/2026\/10[\s\S]*2026\/11/);
	}
);

test(
	'setting from to 2026/11/01 leaves 2026/10 out of the charts and the cards',
	{ meta: { scenario: 'S83' } },
	async () => {
		const cookie = await twoMonths();
		const page = await openPage('/', cookie);

		await page.getByLabel('From', { exact: true }).pressSequentially('20261101');
		await page.waitForURL((url) => url.searchParams.get('from') === '2026/11/01');

		await expect.poll(() => incomeChart(page).textContent()).not.toContain('2026/10');
	}
);

test(
	'"All time" clears from and to and brings every month back',
	{ meta: { scenario: 'S84' } },
	async () => {
		const cookie = await twoMonths();
		const page = await openPage('/?from=2026/11/01&to=2026/11/30', cookie);

		await page.getByRole('link', { name: 'All time' }).click();
		await page.waitForURL((url) => url.search === '');

		expect(await page.getByLabel('From', { exact: true }).inputValue()).toBe('');
		await expect.poll(() => incomeChart(page).textContent()).toContain('2026/10');
	}
);

test(
	'a new account opening the dashboard reads the empty message, and its link opens add',
	{ meta: { scenario: 'S85' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/', cookie);

		expect(await page.getByText('No data yet.').textContent()).toBe(
			'No data yet. Add your first entry on the Add page.'
		);
		await page.getByRole('link', { name: 'Add page' }).click();
		await page.waitForURL((url) => url.pathname === '/add');
	}
);

async function addAsset(cookie: string, date: string, name: string, amount: string, fields: Record<string, string> = {}) {
	const added = await post(
		'/add',
		{ type: 'asset', date, amount, currency: 'IDR', name, cls: 'Cash', source: 'Salary', note: '', ...fields },
		cookie
	);
	if (added.status !== 400) return added;
	return post(`/assets/${encodeURIComponent(name)}?/valuation`, { date, amount, acquisition: '', note: '' }, cookie);
}

function addDollarExpense(cookie: string, date: string, amount: string) {
	return post(
		'/add',
		{
			type: 'expense',
			date,
			amount,
			currency: 'USD',
			category: 'grocery',
			expenseType: 'Non-fixed - Essential',
			owner: 'Personal',
			note: ''
		},
		cookie
	);
}

const region = (page: Page, name: string) => page.getByRole('region', { name });

test(
	'two expenses in USD read that 2 entries in other currencies are left out',
	{ meta: { scenario: 'S75' } },
	async () => {
		const { cookie } = await registered();
		await addExpense(cookie, '2026/11/06', '4.000.000');
		await addDollarExpense(cookie, '2026/11/07', '100');
		await addDollarExpense(cookie, '2026/11/08', '50');

		const page = await openPage('/', cookie);

		expect(await page.getByText('left out').textContent()).toContain(
			'2 entries in other currencies are left out.'
		);
	}
);

test('one expense in USD reads that 1 entry in another currency is left out', async () => {
	const { cookie } = await registered();
	await addExpense(cookie, '2026/11/06', '4.000.000');
	await addDollarExpense(cookie, '2026/11/07', '100');

	const page = await openPage('/', cookie);

	expect(await page.getByText('left out').textContent()).toContain(
		'1 entry in another currency is left out.'
	);
});

test(
	'expenses of 4.000.000 in 2026/11 after 5.000.000 in 2026/10 read a 20.0% drop on the expenses card',
	{ meta: { scenario: 'S68' } },
	async () => {
		const { cookie } = await registered();
		await addExpense(cookie, '2026/10/06', '5.000.000');
		await addExpense(cookie, '2026/11/06', '4.000.000');

		const page = await openPage('/', cookie);

		expect(await region(page, 'Cash flow · 2026/11').textContent()).toMatch(
			/Expenses\s*▼ 20\.0% vs prev\. month/
		);
	}
);

test('income of 10.000.000 in 2026/11 after 9.000.000 in 2026/10 reads an 11.1% rise on the income card', async () => {
	const cookie = await twoMonths();

	const page = await openPage('/', cookie);

	expect(await region(page, 'Cash flow · 2026/11').textContent()).toMatch(
		/Income\s*▲ 11\.1% vs prev\. month/
	);
});

test('a month without income reads the savings rate as a dash', { meta: { scenario: 'S69' } }, async () => {
	const { cookie } = await registered();
	await addExpense(cookie, '2026/11/06', '4.000.000');

	const page = await openPage('/', cookie);

	expect(await region(page, 'Cash flow · 2026/11').textContent()).toContain('Savings rate –');
});

test('expenses above income read the net cash flow with a minus sign', async () => {
	const { cookie } = await registered();
	await addIncome(cookie, '2026/11/05', '3.000.000');
	await addExpense(cookie, '2026/11/06', '4.000.000');

	const page = await openPage('/', cookie);

	expect(await region(page, 'Cash flow · 2026/11').textContent()).toMatch(/Net cash flow.*−1\.000\.000/s);
});

test(
	'own-funded assets growing from 10.000.000 to 12.500.000 read +2.500.000 saved into assets',
	{ meta: { scenario: 'S72' } },
	async () => {
		const { cookie } = await registered();
		await addAsset(cookie, '2026/10/01', 'Savings account', '10.000.000');
		await addAsset(cookie, '2026/11/01', 'Savings account', '12.500.000');

		const page = await openPage('/', cookie);

		expect(await region(page, 'Net worth').textContent()).toMatch(
			/Saved into assets · 2026\/11\s*\+2\.500\.000/
		);
	}
);

test(
	'savings account updated from 10.000.000 to 12.000.000 reads 12.000.000 and a change of +2.000.000 (20.0%)',
	{ meta: { scenario: 'S82' } },
	async () => {
		const { cookie } = await registered();
		await addAsset(cookie, '2026/10/01', 'Savings account', '10.000.000');
		await addAsset(cookie, '2026/11/01', 'Savings account', '12.000.000');

		const page = await openPage('/', cookie);
		const cells = page.getByRole('row', { name: /Savings account/ }).getByRole('cell');

		expect(await cells.allTextContents()).toEqual([
			'Savings account',
			'Cash',
			'Salary',
			'12.000.000',
			'+2.000.000 (20.0%)'
		]);
	}
);

test('an asset updated from 0 to 5.000.000 reads its change without a share', async () => {
	const { cookie } = await registered();
	await addAsset(cookie, '2026/10/01', 'Savings account', '0');
	await addAsset(cookie, '2026/11/01', 'Savings account', '5.000.000');

	const page = await openPage('/', cookie);
	const cells = page.getByRole('row', { name: /Savings account/ }).getByRole('cell');

	expect(await cells.last().textContent()).toBe('+5.000.000');
});

test('an asset with a single update reads a dash for its change', async () => {
	const { cookie } = await registered();
	await addAsset(cookie, '2026/11/01', 'Savings account', '10.000.000');

	const page = await openPage('/', cookie);
	const cells = page.getByRole('row', { name: /Savings account/ }).getByRole('cell');

	expect(await cells.last().textContent()).toBe('–');
});

test('a liability paid down from 3.000.000 to 2.000.000 reads its term and the drop in the good tone', async () => {
	const { cookie } = await registered();
	const loan = { cls: 'Liability', term: 'Long term' };
	await addAsset(cookie, '2026/10/01', 'Mortgage loan', '3.000.000', loan);
	await addAsset(cookie, '2026/11/01', 'Mortgage loan', '2.000.000', loan);

	const page = await openPage('/', cookie);
	const cells = page.getByRole('row', { name: /Mortgage loan/ }).getByRole('cell');

	expect(await cells.allTextContents()).toEqual([
		'Mortgage loan',
		'Liability',
		'Long term',
		'2.000.000',
		'−1.000.000 (−33.3%)'
	]);
	expect(await cells.last().getAttribute('class')).toContain('text-in');
});

test('clearing from brings every month back', async () => {
	const cookie = await twoMonths();
	const page = await openPage('/?from=2026/11/01', cookie);

	await page.getByLabel('From', { exact: true }).fill('');
	await page.waitForURL((url) => url.searchParams.get('from') === '');

	await expect.poll(() => incomeChart(page).textContent()).toContain('2026/10');
});

test("picking a day in from's calendar sets from to that day and applies it", async () => {
	const cookie = await twoMonths();
	const page = await openPage('/?from=2026/10/01', cookie);

	await page.getByRole('button', { name: 'Open calendar for From' }).click();
	await page.getByRole('grid').getByRole('button', { name: /\b2\b/ }).first().click();
	await page.waitForURL((url) => url.searchParams.get('from') === '2026/10/02');

	expect(await page.getByLabel('From', { exact: true }).inputValue()).toBe('2026/10/02');
});

test('an invalid from date waits, then goes blank once a valid to date applies', async () => {
	const cookie = await twoMonths();
	const page = await openPage('/', cookie);

	await page.getByLabel('From', { exact: true }).pressSequentially('20261340');
	await page.getByLabel('To', { exact: true }).pressSequentially('20261031');
	await page.waitForURL((url) => url.searchParams.get('to') === '2026/10/31');

	expect(new URL(page.url()).searchParams.get('from')).toBe('2026/13/40');
	await expect.poll(() => incomeChart(page).textContent()).not.toContain('2026/11');
	expect(await page.getByLabel('From', { exact: true }).inputValue()).toBe('');
});

async function cashAndLand() {
	const { cookie } = await registered();
	await addAsset(cookie, '2026/11/01', 'Savings account', '6.000.000');
	await addAsset(cookie, '2026/11/01', 'Land', '2.000.000', { cls: 'Property' });
	return cookie;
}

async function stackLabels(page: Page, chart: string) {
	const labels = page.locator(`[data-chart="${chart}"] text.fill-card`);
	await labels.first().waitFor();
	return (await labels.allTextContents()).map((text) => text.trim());
}

test(
	'a cash asset of 6.000.000 and a property asset of 2.000.000 label their stacks 75% and 25% on a phone',
	{ meta: { scenario: 'S81' } },
	async () => {
		const cookie = await cashAndLand();

		const page = await openPage('/', cookie, 360);

		expect(await stackLabels(page, 'classes')).toEqual(['75%', '25%']);
	}
);

test('a cash asset of 6.000.000 and a property asset of 2.000.000 label their upright stacks 75% and 25%', async () => {
	const cookie = await cashAndLand();

	const page = await openPage('/', cookie);

	expect(await stackLabels(page, 'classes-upright')).toEqual(['75%', '25%']);
});

test('twelve months in a half-width upright chart label every other month, newest included', async () => {
	const { cookie } = await registered();
	for (let month = 1; month <= 12; month++) {
		await addAsset(cookie, `2026/${String(month).padStart(2, '0')}/05`, 'Savings account', `${month}0.000.000`);
	}

	const page = await openPage('/', cookie);
	const chart = page.locator('[data-chart="classes-upright"]');
	await chart.locator('svg').first().waitFor();

	const text = await chart.textContent();
	expect(text).toContain('2026/12');
	expect(text).not.toContain('2026/11');
});
