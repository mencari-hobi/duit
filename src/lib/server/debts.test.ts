import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { debtTable, reportingMonths, saveDebt, savePayments } from './debts';
import { deleteRecord, editableRecord, listRecords } from './records';
import { label } from '#lib/record.ts';
import { saveSettings } from './settings';

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

const car = (fields: Record<string, string> = {}) => ({
	category: 'Car installment',
	amount: '150.000.000',
	tenor: '36',
	paymentType: 'Monthly',
	start: '2025/06/25',
	end: '2028/05/25',
	installment: '5.200.000',
	...fields
});

const borrow = (userId: number, fields: Record<string, string> = {}) => {
	const result = saveDebt(db, userId, car(fields));
	if (!('saved' in result)) throw new Error(JSON.stringify(result));
	return result.saved;
};

const debts = (userId: number) =>
	db.prepare('SELECT * FROM diary_debts WHERE user_id = ? ORDER BY id').all(userId) as Record<string, unknown>[];

const payments = () => db.prepare('SELECT * FROM diary_debt_payments').all() as Record<string, unknown>[];

const startDay25 = () => saveSettings(db, alice, { currency: 'IDR', startDay: '25' });

test('saving a monthly car installment debt stores DBT-0001 with its schedule', () => {
	expect(saveDebt(db, alice, car())).toEqual({ saved: 'DBT-0001' });
	expect(debts(alice)).toEqual([
		expect.objectContaining({
			code: 'DBT-0001',
			category: 'Car installment',
			amount: 150000000,
			tenor: 36,
			payment_type: 'Monthly',
			start: '2025-06-25',
			end: '2028-05-25',
			installment: 5200000,
			currency: 'IDR'
		})
	]);
});

test('a second debt gets DBT-0002 while another account starts at DBT-0001', { meta: { scenario: 'S212' } }, () => {
	borrow(alice);

	expect(borrow(alice)).toBe('DBT-0002');
	expect(borrow(bob)).toBe('DBT-0001');
});

test('a blank debt amount is refused and stores nothing', { meta: { scenario: 'S213' } }, () => {
	expect(saveDebt(db, alice, car({ amount: '' }))).toEqual({
		message: 'Please enter the debt amount (numbers only).',
		field: 'amount'
	});
	expect(debts(alice)).toEqual([]);
});

test('a tenor of 1.5 months is refused and stores nothing', { meta: { scenario: 'S214' } }, () => {
	expect(saveDebt(db, alice, car({ tenor: '1.5' }))).toEqual({
		message: 'Please enter the tenor as a whole number of months (1 or more).',
		field: 'tenor'
	});
	expect(debts(alice)).toEqual([]);
});

test('a blank installment amount is refused and stores nothing', { meta: { scenario: 'S216' } }, () => {
	expect(saveDebt(db, alice, car({ installment: '' }))).toEqual({
		message: 'Please enter the installment amount (numbers only).',
		field: 'installment'
	});
	expect(debts(alice)).toEqual([]);
});

test('an end payment before the start payment is refused and stores nothing', { meta: { scenario: 'S215' } }, () => {
	expect(saveDebt(db, alice, car({ end: '2025/06/24' }))).toEqual({
		message: 'The end payment cannot be before the start payment.',
		field: 'end'
	});
	expect(debts(alice)).toEqual([]);
});

test('an end payment off the schedule still saves', () => {
	expect(saveDebt(db, alice, car({ end: '2028/06/25' }))).toEqual({ saved: 'DBT-0001' });
});

test('a category outside the list is refused', () => {
	expect(saveDebt(db, alice, car({ category: 'Pawn' }))).toEqual({
		message: 'Pick a debt category from the list.',
		field: 'category'
	});
});

test('saving the installment 5.000.000 on DBT-0001 keeps its code and adds no debt', { meta: { scenario: 'S237' } }, () => {
	borrow(alice);
	const id = `d${debts(alice)[0].id}`;

	expect(saveDebt(db, alice, car({ id, installment: '5.000.000' }))).toEqual({ saved: 'DBT-0001' });
	expect(debts(alice)).toEqual([expect.objectContaining({ code: 'DBT-0001', installment: 5000000 })]);
});

test('editing a debt of another account changes nothing', () => {
	borrow(bob);
	const id = `d${debts(bob)[0].id}`;

	expect(saveDebt(db, alice, car({ id, installment: '1' }))).toEqual({ missing: true });
	expect(debts(bob)[0].installment).toBe(5200000);
});

test('a debt opens for editing on the debt tab filled', () => {
	borrow(alice);
	const id = `d${debts(alice)[0].id}`;

	expect(editableRecord(db, alice, id)).toEqual({
		id,
		type: 'debt',
		category: 'Car installment',
		amount: '150.000.000',
		tenor: '36',
		paymentType: 'Monthly',
		start: '2025/06/25',
		end: '2028/05/25',
		installment: '5.200.000'
	});
});

