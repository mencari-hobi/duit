import Database from 'better-sqlite3';
import type { Page } from 'playwright';
import { expect, inject, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';

function rows(table: 'entries' | 'assets', name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db
		.prepare(`SELECT * FROM ${table} WHERE user_id = (SELECT id FROM users WHERE name = ?)`)
		.all(name) as Record<string, unknown>[];
	db.close();
	return found;
}

async function chooseType(page: Page, label: string) {
	await page.getByText(label, { exact: true }).click();
}

async function openCategories(page: Page) {
	await page.getByRole('combobox', { name: 'Category' }).click();
	return page.getByRole('listbox').getByRole('option');
}

async function categoryNames(page: Page) {
	const options = await openCategories(page);
	const names = (await options.allTextContents()).map((name) => name.trim());
	await page.keyboard.press('Escape');
	return names;
}

test(
	'adding an expense under grocery with an expense type, an owner, and a note stores it and shows "Added ✓"',
	{ meta: { scenario: 'S33' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/add', cookie);
		await chooseType(page, 'Expense');
		await page.getByLabel('Amount').pressSequentially('50000');
		await page.getByLabel('Date').fill('2026-11-02');
		await (await openCategories(page)).getByText('Grocery', { exact: true }).click();
		await page.getByLabel('Expense type').selectOption('Non-fixed - Essential');
		await page.getByLabel('Expense owner').selectOption('Personal');
		await page.getByLabel('Note (optional)').fill('Weekly shop');

		await page.getByRole('button', { name: 'Add entry' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
		expect(rows('entries', name)).toEqual([
			expect.objectContaining({
				kind: 'expense',
				date: '2026-11-02',
				amount: 50000,
				currency: 'IDR',
				category: 'grocery',
				expense_type: 'Non-fixed - Essential',
				owner: 'Personal',
				note: 'Weekly shop'
			})
		]);
	}
);

test(
	'adding the cash asset savings account worth 12000000 funded by salary stores it and shows "Added ✓"',
	{ meta: { scenario: 'S47' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/add', cookie);
		await chooseType(page, 'Asset / Liability');
		await page.getByLabel('Current value').pressSequentially('12000000');
		await page.getByLabel('Date').fill('2026-11-03');
		await page.getByLabel('Name').fill('Savings account');
		await page.getByLabel('Class').selectOption('Cash');
		await page.getByLabel('Source of fund').selectOption('Salary');

		await page.getByRole('button', { name: 'Add entry' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
		expect(rows('assets', name)).toEqual([
			expect.objectContaining({
				name: 'Savings account',
				class: 'Cash',
				value: 12000000,
				currency: 'IDR',
				source: 'Salary'
			})
		]);
	}
);

test(
	'with income chosen, the category list shows salary, freelance, dividend, bonus, other, and sales of asset',
	{ meta: { scenario: 'S39' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);

		expect(await categoryNames(page)).toEqual(['Salary', 'Freelance', 'Dividend', 'Bonus', 'Other', 'Sales of Asset']);
	}
);

test(
	"with expense chosen, the category list shows the mockup's expense categories",
	{ meta: { scenario: 'S40' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);

		await chooseType(page, 'Expense');

		expect(await categoryNames(page)).toEqual([
			'Grocery',
			'Eating Out',
			'Electricity',
			'Gasoline & Tolls',
			'School Tuition',
			'Phone Credit',
			'Internet',
			'Self Care/Entertainment',
			'Clothes',
			'Sports/Gym',
			'Healthcare',
			'Courses',
			'Gift & Charity',
			'House Maintenance',
			'Car Maintenance',
			'Housekeeping',
			'Birthday/Anniversary/Holiday',
			'Mortgage',
			'Car Installment',
			'Debt Payment',
			'Other Installment'
		]);
	}
);

test(
	'typing pet food into the expense category list and pressing enter selects it as a new category',
	{ meta: { scenario: 'S42' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);
		await chooseType(page, 'Expense');
		await openCategories(page);

		await page.getByPlaceholder('+ New category').fill('Pet Food');
		await page.keyboard.press('Enter');

		await expect
			.poll(() => page.getByRole('combobox', { name: 'Category' }).textContent())
			.toContain('Pet Food');
	}
);

test(
	'typing GROCERY as a new expense category picks the listed grocery, and the list shows one grocery',
	{ meta: { scenario: 'S46' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);
		await chooseType(page, 'Expense');
		const options = await openCategories(page);

		await page.getByPlaceholder('+ New category').fill('GROCERY');

		expect((await options.allTextContents()).map((name) => name.trim())).toEqual(['Grocery']);
	}
);

test(
	'for an account whose default currency is USD, the currency beside the amount reads USD',
	{ meta: { scenario: 'S52' } },
	async () => {
		const { cookie } = await registered();
		await post('/?/settings', { currency: 'USD', startDay: '1' }, cookie);

		const page = await openPage('/add', cookie);

		expect(await page.getByRole('combobox', { name: /^Currency/ }).textContent()).toContain('USD');
	}
);

test(
	"picking SGD beside the amount, then adding an expense, stores SGD as the expense's currency",
	{ meta: { scenario: 'S53' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/add', cookie);
		await chooseType(page, 'Expense');
		await page.getByLabel('Amount').pressSequentially('20000');
		await page.getByRole('combobox', { name: /^Currency/ }).click();
		await page.getByPlaceholder('Search currency').fill('SGD');
		await page.getByRole('option', { name: /^SGD/ }).click();

		await page.getByRole('button', { name: 'Add entry' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
		expect(rows('entries', name)[0].currency).toBe('SGD');
	}
);

test(
	'typing 12500000 into the acquisition value shows 12.500.000',
	{ meta: { scenario: 'S60' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);
		await chooseType(page, 'Asset / Liability');
		const acquisition = page.getByLabel(/^Acquisition value/);

		await acquisition.pressSequentially('12500000');

		expect(await acquisition.inputValue()).toBe('12.500.000');
	}
);

test('adding an expense with a blank amount shows the numbers-only message and keeps the typed note', async () => {
	const { name, cookie } = await registered();
	const page = await openPage('/add', cookie);
	await chooseType(page, 'Expense');
	await page.getByLabel('Note (optional)').fill('Weekly shop');

	await page.getByRole('button', { name: 'Add entry' }).click();

	await expect
		.poll(() => page.getByRole('alert').textContent())
		.toBe('Please enter an amount (numbers only).');
	expect(await page.getByLabel('Amount').getAttribute('aria-invalid')).toBe('true');
	expect(await page.getByLabel('Amount').getAttribute('aria-describedby')).toBe('message');
	expect(await page.getByLabel('Date').getAttribute('aria-invalid')).toBeNull();
	expect(await page.getByLabel('Note (optional)').inputValue()).toBe('Weekly shop');
	expect(rows('entries', name)).toEqual([]);
});

test('choosing the liability class shows the liability term in place of the source of fund', async () => {
	const { cookie } = await registered();
	const page = await openPage('/add', cookie);
	await chooseType(page, 'Asset / Liability');

	await page.getByLabel('Class').selectOption('Liability');

	expect(await page.getByLabel('Liability term').inputValue()).toBe('Long term');
	expect(await page.getByLabel('Source of fund').count()).toBe(0);
});

test('after adding an expense under eating out, the page keeps expense and eating out chosen', async () => {
	const { cookie } = await registered();
	const page = await openPage('/add', cookie);
	await chooseType(page, 'Expense');
	await page.getByLabel('Amount').pressSequentially('50000');
	await (await openCategories(page)).getByText('Eating Out', { exact: true }).click();

	await page.getByRole('button', { name: 'Add entry' }).click();

	await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
	expect(await page.getByRole('radio', { name: 'Expense' }).isChecked()).toBe(true);
	expect(await page.getByRole('combobox', { name: 'Category' }).textContent()).toContain('Eating Out');
});

test('typing 98 after the first digit of 1.250.000 inserts it there and shows 198.250.000', async () => {
	const { cookie } = await registered();
	const page = await openPage('/add', cookie);
	const amount = page.getByLabel('Amount');
	await amount.pressSequentially('1250000');
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowRight');

	await page.keyboard.type('98');

	expect(await amount.inputValue()).toBe('198.250.000');
});

const slashed = (date: Date) =>
	[date.getFullYear(), date.getMonth() + 1, date.getDate()]
		.map((part) => String(part).padStart(2, '0'))
		.join('/');

test(
	"the add page opens with today's date in the date field as YYYY/MM/DD",
	{ meta: { scenario: 'S62' } },
	async () => {
		const { cookie } = await registered();

		const page = await openPage('/add', cookie);

		expect(await page.getByLabel('Date').inputValue()).toBe(slashed(new Date()));
	}
);

test(
	"picking the first day of the shown month in the date field's calendar shows that date as YYYY/MM/DD",
	{ meta: { scenario: 'S64' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);
		const today = new Date();

		await page.getByRole('button', { name: 'Open calendar' }).click();
		await page.getByRole('grid').getByRole('button', { name: /\b1\b/ }).first().click();

		expect(await page.getByLabel('Date').inputValue()).toBe(
			slashed(new Date(today.getFullYear(), today.getMonth(), 1))
		);
	}
);

async function chooseSale(page: Page) {
	await (await openCategories(page)).getByText('Sales of Asset', { exact: true }).click();
}

test(
	'selling car for 150.000.000 stores the proceeds as income and an update of car worth 0 from the sale date',
	{ meta: { scenario: 'S123' } },
	async () => {
		const { name, cookie } = await registered();
		await post(
			'/add',
			{ type: 'asset', date: '2026/10/01', amount: '150.000.000', currency: 'IDR', name: 'Car', cls: 'Other', source: 'Salary' },
			cookie
		);
		const page = await openPage('/add', cookie);
		await chooseSale(page);
		await page.getByLabel('Asset sold').selectOption('Car');
		await page.getByLabel('Amount').pressSequentially('150000000');
		await page.getByLabel('Date').fill('2026-11-03');

		await page.getByRole('button', { name: 'Add entry' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
		expect(rows('entries', name)).toEqual([
			expect.objectContaining({ kind: 'income', date: '2026-11-03', amount: 150000000, category: 'sales of asset' })
		]);
		expect(rows('assets', name)).toContainEqual(
			expect.objectContaining({ name: 'Car', date: '2026-11-03', value: 0, acquisition: 0 })
		);
	}
);

test(
	'for an account without a held asset, the asset sold list reads "No assets recorded yet"',
	{ meta: { scenario: 'S126' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/add', cookie);

		await chooseSale(page);

		expect(await page.getByLabel('Asset sold').locator('option').allTextContents()).toEqual(['No assets recorded yet']);
	}
);
