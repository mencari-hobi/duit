import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { assetList, savePurchase, saveUpdates } from './assets';
import { addEntry } from './entries';
import { deleteRecord } from './records';

let db: Db;
let alice: number;
let bob: number;

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

const gold = (fields: Record<string, string> = {}) => ({
	date: '2026/11/12',
	cls: 'Gold',
	source: 'Bonus',
	unit: '25',
	amount: '62.500.000',
	currency: 'IDR',
	note: 'Antam bar',
	...fields
});

const buy = (userId: number, fields: Record<string, string> = {}) => {
	const result = savePurchase(db, userId, gold(fields));
	if (!('saved' in result)) throw new Error(JSON.stringify(result));
	return result.saved;
};

const rowsOf = (userId: number) =>
	db.prepare('SELECT * FROM diary_assets WHERE user_id = ? ORDER BY date, id').all(userId) as Record<string, unknown>[];

const listed = (userId = alice, type = '') => assetList(db, userId, 'IDR', type);

test(
	'a second purchase gets AST-0002, while another account\'s first purchase gets AST-0001',
	{ meta: { scenario: 'S191' } },
	() => {
		buy(alice);

		const second = buy(alice, { note: 'Second bar' });
		const other = buy(bob);

		expect([second, other]).toEqual(['AST-0002', 'AST-0001']);
	}
);

test(
	'saving a purchase with a blank acquisition cost is refused and stores nothing',
	{ meta: { scenario: 'S49' } },
	() => {
		const result = savePurchase(db, alice, gold({ amount: '' }));

		expect(result).toEqual({ message: 'Please enter the acquisition cost (numbers only).', field: 'amount' });
		expect(rowsOf(alice)).toEqual([]);
	}
);

test(
	'saving a purchase with a blank unit is refused and stores nothing',
	{ meta: { scenario: 'S192' } },
	() => {
		const result = savePurchase(db, alice, gold({ unit: '' }));

		expect(result).toEqual({ message: 'Please enter the unit (numbers only).', field: 'unit' });
		expect(rowsOf(alice)).toEqual([]);
	}
);

test(
	'a foreign exchanges purchase of 2.000 usd stores the unit in usd and the cost in the default currency',
	{ meta: { scenario: 'S55' } },
	() => {
		buy(alice, { cls: 'Foreign Exchanges', unit: '2.000', unitCurrency: 'USD', amount: '32.000.000' });

		expect(rowsOf(alice)).toEqual([
			expect.objectContaining({ class: 'Foreign Exchanges', unit: 2000, unit_currency: 'USD', value: 32000000, currency: 'IDR' })
		]);
	}
);

test('a purchase refuses an asset type outside the list', () => {
	expect(savePurchase(db, alice, gold({ cls: 'Crypto' }))).toEqual(expect.objectContaining({ field: 'cls' }));
});

const purchaseKey = (userId = alice) => `a${rowsOf(userId)[0].id}`;

test(
	'saving the type mutual fund on a purchase moves every update of its asset to mutual fund',
	{ meta: { scenario: 'S197' } },
	() => {
		buy(alice);
		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '70.000.000' });

		savePurchase(db, alice, gold({ id: purchaseKey(), cls: 'Mutual Fund', unit: '1.200' }));

		expect(rowsOf(alice).map((row) => [row.code, row.class, row.unit])).toEqual([
			['AST-0001', 'Mutual Fund', 1200],
			['AST-0001', 'Mutual Fund', 1200]
		]);
	}
);

test('saving a new acquisition cost on a purchase keeps its code and adds no asset', () => {
	buy(alice);

	savePurchase(db, alice, gold({ id: purchaseKey(), amount: '13.000.000' }));

	expect(rowsOf(alice)).toEqual([expect.objectContaining({ code: 'AST-0001', value: 13000000, acquisition: 13000000 })]);
});

test(
	'deleting the purchase of AST-0001 removes every update of AST-0001',
	{ meta: { scenario: 'S198' } },
	() => {
		buy(alice);
		buy(alice, { note: 'Kept' });
		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '70.000.000' });

		deleteRecord(db, alice, purchaseKey());

		expect(rowsOf(alice).map((row) => row.code)).toEqual(['AST-0002']);
	}
);

