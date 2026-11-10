import Database from 'better-sqlite3';
import { expect, inject, test } from 'vitest';
import { get, post, registered } from './app';
import { openPage } from './browser';

function rows(table: 'entries' | 'assets', name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db
		.prepare(`SELECT * FROM ${table} WHERE user_id = (SELECT id FROM users WHERE name = ?)`)
		.all(name) as Record<string, unknown>[];
	db.close();
	return found;
}

const expense = {
	type: 'expense',
	date: '2026/11/02',
	amount: '50.000',
	currency: 'IDR',
	category: 'grocery',
	expenseType: 'Non-fixed - Essential',
	owner: 'Personal',
	note: 'Weekly shop'
};

const asset = {
	type: 'asset',
	date: '2026/11/05',
	amount: '12.000.000',
	currency: 'IDR',
	name: 'Savings account',
	cls: 'Cash',
	source: 'Salary',
	note: ''
};

async function withEntries() {
	const account = await registered();
	await post('/add', expense, account.cookie);
	await post('/add', asset, account.cookie);
	return account;
}

async function editGrocery(cookie: string) {
	const page = await openPage('/records', cookie);
	await page.getByRole('row', { name: /Grocery/ }).getByRole('link', { name: 'Edit' }).click();
	await page.waitForURL((url) => url.pathname === '/add');
	return page;
}

test(
	'an expense dated 2026/11/02 and an asset dated 2026/11/05 list the asset first with dates, types, and amounts',
	{ meta: { scenario: 'S87' } },
	async () => {
		const { cookie } = await withEntries();

		const page = await openPage('/records', cookie);
		const table = page.locator('table');

		const text = (await table.textContent())!;
		expect(text.indexOf('2026/11/05')).toBeLessThan(text.indexOf('2026/11/02'));
		const assetRow = page.getByRole('row', { name: /Savings account/ });
		const expenseRow = page.getByRole('row', { name: /Grocery/ });
		expect(await assetRow.textContent()).toMatch(/Asset.*12\.000\.000/s);
		expect(await expenseRow.textContent()).toMatch(/Expense.*50\.000/s);
	}
);

test('the records page reads "Nothing here yet." for an account without entries', { meta: { scenario: 'S92' } }, async () => {
	const { cookie } = await registered();

	const page = await openPage('/records', cookie);

	expect(await page.getByText('Nothing here yet.').isVisible()).toBe(true);
});

test(
	'choosing edit on an expense opens the add page filled, with the button reading "Save changes"',
	{ meta: { scenario: 'S94' } },
	async () => {
		const { cookie } = await withEntries();

		const page = await editGrocery(cookie);

		expect(await page.getByRole('radio', { name: 'Expense' }).isChecked()).toBe(true);
		expect(await page.getByLabel('Date').inputValue()).toBe('2026/11/02');
		expect(await page.getByLabel('Amount').inputValue()).toBe('50.000');
		expect(await page.getByRole('combobox', { name: /^Currency/ }).textContent()).toContain('IDR');
		expect(await page.getByRole('combobox', { name: 'Category' }).textContent()).toContain('Grocery');
		expect(await page.getByLabel('Expense type').inputValue()).toBe('Non-fixed - Essential');
		expect(await page.getByLabel('Expense owner').inputValue()).toBe('Personal');
		expect(await page.getByLabel('Note (optional)').inputValue()).toBe('Weekly shop');
		expect(await page.getByRole('button', { name: 'Save changes' }).isVisible()).toBe(true);
	}
);

test(
	'saving the amount 75.000 on an edited expense stores it on the same entry and opens records',
	{ meta: { scenario: 'S95' } },
	async () => {
		const { name, cookie } = await withEntries();
		const [before] = rows('entries', name);
		const page = await editGrocery(cookie);
		const amount = page.getByLabel('Amount');
		await amount.fill('');
		await amount.pressSequentially('75000');

		await page.getByRole('button', { name: 'Save changes' }).click();
		await page.waitForURL((url) => url.pathname === '/records');

		expect(rows('entries', name)).toEqual([
			expect.objectContaining({ id: before.id, amount: 75000 })
		]);
	}
);

test('"Cancel edit" opens records and leaves the entry unchanged', { meta: { scenario: 'S97' } }, async () => {
	const { name, cookie } = await withEntries();
	const page = await editGrocery(cookie);
	await page.getByLabel('Amount').fill('1');

	await page.getByRole('link', { name: 'Cancel edit' }).click();
	await page.waitForURL((url) => url.pathname === '/records');

	expect(rows('entries', name)[0].amount).toBe(50000);
});

test(
	'deleting an expense removes it from the list and from storage',
	{ meta: { scenario: 'S99' } },
	async () => {
		const { name, cookie } = await withEntries();
		const page = await openPage('/records', cookie);

		await page.getByRole('row', { name: /Grocery/ }).getByRole('button', { name: /^Delete/ }).click();

		await expect.poll(() => page.getByRole('row', { name: /Grocery/ }).count()).toBe(0);
		expect(rows('entries', name)).toEqual([]);
		expect(rows('assets', name)).toHaveLength(1);
	}
);

test(
	'confirming delete all data removes every entry and the list reads "Nothing here yet."',
	{ meta: { scenario: 'S101' } },
	async () => {
		const { name, cookie } = await withEntries();
		const page = await openPage('/records', cookie);

		await page.getByRole('button', { name: 'Delete all data' }).click();
		expect(await page.getByRole('dialog').textContent()).toContain('Delete ALL records? This cannot be undone.');
		await page.getByRole('button', { name: 'Delete all', exact: true }).click();

		await expect.poll(() => page.getByText('Nothing here yet.').isVisible()).toBe(true);
		expect([...rows('entries', name), ...rows('assets', name)]).toEqual([]);
	}
);

test('cancelling the delete all confirmation keeps every entry', { meta: { scenario: 'S102' } }, async () => {
	const { name, cookie } = await withEntries();
	const page = await openPage('/records', cookie);

	await page.getByRole('button', { name: 'Delete all data' }).click();
	await page.getByRole('button', { name: 'Cancel' }).click();

	await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
	expect([...rows('entries', name), ...rows('assets', name)]).toHaveLength(2);
});

test('opening the add page to edit a malformed key answers 404', async () => {
	const { cookie } = await registered();

	const response = await get('/add?edit=x1', cookie);

	expect(response.status).toBe(404);
});

test('opening the add page to edit an entry of another account answers 404', async () => {
	const owner = await withEntries();
	const [entry] = rows('entries', owner.name);
	const { cookie } = await registered();

	const response = await get(`/add?edit=e${entry.id}`, cookie);

	expect(response.status).toBe(404);
});

test('saving changes to an entry of another account answers 404 and keeps the entry', async () => {
	const owner = await withEntries();
	const [entry] = rows('entries', owner.name);
	const { cookie } = await registered();

	const response = await post('/add', { ...expense, amount: '1', id: `e${entry.id}` }, cookie);

	expect(response.status).toBe(404);
	expect(rows('entries', owner.name)[0].amount).toBe(50000);
});

test('tapping an expense row on a phone opens the add page to edit it', async () => {
	const { cookie } = await withEntries();
	const page = await openPage('/records', cookie, 360);

	await page.getByRole('link', { name: /^Edit Grocery/ }).click();
	await page.waitForURL((url) => url.pathname === '/add');

	expect(await page.getByLabel('Amount').inputValue()).toBe('50.000');
	expect(await page.getByRole('button', { name: 'Save changes' }).isVisible()).toBe(true);
});
