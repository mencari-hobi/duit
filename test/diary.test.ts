import Database from 'better-sqlite3';
import type { Page } from 'playwright';
import { expect, inject, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';
import { addHolding } from './holdings';

function rows(table: 'entries' | 'assets', name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db
		.prepare(`SELECT * FROM diary_${table} WHERE user_id = (SELECT id FROM users WHERE name = ?)`)
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
		const page = await openPage('/diary', cookie);
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
	'with income chosen, the category list shows salary, freelance, dividend, bonus, other, and sales of asset',
	{ meta: { scenario: 'S39' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/diary', cookie);

		expect(await categoryNames(page)).toEqual(['Salary', 'Freelance', 'Dividend', 'Bonus', 'Other', 'Sales of Asset']);
	}
);

const expenseDefaults = [
	['Grocery', 'Non-fixed - Essential'],
	['Eating Out', 'Non-fixed - Non-essential'],
	['Electricity', 'Non-fixed - Essential'],
	['Gasoline & Tolls', 'Non-fixed - Essential'],
	['School Tuition', 'Fixed - Essential'],
	['Phone Credit', 'Fixed - Essential'],
	['Internet', 'Fixed - Essential'],
	['Self Care/Entertainment', 'Non-fixed - Non-essential'],
	['Clothes', 'Non-fixed - Non-essential'],
	['Sports/Gym', 'Fixed - Non-essential'],
	['Healthcare', 'Non-fixed - Essential'],
	['Courses', 'Non-fixed - Non-essential'],
	['Gift & Charity', 'Non-fixed - Non-essential'],
	['House Maintenance', 'Non-fixed - Essential'],
	['Car Maintenance', 'Non-fixed - Essential'],
	['Housekeeping', 'Fixed - Non-essential'],
	['Birthday/Anniversary/Holiday', 'Non-fixed - Non-essential']
];

async function openExpenseForm() {
	const account = await registered();
	const page = await openPage('/diary', account.cookie);
	await chooseType(page, 'Expense');
	return { ...account, page };
}

async function chooseCategory(page: Page, name: string) {
	await (await openCategories(page)).getByText(name, { exact: true }).click();
}

test(
	"with expense chosen, a new account's category list shows the spec's 17 expense categories and lacks the installments",
	{ meta: { scenario: 'S40' } },
	async () => {
		const { page } = await openExpenseForm();

		expect(await categoryNames(page)).toEqual(expenseDefaults.map(([category]) => category));
	}
);

test(
	'the expense form opens with grocery and its default expense type chosen',
	{ meta: { scenario: 'S142' } },
	async () => {
		const { page } = await openExpenseForm();

		expect(await page.getByRole('combobox', { name: 'Category' }).textContent()).toContain('Grocery');
		expect(await page.getByLabel('Expense type').inputValue()).toBe('Non-fixed - Essential');
	}
);

test(
	'each listed expense category fills the expense type the settings sheet pairs with it',
	{ meta: { scenario: 'S143' } },
	async () => {
		const { page } = await openExpenseForm();
		const filled: string[][] = [];

		for (const [category] of expenseDefaults) {
			await chooseCategory(page, category);
			filled.push([category, await page.getByLabel('Expense type').inputValue()]);
		}

		expect(filled).toEqual(expenseDefaults);
	}
);

test(
	'choosing the new category pet food keeps the expense type chosen before it',
	{ meta: { scenario: 'S144' } },
	async () => {
		const { page } = await openExpenseForm();
		await chooseCategory(page, 'School Tuition');
		await openCategories(page);

		await page.getByPlaceholder('+ New category').fill('Pet Food');
		await page.keyboard.press('Enter');

		await expect
			.poll(() => page.getByRole('combobox', { name: 'Category' }).textContent())
			.toContain('Pet Food');
		expect(await page.getByLabel('Expense type').inputValue()).toBe('Fixed - Essential');
	}
);

test(
	'changing the filled expense type of grocery, then adding the expense, stores the changed type',
	{ meta: { scenario: 'S145' } },
	async () => {
		const { name, page } = await openExpenseForm();
		await page.getByLabel('Amount').pressSequentially('50000');

		await page.getByLabel('Expense type').selectOption('Fixed - Non-essential');
		await page.getByRole('button', { name: 'Add entry' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Added ✓');
		expect(rows('entries', name)).toEqual([
			expect.objectContaining({ category: 'grocery', expense_type: 'Fixed - Non-essential' })
		]);
	}
);

test(
	'editing a grocery expense stored with another expense type opens with the stored type',
	{ meta: { scenario: 'S146' } },
	async () => {
		const { name, cookie } = await registered();
		await post(
			'/diary',
			{ type: 'expense', date: '2026/11/02', amount: '50.000', currency: 'IDR', category: 'grocery', expenseType: 'Fixed - Non-essential', owner: 'Personal', note: '' },
			cookie
		);
		const [entry] = rows('entries', name);

		const page = await openPage(`/diary?edit=e${entry.id}`, cookie);

		expect(await page.getByLabel('Expense type').inputValue()).toBe('Fixed - Non-essential');
	}
);

test(
	'the expense owner list follows the spec',
	{ meta: { scenario: 'S147' } },
	async () => {
		const { page } = await openExpenseForm();

		const owners = await page.getByLabel('Expense owner').locator('option').allTextContents();

		expect(owners).toEqual(['Personal', 'Children', 'Spouse', 'Family', 'Extended Family', 'Friends', 'Other']);
	}
);

test(
	'typing pet food into the expense category list and pressing enter selects it as a new category',
	{ meta: { scenario: 'S42' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/diary', cookie);
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
		const page = await openPage('/diary', cookie);
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

		const page = await openPage('/diary', cookie);

		expect(await page.getByRole('combobox', { name: /^Currency/ }).textContent()).toContain('USD');
	}
);

test(
	"picking SGD beside the amount, then adding an expense, stores SGD as the expense's currency",
	{ meta: { scenario: 'S53' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/diary', cookie);
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

test('adding an expense with a blank amount shows the numbers-only message and keeps the typed note', async () => {
	const { name, cookie } = await registered();
	const page = await openPage('/diary', cookie);
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

test('after adding an expense under eating out, the page keeps expense and eating out chosen', async () => {
	const { cookie } = await registered();
	const page = await openPage('/diary', cookie);
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
	const page = await openPage('/diary', cookie);
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
	"the financial diary page opens with today's date in the date field as YYYY/MM/DD",
	{ meta: { scenario: 'S62' } },
	async () => {
		const { cookie } = await registered();

		const page = await openPage('/diary', cookie);

		expect(await page.getByLabel('Date').inputValue()).toBe(slashed(new Date()));
	}
);

test(
	"picking the first day of the shown month in the date field's calendar shows that date as YYYY/MM/DD",
	{ meta: { scenario: 'S64' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/diary', cookie);
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
		await addHolding(cookie, { date: '2026/10/01', amount: '150.000.000', name: 'Car', cls: 'Other' });
		const page = await openPage('/diary', cookie);
		await chooseSale(page);
		await page.getByLabel('Asset sold').selectOption({ label: 'AST-0001 · Car' });
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
		const page = await openPage('/diary', cookie);

		await chooseSale(page);

		expect(await page.getByLabel('Asset sold').locator('option').allTextContents()).toEqual(['No assets recorded yet']);
	}
);


async function openAssetTab(cookie: string, view = 'purchase') {
	const page = await openPage(`/diary?tab=asset&view=${view}`, cookie);
	return page;
}

test(
	'saving a gold purchase of 25 gr for 62.500.000 stores AST-0001 at its cost and shows "Saved AST-0001 ✓"',
	{ meta: { scenario: 'S47' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openPage('/diary', cookie);
		await chooseType(page, 'Asset');
		await page.getByLabel('Purchase date').fill('2026/11/12');
		await page.getByLabel('Asset type').selectOption('Gold');
		await page.getByLabel('Source').selectOption('Bonus');
		await page.getByLabel('Unit (gr)').pressSequentially('25');
		await page.getByLabel('Acquisition cost (IDR)').pressSequentially('62500000');
		await page.getByLabel('Note (optional)').fill('Antam bar');

		await page.getByRole('button', { name: 'Save purchase' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved AST-0001 ✓');
		expect(rows('assets', name)).toEqual([
			expect.objectContaining({
				code: 'AST-0001',
				name: 'Antam bar',
				class: 'Gold',
				date: '2026-11-12',
				source: 'Bonus',
				unit: 25,
				value: 62500000,
				acquisition: 62500000,
				currency: 'IDR'
			})
		]);
	}
);

test('the unit follows the asset type', { meta: { scenario: 'S193' } }, async () => {
	const { cookie } = await registered();
	const page = await openAssetTab(cookie);
	const unitLabels: string[][] = [];

	for (const type of ['Gold', 'Property & Land', 'Stock', 'Mutual Fund', 'Other', 'Cash', 'Term Deposit', 'Foreign Exchanges', 'Bond']) {
		await page.getByLabel('Asset type').selectOption(type);
		const currency = await page.getByLabel('Unit currency').count();
		unitLabels.push([type, (await page.locator('label[for="unit"]').textContent())!.trim(), currency ? 'currency' : '']);
	}

	expect(unitLabels).toEqual([
		['Gold', 'Unit (gr)', ''],
		['Property & Land', 'Unit (sqm)', ''],
		['Stock', 'Unit (lot)', ''],
		['Mutual Fund', 'Unit (unit)', ''],
		['Other', 'Unit (unit)', ''],
		['Cash', 'Unit', 'currency'],
		['Term Deposit', 'Unit', 'currency'],
		['Foreign Exchanges', 'Unit', 'currency'],
		['Bond', 'Unit', 'currency']
	]);
});

test(
	'an acquisition cost of 62.500.000 for 25 gr reads "IDR 2.500.000 per gr" under cost per unit',
	{ meta: { scenario: 'S194' } },
	async () => {
		const { cookie } = await registered();
		const page = await openAssetTab(cookie);
		await page.getByLabel('Asset type').selectOption('Gold');

		await page.getByLabel('Unit (gr)').pressSequentially('25');
		await page.getByLabel('Acquisition cost (IDR)').pressSequentially('62500000');

		await expect.poll(() => page.getByText('IDR 2.500.000 per gr').isVisible()).toBe(true);
	}
);

test('the purchase lists follow the spec', { meta: { scenario: 'S195' } }, async () => {
	const { cookie } = await registered();
	const page = await openAssetTab(cookie);

	expect(await page.getByLabel('Asset type').locator('option').allTextContents()).toEqual([
		'Cash',
		'Term Deposit',
		'Foreign Exchanges',
		'Mutual Fund',
		'Bond',
		'Stock',
		'Gold',
		'Property & Land',
		'Other'
	]);
	expect(await page.getByLabel('Source').locator('option').allTextContents()).toEqual([
		'Salary',
		'Freelance',
		'Dividend',
		'Bonus',
		'Other',
		'Debt'
	]);
});

const goldPurchase = { type: 'asset', date: '2026/11/12', cls: 'Gold', source: 'Bonus', unit: '25', amount: '62.500.000', currency: 'IDR', note: 'Antam bar' };

test(
	'choosing edit on the purchase of AST-0001 in records opens the purchase form filled, with "Save changes"',
	{ meta: { scenario: 'S196' } },
	async () => {
		const { cookie } = await registered();
		await post('/diary', goldPurchase, cookie);
		const page = await openPage('/records', cookie);

		await page.getByRole('row', { name: /AST-0001/ }).getByRole('link', { name: 'Edit' }).click();
		await page.waitForURL((url) => url.searchParams.has('edit'));

		expect(await page.getByLabel('Purchase date').inputValue()).toBe('2026/11/12');
		expect(await page.getByLabel('Asset type').inputValue()).toBe('Gold');
		expect(await page.getByLabel('Source').inputValue()).toBe('Bonus');
		expect(await page.getByLabel('Unit (gr)').inputValue()).toBe('25');
		expect(await page.getByLabel('Acquisition cost (IDR)').inputValue()).toBe('62.500.000');
		expect(await page.getByLabel('Note (optional)').inputValue()).toBe('Antam bar');
		expect(await page.getByRole('button', { name: 'Save changes' }).isVisible()).toBe(true);
	}
);

test(
	'saving 70.000.000 as of 2026/11/30 on the asset list adds an update of AST-0001',
	{ meta: { scenario: 'S203' } },
	async () => {
		const { name, cookie } = await registered();
		await post('/diary', goldPurchase, cookie);
		const page = await openPage('/diary', cookie);
		await chooseType(page, 'Asset');
		await page.getByRole('link', { name: 'Asset list & update' }).click();
		await page.waitForURL((url) => url.searchParams.get('view') === 'list');

		await page.getByLabel('Value as of, AST-0001').fill('2026/11/30');
		await page.getByLabel('Market value, AST-0001').pressSequentially('70000000');
		await page.getByRole('button', { name: 'Save updates' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved ✓');
		expect(rows('assets', name).map((row) => [row.code, row.date, row.value])).toEqual([
			['AST-0001', '2026-11-12', 62500000],
			['AST-0001', '2026-11-30', 70000000]
		]);
		expect(await page.getByRole('row', { name: /AST-0001/ }).textContent()).toContain('+7.500.000');
	}
);

test(
	'a new account\'s asset list reads "No assets yet. Save a purchase first."',
	{ meta: { scenario: 'S206' } },
	async () => {
		const { cookie } = await registered();

		const page = await openAssetTab(cookie, 'list');

		expect(await page.getByText('No assets yet. Save a purchase first.').isVisible()).toBe(true);
	}
);