test('deleting DBT-0001 removes the debt and its paid ticks', { meta: { scenario: 'S223' } }, () => {
	startDay25();
	borrow(alice);
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	deleteRecord(db, alice, `d${debts(alice)[0].id}`);

	expect(debts(alice)).toEqual([]);
	expect(payments()).toEqual([]);
});

test('a debt lists in records on its start date at its debt amount', { meta: { scenario: 'S221' } }, () => {
	borrow(alice);

	const [record] = listRecords(db, alice);

	expect(record).toEqual(expect.objectContaining({ kind: 'debt', date: '2025-06-25', amount: 150000000 }));
	expect(label(record)).toBe('DBT-0001 · Car installment · 36 × 5.200.000 monthly');
});

test('debt payment reads DBT-0001 for the current reporting month', { meta: { scenario: 'S225' } }, () => {
	startDay25();
	borrow(alice);

	expect(debtTable(db, alice, '2026-11')!.rows).toEqual([
		{ code: 'DBT-0001', category: 'Car installment', total: 187200000, due: 5200000, paid: false, remaining: 98800000 }
	]);
});

test('a weekly debt from the first day of the window is due five times in it', { meta: { scenario: 'S226' } }, () => {
	startDay25();
	borrow(alice, { paymentType: 'Weekly', tenor: '12', start: '2026/10/25', end: '2027/09/19', installment: '1.000.000' });

	expect(debtTable(db, alice, '2026-11')!.rows[0].due).toBe(5000000);
});

test('a finished debt and a debt starting later stay out of the table', { meta: { scenario: 'S227' } }, () => {
	startDay25();
	borrow(alice, { tenor: '3', start: '2026/01/25', end: '2026/03/25' });
	borrow(alice, { start: '2026/11/25', end: '2029/10/25' });
	borrow(alice);

	expect(debtTable(db, alice, '2026-11')!.rows.map((row) => row.code)).toEqual(['DBT-0003']);
});

test('the total row sums the amounts and counts the unticked rows', { meta: { scenario: 'S228' } }, () => {
	startDay25();
	borrow(alice);
	borrow(alice, { category: 'Mortgage', amount: '900.000.000', tenor: '180', end: '2040/05/25', installment: '6.000.000' });
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	expect(debtTable(db, alice, '2026-11')!.total).toEqual({
		total: 187200000 + 1080000000,
		due: 11200000,
		unpaid: 1,
		remaining: 98800000 + 1080000000 - 17 * 6000000
	});
});

test('reporting month lists each month from the earliest start to the current one, newest first', { meta: { scenario: 'S229' } }, () => {
	startDay25();
	borrow(alice, { start: '2026/08/25', end: '2029/07/25' });

	expect(reportingMonths(db, alice, '2026-11-18')).toEqual([
		{ value: '2026-11', label: '2026-11 (25 Oct – 24 Nov 2026) · current' },
		{ value: '2026-10', label: '2026-10 (25 Sep – 24 Oct 2026)' },
		{ value: '2026-09', label: '2026-09 (25 Aug – 24 Sep 2026)' }
	]);
});

test('an earlier month shows its own due amounts', () => {
	startDay25();
	borrow(alice, { start: '2026/10/25', end: '2029/09/25' });

	expect(debtTable(db, alice, '2026-10')!.rows).toEqual([]);
	expect(debtTable(db, alice, '2026-11')!.rows[0]).toEqual(
		expect.objectContaining({ due: 5200000, remaining: 187200000 - 5200000 })
	);
});

test('ticking DBT-0001 for 2026-11 stores its payment paid today', () => {
	startDay25();
	borrow(alice);

	expect(savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18')).toEqual({ paid: 1 });
	expect(payments()).toEqual([expect.objectContaining({ month: '2026-11', paid_date: '2026-11-18' })]);
	expect(debtTable(db, alice, '2026-11')!.rows[0].paid).toBe(true);
});

test('saving the tick again keeps the first paid date', () => {
	startDay25();
	borrow(alice);
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-20');

	expect(payments()).toEqual([expect.objectContaining({ paid_date: '2026-11-18' })]);
});

test('unticking DBT-0001 removes its payment for 2026-11', { meta: { scenario: 'S231' } }, () => {
	startDay25();
	borrow(alice);
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	savePayments(db, alice, '2026-11', {}, '2026-11-18');

	expect(payments()).toEqual([]);
});

test('ticking DBT-0001 leaves its remaining debt unchanged', { meta: { scenario: 'S232' } }, () => {
	startDay25();
	borrow(alice);

	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	expect(debtTable(db, alice, '2026-11')!.rows[0].remaining).toBe(98800000);
});

test('a tick for a debt of another account stores nothing', () => {
	borrow(bob);

	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	expect(payments()).toEqual([]);
});

test('an account without debts has no debt table', () => {
	expect(debtTable(db, alice, '2026-11')).toBeNull();
	expect(reportingMonths(db, alice, '2026-11-18')).toEqual([
		{ value: '2026-11', label: '2026-11 (1 Nov – 30 Nov 2026) · current' }
	]);
});
