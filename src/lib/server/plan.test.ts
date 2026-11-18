import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { budget, deletePlanItem, savePlanItem } from './plan';

let db: Db;
let alice: number;
let bob: number;

const today = '2026-11-18';

const account = (name: string) => {
	const result = register(db, name, 'password1');
	if (!('user' in result)) throw new Error(result.message);
	return result.user.id;
};

beforeEach(() => {
	db = openDatabase(':memory:');
	alice = account('alice');
	bob = account('bob');
});

const income = (fields: Record<string, string> = {}) => ({
	tab: 'income',
	amount: '18.000.000',
	currency: 'IDR',
	timeframe: 'monthly',
	category: 'Salary',
	note: '',
	...fields
});

const expense = (fields: Record<string, string> = {}) => ({
	tab: 'expense',
	amount: '2.500.000',
	currency: 'IDR',
	timeframe: 'monthly',
	category: 'Grocery',
	expenseType: 'Non-fixed - Essential',
	owner: 'Personal',
	note: '',
	...fields
});

const saving = (fields: Record<string, string> = {}) => ({
	tab: 'saving',
	dream: 'Emergency fund',
	amount: '60.000.000',
	currency: 'IDR',
	months: '12',
	...fields
});

const debt = (fields: Record<string, string> = {}) => ({
	tab: 'debt',
	category: 'Mortgage',
	amount: '3.000.000',
	currency: 'IDR',
	start: '2026/11/25',
	end: '2031/10/25',
	...fields
});

const add = (userId: number, fields: Record<string, string>) => {
	const result = savePlanItem(db, userId, fields);
	if (!('added' in result)) throw new Error(JSON.stringify(result));
};

const view = (userId = alice, timeframe = 'monthly', currency = 'IDR') => budget(db, userId, currency, timeframe, today);

const group = (name: string, userId = alice, timeframe = 'monthly') =>
	view(userId, timeframe)?.groups.find((found) => found.name === name);

const rowsOf = (name: string) => group(name)?.rows.map(({ label, amount }) => [label, amount]);

test(
	'adding a monthly grocery expense with its type and owner stores it',
	{ meta: { scenario: 'S151' } },
	() => {
		add(alice, expense());

		expect(db.prepare('SELECT * FROM plan_entries WHERE user_id = ?').all(alice)).toEqual([
			expect.objectContaining({
				kind: 'expense',
				amount: 2500000,
				currency: 'IDR',
				timeframe: 'monthly',
				category: 'grocery',
				expense_type: 'Non-fixed - Essential',
				owner: 'Personal'
			})
		]);
	}
);

test('adding the dream emergency fund of 60.000.000 in 12 months stores it', { meta: { scenario: 'S152' } }, () => {
	add(alice, saving());

	expect(db.prepare('SELECT * FROM plan_savings WHERE user_id = ?').all(alice)).toEqual([
		expect.objectContaining({ dream: 'Emergency fund', amount: 60000000, currency: 'IDR', months: 12 })
	]);
});

test('adding a mortgage installment from 2026/11/25 to 2031/10/25 stores it', { meta: { scenario: 'S153' } }, () => {
	add(alice, debt());

	expect(db.prepare('SELECT * FROM plan_debts WHERE user_id = ?').all(alice)).toEqual([
		expect.objectContaining({
			category: 'Mortgage',
			amount: 3000000,
			currency: 'IDR',
			start: '2026-11-25',
			end: '2031-10-25'
		})
	]);
});

test(
	'adding a saving with a blank dream is refused and stores nothing',
	{ meta: { scenario: 'S156' } },
	() => {
		const result = savePlanItem(db, alice, saving({ dream: ' ' }));

		expect(result).toEqual({ message: 'Please name your dream.', field: 'dream' });
		expect(db.prepare('SELECT count(*) AS count FROM plan_savings').get()).toEqual({ count: 0 });
	}
);

