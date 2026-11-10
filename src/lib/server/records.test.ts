import { beforeEach, expect, test } from 'vitest';
import { label, money } from '#lib/record.ts';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { addEntry, saveEntry } from './entries';
import { deleteRecord, editableRecord, listRecords, wipeRecords } from './records';

let db: Db;
let alice: number;
let bob: number;

function account(name: string) {
	const result = register(db, name, 'password1');
	if (!('user' in result)) throw new Error(result.message);
	return result.user.id;
}

beforeEach(() => {
	db = openDatabase(':memory:');
	alice = account('alice');
	bob = account('bob');
});

const income = (fields: Record<string, string> = {}) => ({
	type: 'income',
	date: '2026/11/01',
	amount: '1',
	currency: 'IDR',
	category: 'salary',
	...fields
});

const expense = (fields: Record<string, string> = {}) => ({
	type: 'expense',
	date: '2026/11/02',
	amount: '50.000',
	currency: 'IDR',
	category: 'grocery',
	expenseType: 'Non-fixed - Essential',
	owner: 'Personal',
	note: 'Weekly shop',
	...fields
});

const asset = (fields: Record<string, string> = {}) => ({
	type: 'asset',
	date: '2026/11/05',
	amount: '12.000.000',
	currency: 'IDR',
	name: 'Savings account',
	cls: 'Cash',
	source: 'Salary',
	acquisition: '12.000.000',
	note: '',
	...fields
});

test(
	'an income under salary lists as Salary with an empty expense type and owner',
	{ meta: { scenario: 'S88' } },
	() => {
		addEntry(db, alice, income());

		const [record] = listRecords(db, alice);

		expect(label(record)).toBe('Salary');
		expect(record).toMatchObject({ expenseType: null, owner: null });
	}
);

test(
	'the asset Savings account lists with its class, source, and cost',
	{ meta: { scenario: 'S89' } },
	() => {
		addEntry(db, alice, asset());

		expect(label(listRecords(db, alice)[0])).toBe(
			'Savings account (Cash) · funded by Salary · cost 12.000.000'
		);
	}
);

test('an amount of 1250000 in USD lists as 1.250.000 beside USD', { meta: { scenario: 'S90' } }, () => {
	addEntry(db, alice, expense({ amount: '1.250.000', currency: 'USD' }));

	const [record] = listRecords(db, alice);

	expect([money(record.amount), record.currency]).toEqual(['1.250.000', 'USD']);
});

test('the entries of another account stay out of the list', { meta: { scenario: 'S91' } }, () => {
	addEntry(db, bob, expense());
	addEntry(db, bob, asset());

	expect(listRecords(db, alice)).toEqual([]);
});

test(
	'saving the value 13.000.000 on an edited asset stores it on the same asset and adds no asset',
	{ meta: { scenario: 'S96' } },
	() => {
		addEntry(db, alice, asset());
		const [record] = listRecords(db, alice);

		saveEntry(db, alice, { ...asset({ amount: '13.000.000' }), id: record.id });

		expect(listRecords(db, alice)).toEqual([
			expect.objectContaining({ id: record.id, amount: 13000000 })
		]);
	}
);

test(
	'saving changes to an entry of another account leaves that entry unchanged',
	{ meta: { scenario: 'S98' } },
	() => {
		addEntry(db, bob, expense());
		const [record] = listRecords(db, bob);

		const result = saveEntry(db, alice, { ...expense({ amount: '1' }), id: record.id });

		expect(result).toEqual({ missing: true });
		expect(listRecords(db, bob)[0].amount).toBe(50000);
		expect(listRecords(db, alice)).toEqual([]);
	}
);

test('deleting an entry of another account leaves that entry stored', { meta: { scenario: 'S100' } }, () => {
	addEntry(db, bob, expense());
	const [record] = listRecords(db, bob);

	deleteRecord(db, alice, record.id);

	expect(listRecords(db, bob)).toHaveLength(1);
});

test(
	'deleting all data removes every income, expense, and asset of the account',
	{ meta: { scenario: 'S101' } },
	() => {
		addEntry(db, alice, income());
		addEntry(db, alice, expense());
		addEntry(db, alice, asset());

		wipeRecords(db, alice);

		expect(listRecords(db, alice)).toEqual([]);
	}
);

test('deleting all data leaves the entries of another account stored', { meta: { scenario: 'S103' } }, () => {
	addEntry(db, bob, expense());
	addEntry(db, bob, asset());

	wipeRecords(db, alice);

	expect(listRecords(db, bob)).toHaveLength(2);
});

