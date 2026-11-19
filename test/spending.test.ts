import Database from 'better-sqlite3';
import { expect, inject, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';

function query(sql: string, name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db.prepare(sql).all(name) as Record<string, unknown>[];
	db.close();
	return found;
}

const house = (cookie: string) =>
	post('/plan?/save', { tab: 'saving', dream: 'House', amount: '120.000.000', currency: 'IDR', months: '24', start: '2026/01/01' }, cookie);

const dreamOf = (name: string) =>
	String(query('SELECT id FROM plan_savings WHERE user_id = (SELECT id FROM users WHERE name = ?)', name)[0].id);

const pad = (n: number) => String(n).padStart(2, '0');

test(
	'the spending report opens on last month, the previous reporting month',
	{ meta: { scenario: 'S239' } },
	async () => {
		const { cookie } = await registered();
		await post('/diary', { type: 'income', date: '2026/11/05', amount: '1', currency: 'IDR', category: 'salary', note: '' }, cookie);
		const now = new Date();
		const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const last = new Date(now.getFullYear(), now.getMonth(), 0);
		const slash = (date: Date) => `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

		const page = await openPage('/snapshot', cookie);

		expect(await page.getByLabel('Period').inputValue()).toBe('lastmonth');
		expect(await page.getByText(`${slash(first)} – ${slash(last)}`).isVisible()).toBe(true);
	}
);

test(
	'a diary salary of 9.000.000 against a plan salary of 10.000.000 reads the shortfall in the out tone, beside its note',
	{ meta: { scenario: 'S246' } },
	async () => {
		const { cookie } = await registered();
		await post('/diary', { type: 'income', date: '2026/11/05', amount: '9.000.000', currency: 'IDR', category: 'salary', note: '' }, cookie);
		await post('/plan?/save', { tab: 'income', amount: '10.000.000', currency: 'IDR', timeframe: 'monthly', category: 'Salary', note: '' }, cookie);

		const page = await openPage('/snapshot?period=between&from=2026/11/01&to=2026/11/30', cookie);
		const cells = page.getByRole('row', { name: /^Salary/ }).getByRole('cell');

		expect((await cells.allTextContents()).slice(0, 4)).toEqual(['9.000.000', '10.000.000', '−1.000.000', '−10.0%']);
		expect(await cells.nth(2).getAttribute('class')).toContain('text-out');
	}
);

test(
	'the snapshot opens on the spending report, and monthly report shows the last three months',
	{ meta: { scenario: 'S259' } },
	async () => {
		const { cookie } = await registered();
		await post('/diary', { type: 'income', date: '2026/11/05', amount: '1', currency: 'IDR', category: 'salary', note: '' }, cookie);
		const page = await openPage('/snapshot', cookie);
		const spending = await page.getByRole('link', { name: 'Spending Report' }).getAttribute('aria-current');

		await page.getByRole('link', { name: 'Monthly report' }).click();
		await page.waitForURL((url) => url.searchParams.get('view') === 'monthly');

		expect(spending).toBe('page');
		expect(await page.getByRole('columnheader', { name: '2026/11' }).first().isVisible()).toBe(true);
	}
);

test(
	'linked dream lists none and each plan dream, and a purchase linked to house stores the link',
	{ meta: { scenario: 'S256' } },
	async () => {
		const { name, cookie } = await registered();
		await house(cookie);
		const page = await openPage('/diary?tab=asset', cookie);
		const options = await page.getByLabel('Linked dream').locator('option').allTextContents();
		await page.getByLabel('Unit', { exact: true }).fill('1');
		await page.getByLabel('Acquisition cost (IDR)').fill('2.000.000');
		await page.getByLabel('Linked dream').selectOption({ label: 'House' });

		await page.getByRole('button', { name: 'Save purchase' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved AST-0001 ✓');
		expect(options).toEqual(['None', 'House']);
		expect(query('SELECT dream_id FROM diary_assets WHERE user_id = (SELECT id FROM users WHERE name = ?)', name)).toEqual([
			{ dream_id: Number(dreamOf(name)) }
		]);
	}
);

test(
	'editing a purchase linked to house opens it with house chosen',
	{ meta: { scenario: 'S257' } },
	async () => {
		const { name, cookie } = await registered();
		await house(cookie);
		await post(
			'/diary',
			{ type: 'asset', date: '2026/11/10', cls: 'Cash', source: 'Salary', unit: '1', unitCurrency: 'IDR', amount: '2.000.000', currency: 'IDR', note: 'Down payment', dream: dreamOf(name) },
			cookie
		);
		const page = await openPage('/records', cookie);

		await page.getByRole('row', { name: /AST-0001/ }).getByRole('link', { name: 'Edit' }).click();
		await page.waitForURL((url) => url.pathname === '/diary');

		expect(await page.getByLabel('Linked dream').locator('option:checked').textContent()).toBe('House');
	}
);

test(
	'typing a note into eating out on last month, then saving the notes, shows "Saved ✓" and the report reopens with the note',
	{ meta: { scenario: 'S278' } },
	async () => {
		const { cookie } = await registered();
		const now = new Date();
		const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const date = `${first.getFullYear()}/${pad(first.getMonth() + 1)}/01`;
		await post('/diary', { type: 'expense', date, amount: '400.000', currency: 'IDR', category: 'eating out', expenseType: 'Non-fixed - Non-essential', owner: 'Personal', note: '' }, cookie);
		const page = await openPage('/snapshot', cookie);
		await page.getByRole('textbox', { name: /Eating Out$/ }).fill('Birthday party');

		await page.getByRole('button', { name: 'Save notes' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved ✓');
		const reopened = await openPage('/snapshot', cookie);
		expect(await reopened.getByRole('textbox', { name: /Eating Out$/ }).inputValue()).toBe('Birthday party');
	}
);
