import { beforeEach, expect, test } from 'vitest';
import { millions } from '#lib/report.ts';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { addEntry } from './entries';
import { recordHolding } from './holdings-fixture';
import { loadReport } from './report';
import { saveDebt, savePayments } from './debts';
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
	recordHolding(db, alice, { date, name, amount, ...fields });
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
	'a gold asset of 2.000.000 reads "Non-liquid assets" 2,00 with a "Gold" line of 2,00',
	{ meta: { scenario: 'S135' } },
	() => {
		asset('2026/11/01', 'Savings account', '6.000.000');
		asset('2026/11/01', 'Antam bar', '2.000.000', { cls: 'Gold' });

		expect([line('Liquid assets'), line('Non-liquid assets'), line('Gold')]).toEqual([6000000, 2000000, 2000000]);
	}
);

test(
	'term deposit, foreign exchanges, and mutual fund assets of 1.000.000 each read "Liquid assets" 3,00',
	{ meta: { scenario: 'S207' } },
	() => {
		asset('2026/11/01', 'Deposit', '1.000.000', { cls: 'Term Deposit' });
		asset('2026/11/01', 'Dollars', '1.000.000', { cls: 'Foreign Exchanges' });
		asset('2026/11/01', 'Fund', '1.000.000', { cls: 'Mutual Fund' });

		expect([line('Liquid assets'), line('Term Deposit'), line('Mutual Fund')]).toEqual([3000000, 1000000, 1000000]);
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
			type: 'sale',
			date: '2026/11/02',
			amount: '50.000.000',
			currency: 'IDR',
			category: 'sales of asset',
			asset: 'AST-0001'
		});

		expect([line('Total Income'), line(memo)]).toEqual([8000000, 50000000]);
	}
);

test('three reporting months without a sale leave out the memo line', { meta: { scenario: 'S134' } }, () => {
	income('2026/11/01', '8.000.000');

	const labels = loadReport(db, alice)!.sections.flatMap((section) => section.lines).map((row) => row.label);

	expect(labels).not.toContain(memo);
});

test(
	'a gold asset bought for 62.500.000 and updated to 70.000.000 a month later reads no saving in that month',
	{ meta: { scenario: 'S291' } },
	() => {
		asset('2026/10/01', 'Antam bar', '62.500.000', { cls: 'Gold', source: 'Bonus' });
		asset('2026/11/01', 'Antam bar', '70.000.000', { cls: 'Gold', source: 'Bonus' });

		expect(line('Total Saving')).toBe(0);
	}
);

function sellGold(amount: string) {
	asset('2026/10/01', 'Antam bar', '62.500.000', { cls: 'Gold', source: 'Bonus' });
	income('2026/11/01', '8.000.000');
	addEntry(db, alice, { type: 'sale', date: '2026/11/10', amount, currency: 'IDR', category: 'sales of asset', asset: 'AST-0001' });
}

test(
	'a salary of 8.000.000 and a gold sale for 70.000.000 of a bar bought for 62.500.000 read total income 15.500.000 with a realized gain of 7.500.000',
	{ meta: { scenario: 'S292' } },
	() => {
		sellGold('70.000.000');

		expect([line('Total Income'), line('Realized gain on asset sales')]).toEqual([15500000, 7500000]);
	}
);

test(
	'selling that gold bar for 55.000.000 reads a realized gain of −7.500.000 and total income 500.000',
	{ meta: { scenario: 'S293' } },
	() => {
		sellGold('55.000.000');

		expect([line('Realized gain on asset sales'), line('Total Income')]).toEqual([-7500000, 500000]);
	}
);

const carDebt = { category: 'Car installment', amount: '150.000.000', tenor: '36', paymentType: 'Monthly', start: '2025/06/25', end: '2028/05/25', installment: '5.200.000' };

function borrow(fields: Record<string, string> = {}) {
	const result = saveDebt(db, alice, { ...carDebt, ...fields });
	if (!('saved' in result)) throw new Error(JSON.stringify(result));
	return result.saved!;
}

function pay(codes: string | string[], month: string, paidOn: string) {
	savePayments(db, alice, month, Object.fromEntries([codes].flat().map((code) => [`paid-${code}`, 'on'])), paidOn);
}

function snapshot(today = '2026-11-18') {
	const report = loadReport(db, alice, today)!;
	const value = (label: string, at = -1) => report.sections.flatMap((section) => section.lines).find((row) => row.label === label)?.values.at(at);
	return { report, value };
}

test(
	'a debt over 36 months counts its remaining debt after its paid ticks as long term, and one over 12 months as short term',
	{ meta: { scenario: 'S236' } },
	() => {
		const car = borrow();
		borrow({ tenor: '12', start: '2026/10/01', end: '2027/09/01', installment: '1.000.000' });
		pay(car, '2026-11', '2026-11-25');

		const { report, value } = snapshot();

		expect(report.months.at(-1)).toBe('2026/11');
		expect([value('Long term'), value('Short term')]).toEqual([187200000 - 5200000, 12000000]);
	}
);

