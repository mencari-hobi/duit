import Database from 'better-sqlite3';
import { expect, inject, test } from 'vitest';
import { get, post, registered } from './app';
import { openPage } from './browser';

function assetRows(name: string) {
	const db = new Database(inject('databasePath'), { readonly: true });
	const found = db
		.prepare('SELECT * FROM assets WHERE user_id = (SELECT id FROM users WHERE name = ?) ORDER BY id')
		.all(name) as Record<string, unknown>[];
	db.close();
	return found;
}

const savings = {
	type: 'asset',
	date: '2026/10/10',
	amount: '12.999.954',
	market: '12.659.563',
	currency: 'IDR',
	name: 'Savings account',
	cls: 'Cash',
	source: 'Salary',
	note: ''
};

const savingsPage = '/assets/Savings%20account';

test(
	'savings account worth 12.659.563 against an acquisition value of 12.999.954 lists with its value, cost, and gain',
	{ meta: { scenario: 'S144' } },
	async () => {
		const { cookie } = await registered();
		await post('/add', savings, cookie);

		const page = await openPage('/assets', cookie);
		const row = page.getByRole('link', { name: /Savings account/ });

		const text = await row.textContent();
		expect(text).toContain('12.659.563');
		expect(text).toContain('cost 12.999.954');
		expect(text).toContain('−340.391 (−2.6%)');
	}
);

test(
	'a new account opening the assets page points to the add page',
	{ meta: { scenario: 'S151' } },
	async () => {
		const { cookie } = await registered();
		const page = await openPage('/assets', cookie);

		expect(await page.getByText('No assets yet.').textContent()).toBe(
			'No assets yet. Add your first asset on the Add page.'
		);
		await page.getByRole('link', { name: 'Add page' }).click();
		await page.waitForURL((url) => url.pathname === '/add');
	}
);

test(
	"opening the page of another account's asset shows Asset not found with status 404",
	{ meta: { scenario: 'S153' } },
	async () => {
		const owner = await registered();
		await post('/add', savings, owner.cookie);
		const { cookie } = await registered();

		const response = await get(savingsPage, cookie);

		expect(response.status).toBe(404);
		expect(await response.text()).toContain('Asset not found');
	}
);

test(
	'adding a valuation of savings account dated 2026/11/30 worth 13.100.000 lists it on the assets page at 13.100.000',
	{ meta: { scenario: 'S154' } },
	async () => {
		const { cookie } = await registered();
		await post('/add', savings, cookie);
		const page = await openPage(savingsPage, cookie);

		await page.getByLabel('Date').fill('2026/11/30');
		await page.getByLabel('Market value').pressSequentially('13100000');
		await page.getByRole('button', { name: 'Add valuation' }).click();
		await expect.poll(() => page.getByRole('list', { name: 'Valuations' }).textContent()).toContain('2026/11/30');

		await page.goto(page.url().replace(savingsPage, '/assets'));
		expect(await page.getByRole('link', { name: /Savings account/ }).textContent()).toContain('13.100.000');
	}
);

test(
	'the valuation of 0 from a sale of car reads sold, without edit or delete',
	{ meta: { scenario: 'S164' } },
	async () => {
		const { cookie } = await registered();
		await post('/add', { ...savings, name: 'Car', cls: 'Other', market: '' }, cookie);
		await post(
			'/add',
			{ type: 'income', date: '2026/11/03', amount: '10.000.000', currency: 'IDR', category: 'Sales of Asset', asset: 'Car', note: '' },
			cookie
		);

		const page = await openPage('/assets/Car', cookie);
		const [sale, bought] = await page.getByRole('list', { name: 'Valuations' }).getByRole('listitem').all();

		expect(await sale.textContent()).toContain('Sold');
		expect(await sale.getByRole('link', { name: /^Edit/ }).count()).toBe(0);
		expect(await sale.getByRole('button', { name: /^Delete/ }).count()).toBe(0);
		expect(await bought.getByRole('link', { name: /^Edit/ }).count()).toBe(1);
	}
);