test(
	'adding a saving over 0 months is refused and stores nothing',
	{ meta: { scenario: 'S157' } },
	() => {
		const result = savePlanItem(db, alice, saving({ months: '0' }));

		expect(result).toEqual({ message: 'Please enter a whole number of months, 1 or more.', field: 'months' });
		expect(db.prepare('SELECT count(*) AS count FROM plan_savings').get()).toEqual({ count: 0 });
	}
);

test('adding a saving over 1,5 months is refused', () => {
	expect(savePlanItem(db, alice, saving({ months: '1,5' }))).toEqual(
		expect.objectContaining({ field: 'months' })
	);
});

test(
	'adding a debt payment that ends before it starts is refused and stores nothing',
	{ meta: { scenario: 'S158' } },
	() => {
		const result = savePlanItem(db, alice, debt({ start: '2026/11/25', end: '2026/10/25' }));

		expect(result).toEqual({ message: "The end payment can't be before the start payment.", field: 'end' });
		expect(db.prepare('SELECT count(*) AS count FROM plan_debts').get()).toEqual({ count: 0 });
	}
);

test('an annual income of 12.000.000 reads 1.000.000 per month', { meta: { scenario: 'S168' } }, () => {
	add(alice, income({ amount: '12.000.000', timeframe: 'annually' }));

	expect(rowsOf('Income')).toEqual([['Salary', 1000000]]);
});

test('a daily income of 100.000 reads 3.000.000 per month', () => {
	add(alice, income({ amount: '100.000', timeframe: 'daily' }));

	expect(rowsOf('Income')).toEqual([['Salary', 3000000]]);
});

test('a quarterly income of 3.000.000 reads 1.000.000 per month and 12.000.000 per year', () => {
	add(alice, income({ amount: '3.000.000', timeframe: 'quarterly' }));

	expect(group('Income')?.total).toBeCloseTo(1000000);
	expect(group('Income', alice, 'annually')?.total).toBeCloseTo(12000000);
});

test('a saving of 60.000.000 in 12 months reads 5.000.000 per month', { meta: { scenario: 'S169' } }, () => {
	add(alice, saving());

	expect(rowsOf('Saving')).toEqual([['Emergency fund', 5000000]]);
});

test(
	'incomes under salary and freelance read their total over a row each',
	{ meta: { scenario: 'S170' } },
	() => {
		add(alice, income());
		add(alice, income({ amount: '2.000.000', category: 'Freelance' }));

		expect(group('Income')?.total).toBe(20000000);
		expect(rowsOf('Income')).toEqual([
			['Salary', 18000000],
			['Freelance', 2000000]
		]);
	}
);

test(
	'installments under mortgage and car installment read their debt payment total',
	{ meta: { scenario: 'S171' } },
	() => {
		add(alice, debt({ start: '2026/01/01' }));
		add(alice, debt({ category: 'Car installment', amount: '1.500.000', start: '2026/01/01' }));

		expect(group('Debt payment')?.total).toBe(4500000);
	}
);

test(
	'expenses as fixed - essential read the expense and type totals over both category rows',
	{ meta: { scenario: 'S172' } },
	() => {
		add(alice, expense({ amount: '650.000', category: 'School Tuition', expenseType: 'Fixed - Essential' }));
		add(alice, expense({ amount: '450.000', category: 'Internet', expenseType: 'Fixed - Essential' }));

		const spent = group('Expense');

		expect(spent?.total).toBe(1100000);
		expect(spent?.types.map(({ name, total, rows }) => [name, total, rows.map((row) => row.label)])).toEqual([
			['Fixed - Essential', 1100000, ['School Tuition', 'Internet']]
		]);
	}
);

test('an installment starting next month stays out of debt payment', { meta: { scenario: 'S173' } }, () => {
	add(alice, income());
	add(alice, debt({ start: '2026/12/18', end: '2031/10/25' }));

	expect(group('Debt payment')).toBeUndefined();
});

