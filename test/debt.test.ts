import Database from 'better-sqlite3';
import type { Page } from 'playwright';
import { expect, inject, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';
import { addHolding } from './holdings';

const carDebt = {
	type: 'debt',
	category: 'Car installment',
	amount: '150.000.000',
	tenor: '36',
	paymentType: 'Monthly',
	start: '2025/06/25',
	end: '2028/05/25',
	installment: '5.200.000'
};

function query(sql: string, name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db.prepare(sql).all(name) as Record<string, unknown>[];
	db.close();
	return found;
}

const debts = (name: string) =>
	query('SELECT * FROM diary_debts WHERE user_id = (SELECT id FROM users WHERE name = ?)', name);

const payments = (name: string) =>
	query(
		`SELECT month, paid_date FROM diary_debt_payments JOIN diary_debts ON diary_debts.id = debt_id
		WHERE user_id = (SELECT id FROM users WHERE name = ?)`,
		name
	);

const localDay = () => {
	const now = new Date();
	return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
};

async function fillDebt(page: Page, fields: Partial<typeof carDebt> = {}) {
	const debt = { ...carDebt, ...fields };
	await page.getByLabel('Debt category').selectOption(debt.category);
	await page.getByLabel('Debt amount (IDR)').fill(debt.amount);
	await page.getByLabel('Tenor (months)').fill(debt.tenor);
	await page.getByLabel('Payment type').selectOption(debt.paymentType);
	await page.getByLabel('Start payment').fill(debt.start);
	await page.getByLabel('End payment').fill(debt.end);
	await page.getByLabel('Installment amount (IDR)').fill(debt.installment);
}

const openDebtTab = (cookie: string, view = 'add') => openPage(`/diary?tab=debt&view=${view}`, cookie);

test(
	'saving a monthly car installment debt stores DBT-0001 and shows "Saved DBT-0001 ✓"',
	{ meta: { scenario: 'S48' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openDebtTab(cookie);
		await fillDebt(page);

		await page.getByRole('button', { name: 'Save debt' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved DBT-0001 ✓');
		expect(debts(name)).toEqual([
			expect.objectContaining({
				code: 'DBT-0001',
				category: 'Car installment',
				amount: 150000000,
				tenor: 36,
				payment_type: 'Monthly',
				start: '2025-06-25',
				end: '2028-05-25',
				installment: 5200000
			})
		]);
	}
);

test(
	'the form totals 36 monthly installments of 5.200.000 on 150.000.000 with a flat interest of 24.8%',
	{ meta: { scenario: 'S217' } },
	async () => {
		const { cookie } = await registered();
		const page = await openDebtTab(cookie);

		await fillDebt(page);

		const total = page.getByRole('group', { name: 'Total debt & interest' });
		expect(await total.getByText('IDR 187.200.000').isVisible()).toBe(true);
		expect(await total.getByText('Installment × 36 payments').isVisible()).toBe(true);
		expect(await page.getByRole('group', { name: 'Interest (flat)' }).getByText('24.8%').isVisible()).toBe(true);
	}
);

test(
	'weekly over 12 months counts 48 payments, and daily over 1 month counts 30',
	{ meta: { scenario: 'S218' } },
	async () => {
		const { cookie } = await registered();
		const page = await openDebtTab(cookie);
		await fillDebt(page, { tenor: '12', paymentType: 'Weekly' });
		const weekly = await page.getByText(/^Installment × \d+ payments$/).textContent();

		await page.getByLabel('Tenor (months)').fill('1');
		await page.getByLabel('Payment type').selectOption('Daily');

		expect([weekly, await page.getByText(/^Installment × \d+ payments$/).textContent()]).toEqual([
			'Installment × 48 payments',
			'Installment × 30 payments'
		]);
	}
);

test(
	'an end payment off the schedule warns with the expected date, and the debt still saves',
	{ meta: { scenario: 'S219' } },
	async () => {
		const { name, cookie } = await registered();
		const page = await openDebtTab(cookie);
		await fillDebt(page, { end: '2028/06/25' });

		expect(await page.getByText('The end payment differs from start + tenor (2028/05/25).').isVisible()).toBe(true);
		await page.getByRole('button', { name: 'Save debt' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved DBT-0001 ✓');
		expect(debts(name)).toHaveLength(1);
	}
);

test('the debt category and payment type lists follow the spec', { meta: { scenario: 'S220' } }, async () => {
	const { cookie } = await registered();
	const page = await openDebtTab(cookie);

	expect([
		await page.getByLabel('Debt category').locator('option').allTextContents(),
		await page.getByLabel('Payment type').locator('option').allTextContents()
	]).toEqual([
		['Credit card', 'Mortgage', 'Car installment', 'Non-collateral loan', 'Other loan'],
		['Daily', 'Weekly', 'Monthly']
	]);
});

test(
	'choosing edit on DBT-0001 in records opens additional debt filled with a "Save changes" button',
	{ meta: { scenario: 'S222' } },
	async () => {
		const { cookie } = await registered();
		await post('/diary', carDebt, cookie);
		const page = await openPage('/records', cookie);

		await page.getByRole('row', { name: /DBT-0001/ }).getByRole('link', { name: 'Edit' }).click();
		await page.waitForURL((url) => url.pathname === '/diary');

		expect([
			await page.getByLabel('Debt category').inputValue(),
			await page.getByLabel('Debt amount (IDR)').inputValue(),
			await page.getByLabel('Tenor (months)').inputValue(),
			await page.getByLabel('Payment type').inputValue(),
			await page.getByLabel('Start payment').inputValue(),
			await page.getByLabel('End payment').inputValue(),
			await page.getByLabel('Installment amount (IDR)').inputValue()
		]).toEqual(['Car installment', '150.000.000', '36', 'Monthly', '2025/06/25', '2028/05/25', '5.200.000']);
		expect(await page.getByRole('button', { name: 'Save changes' }).isVisible()).toBe(true);
	}
);

test(
	'an old liability lists in records with a delete button and no edit button',
	{ meta: { scenario: 'S224' } },
	async () => {
		const { cookie } = await registered();
		await addHolding(cookie, { date: '2026/11/05', name: 'Mortgage loan', amount: '300.000.000', cls: 'Liability', term: 'Long term' });
		const page = await openPage('/records', cookie);
		const row = page.getByRole('row', { name: /Mortgage loan/ });

		expect([await row.getByRole('button', { name: 'Delete' }).count(), await row.getByRole('link', { name: 'Edit' }).count()]).toEqual([1, 0]);
	}
);

test(
	'ticking DBT-0001 for the current month and saving stores its payment paid today',
	{ meta: { scenario: 'S230' } },
	async () => {
		const { name, cookie } = await registered();
		await post('/diary', carDebt, cookie);
		const page = await openDebtTab(cookie, 'payments');

		await page.getByLabel('DBT-0001 paid').check();
		await page.getByRole('button', { name: 'Save payments' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved ✓');
		expect(await page.getByLabel('DBT-0001 paid').isChecked()).toBe(true);
		expect(payments(name)).toEqual([{ month: localDay().slice(0, 7), paid_date: localDay() }]);
	}
);

test('ticking DBT-0001 fills its paid date with today', { meta: { scenario: 'S294' } }, async () => {
	const { cookie } = await registered();
	await post('/diary', carDebt, cookie);
	const page = await openDebtTab(cookie, 'payments');

	await page.getByLabel('DBT-0001 paid').check();

	expect(await page.getByLabel('Paid date of DBT-0001').inputValue()).toBe(localDay().replaceAll('-', '/'));
});

test(
	'ticking DBT-0001, typing the paid date 2026/11/20, and saving stores that date and reopens with it',
	{ meta: { scenario: 'S295' } },
	async () => {
		const { name, cookie } = await registered();
		await post('/diary', carDebt, cookie);
		const page = await openDebtTab(cookie, 'payments');

		await page.getByLabel('DBT-0001 paid').check();
		await page.getByLabel('Paid date of DBT-0001').fill('20261120');
		await page.getByRole('button', { name: 'Save payments' }).click();

		await expect.poll(() => page.getByRole('status').textContent()).toBe('Saved ✓');
		expect(payments(name)).toEqual([{ month: localDay().slice(0, 7), paid_date: '2026-11-20' }]);
		await page.reload();
		expect(await page.getByLabel('Paid date of DBT-0001').inputValue()).toBe('2026/11/20');
	}
);

test('unticking DBT-0001 empties its paid date', { meta: { scenario: 'S297' } }, async () => {
	const { cookie } = await registered();
	await post('/diary', carDebt, cookie);
	const page = await openDebtTab(cookie, 'payments');
	await page.getByLabel('DBT-0001 paid').check();

	await page.getByLabel('DBT-0001 paid').uncheck();

	expect(await page.getByLabel('Paid date of DBT-0001').inputValue()).toBe('');
});

test('a ticked row with an impossible paid date shows "Please pick a date."', async () => {
	const { cookie } = await registered();
	await post('/diary', carDebt, cookie);
	const page = await openDebtTab(cookie, 'payments');

	await page.getByLabel('DBT-0001 paid').check();
	await page.getByLabel('Paid date of DBT-0001').fill('20260230');
	await page.getByRole('button', { name: 'Save payments' }).click();

	await expect.poll(() => page.getByText('Please pick a date.').isVisible()).toBe(true);
});

test(
	'a new account reads "No debts yet. Save an additional debt first." on debt payment',
	{ meta: { scenario: 'S233' } },
	async () => {
		const { cookie } = await registered();
		const page = await openDebtTab(cookie, 'payments');

		expect(await page.getByText('No debts yet. Save an additional debt first.').isVisible()).toBe(true);
	}
);

test('choosing an earlier reporting month shows that month', async () => {
	const { cookie } = await registered();
	await post('/diary', carDebt, cookie);
	const page = await openDebtTab(cookie, 'payments');
	const earlier = await page.getByLabel('Reporting month').locator('option').nth(1).getAttribute('value');

	await page.getByLabel('Reporting month').selectOption(earlier!);
	await page.waitForURL((url) => url.searchParams.get('month') === earlier);

	expect(await page.getByLabel('Reporting month').inputValue()).toBe(earlier);
});
