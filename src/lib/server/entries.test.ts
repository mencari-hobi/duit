import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { heldAssets } from './assets';
import { addEntry, entryCategories, saveEntry } from './entries';
import { recordHolding } from './holdings-fixture';

let db: Db;
let alice: number;

beforeEach(() => {
	db = openDatabase(':memory:');
	const result = register(db, 'alice', 'password1');
	if (!('user' in result)) throw new Error(result.message);
	alice = result.user.id;
});

const income = (fields: Record<string, string> = {}) => ({
	type: 'income',
	date: '2026-11-01',
	amount: '5.200.000',
	currency: 'IDR',
	category: 'salary',
	note: '',
	...fields
});

const expense = (fields: Record<string, string> = {}) => ({
	type: 'expense',
	date: '2026-11-02',
	amount: '50.000',
	currency: 'IDR',
	category: 'grocery',
	expenseType: 'Non-fixed - Essential',
	owner: 'Personal',
	note: '',
	...fields
});

const asset = (fields: Record<string, string> = {}) => ({
	type: 'asset',
	date: '2026-11-03',
	amount: '12.000.000',
	currency: 'IDR',
	name: 'Savings account',
	cls: 'Cash',
	source: 'Salary',
	acquisition: '',
	note: '',
	...fields
});

const hold = (fields: Record<string, string>) =>
	recordHolding(db, alice, { date: '2026-11-03', amount: '12.000.000', name: 'Savings account', ...fields });

const entryRows = () => db.prepare('SELECT * FROM diary_entries').all() as Record<string, unknown>[];
const assetRows = () => db.prepare('SELECT * FROM diary_assets').all() as Record<string, unknown>[];

test(
	'adding an income of 5200000 under salary stores an income entry without an expense type or an owner',
	{ meta: { scenario: 'S34' } },
	() => {
		addEntry(db, alice, income());

		expect(entryRows()).toEqual([
			expect.objectContaining({
				user_id: alice,
				kind: 'income',
				amount: 5200000,
				category: 'salary',
				expense_type: null,
				owner: null
			})
		]);
	}
);

test(
	'adding a blank amount returns the numbers-only message and stores no entry',
	{ meta: { scenario: 'S35' } },
	() => {
		const result = addEntry(db, alice, expense({ amount: '' }));

		expect(result).toEqual({ message: 'Please enter an amount (numbers only).', field: 'amount' });
		expect(entryRows()).toEqual([]);
	}
);

test(
	'adding the amount 12abc returns the numbers-only message and stores no entry',
	{ meta: { scenario: 'S36' } },
	() => {
		const result = addEntry(db, alice, expense({ amount: '12abc' }));

		expect(result).toEqual({ message: 'Please enter an amount (numbers only).', field: 'amount' });
		expect(entryRows()).toEqual([]);
	}
);

test(
	'adding an entry with a blank date returns "Please pick a date." and stores no entry',
	{ meta: { scenario: 'S37' } },
	() => {
		const result = addEntry(db, alice, expense({ date: '' }));

		expect(result).toEqual({ message: 'Please pick a date.', field: 'date' });
		expect(entryRows()).toEqual([]);
	}
);

test('adding the amount 1.250.000 stores 1250000', { meta: { scenario: 'S57' } }, () => {
	addEntry(db, alice, expense({ amount: '1.250.000' }));

	expect(entryRows()[0].amount).toBe(1250000);
});

test('adding the amount 12,5 stores 12.5', { meta: { scenario: 'S58' } }, () => {
	addEntry(db, alice, expense({ amount: '12,5' }));

	expect(entryRows()[0].amount).toBe(12.5);
});

test(
	'after an expense under the new category pet food, the expense categories include it and the income categories lack it',
	{ meta: { scenario: 'S43' } },
	() => {
		addEntry(db, alice, expense({ category: 'Pet Food' }));

		const categories = entryCategories(db, alice);

		expect(categories.expense).toContain('pet food');
		expect(categories.income).not.toContain('pet food');
	}
);