test(
	'income of 10.000.000, debt payments of 2.000.000, saving of 2.000.000, and expenses of 4.000.000 leave a remaining amount of 2.000.000',
	{ meta: { scenario: 'S110' } },
	() => {
		asset('2026/10/01', 'Savings account', '10.000.000');
		income('2026/11/01', '10.000.000');
		asset('2026/11/01', 'Savings account', '12.000.000');
		expense('2026/11/03', '4.000.000');
		pay(borrow({ installment: '2.000.000' }), '2026-11', '2026-11-10');

		expect(snapshot().value('Remaining Amount (income − debt payment − saving − expense)')).toBe(2000000);
	}
);

test(
	'a car installment of 5.200.000 ticked paid on 2026/11/18 reads total debt payment with car installment under it',
	{ meta: { scenario: 'S261' } },
	() => {
		pay(borrow(), '2026-11', '2026-11-18');

		const { report, value } = snapshot();
		expect(report.months.at(-1)).toBe('2026/11');
		expect([value('Total Debt payment'), value('Car installment')]).toEqual([5200000, 5200000]);
	}
);

test(
	'a tick for 2026-11 with the paid date 2026/10/20 counts in 2026/10 and leaves 2026/11 without debt payment',
	{ meta: { scenario: 'S301' } },
	() => {
		saveSettings(db, alice, { currency: 'IDR', startDay: '25' });
		const car = borrow();
		savePayments(db, alice, '2026-11', { [`paid-${car}`]: 'on', [`paidDate-${car}`]: '2026/10/20' }, '2026-11-18');

		const { report, value } = snapshot();
		expect(report.months.slice(-2)).toEqual(['2026/10', '2026/11']);
		expect([value('Total Debt payment', -2), value('Total Debt payment')]).toEqual([5200000, 0]);
	}
);

test(
	'a tick for 2026-10 saved on 2026/11/18 counts in 2026/11 and leaves 2026/10 without debt payment',
	{ meta: { scenario: 'S262' } },
	() => {
		pay(borrow(), '2026-10', '2026-11-18');

		const { report, value } = snapshot();
		expect(report.months.slice(-2)).toEqual(['2026/10', '2026/11']);
		expect([value('Total Debt payment', -2), value('Total Debt payment')]).toEqual([0, 5200000]);
	}
);

test(
	'paid installments on a mortgage and a car installment against an income of 10.000.000 read the debt service ratios',
	{ meta: { scenario: 'S115' } },
	() => {
		income('2026/11/01', '10.000.000');
		pay([borrow({ category: 'Mortgage', installment: '3.000.000' }), borrow({ installment: '1.000.000' })], '2026-11', '2026-11-10');

		const { value } = snapshot();
		expect([
			value('6. Debt service ratio (debt payments ÷ income)'),
			value('7. Non-mortgage service ratio (non-mortgage debt payments ÷ income)')
		]).toEqual([0.4, 0.1]);
	}
);

test(
	'an expense under mortgage reads a debt service ratio of 0 and counts in the total expense',
	{ meta: { scenario: 'S263' } },
	() => {
		income('2026/11/01', '10.000.000');
		expense('2026/11/03', '3.000.000', { category: 'mortgage', expenseType: 'Fixed - Essential' });

		const { value } = snapshot();
		expect([value('6. Debt service ratio (debt payments ÷ income)'), value('Total Expense')]).toEqual([0, 3000000]);
	}
);

test('a month without income leaves every ratio divided by income empty', { meta: { scenario: 'S116' } }, () => {
	expense('2026/11/03', '3.000.000', { category: 'mortgage', expenseType: 'Fixed - Essential' });

	const { value } = snapshot();
	expect([
		value('1. Saving rate (saving ÷ income)'),
		value('2. Fixed expense ÷ income'),
		value('6. Debt service ratio (debt payments ÷ income)'),
		value('7. Non-mortgage service ratio (non-mortgage debt payments ÷ income)')
	]).toEqual([null, null, null, null]);
});

test(
	'with the default currency IDR, a paid installment of a USD debt stays out of the total debt payment',
	{ meta: { scenario: 'S264' } },
	() => {
		saveSettings(db, alice, { currency: 'USD', startDay: '1' });
		const dollars = borrow({ installment: '100' });
		saveSettings(db, alice, { currency: 'IDR', startDay: '1' });
		pay([dollars, borrow()], '2026-11', '2026-11-10');

		expect(snapshot().value('Total Debt payment')).toBe(5200000);
	}
);
