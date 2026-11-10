import { beforeEach, expect, test } from 'vitest';
import { millions } from '#lib/report.ts';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { addEntry } from './entries';
import { loadReport } from './report';
import { saveSettings } from './settings';

let db: Db;
let alice: number;

beforeEach(() => {
	db = openDatabase(':memory:');
	const result = register(db, 'alice', 'password1');
	if (!('user' in result)) throw new Error(result.message);
	alice = result.user.id;
});

function income(date: string, amount: string, category = 'salary') {
	addEntry(db, alice, { type: 'income', date, amount, currency: 'IDR', category });
}

function expense(date: string, amount: string, fields: Record<string, string> = {}) {
	addEntry(db, alice, {
		type: 'expense',
		date,
		amount,
		currency: 'IDR',
		category: 'grocery',
		expenseType: 'Non-fixed - Essential',
		owner: 'Personal',
		...fields
	});
}

function asset(date: string, name: string, amount: string, fields: Record<string, string> = {}) {
	addEntry(db, alice, {
		type: 'asset',
		date,
		name,
		amount,
		currency: 'IDR',
		cls: 'Cash',
		source: 'Salary',
		...fields
	});
}

function line(label: string) {
	const report = loadReport(db, alice)!;
	const found = report.sections.flatMap((section) => section.lines).find((row) => row.label === label);
	if (!found) throw new Error(`no line ${label}`);
	return found.values.at(-1);
}

test(
	'entries from 2026/08 to 2026/11 give the columns 2026/09, 2026/10, and 2026/11',
	{ meta: { scenario: 'S105' } },
	() => {
		for (const month of ['08', '09', '10', '11']) expense(`2026/${month}/05`, '1.000.000');

		expect(loadReport(db, alice)!.months).toEqual(['2026/09', '2026/10', '2026/11']);
	}
);

test(
	'with the reporting start day 25, an expense dated 2026/10/25 counts in the column 2026/11',
	{ meta: { scenario: 'S106' } },
	() => {
		saveSettings(db, alice, { currency: 'IDR', startDay: '25' });
		expense('2026/10/25', '1.000.000');

		expect(loadReport(db, alice)!.months).toEqual(['2026/11']);
	}
);

test(
	'incomes under salary and bonus read total income with each category under it',
	{ meta: { scenario: 'S107' } },
	() => {
		income('2026/11/01', '8.000.000');
		income('2026/11/02', '2.000.000', 'bonus');

		expect([line('Total Income'), line('Salary'), line('Bonus')]).toEqual([10000000, 8000000, 2000000]);
	}
);

test(
	'an expense under mortgage as fixed essential reads total expense with its type and category under it',
	{ meta: { scenario: 'S108' } },
	() => {
		expense('2026/11/03', '3.000.000', { category: 'mortgage', expenseType: 'Fixed - Essential' });

		expect([line('Total Expense'), line('Fixed - Essential'), line('Mortgage')]).toEqual([
			3000000, 3000000, 3000000
		]);
	}
);

test(
	'a cash asset funded by salary growing by 2.000.000 reads total saving 2.000.000, and a debt-funded asset stays out',
	{ meta: { scenario: 'S109' } },
	() => {
		asset('2026/10/01', 'Savings account', '10.000.000');
		asset('2026/10/01', 'Car', '5.000.000', { cls: 'Other', source: 'Debt' });
		asset('2026/11/01', 'Savings account', '12.000.000');
		asset('2026/11/01', 'Car', '6.000.000', { cls: 'Other', source: 'Debt' });

		expect([line('Total Saving'), line('Cash')]).toEqual([2000000, 2000000]);
	}
);

test(
	'income of 10.000.000, saving of 2.000.000, and expenses of 4.000.000 leave a remaining amount of 4.000.000',
	{ meta: { scenario: 'S110' } },
	() => {
		asset('2026/10/01', 'Savings account', '10.000.000');
		income('2026/11/01', '10.000.000');
		asset('2026/11/01', 'Savings account', '12.000.000');
		expense('2026/11/03', '4.000.000');

		expect(line('Remaining Amount (income − saving − expense)')).toBe(4000000);
	}
);

