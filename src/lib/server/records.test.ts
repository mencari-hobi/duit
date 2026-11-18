import { beforeEach, expect, test } from 'vitest';
import { label, money } from '#lib/record.ts';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { heldAssets, savePurchase, saveUpdates } from './assets';
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
	cls: 'Cash',
	source: 'Salary',
	unit: '12.000.000',
	unitCurrency: 'IDR',
	note: 'Savings account',
	...fields
});

const buy = (userId: number, fields: Record<string, string> = {}) => savePurchase(db, userId, asset(fields));

const liability = (fields: Record<string, string> = {}) =>
	addEntry(db, alice, {
		type: 'debt',
		date: '2026/11/05',
		amount: '12.000.000',
		currency: 'IDR',
		name: 'Mortgage',
		term: 'Long term',
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
	'an asset update lists with its code and name, its type, its source, and its cost',
	{ meta: { scenario: 'S89' } },
	() => {
		buy(alice);

		expect(label(listRecords(db, alice)[0])).toBe(
			'AST-0001 · Savings account (Cash) · funded by Salary · cost 12.000.000'
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
	buy(bob);

	expect(listRecords(db, alice)).toEqual([]);
});

test(
	'saving the acquisition cost 13.000.000 on an edited purchase stores it on the same asset and adds no asset',
	{ meta: { scenario: 'S96' } },
	() => {
		buy(alice);
		const [record] = listRecords(db, alice);

		savePurchase(db, alice, asset({ amount: '13.000.000', id: record.id }));

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
		buy(alice);

		wipeRecords(db, alice);

		expect(listRecords(db, alice)).toEqual([]);
	}
);

test('deleting all data leaves the entries of another account stored', { meta: { scenario: 'S103' } }, () => {
	addEntry(db, bob, expense());
	buy(bob);

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

test('saving an edited expense with a blank amount refuses and keeps the old expense', () => {
	addEntry(db, alice, expense());
	const [record] = listRecords(db, alice);

	const result = saveEntry(db, alice, { ...expense({ amount: '' }), id: record.id });

	expect(result).toMatchObject({ field: 'amount' });
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

test('a purchase opens for editing with its fields shaped for the Purchase form', () => {
	buy(alice, { note: 'BCA' });
	const [record] = listRecords(db, alice);

	expect(editableRecord(db, alice, record.id)).toEqual({
		id: record.id,
		type: 'asset',
		date: '2026/11/05',
		cls: 'Cash',
		source: 'Salary',
		unit: '12.000.000',
		unitCurrency: 'IDR',
		amount: '12.000.000',
		currency: 'IDR',
		note: 'BCA'
	});
});

test('a liability opens for editing on the debt tab with its name and term', () => {
	liability();
	const [record] = listRecords(db, alice);

	expect(editableRecord(db, alice, record.id)).toEqual({
		id: record.id,
		type: 'debt',
		date: '2026/11/05',
		amount: '12.000.000',
		currency: 'IDR',
		name: 'Mortgage',
		term: 'Long term',
		note: ''
	});
});

test('choosing edit on an asset update opens the asset list', { meta: { scenario: 'S208' } }, () => {
	buy(alice);
	saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '13.000.000' });
	const [update] = listRecords(db, alice);

	expect(editableRecord(db, alice, update.id)).toEqual({ id: update.id, type: 'asset', view: 'list' });
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
	liability({ term: '' });

	expect(label(listRecords(db, alice)[0])).toBe('Mortgage (Liability)');
});

test('an amount of 12,5 lists as 12,5', () => {
	addEntry(db, alice, expense({ amount: '12,5' }));

	expect(money(listRecords(db, alice)[0].amount)).toBe('12,5');
});

const car = () => buy(alice, { date: '2026/10/01', amount: '150.000.000', cls: 'Other', unit: '1', note: 'Car' });

const sellCar = () => {
	addEntry(db, alice, income({ date: '2026/11/03', amount: '150.000.000', category: 'sales of asset', asset: 'AST-0001' }));
	return listRecords(db, alice).find((row) => row.kind === 'income')!.id;
};

test(
	'choosing edit on a sale of car opens it with sales of asset and car chosen',
	{ meta: { scenario: 'S128' } },
	() => {
		car();
		const key = sellCar();

		expect(editableRecord(db, alice, key)).toMatchObject({ category: 'sales of asset', asset: 'AST-0001' });
	}
);

test(
	'deleting a sale of car removes the 0 update of car, and car returns to the held assets',
	{ meta: { scenario: 'S130' } },
	() => {
		car();
		const key = sellCar();

		deleteRecord(db, alice, key);

		expect(listRecords(db, alice).filter((row) => row.kind === 'asset').map((row) => row.amount)).toEqual([150000000]);
		expect(heldAssets(db, alice).map((row) => row.name)).toEqual(['Car']);
	}
);
