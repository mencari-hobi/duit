import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { addValuation, assetPage, deleteValuation, listAssets, saveDetails, saveValuation, valuationForm } from './assets';
import { openDatabase, type Db } from './db';
import { addEntry } from './entries';

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

const asset = (fields: Record<string, string> = {}) => ({
	type: 'asset',
	date: '2026/10/10',
	amount: '12.000.000',
	currency: 'IDR',
	name: 'Savings account',
	cls: 'Cash',
	source: 'Salary',
	acquisition: '',
	note: '',
	...fields
});

const valuation = (fields: Record<string, string> = {}) => ({ date: '2026/11/30', amount: '13.100.000', acquisition: '', note: '', ...fields });

const valuations = (name: string) => assetPage(db, alice, name)!.valuations;

test('car worth 150.000.000 lists above savings account worth 12.659.563', { meta: { scenario: 'S145' } }, () => {
	addEntry(db, alice, asset({ amount: '12.659.563' }));
	addEntry(db, alice, asset({ name: 'Car', cls: 'Other', amount: '150.000.000' }));

	expect(listAssets(db, alice).assets.map((row) => row.name)).toEqual(['Car', 'Savings account']);
});

test('the assets of another account stay out of the list', { meta: { scenario: 'S147' } }, () => {
	addEntry(db, bob, asset());

	expect(listAssets(db, alice)).toEqual({ assets: [], liabilities: [], sold: [] });
});

test(
	'three stored entries named savings account list as one asset, whose page shows three valuations',
	{ meta: { scenario: 'S148' } },
	() => {
		for (const date of ['2026/09/10', '2026/10/10', '2026/11/10']) addEntry(db, alice, asset({ date }));

		expect(listAssets(db, alice).assets).toHaveLength(1);
		expect(valuations('Savings account')).toHaveLength(3);
	}
);

test(
	'mortgage loan at 300.000.000 lists under liabilities with 300.000.000 and without a cost',
	{ meta: { scenario: 'S149' } },
	() => {
		addEntry(db, alice, asset({ name: 'Mortgage loan', cls: 'Liability', term: 'Long term', amount: '300.000.000' }));

		expect(listAssets(db, alice)).toEqual({
			assets: [],
			liabilities: [expect.objectContaining({ name: 'Mortgage loan', value: 300000000, acquisition: null })],
			sold: []
		});
	}
);

test('car sold on 2026/11/03 lists under sold and leaves the assets section', { meta: { scenario: 'S150' } }, () => {
	addEntry(db, alice, asset({ name: 'Car', cls: 'Other', amount: '150.000.000' }));
	addEntry(db, alice, { type: 'income', date: '2026/11/03', amount: '140.000.000', currency: 'IDR', category: 'sales of asset', asset: 'Car', note: '' });

	const { assets, sold } = listAssets(db, alice);

	expect(assets).toEqual([]);
	expect(sold).toEqual([expect.objectContaining({ name: 'Car', value: 0 })]);
});

test(
	'savings account lists its valuations dated 2026/11/10 and 2026/10/10 newest first',
	{ meta: { scenario: 'S152' } },
	() => {
		addEntry(db, alice, asset({ date: '2026/10/10' }));
		addEntry(db, alice, asset({ date: '2026/11/10' }));

		expect(valuations('Savings account').map((row) => row.date)).toEqual(['2026/11/10', '2026/10/10']);
	}
);

test("the page of another account's asset is missing", () => {
	addEntry(db, bob, asset());

	expect(assetPage(db, alice, 'Savings account')).toBeNull();
});

test(
	'adding a valuation with a blank acquisition value stores the acquisition value of the latest valuation',
	{ meta: { scenario: 'S155' } },
	() => {
		addEntry(db, alice, asset({ amount: '12.659.563', acquisition: '12.999.954' }));

		addValuation(db, alice, 'Savings account', valuation());

		expect(valuations('Savings account')[0]).toMatchObject({ value: 13100000, acquisition: 12999954 });
	}
);

