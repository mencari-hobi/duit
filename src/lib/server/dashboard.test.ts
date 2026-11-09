import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { loadDashboard } from './dashboard';
import { openDatabase, type Db } from './db';
import { addEntry } from './entries';
import { saveSettings } from './settings';

let db: Db;
let alice: number;

beforeEach(() => {
	db = openDatabase(':memory:');
	const result = register(db, 'alice', 'password1');
	if (!('user' in result)) throw new Error(result.message);
	alice = result.user.id;
});

function income(date: string, amount: string) {
	addEntry(db, alice, { type: 'income', date, amount, currency: 'IDR', category: 'salary' });
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

const board = (from = '', to = '') => loadDashboard(db, alice, from, to);

test(
	'income of 10.000.000 and expenses of 4.000.000 in 2026/11 give the cards income, expenses, net cash flow, and a 60% savings rate',
	{ meta: { scenario: 'S67' } },
	() => {
		income('2026/11/05', '10.000.000');
		expense('2026/11/06', '4.000.000');

		expect(board().cards).toMatchObject({
			month: '2026/11',
			income: 10000000,
			expenses: 4000000,
			net: 6000000,
			savingsRate: 60
		});
	}
);

test(
	'expenses of 4.000.000 in 2026/11 after 5.000.000 in 2026/10 give the expenses card a 20% drop',
	{ meta: { scenario: 'S68' } },
	() => {
		expense('2026/10/06', '5.000.000');
		expense('2026/11/06', '4.000.000');

		expect(board().cards!.expensesChange).toBe(-20);
	}
);

test('a month without income has no savings rate', { meta: { scenario: 'S69' } }, () => {
	expense('2026/11/06', '4.000.000');

	expect(board().cards!.savingsRate).toBeNull();
});

test(
	'net worth sums the latest value of each asset minus the latest value of each liability',
	{ meta: { scenario: 'S70' } },
	() => {
		asset('2026/10/01', 'Savings account', '10.000.000');
		asset('2026/11/01', 'Savings account', '12.000.000');
		asset('2026/11/01', 'Mortgage loan', '3.000.000', { cls: 'Liability', term: 'Long term' });

		expect(board().cards!.netWorth).toBe(9000000);
	}
);

test(
	'own-funded assets leave out the assets funded by debt',
	{ meta: { scenario: 'S71' } },
	() => {
		asset('2026/11/01', 'Savings account', '10.000.000');
		asset('2026/11/01', 'Car', '5.000.000', { cls: 'Other', source: 'Debt' });

		expect(board().cards).toMatchObject({ own: 10000000, ownShare: 67, debtFunded: 5000000 });
	}
);

test(
	'own-funded assets growing from 10.000.000 to 12.500.000 give 2.500.000 saved into assets',
	{ meta: { scenario: 'S72' } },
	() => {
		asset('2026/10/01', 'Savings account', '10.000.000');
		asset('2026/11/01', 'Savings account', '12.500.000');

		expect(board().cards!.saved).toBe(2500000);
	}
);

test(
	'with the reporting start day 25, an expense dated 2026/10/25 counts in 2026/11 and one dated 2026/10/24 in 2026/10',
	{ meta: { scenario: 'S73' } },
	() => {
		saveSettings(db, alice, { currency: 'IDR', startDay: '25' });
		expense('2026/10/24', '1.000.000');
		expense('2026/10/25', '2.000.000');

		expect(board().months.map((row) => [row.month, row.expenses])).toEqual([
			['2026/10', 1000000],
			['2026/11', 2000000]
		]);
	}
);

test(
	'two expenses in USD stay out of every total and count as left out',
	{ meta: { scenario: 'S75' } },
	() => {
		expense('2026/11/06', '4.000.000');
		expense('2026/11/07', '100', { currency: 'USD' });
		expense('2026/11/08', '50', { currency: 'USD' });

		const dashboard = board();

		expect(dashboard.leftOut).toBe(2);
		expect(dashboard.cards!.expenses).toBe(4000000);
	}
);

test(
	'entries in 2026/10 and 2026/11 give the income vs expense chart both months with their income and expenses',
	{ meta: { scenario: 'S76' } },
	() => {
		income('2026/10/05', '9.000.000');
		expense('2026/10/06', '3.000.000');
		income('2026/11/05', '10.000.000');
		expense('2026/11/06', '4.000.000');

		expect(board().months.map(({ month, income, expenses }) => ({ month, income, expenses }))).toEqual([
			{ month: '2026/10', income: 9000000, expenses: 3000000 },
			{ month: '2026/11', income: 10000000, expenses: 4000000 }
		]);
	}
);

test(
	'expenses of 3.000.000 fixed essential and 1.000.000 non-fixed essential stack as 75% and 25%',
	{ meta: { scenario: 'S77' } },
	() => {
		expense('2026/11/06', '3.000.000', { expenseType: 'Fixed - Essential' });
		expense('2026/11/07', '1.000.000', { expenseType: 'Non-fixed - Essential' });

		const { byType } = board().months[0];

		expect(byType['Fixed - Essential'].share).toBe(75);
		expect(byType['Non-fixed - Essential'].share).toBe(25);
	}
);

test(
	'expenses for personal and children give the owner chart their totals',
	{ meta: { scenario: 'S78' } },
	() => {
		expense('2026/11/06', '1.500.000', { owner: 'Personal' });
		expense('2026/11/07', '500.000', { owner: 'Personal' });
		expense('2026/11/08', '500.000', { owner: 'Children' });

		expect(board().owners).toEqual([
			{ name: 'Personal', amount: 2000000 },
			{ name: 'Children', amount: 500000 }
		]);
	}
);

test(
	'expenses under ten categories give the top categories chart the eight largest, largest first',
	{ meta: { scenario: 'S79' } },
	() => {
		for (let rank = 1; rank <= 10; rank++) {
			expense('2026/11/06', `${rank}.000.000`, { category: `category ${rank}` });
		}

		expect(board().categories.map((row) => row.name)).toEqual(
			[10, 9, 8, 7, 6, 5, 4, 3].map((rank) => `category ${rank}`)
		);
	}
);

test(
	'assets of 15.000.000 and liabilities of 3.000.000 give equity and net worth of 12.000.000',
	{ meta: { scenario: 'S80' } },
	() => {
		asset('2026/11/01', 'Savings account', '15.000.000');
		asset('2026/11/01', 'Mortgage loan', '3.000.000', { cls: 'Liability', term: 'Long term' });

		expect(board().months[0]).toMatchObject({
			liabilities: 3000000,
			equity: 12000000,
			netWorth: 12000000
		});
	}
);

test(
	'a cash asset of 6.000.000 and a property asset of 2.000.000 stack as 75% and 25%',
	{ meta: { scenario: 'S81' } },
	() => {
		asset('2026/11/01', 'Savings account', '6.000.000');
		asset('2026/11/01', 'Land', '2.000.000', { cls: 'Property' });

		const { byClass } = board().months[0];

		expect(byClass.Cash.share).toBe(75);
		expect(byClass.Property.share).toBe(25);
	}
);

test(
	'savings account updated from 10.000.000 to 12.000.000 reads 12.000.000 with a change of 2.000.000',
	{ meta: { scenario: 'S82' } },
	() => {
		asset('2026/10/01', 'Savings account', '10.000.000');
		asset('2026/11/01', 'Savings account', '12.000.000');

		expect(board().table).toEqual([
			expect.objectContaining({ name: 'Savings account', value: 12000000, change: 2000000 })
		]);
	}
);

test('a range starting 2026/11/01 leaves 2026/10 out of the months', () => {
	expense('2026/10/06', '5.000.000');
	expense('2026/11/06', '4.000.000');

	expect(board('2026/11/01').months.map((row) => row.month)).toEqual(['2026/11']);
});

test('an account without entries has no months', () => {
	expect(board().months).toEqual([]);
});

test('with the reporting start day 25, an expense dated 2026/12/25 counts in 2027/01', () => {
	saveSettings(db, alice, { currency: 'IDR', startDay: '25' });
	expense('2026/12/25', '1.000.000');

	expect(board().months.map((row) => row.month)).toEqual(['2027/01']);
});

test('a range ending 2026/10/31 leaves 2026/11 out of the months', () => {
	expense('2026/10/06', '5.000.000');
	expense('2026/11/06', '4.000.000');

	expect(board('', '2026/10/31').months.map((row) => row.month)).toEqual(['2026/10']);
});

test('a range ending 2026/10/31 gives the assets table the value as of 2026/10', () => {
	asset('2026/10/01', 'Savings account', '10.000.000');
	asset('2026/11/01', 'Savings account', '12.000.000');

	expect(board('', '2026/10/31').table).toEqual([
		expect.objectContaining({ name: 'Savings account', value: 10000000, change: null })
	]);
});

test('an invalid from date leaves the range open and comes back blank', () => {
	expense('2026/10/06', '5.000.000');
	expense('2026/11/06', '4.000.000');

	const dashboard = board('2026/13/40');

	expect(dashboard.from).toBe('');
	expect(dashboard.months.map((row) => row.month)).toEqual(['2026/10', '2026/11']);
});