test(
	'the asset list shows a held asset with its latest value and its gain over cost',
	{ meta: { scenario: 'S199' } },
	() => {
		buy(alice);
		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/20', 'value-AST-0001': '68.000.000' });

		expect(listed()?.rows).toEqual([
			expect.objectContaining({
				code: 'AST-0001',
				label: 'AST-0001 · Antam bar',
				type: 'Gold',
				unit: '25 gr',
				bought: '2026/11/12',
				cost: 62500000,
				value: 68000000,
				gain: 5500000
			})
		]);
	}
);

test('a currency unit reads its currency before the amount', () => {
	buy(alice, { cls: 'Foreign Exchanges', unit: '2.000', unitCurrency: 'USD', amount: '32.000.000' });

	expect(listed()?.rows[0].unit).toBe('USD 2.000');
});

test('a sold asset and a liability stay out of the asset list', { meta: { scenario: 'S200' } }, () => {
	buy(alice, { cls: 'Other', note: 'Car' });
	addEntry(db, alice, { type: 'income', date: '2026/11/20', amount: '150.000.000', currency: 'IDR', category: 'sales of asset', asset: 'AST-0001', note: '' });
	addEntry(db, alice, { type: 'debt', date: '2026/11/20', amount: '3.000.000', currency: 'IDR', name: 'Mortgage loan', term: 'Long term', note: '' });

	expect(listed()).toBeNull();
});

test(
	'the total row sums cost, market value, and gain, with the gain\'s share of cost',
	{ meta: { scenario: 'S201' } },
	() => {
		buy(alice);
		buy(alice, { cls: 'Cash', unit: '10.000.000', unitCurrency: 'IDR', amount: '10.000.000', note: 'BCA' });
		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/20', 'value-AST-0001': '68.000.000' });

		expect(listed()?.total).toEqual({ cost: 72500000, value: 78000000, gain: 5500000, share: 5500000 / 72500000 });
	}
);

test('filtering by gold leaves the other asset types out', { meta: { scenario: 'S202' } }, () => {
	buy(alice);
	buy(alice, { cls: 'Cash', unit: '10.000.000', unitCurrency: 'IDR', amount: '10.000.000', note: 'BCA' });

	expect(listed(alice, 'Gold')?.rows.map((row) => row.code)).toEqual(['AST-0001']);
});

test(
	'saving 70.000.000 as of 2026/11/30 adds an update of AST-0001 and keeps its earlier updates',
	{ meta: { scenario: 'S203' } },
	() => {
		buy(alice);

		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '70.000.000' });

		expect(rowsOf(alice).map((row) => [row.code, row.date, row.value, row.class, row.acquisition, row.name])).toEqual([
			['AST-0001', '2026-11-12', 62500000, 'Gold', 62500000, 'Antam bar'],
			['AST-0001', '2026-11-30', 70000000, 'Gold', 62500000, 'Antam bar']
		]);
	}
);

test('a row with a blank market value adds no update', { meta: { scenario: 'S204' } }, () => {
	buy(alice);

	saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '' });

	expect(rowsOf(alice)).toHaveLength(1);
});

test(
	'saving a second value for the same asset and date replaces that date\'s update',
	{ meta: { scenario: 'S205' } },
	() => {
		buy(alice);
		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '70.000.000' });

		saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '71.000.000' });

		expect(rowsOf(alice).map((row) => row.value)).toEqual([62500000, 71000000]);
	}
);

test('an update with a malformed market value is refused and adds nothing', () => {
	buy(alice);

	const result = saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '7x' });

	expect(result).toEqual({ message: 'Please enter the market value (numbers only).', field: 'value-AST-0001' });
	expect(rowsOf(alice)).toHaveLength(1);
});

test("an update for another account's asset adds nothing", () => {
	buy(bob);

	saveUpdates(db, alice, { 'date-AST-0001': '2026/11/30', 'value-AST-0001': '70.000.000' });

	expect(rowsOf(bob)).toHaveLength(1);
	expect(rowsOf(alice)).toHaveLength(0);
});