test(
	'adding a valuation with a blank market value shows the numbers-only message and stores no valuation',
	{ meta: { scenario: 'S157' } },
	() => {
		addEntry(db, alice, asset());

		const result = addValuation(db, alice, 'Savings account', valuation({ amount: '' }));

		expect(result).toEqual({ message: 'Please enter an amount (numbers only).', field: 'amount' });
		expect(valuations('Savings account')).toHaveLength(1);
	}
);

test(
	'adding a valuation of the liability mortgage loan worth 290.000.000 stores it without an acquisition value',
	{ meta: { scenario: 'S158' } },
	() => {
		addEntry(db, alice, asset({ name: 'Mortgage loan', cls: 'Liability', term: 'Long term', amount: '300.000.000' }));

		addValuation(db, alice, 'Mortgage loan', valuation({ amount: '290.000.000' }));

		expect(valuations('Mortgage loan')[0]).toMatchObject({ value: 290000000, acquisition: null });
	}
);

test(
	'adding a valuation of a goldbar at 2,5 grams and 1.600.000 per gram stores a market value of 4.000.000',
	{ meta: { scenario: 'S159' } },
	() => {
		addEntry(db, alice, asset({ name: 'Antam', cls: 'Goldbar', amount: '3.000.000', weight: '2,5', price: '1.500.000' }));

		addValuation(db, alice, 'Antam', valuation({ amount: '', weight: '2,5', price: '1.600.000' }));

		expect(valuations('Antam')[0]).toMatchObject({ value: 4000000, acquisition: 3000000, weight: 2.5, price: 1600000 });
	}
);

test('adding a valuation to an asset the account lacks answers missing and stores nothing', () => {
	addEntry(db, bob, asset());

	expect(addValuation(db, alice, 'Savings account', valuation())).toEqual({ missing: true });
	expect(assetPage(db, bob, 'Savings account')!.valuations).toHaveLength(1);
});

test(
	"editing that goldbar's valuation fills the acquisition value 3.000.000, the weight 2,5, and the market price per gram 1.500.000",
	{ meta: { scenario: 'S139' } },
	() => {
		addEntry(db, alice, asset({ name: 'Antam', cls: 'Goldbar', amount: '3.000.000', weight: '2,5', price: '1.500.000' }));
		const [{ id }] = valuations('Antam');

		expect(valuationForm(db, alice, 'Antam', id)).toMatchObject({
			id,
			acquisition: '3.000.000',
			weight: '2,5',
			price: '1.500.000'
		});
	}
);

test(
	'saving the market value 13.000.000 on an edited valuation stores it on the same valuation and adds no valuation',
	{ meta: { scenario: 'S161' } },
	() => {
		addEntry(db, alice, asset());
		const [{ id }] = valuations('Savings account');

		saveValuation(db, alice, 'Savings account', { ...valuationForm(db, alice, 'Savings account', id)!, amount: '13.000.000' });

		expect(valuations('Savings account')).toEqual([expect.objectContaining({ id, value: 13000000, acquisition: 12000000 })]);
	}
);

test('saving a valuation of another asset answers missing and leaves it unchanged', () => {
	addEntry(db, alice, asset());
	addEntry(db, alice, asset({ name: 'Car', amount: '5' }));
	const [{ id }] = valuations('Car');

	const result = saveValuation(db, alice, 'Savings account', { ...valuation(), id });

	expect(result).toEqual({ missing: true });
	expect(valuations('Car')).toEqual([expect.objectContaining({ id, value: 5 })]);
});

test(
	'deleting the latest valuation of savings account lists it at the value of the valuation before it',
	{ meta: { scenario: 'S162' } },
	() => {
		addEntry(db, alice, asset({ date: '2026/10/10', amount: '12.000.000' }));
		addEntry(db, alice, asset({ date: '2026/11/10', amount: '13.000.000' }));
		const [latest] = valuations('Savings account');

		deleteValuation(db, alice, 'Savings account', latest.id);

		expect(listAssets(db, alice).assets).toEqual([expect.objectContaining({ name: 'Savings account', value: 12000000 })]);
	}
);

test('deleting the only valuation of an asset removes the asset', { meta: { scenario: 'S163' } }, () => {
	addEntry(db, alice, asset());
	const [{ id }] = valuations('Savings account');

	deleteValuation(db, alice, 'Savings account', id);

	expect(listAssets(db, alice).assets).toEqual([]);
	expect(assetPage(db, alice, 'Savings account')).toBeNull();
});