test('an installment that ended last month stays out of debt payment', { meta: { scenario: 'S174' } }, () => {
	add(alice, income());
	add(alice, debt({ start: '2021/01/18', end: '2026/10/18' }));

	expect(group('Debt payment')).toBeUndefined();
});

test(
	'an installment outside its payment dates lists apart from the totals, where edit and delete reach it',
	{ meta: { scenario: 'S189' } },
	() => {
		add(alice, debt({ start: '2026/12/18', end: '2031/10/25' }));

		expect(view()?.idle.map(({ key, label, amount }) => [key.charAt(0), label, amount])).toEqual([
			['d', 'Mortgage', 3000000]
		]);
		expect(view()?.free).toBe(0);
	}
);

test('an installment starting or ending today counts', () => {
	add(alice, debt({ start: today.replaceAll('-', '/'), end: '2031/10/25' }));
	add(alice, debt({ category: 'Credit card', start: '2021/01/18', end: today.replaceAll('-', '/') }));

	expect(group('Debt payment')?.total).toBe(6000000);
});

const sampleBudget = () => {
	add(alice, income({ amount: '20.000.000' }));
	add(alice, debt({ amount: '4.500.000', start: '2026/01/01' }));
	add(alice, saving());
	add(alice, expense({ amount: '1.100.000', category: 'School Tuition', expenseType: 'Fixed - Essential' }));
	add(alice, expense({ amount: '3.100.000', category: 'Grocery', expenseType: 'Non-fixed - Essential' }));
	add(alice, expense({ amount: '2.900.000', category: 'Courses', expenseType: 'Fixed - Non-essential' }));
};

test(
	'free cash flow is income minus debt payment, saving, and expense',
	{ meta: { scenario: 'S175' } },
	() => {
		sampleBudget();

		expect(view()?.free).toBe(3400000);
	}
);

test('the budget shows the four ratios of income', { meta: { scenario: 'S176' } }, () => {
	sampleBudget();

	expect(view()?.ratios.map(({ name, value }) => [name, value])).toEqual([
		['Debt Service Ratio', 0.225],
		['Saving Ratio', 0.25],
		['Essential Expense Ratio', 0.21],
		['Free Cash Flow Ratio', 0.17]
	]);
});

test('a plan without income has no value for every ratio', { meta: { scenario: 'S177' } }, () => {
	add(alice, expense());

	expect(view()?.ratios.map(({ value }) => value)).toEqual([null, null, null, null]);
});

test('with the default currency idr, an income in usd stays out of every total', { meta: { scenario: 'S178' } }, () => {
	add(alice, income());
	add(alice, income({ amount: '1.000', currency: 'USD' }));

	expect(group('Income')?.total).toBe(18000000);
	expect(view()?.free).toBe(18000000);
});

test(
	'an income in usd lists apart from the totals, where edit and delete reach it',
	{ meta: { scenario: 'S190' } },
	() => {
		add(alice, income({ amount: '1.000', currency: 'USD' }));

		expect(view()?.idle.map(({ label, amount, currency }) => [label, amount, currency])).toEqual([
			['Salary', 1000, 'USD']
		]);
	}
);

test("another account's items stay out of view budget", { meta: { scenario: 'S154' } }, () => {
	add(bob, income());

	expect(view(alice)).toBeNull();
});

test("saving changes to another account's item leaves it unchanged", { meta: { scenario: 'S185' } }, () => {
	add(bob, income());
	const [item] = group('Income', bob)!.rows;

	const result = savePlanItem(db, alice, income({ amount: '1', id: item.key }));

	expect(result).toEqual({ missing: true });
	expect(group('Income', bob)?.total).toBe(18000000);
});

test("deleting another account's item leaves it stored", { meta: { scenario: 'S187' } }, () => {
	add(bob, saving());
	const [item] = group('Saving', bob)!.rows;

	deletePlanItem(db, alice, item.key);

	expect(group('Saving', bob)?.rows).toHaveLength(1);
});