test(
	'renaming savings account to BCA savings lists every valuation of it under BCA savings on the records page',
	{ meta: { scenario: 'S165' } },
	async () => {
		const { cookie } = await registered();
		await post('/add', savings, cookie);
		await post(`${savingsPage}?/valuation`, { date: '2026/11/10', amount: '13.000.000', acquisition: '', note: '' }, cookie);
		const page = await openPage(savingsPage, cookie);

		await page.getByLabel('Name').fill('BCA savings');
		await page.getByRole('button', { name: 'Save details' }).click();
		await page.waitForURL((url) => url.pathname === '/assets/BCA%20savings');

		await page.goto(page.url().replace('/assets/BCA%20savings', '/records'));
		const text = (await page.locator('table').textContent())!;
		expect(text.match(/BCA savings \(Cash\)/g)).toHaveLength(2);
		expect(text).not.toContain('Savings account');
	}
);

test('opening an edit key the asset lacks shows Valuation not found with status 404', async () => {
	const { cookie } = await registered();
	await post('/add', savings, cookie);

	const response = await get(`${savingsPage}?edit=a999999`, cookie);

	expect(response.status).toBe(404);
	expect(await response.text()).toContain('Valuation not found');
});

test('adding a valuation to an asset the account lacks answers status 404', async () => {
	const { cookie } = await registered();

	const response = await post(`${savingsPage}?/valuation`, { date: '2026/11/10', amount: '13.000.000', acquisition: '', note: '' }, cookie);

	expect(response.status).toBe(404);
});

test('adding a valuation with the market value "abc" answers status 400 with the numbers-only message', async () => {
	const { cookie } = await registered();
	await post('/add', savings, cookie);

	const response = await post(`${savingsPage}?/valuation`, { date: '2026/11/10', amount: 'abc', acquisition: '', note: '' }, cookie);

	expect(response.status).toBe(400);
	expect(await response.text()).toContain('Please enter an amount (numbers only).');
});

test('saving an edited valuation at 13.000.000 stores it and returns to the asset page', async () => {
	const { name, cookie } = await registered();
	await post('/add', savings, cookie);
	const [stored] = assetRows(name);

	const response = await post(
		`${savingsPage}?/valuation`,
		{ id: `a${stored.id}`, date: '2026/10/10', amount: '13.000.000', acquisition: '', note: '' },
		cookie
	);

	expect(response.status).toBe(303);
	expect(response.headers.get('location')).toBe(savingsPage);
	expect(assetRows(name)).toEqual([expect.objectContaining({ id: stored.id, value: 13000000 })]);
});

test('deleting one of two valuations returns to the asset page', async () => {
	const { name, cookie } = await registered();
	await post('/add', savings, cookie);
	await post(`${savingsPage}?/valuation`, { date: '2026/11/10', amount: '13.000.000', acquisition: '', note: '' }, cookie);
	const [, latest] = assetRows(name);

	const response = await post(`${savingsPage}?/delete`, { id: `a${latest.id}` }, cookie);

	expect(response.headers.get('location')).toBe(savingsPage);
	expect(assetRows(name)).toHaveLength(1);
});

test('deleting the only valuation returns to the assets page', async () => {
	const { name, cookie } = await registered();
	await post('/add', savings, cookie);
	const [stored] = assetRows(name);

	const response = await post(`${savingsPage}?/delete`, { id: `a${stored.id}` }, cookie);

	expect(response.headers.get('location')).toBe('/assets');
	expect(assetRows(name)).toEqual([]);
});

test('saving details with a blank name answers status 400 with the name message', async () => {
	const { cookie } = await registered();
	await post('/add', savings, cookie);

	const response = await post(`${savingsPage}?/details`, { name: ' ', cls: 'Cash', source: 'Salary' }, cookie);

	expect(response.status).toBe(400);
	expect(await response.text()).toContain('Please enter a name for the asset.');
});

test('the page of a goldbar asks for the weight and the market price per gram instead of the market value', async () => {
	const { cookie } = await registered();
	await post('/add', { ...savings, name: 'Antam', cls: 'Goldbar', amount: '3.000.000', market: '', weight: '2,5', price: '1.500.000' }, cookie);

	const text = await (await get('/assets/Antam', cookie)).text();

	expect(text).toContain('Weight (grams)');
	expect(text).toContain('Market price per gram');
	expect(text).not.toContain('Market value');
});

test('the page of a liability asks for the balance and the term, without an acquisition value', async () => {
	const { cookie } = await registered();
	await post('/add', { ...savings, name: 'Mortgage loan', cls: 'Liability', term: 'Long term', amount: '300.000.000', market: '' }, cookie);

	const text = await (await get('/assets/Mortgage%20loan', cookie)).text();

	expect(text).toContain('Balance');
	expect(text).toContain('Liability term');
	expect(text).not.toContain('Acquisition value');
});