test('deleting the valuation of a sale leaves it stored', () => {
	addEntry(db, alice, asset({ name: 'Car', cls: 'Other' }));
	addEntry(db, alice, { type: 'income', date: '2026/11/03', amount: '1', currency: 'IDR', category: 'sales of asset', asset: 'Car', note: '' });
	const [sale] = valuations('Car');

	deleteValuation(db, alice, 'Car', sale.id);

	expect(valuations('Car')).toEqual([expect.objectContaining({ id: sale.id, sold: true }), expect.anything()]);
});

test(
	'renaming an asset to the name of another asset of the account, ignoring case, refuses and keeps the name',
	{ meta: { scenario: 'S166' } },
	() => {
		addEntry(db, alice, asset());
		addEntry(db, alice, asset({ name: 'Car' }));

		const result = saveDetails(db, alice, 'Savings account', { name: 'car', cls: 'Cash', source: 'Salary' });

		expect(result).toEqual({ message: 'Another asset has that name.', field: 'name' });
		expect(assetPage(db, alice, 'Savings account')).not.toBeNull();
	}
);

test('renaming an asset to a blank name refuses and keeps the name', () => {
	addEntry(db, alice, asset());

	const result = saveDetails(db, alice, 'Savings account', { name: ' ', cls: 'Cash', source: 'Salary' });

	expect(result).toEqual({ message: 'Please enter a name for the asset.', field: 'name' });
});

test('changing an asset into a liability drops its source of fund and keeps the term', () => {
	addEntry(db, alice, asset());
	addEntry(db, alice, asset({ date: '2026/11/10' }));

	saveDetails(db, alice, 'Savings account', { name: 'Savings account', cls: 'Liability', source: 'Salary', term: 'Short term' });

	expect(assetPage(db, alice, 'Savings account')).toMatchObject({ cls: 'Liability', source: null, term: 'Short term' });
	expect(listAssets(db, alice).liabilities).toHaveLength(1);
});

test('an asset changed from a liability lists without a gain', () => {
	addEntry(db, alice, asset({ name: 'Mortgage loan', cls: 'Liability', term: 'Long term' }));

	saveDetails(db, alice, 'Mortgage loan', { name: 'Mortgage loan', cls: 'Cash', source: 'Salary' });

	expect(listAssets(db, alice).assets).toEqual([expect.objectContaining({ name: 'Mortgage loan', acquisition: null, gain: null })]);
});

test('the key of an income entry with the number of a valuation opens no valuation for editing', () => {
	addEntry(db, alice, asset());
	addEntry(db, alice, { type: 'income', date: '2026/11/03', amount: '1', currency: 'IDR', category: 'salary', note: '' });
	const [{ id }] = valuations('Savings account');

	expect(valuationForm(db, alice, 'Savings account', id.replace('a', 'e'))).toBeNull();
});

test('saving a valuation without an id answers missing and adds no valuation', () => {
	addEntry(db, alice, asset());

	const result = saveValuation(db, alice, 'Savings account', valuation());

	expect(result).toEqual({ missing: true });
	expect(valuations('Savings account')).toHaveLength(1);
});

test('saving the market value "abc" on an edited valuation refuses and keeps the valuation', () => {
	addEntry(db, alice, asset());
	const [{ id }] = valuations('Savings account');

	const result = saveValuation(db, alice, 'Savings account', { ...valuationForm(db, alice, 'Savings account', id)!, amount: 'abc' });

	expect(result).toEqual({ message: 'Please enter an amount (numbers only).', field: 'amount' });
	expect(valuations('Savings account')).toEqual([expect.objectContaining({ id, value: 12000000 })]);
});

test('renaming an asset to its own name in another case stores the new case', () => {
	addEntry(db, alice, asset());

	const result = saveDetails(db, alice, 'Savings account', { name: 'savings account', cls: 'Cash', source: 'Salary' });

	expect(result).toEqual({ name: 'savings account' });
	expect(listAssets(db, alice).assets.map((row) => row.name)).toEqual(['savings account']);
});