test(
	'adding an expense under Self Care/Entertainment stores the category in lowercase',
	{ meta: { scenario: 'S44' } },
	() => {
		addEntry(db, alice, expense({ category: 'Self Care/Entertainment' }));

		expect(entryRows()[0].category).toBe('self care/entertainment');
	}
);

test(
	'adding an entry with the currency ABC returns "Pick a currency from the list." and stores no entry',
	{ meta: { scenario: 'S54' } },
	() => {
		const result = addEntry(db, alice, expense({ currency: 'ABC' }));

		expect(result).toEqual({ message: 'Pick a currency from the list.', field: 'currency' });
		expect(entryRows()).toEqual([]);
	}
);

test('adding an expense with a blank category stores it under other', () => {
	addEntry(db, alice, expense({ category: ' ' }));

	expect(entryRows()[0].category).toBe('other');
});

test('adding an income without a note field stores an empty note', () => {
	const { note: _, ...fields } = income();

	addEntry(db, alice, fields);

	expect(entryRows()[0].note).toBe('');
});

test(
	'adding an entry dated 2026/11/03 stores the date 3 November 2026',
	{ meta: { scenario: 'S65' } },
	() => {
		addEntry(db, alice, expense({ date: '2026/11/03' }));

		expect(entryRows()[0].date).toBe('2026-11-03');
	}
);

test(
	'adding an entry dated 2026/02/30 returns "Please pick a date." and stores no entry',
	{ meta: { scenario: 'S66' } },
	() => {
		const result = addEntry(db, alice, expense({ date: '2026/02/30' }));

		expect(result).toEqual({ message: 'Please pick a date.', field: 'date' });
		expect(entryRows()).toEqual([]);
	}
);

const sale = (fields: Record<string, string> = {}) =>
	income({ date: '2026-11-03', amount: '150.000.000', category: 'sales of asset', asset: 'AST-0001', ...fields });

test('a sale with a blank note stores the note "Sale of Car"', { meta: { scenario: 'S124' } }, () => {
	hold({ name: 'Car', cls: 'Other', date: '2026-10-01' });

	addEntry(db, alice, sale());

	expect(entryRows()).toEqual([expect.objectContaining({ category: 'sales of asset', note: 'Sale of Car' })]);
});

test(
	'the held assets list each asset whose latest value is above 0, and no liability',
	{ meta: { scenario: 'S125' } },
	() => {
		hold({ name: 'Savings account' });
		hold({ name: 'Car', cls: 'Other', date: '2026-10-01' });
		hold({ name: 'Car', cls: 'Other', amount: '0' });
		hold({ name: 'Bond', cls: 'Bond', date: '2026-10-01' });
		hold({ name: 'Bond', cls: 'Bond', date: '2026-10-02', amount: '0' });
		hold({ name: 'Bond', cls: 'Bond', amount: '5.000.000' });
		hold({ name: 'Mortgage loan', cls: 'Liability', term: 'Long term' });

		expect(heldAssets(db, alice).map((row) => row.name)).toEqual(['Savings account', 'Bond']);
	}
);

test(
	'adding a sale without a chosen asset shows "Choose the asset that was sold." and stores nothing',
	{ meta: { scenario: 'S127' } },
	() => {
		const result = addEntry(db, alice, sale({ asset: '' }));

		expect(result).toEqual({ message: 'Choose the asset that was sold.', field: 'asset' });
		expect(entryRows()).toEqual([]);
		expect(assetRows()).toEqual([]);
	}
);

test(
	'saving the date 2026/11/10 on an edited sale of car leaves one update of car worth 0 dated 2026/11/10',
	{ meta: { scenario: 'S129' } },
	() => {
		hold({ name: 'Car', cls: 'Other', date: '2026-10-01' });
		addEntry(db, alice, sale());
		const id = `e${(entryRows()[0] as { id: number }).id}`;

		saveEntry(db, alice, sale({ id, date: '2026-11-10' }));

		expect(assetRows().filter((row) => row.value === 0)).toEqual([
			expect.objectContaining({ name: 'Car', date: '2026-11-10', value: 0 })
		]);
		expect(entryRows()).toHaveLength(1);
	}
);