test(
	'a cash asset of 6.000.000 and a property asset of 2.000.000 read liquid, non-liquid, and total assets',
	{ meta: { scenario: 'S111' } },
	() => {
		asset('2026/11/01', 'Savings account', '6.000.000');
		asset('2026/11/01', 'Land', '2.000.000', { cls: 'Property' });

		expect([
			line('Liquid assets'),
			line('Non-liquid assets'),
			line('Total Assets (market value)')
		]).toEqual([6000000, 2000000, 8000000]);
	}
);

test(
	'an asset worth 12.000.000 bought for 10.000.000 reads a capital gain of 2.000.000, 20% of its acquisition value',
	{ meta: { scenario: 'S112' } },
	() => {
		asset('2026/11/01', 'Shares', '12.000.000', { cls: 'Investments', acquisition: '10.000.000' });

		expect([
			line('Acquisition value'),
			line('Capital gain (market − acquisition)'),
			line('Capital gain % of acquisition value')
		]).toEqual([10000000, 2000000, 0.2]);
	}
);

test(
	'liabilities of each term against assets of 8.000.000 read liabilities by term and net worth',
	{ meta: { scenario: 'S113' } },
	() => {
		asset('2026/11/01', 'Savings account', '8.000.000');
		asset('2026/11/01', 'Credit card', '1.000.000', { cls: 'Liability', term: 'Short term' });
		asset('2026/11/01', 'Mortgage loan', '2.000.000', { cls: 'Liability', term: 'Long term' });

		expect([
			line('Liabilities'),
			line('Short term'),
			line('Long term'),
			line('Net Worth (assets − liabilities)')
		]).toEqual([3000000, 1000000, 2000000, 5000000]);
	}
);

test(
	'a month of income, fixed expenses, saving, assets, and a liability reads seven of the ratios',
	{ meta: { scenario: 'S114' } },
	() => {
		asset('2026/10/01', 'Savings account', '4.000.000');
		asset('2026/10/01', 'Land', '2.000.000', { cls: 'Property' });
		income('2026/11/01', '10.000.000');
		expense('2026/11/03', '3.000.000', { category: 'electricity', expenseType: 'Fixed - Essential' });
		asset('2026/11/01', 'Savings account', '6.000.000');
		asset('2026/11/01', 'Mortgage loan', '2.000.000', { cls: 'Liability', term: 'Long term' });

		const ratios = [
			'1. Saving rate (saving ÷ income)',
			'2. Fixed expense ÷ income',
			'3. Debt ÷ total assets',
			'4. Liquidity ratio (liquid ÷ total assets)',
			'5. Liquid assets ÷ net worth',
			'8. Non-cash assets ÷ net worth',
			'9. Net worth ÷ total assets'
		].map((label) => Number(line(label)!.toFixed(3)));

		expect(ratios).toEqual([0.2, 0.3, 0.25, 0.75, 1, 0.333, 0.75]);
	}
);

test(
	'mortgage and car installment expenses against an income of 10.000.000 read the debt service ratios',
	{ meta: { scenario: 'S115' } },
	() => {
		income('2026/11/01', '10.000.000');
		expense('2026/11/03', '3.000.000', { category: 'mortgage', expenseType: 'Fixed - Essential' });
		expense('2026/11/04', '1.000.000', { category: 'car installment', expenseType: 'Fixed - Essential' });

		expect([
			line('6. Debt service ratio (installments ÷ income)'),
			line('7. Non-mortgage service ratio (non-mortgage installments ÷ income)')
		]).toEqual([0.4, 0.1]);
	}
);

test('a month without income leaves every ratio divided by income empty', { meta: { scenario: 'S116' } }, () => {
	expense('2026/11/03', '3.000.000', { category: 'mortgage', expenseType: 'Fixed - Essential' });

	expect([
		line('1. Saving rate (saving ÷ income)'),
		line('2. Fixed expense ÷ income'),
		line('6. Debt service ratio (installments ÷ income)'),
		line('7. Non-mortgage service ratio (non-mortgage installments ÷ income)')
	]).toEqual([null, null, null, null]);
});