test('an expense opens for editing with its fields shaped for the Add form', () => {
	addEntry(db, alice, expense());
	const [record] = listRecords(db, alice);

	expect(editableRecord(db, alice, record.id)).toEqual({
		id: record.id,
		type: 'expense',
		date: '2026/11/02',
		amount: '50.000',
		currency: 'IDR',
		category: 'grocery',
		expenseType: 'Non-fixed - Essential',
		owner: 'Personal',
		note: 'Weekly shop'
	});
});

test('an entry of another account stays out of editing', () => {
	addEntry(db, bob, expense());
	const [record] = listRecords(db, bob);

	expect(editableRecord(db, alice, record.id)).toBeNull();
});

test('saving an edited expense as an asset removes the expense and stores one asset', () => {
	addEntry(db, alice, expense());
	const [record] = listRecords(db, alice);

	saveEntry(db, alice, { ...asset(), id: record.id });

	expect(listRecords(db, alice)).toEqual([
		expect.objectContaining({ kind: 'asset', name: 'Savings account', amount: 12000000 })
	]);
});

test('saving an edited asset as an income removes the asset and stores one income', () => {
	addEntry(db, alice, asset());
	const [record] = listRecords(db, alice);

	saveEntry(db, alice, { ...income({ amount: '7' }), id: record.id });

	expect(listRecords(db, alice)).toEqual([expect.objectContaining({ kind: 'income', category: 'salary', amount: 7 })]);
});

test('saving an edited expense with a blank amount refuses and keeps the old expense', () => {
	addEntry(db, alice, expense());
	const [record] = listRecords(db, alice);

	const result = saveEntry(db, alice, { ...expense({ amount: '' }), id: record.id });

	expect(result).toMatchObject({ field: 'amount' });
	expect(listRecords(db, alice)).toEqual([record]);
});

test('saving an edited expense as an asset without a name refuses and keeps the old expense', () => {
	addEntry(db, alice, expense());
	const [record] = listRecords(db, alice);

	const result = saveEntry(db, alice, { ...asset({ name: '' }), id: record.id });

	expect(result).toMatchObject({ field: 'name' });
	expect(listRecords(db, alice)).toEqual([record]);
});

test('saving changes under a malformed key answers missing and leaves the entries unchanged', () => {
	addEntry(db, alice, expense());
	const before = listRecords(db, alice);

	const result = saveEntry(db, alice, { ...expense({ amount: '1' }), id: 'x1' });

	expect(result).toEqual({ missing: true });
	expect(listRecords(db, alice)).toEqual(before);
});

test('deleting under a malformed key leaves every entry stored', () => {
	addEntry(db, alice, expense());

	deleteRecord(db, alice, 'e1x');

	expect(listRecords(db, alice)).toHaveLength(1);
});

test('two entries on the same date list the later one first', () => {
	addEntry(db, alice, expense({ category: 'grocery' }));
	addEntry(db, alice, expense({ category: 'eating out' }));

	expect(listRecords(db, alice).map((record) => record.category)).toEqual(['eating out', 'grocery']);
});

test('an asset opens for editing with its fields shaped for the Add form', () => {
	addEntry(db, alice, asset({ note: 'BCA' }));
	const [record] = listRecords(db, alice);

	expect(editableRecord(db, alice, record.id)).toEqual({
		id: record.id,
		type: 'asset',
		date: '2026/11/05',
		amount: '12.000.000',
		currency: 'IDR',
		name: 'Savings account',
		cls: 'Cash',
		source: 'Salary',
		acquisition: '12.000.000',
		note: 'BCA'
	});
});

test('a liability opens for editing with its term, and with the source and acquisition blank', () => {
	addEntry(db, alice, asset({ name: 'Mortgage', cls: 'Liability', term: 'Long term' }));
	const [record] = listRecords(db, alice);

	expect(editableRecord(db, alice, record.id)).toEqual({
		id: record.id,
		type: 'asset',
		date: '2026/11/05',
		amount: '12.000.000',
		currency: 'IDR',
		name: 'Mortgage',
		cls: 'Liability',
		term: 'Long term',
		acquisition: '',
		note: ''
	});
});

test('an income opens for editing without an expense type or owner', () => {
	addEntry(db, alice, income());
	const [record] = listRecords(db, alice);

	expect(editableRecord(db, alice, record.id)).toEqual({
		id: record.id,
		type: 'income',
		date: '2026/11/01',
		amount: '1',
		currency: 'IDR',
		category: 'salary',
		note: ''
	});
});

test('a liability lists as its name and class', () => {
	addEntry(db, alice, asset({ name: 'Mortgage', cls: 'Liability' }));

	expect(label(listRecords(db, alice)[0])).toBe('Mortgage (Liability)');
});

test('an amount of 12,5 lists as 12,5', () => {
	addEntry(db, alice, expense({ amount: '12,5' }));

	expect(money(listRecords(db, alice)[0].amount)).toBe('12,5');
});
