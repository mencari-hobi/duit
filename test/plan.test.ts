import Database from 'better-sqlite3';
import type { Page } from 'playwright';
import { expect, inject, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';

function rows(table: 'plan_entries' | 'plan_savings' | 'plan_debts', name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db
		.prepare(`SELECT * FROM ${table} WHERE user_id = (SELECT id FROM users WHERE name = ?)`)
		.all(name) as Record<string, unknown>[];
	db.close();
	return found;
}

const salary = { tab: 'income', amount: '18.000.000', currency: 'IDR', timeframe: 'monthly', category: 'Salary', note: 'Office' };

const grocery = {
	tab: 'expense',
	amount: '2.500.000',
	currency: 'IDR',
	timeframe: 'monthly',
	category: 'Grocery',
	expenseType: 'Fixed - Non-essential',
	owner: 'Spouse',
	note: ''
};

const pad = (n: number) => String(n).padStart(2, '0');

const now = new Date();

const todaySlash = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;

const dream = { tab: 'saving', dream: 'Emergency fund', amount: '60.000.000', currency: 'IDR', months: '12', start: todaySlash };

const mortgage = { tab: 'debt', category: 'Mortgage', amount: '3.000.000', currency: 'IDR', start: '2026/01/25', end: '2099/10/25' };

async function planned(...items: Record<string, string>[]) {
	const account = await registered();
	for (const item of items) await post('/plan?/save', item, account.cookie);
	return account;
}

async function openTab(cookie: string, label: string) {
	const page = await openPage('/plan', cookie);
	await page.getByRole('navigation', { name: 'Plan tabs' }).getByRole('link', { name: label }).click();
	await page.waitForURL((url) => url.searchParams.has('tab'));
	return page;
}

const optionsOf = (page: Page, label: string) => page.getByLabel(label).locator('option').allTextContents();

const budgetRow = (page: Page, label: string) => page.getByRole('row').filter({ hasText: label }).last();

test(
	'adding a monthly income under salary with a note stores it and shows "Added ✓"',
	{ meta: { scenario: 'S150' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/plan', cookie);

		await page.getByLabel('Amount').pressSequentially('18000000');
		await page.getByLabel('Note (optional)').fill('Office');
		await page.getByRole('button', { name: 'Add to plan' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
		expect(rows('plan_entries', name)).toEqual([
			expect.objectContaining({
				kind: 'income',
				amount: 18000000,
				currency: 'IDR',
				timeframe: 'monthly',
				category: 'salary',
				note: 'Office'
			})
		]);
	}
);

test(
	'adding an income with a blank amount shows the amount message and stores nothing',
	{ meta: { scenario: 'S155' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/plan', cookie);

		await page.getByRole('button', { name: 'Add to plan' }).click();

		await expect.poll(() => page.getByText('Please enter an amount (numbers only).').isVisible()).toBe(true);
		expect(rows('plan_entries', name)).toEqual([]);
	}
);

test('the income categories follow the spec', { meta: { scenario: 'S159' } }, async () => {
	const { cookie } = await registered();
	const page = await openPage('/plan', cookie);

	expect(await optionsOf(page, 'Category')).toEqual(['Salary', 'Freelance', 'Dividend', 'Bonus', 'Other']);
});

test("the expense categories are the diary's 17", { meta: { scenario: 'S160' } }, async () => {
	const { cookie } = await registered();
	const page = await openTab(cookie, 'Expense');

	const categories = await optionsOf(page, 'Category');

	expect(categories).toHaveLength(17);
	expect(categories[0]).toBe('Grocery');
	expect(categories.at(-1)).toBe('Birthday/Anniversary/Holiday');
});

test(
	'choosing school tuition on the expense tab fills the expense type fixed - essential',
	{ meta: { scenario: 'S161' } },
	async () => {
		const { cookie } = await registered();
		const page = await openTab(cookie, 'Expense');

		await page.getByLabel('Category').selectOption('School Tuition');

		expect(await page.getByLabel('Expense type').inputValue()).toBe('Fixed - Essential');
	}
);

test('the expense owners follow the spec', { meta: { scenario: 'S162' } }, async () => {
	const { cookie } = await registered();
	const page = await openTab(cookie, 'Expense');

	expect(await optionsOf(page, 'Expense owner')).toEqual([
		'Personal',
		'Children',
		'Spouse',
		'Family',
		'Extended Family',
		'Friends',
		'Other'
	]);
});

test('the debt payment categories follow the spec', { meta: { scenario: 'S163' } }, async () => {
	const { cookie } = await registered();
	const page = await openTab(cookie, 'Debt payment');

	expect(await optionsOf(page, 'Debt category')).toEqual([
		'Credit card',
		'Mortgage',
		'Car installment',
		'Non-collateral loan',
		'Other loan'
	]);
});

test('the timeframe list follows the spec with monthly chosen', { meta: { scenario: 'S164' } }, async () => {
	const { cookie } = await registered();
	const page = await openPage('/plan', cookie);

	expect(await optionsOf(page, 'Timeframe')).toEqual(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually']);
	expect(await page.getByLabel('Timeframe').inputValue()).toBe('monthly');
});

test(
	'typing 60.000.000 and 12 months reads the amount to save per month',
	{ meta: { scenario: 'S165' } },
	async () => {
		const { cookie } = await registered();
		const page = await openTab(cookie, 'Saving');

		await page.getByLabel('Amount I need (IDR)').pressSequentially('60000000');
		await page.getByLabel('I will achieve this in (months)').fill('12');

		await expect.poll(() => page.getByText('IDR 5.000.000 per month').isVisible()).toBe(true);
	}
);

test(
	'a weekly income of 500.000 reads 2.000.000 on view budget with monthly chosen',
	{ meta: { scenario: 'S166' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/plan', cookie);
		await page.getByLabel('Amount').pressSequentially('500000');
		await page.getByLabel('Timeframe').selectOption('Weekly');
		await page.getByRole('button', { name: 'Add to plan' }).click();
		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');

		await page.getByRole('navigation', { name: 'Plan tabs' }).getByRole('link', { name: 'View budget' }).click();

		await expect.poll(() => budgetRow(page, 'Salary').textContent()).toContain('2.000.000');
	}
);

test(
	'a monthly income of 18.000.000 reads 4.500.000 with weekly chosen, under the header "IDR per week"',
	{ meta: { scenario: 'S167' } },
	async () => {
		const { cookie } = await planned(salary);
		const page = await openTab(cookie, 'View budget');

		await page.getByLabel('Timeframe').selectOption('Weekly');

		await expect.poll(() => page.getByRole('columnheader', { name: 'IDR per week' }).isVisible()).toBe(true);
		expect(await budgetRow(page, 'Salary').textContent()).toContain('4.500.000');
	}
);

test(
	'an installment outside its payment dates lists under "Not counted today" with edit and delete',
	{ meta: { scenario: 'S189' } },
	async () => {
		const { cookie } = await planned(salary, { ...mortgage, start: '2098/01/25' });
		const page = await openTab(cookie, 'View budget');

		expect(await page.getByText('Not counted today').isVisible()).toBe(true);
		expect(await page.getByRole('link', { name: 'Edit Mortgage' }).isVisible()).toBe(true);
		expect(await page.getByRole('button', { name: 'Delete Mortgage' }).isVisible()).toBe(true);
	}
);

test('a new account\'s view budget reads "Nothing planned yet."', { meta: { scenario: 'S179' } }, async () => {
	const { cookie } = await registered();

	const page = await openTab(cookie, 'View budget');

	expect(await page.getByText('Nothing planned yet.').isVisible()).toBe(true);
});

async function edit(cookie: string, label: string) {
	const page = await openTab(cookie, 'View budget');
	await page.getByRole('link', { name: `Edit ${label}` }).click();
	await page.waitForURL((url) => url.searchParams.has('edit'));
	return page;
}

test(
	'choosing edit on a salary income opens the income tab filled with a "Save changes" button',
	{ meta: { scenario: 'S180' } },
	async () => {
		const { cookie } = await planned({ ...salary, timeframe: 'weekly', currency: 'USD' });

		const page = await edit(cookie, 'Salary');

		expect(await page.getByRole('link', { name: 'Income', exact: true }).getAttribute('aria-current')).toBe('page');
		expect(await page.getByLabel('Amount').inputValue()).toBe('18.000.000');
		expect(await page.getByRole('combobox', { name: /^Currency/ }).textContent()).toContain('USD');
		expect(await page.getByLabel('Timeframe').inputValue()).toBe('weekly');
		expect(await page.getByLabel('Category').inputValue()).toBe('Salary');
		expect(await page.getByLabel('Note (optional)').inputValue()).toBe('Office');
		expect(await page.getByRole('button', { name: 'Save changes' }).isVisible()).toBe(true);
	}
);

test(
	'saving 19.000.000 on the edited income stores it on the same item and opens view budget',
	{ meta: { scenario: 'S181' } },
	async () => {
		const { name, cookie } = await planned(salary);
		const [before] = rows('plan_entries', name);
		const page = await edit(cookie, 'Salary');

		await page.getByLabel('Amount').fill('19.000.000');
		await page.getByRole('button', { name: 'Save changes' }).click();

		await page.waitForURL((url) => url.searchParams.get('tab') === 'budget');
		expect(rows('plan_entries', name)).toEqual([expect.objectContaining({ id: before.id, amount: 19000000 })]);
	}
);

test(
	'choosing edit on a grocery expense opens the expense tab with its type and owner',
	{ meta: { scenario: 'S182' } },
	async () => {
		const { cookie } = await planned(grocery);

		const page = await edit(cookie, 'Grocery');

		expect(await page.getByLabel('Expense type').inputValue()).toBe('Fixed - Non-essential');
		expect(await page.getByLabel('Expense owner').inputValue()).toBe('Spouse');
	}
);

test(
	'choosing edit on a mortgage installment opens the debt payment tab with its start and end payment',
	{ meta: { scenario: 'S184' } },
	async () => {
		const { cookie } = await planned(mortgage);

		const page = await edit(cookie, 'Mortgage');

		expect(await page.getByLabel('Start payment').inputValue()).toBe('2026/01/25');
		expect(await page.getByLabel('End payment').inputValue()).toBe('2099/10/25');
	}
);

test(
	'deleting a salary income removes it from view budget and from storage',
	{ meta: { scenario: 'S186' } },
	async () => {
		const { name, cookie } = await planned(salary, grocery);
		const page = await openTab(cookie, 'View budget');

		await page.getByRole('button', { name: 'Delete Salary' }).click();

		await expect.poll(() => page.getByRole('link', { name: 'Edit Salary' }).count()).toBe(0);
		expect(rows('plan_entries', name).map((row) => row.category)).toEqual(['grocery']);
	}
);

test('the saving tab opens with today in start saving', { meta: { scenario: 'S265' } }, async () => {
	const { cookie } = await registered();

	const page = await openTab(cookie, 'Saving');

	expect(await page.getByLabel('Start saving').inputValue()).toBe(todaySlash);
});

test(
	'choosing edit on the dream emergency fund opens the saving tab with its amount, months, and start saving',
	{ meta: { scenario: 'S183' } },
	async () => {
		const { cookie } = await planned({ ...dream, start: '2026/11/25' });

		const page = await edit(cookie, 'Emergency fund');

		expect(await page.getByLabel('My dream').inputValue()).toBe('Emergency fund');
		expect(await page.getByLabel('Amount I need (IDR)').inputValue()).toBe('60.000.000');
		expect(await page.getByLabel('I will achieve this in (months)').inputValue()).toBe('12');
		expect(await page.getByLabel('Start saving').inputValue()).toBe('2026/11/25');
	}
);