test('an amount of 12.500.000 reads 12,50 and a zero reads a dash', { meta: { scenario: 'S117' } }, () => {
	expect([millions(12500000), millions(0)]).toEqual(['12,50', '–']);
});

test('an expense in USD stays out of every total', { meta: { scenario: 'S118' } }, () => {
	expense('2026/11/03', '4.000.000');
	addEntry(db, alice, {
		type: 'expense',
		date: '2026/11/04',
		amount: '100',
		currency: 'USD',
		category: 'grocery',
		expenseType: 'Non-fixed - Essential',
		owner: 'Personal'
	});

	expect(line('Total Expense')).toBe(4000000);
});

test('an account without entries has no report', () => {
	expect(loadReport(db, alice)).toBeNull();
});

function lines(sectionId: string) {
	return loadReport(db, alice)!.sections.find((section) => section.id === sectionId)!.lines;
}

test('expenses in 2026/09 and 2026/11 give a 2026/10 column without expenses', () => {
	expense('2026/09/05', '1.000.000');
	expense('2026/11/05', '1.000.000');

	const report = loadReport(db, alice)!;
	const totalExpense = lines('flow').find((row) => row.label === 'Total Expense')!;

	expect([report.months, totalExpense.values]).toEqual([
		['2026/09', '2026/10', '2026/11'],
		[1000000, 0, 1000000]
	]);
});

test('expenses in 2026/12 and 2027/01 give the two columns 2026/12 and 2027/01', () => {
	expense('2026/12/05', '1.000.000');
	expense('2027/01/05', '1.000.000');

	expect(loadReport(db, alice)!.months).toEqual(['2026/12', '2027/01']);
});

test('a cash asset falling from 10.000.000 to 8.000.000 reads a total saving of −2.000.000', () => {
	asset('2026/10/01', 'Savings account', '10.000.000');
	asset('2026/11/01', 'Savings account', '8.000.000');

	expect(line('Total Saving')).toBe(-2000000);
});

test('a liability posted without a term counts under the liabilities as unspecified', () => {
	asset('2026/11/01', 'Loan', '1.000.000', { cls: 'Liability' });

	expect([line('Liabilities'), line('Unspecified')]).toEqual([1000000, 1000000]);
});

test('an expense posted without an expense type counts in the total expense and stays out of the category lines', () => {
	expense('2026/11/03', '1.000.000', { expenseType: '' });

	const labels = lines('flow').map((row) => row.label);

	expect([line('Total Expense'), labels.includes('Grocery')]).toEqual([1000000, false]);
});

test('income categories list the larger total first', () => {
	income('2026/11/01', '1.000.000', 'bonus');
	income('2026/11/02', '5.000.000');

	expect(lines('flow').map((row) => row.label).slice(1, 3)).toEqual(['Salary', 'Bonus']);
});

test('an asset class without a value in any column stays out of the report', () => {
	asset('2026/11/01', 'Savings account', '6.000.000');

	expect(lines('worth').map((row) => row.label).slice(0, 4)).toEqual([
		'Liquid assets',
		'Cash',
		'Non-liquid assets',
		'Total Assets (market value)'
	]);
});

const memo = 'Sales of Asset (memo, not counted as income)';

test(
	'a salary of 8.000.000 and a sale of 50.000.000 read total income 8.000.000 and the sale on the memo line',
	{ meta: { scenario: 'S133' } },
	() => {
		asset('2026/10/01', 'Car', '50.000.000', { cls: 'Other' });
		income('2026/11/01', '8.000.000');
		addEntry(db, alice, {
			type: 'income',
			date: '2026/11/02',
			amount: '50.000.000',
			currency: 'IDR',
			category: 'sales of asset',
			asset: 'Car'
		});

		expect([line('Total Income'), line(memo)]).toEqual([8000000, 50000000]);
	}
);

test('three reporting months without a sale leave out the memo line', { meta: { scenario: 'S134' } }, () => {
	income('2026/11/01', '8.000.000');

	const labels = loadReport(db, alice)!.sections.flatMap((section) => section.lines).map((row) => row.label);

	expect(labels).not.toContain(memo);
});
