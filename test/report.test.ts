import { expect, test } from 'vitest';
import { post, registered } from './app';
import { openPage } from './browser';

test(
	'entries from 2026/08 to 2026/11 show the report columns 2026/09, 2026/10, and 2026/11',
	{ meta: { scenario: 'S105' } },
	async () => {
		const { cookie } = await registered();
		for (const month of ['08', '09', '10', '11']) {
			await post(
				'/add',
				{ type: 'income', date: `2026/${month}/05`, amount: '10.000.000', currency: 'IDR', category: 'salary', note: '' },
				cookie
			);
		}

		const page = await openPage('/report', cookie);
		const flow = page.getByRole('region', { name: 'Income vs Expense Report' });

		expect((await flow.getByRole('columnheader').allTextContents()).map((text) => text.trim())).toEqual([
			'Line',
			'2026/09',
			'2026/10',
			'2026/11'
		]);
		expect(await flow.getByRole('row', { name: /Total Income/ }).textContent()).toContain('10,00');
	}
);

test(
	'on a 360 px wide screen, the income and expense table fades at its right edge until scrolled to its end',
	{ meta: { scenario: 'S121' } },
	async () => {
		const { cookie } = await registered();
		for (const month of ['09', '10', '11']) {
			await post(
				'/add',
				{ type: 'income', date: `2026/${month}/05`, amount: '125.000.000', currency: 'IDR', category: 'salary', note: '' },
				cookie
			);
		}
		const page = await openPage('/report', cookie, 360);
		const flow = page.getByRole('region', { name: 'Income vs Expense Report' });
		const fade = flow.locator('[aria-hidden="true"]').last();
		const opacity = () => fade.evaluate((element) => getComputedStyle(element).opacity);

		expect(await opacity()).toBe('1');
		await flow.locator('.overflow-x-auto').evaluate((scroller) => scroller.scrollTo({ left: scroller.scrollWidth }));

		await expect.poll(opacity).toBe('0');
	}
);

test('expenses of 2.000.000 against an income of 1.000.000 show a remaining amount of −1,00 in the out tone', async () => {
	const { cookie } = await registered();
	await post(
		'/add',
		{ type: 'income', date: '2026/11/05', amount: '1.000.000', currency: 'IDR', category: 'salary', note: '' },
		cookie
	);
	await post(
		'/add',
		{ type: 'expense', date: '2026/11/06', amount: '2.000.000', currency: 'IDR', category: 'grocery', expenseType: 'Non-fixed - Essential', owner: 'Personal', note: '' },
		cookie
	);

	const page = await openPage('/report', cookie);
	const remaining = page.getByRole('row', { name: /Remaining Amount/ }).getByRole('cell').last();

	expect([await remaining.textContent(), await remaining.getAttribute('class')]).toEqual([
		'−1,00',
		expect.stringContaining('text-out')
	]);
});

test('an account with a cash asset sees the asset report with its cash value', async () => {
	const { cookie } = await registered();
	await post(
		'/add',
		{ type: 'asset', date: '2026/11/05', amount: '10.000.000', currency: 'IDR', name: 'Savings account', cls: 'Cash', source: 'Salary', note: '' },
		cookie
	);

	const page = await openPage('/report', cookie);
	const worth = page.getByRole('region', { name: 'Asset Report (market value unless stated)' });

	await expect
		.poll(() => worth.getByRole('row', { name: /Total Assets/ }).textContent())
		.toContain('10,00');
});

test('with the default currency USD, the report names USD under its title and in its notes', async () => {
	const { cookie } = await registered();
	await post('/?/settings', { currency: 'USD', startDay: '1' }, cookie);
	await post(
		'/add',
		{ type: 'income', date: '2026/11/05', amount: '1.000.000', currency: 'USD', category: 'salary', note: '' },
		cookie
	);

	const page = await openPage('/report', cookie);
	const notes = page.getByRole('region', { name: 'How the numbers are built' });

	expect([
		await page.getByText('The last 3 reporting months, in millions of USD').isVisible(),
		await notes.getByText('are in millions of USD, the default currency.').isVisible()
	]).toEqual([true, true]);
});

test('a new account opening the report reads "No data yet."', { meta: { scenario: 'S119' } }, async () => {
	const { cookie } = await registered();

	const page = await openPage('/report', cookie);

	expect(await page.getByText('No data yet.').isVisible()).toBe(true);
});
