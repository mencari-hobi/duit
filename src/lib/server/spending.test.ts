import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { savePurchase, saveUpdates } from './assets';
import { openDatabase, type Db } from './db';
import { saveDebt, savePayments } from './debts';
import { addEntry } from './entries';
import { deletePlanItem, savePlanItem } from './plan';
import { saveSettings } from './settings';
import { periodOf, spendingReport } from './spending';

let db: Db;
let alice: number;

beforeEach(() => {
	db = openDatabase(':memory:');
	const result = register(db, 'alice', 'password1');
	if (!('user' in result)) throw new Error(result.message);
	alice = result.user.id;
});

const today = '2026-11-18';

const plan = (fields: Record<string, string>) => {
	const result = savePlanItem(db, alice, { currency: 'IDR', timeframe: 'monthly', note: '', ...fields });
	if (!('added' in result)) throw new Error(JSON.stringify(result));
};

const diary = (fields: Record<string, string>) => addEntry(db, alice, { currency: 'IDR', note: '', ...fields });

const buy = (date: string, amount: string, fields: Record<string, string> = {}) => {
	const result = savePurchase(db, alice, { date, cls: 'Cash', source: 'Salary', unit: '1', amount, currency: 'IDR', note: 'Savings', ...fields });
	if (!('saved' in result)) throw new Error(JSON.stringify(result));
	return result.saved;
};

const dreamId = (dream: string) =>
	String((db.prepare('SELECT id FROM plan_savings WHERE dream = ?').get(dream) as { id: number }).id);

const report = (start = '2026-11-01', end = '2026-11-30') => spendingReport(db, alice, start, end)!;

const section = (name: string, start?: string, end?: string) => report(start, end).sections.find((found) => found.name === name)!;

const row = (sectionName: string, label: string, start?: string, end?: string) =>
	section(sectionName, start, end).rows.find((found) => found.label === label)!;

test('the report opens on last month, the previous reporting month', { meta: { scenario: 'S239' } }, () => {
	saveSettings(db, alice, { currency: 'IDR', startDay: '25' });

	expect(periodOf(db, alice, {}, today)).toMatchObject({ period: 'lastmonth', start: '2026-09-25', end: '2026-10-24' });
});

test('on a date covers that day alone', { meta: { scenario: 'S240' } }, () => {
	expect(periodOf(db, alice, { period: 'on', date: '2026/11/03' }, today)).toMatchObject({ start: '2026-11-03', end: '2026-11-03' });
});

test('before a date covers every date up to the day before, from the earliest diary date', { meta: { scenario: 'S241' } }, () => {
	diary({ type: 'expense', date: '2026/08/14', amount: '1', category: 'grocery', expenseType: 'Non-fixed - Essential', owner: 'Personal' });

	expect(periodOf(db, alice, { period: 'before', date: '2026/11/03' }, today)).toMatchObject({
		start: '2026-08-14',
		end: '2026-11-02'
	});
});

test('between two dates covers both end dates', { meta: { scenario: 'S242' } }, () => {
	expect(periodOf(db, alice, { period: 'between', from: '2026/11/01', to: '2026/11/10' }, today)).toMatchObject({
		start: '2026-11-01',
		end: '2026-11-10'
	});
});

test('last 7 days covers today and the 6 days before', { meta: { scenario: 'S243' } }, () => {
	expect(periodOf(db, alice, { period: 'last7' }, today)).toMatchObject({ start: '2026-11-12', end: '2026-11-18' });
});

test('between with the end before the start is refused', { meta: { scenario: 'S244' } }, () => {
	expect(periodOf(db, alice, { period: 'between', from: '2026/11/10', to: '2026/11/01' }, today)).toMatchObject({
		error: 'The end date cannot be before the start date.'
	});
});

test('a malformed date falls back to today', () => {
	expect(periodOf(db, alice, { period: 'on', date: 'soon' }, today)).toMatchObject({ start: today, end: today });
});

test('a monthly salary budget reads in full for one reporting month and by days ÷ 30 otherwise', { meta: { scenario: 'S245' } }, () => {
	diary({ type: 'income', date: '2026/11/05', amount: '1', category: 'salary' });
	plan({ tab: 'income', amount: '10.000.000', category: 'Salary' });

	expect(row('Income', 'Salary').budget).toBe(10000000);
	expect(row('Income', 'Salary', '2026-11-12', '2026-11-18').budget).toBeCloseTo(2333333.33, 1);
});

test('a weekly plan income counts four times a month', () => {
	plan({ tab: 'income', amount: '1.000.000', category: 'Freelance', timeframe: 'weekly' });

	expect(row('Income', 'Freelance').budget).toBe(4000000);
});

test('a diary salary under its plan reads the shortfall in the unfavourable tone', { meta: { scenario: 'S246' } }, () => {
	diary({ type: 'income', date: '2026/11/05', amount: '9.000.000', category: 'salary' });
	plan({ tab: 'income', amount: '10.000.000', category: 'Salary' });

	expect(row('Income', 'Salary')).toEqual({ label: 'Salary', actual: 9000000, budget: 10000000, variance: -1000000, share: -0.1, good: false });
});

test('a sale of an asset stays out of income', { meta: { scenario: 'S247' } }, () => {
	const code = buy('2026/10/01', '5.000.000');
	diary({ type: 'income', date: '2026/11/05', amount: '6.000.000', category: 'sales of asset', asset: code });

	expect(section('Income').actual).toBe(0);
});

const carDebt = {
	category: 'Car installment',
	amount: '150.000.000',
	tenor: '36',
	paymentType: 'Monthly',
	start: '2025/06/25',
	end: '2028/05/25',
	installment: '5.200.000'
};

test('a debt installment ticked paid on a date in the period counts as its due amount', { meta: { scenario: 'S248' } }, () => {
	saveDebt(db, alice, carDebt);
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');

	expect([
		row('Debt payment', 'Car installment', '2026-11-18', '2026-11-18').actual,
		section('Debt payment', '2026-11-01', '2026-11-17').actual
	]).toEqual([5200000, 0]);
});

test('a plan installment running through the period is the budget, and paying more reads unfavourable', { meta: { scenario: 'S249' } }, () => {
	saveDebt(db, alice, carDebt);
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');
	plan({ tab: 'debt', category: 'Car installment', amount: '5.000.000', start: '2025/06/25', end: '2028/05/25' });

	expect(row('Debt payment', 'Car installment')).toMatchObject({ budget: 5000000, variance: 200000, good: false });
});

test('a plan installment ending before the period leaves the budget out', () => {
	plan({ tab: 'debt', category: 'Mortgage', amount: '3.000.000', start: '2020/01/01', end: '2026/10/31' });
	diary({ type: 'income', date: '2026/11/05', amount: '1', category: 'salary' });

	expect(section('Debt payment').rows).toEqual([]);
});

test('a purchase linked to a dream counts as that dream\'s saving against its monthly budget', { meta: { scenario: 'S250' } }, () => {
	plan({ tab: 'saving', dream: 'House', amount: '120.000.000', months: '24', start: '2026/11/01' });
	buy('2026/11/10', '2.000.000', { dream: dreamId('House') });

	expect(row('Saving', 'House')).toMatchObject({ actual: 2000000, budget: 5000000 });
});

test('a purchase without a dream reads as other saving, and a later valuation adds nothing', { meta: { scenario: 'S251' } }, () => {
	const code = buy('2026/10/10', '2.000.000');
	saveUpdates(db, alice, { [`date-${code}`]: '2026/11/10', [`value-${code}`]: '2.500.000' });
	buy('2026/11/10', '1.000.000');

	expect(section('Saving').rows).toEqual([
		{ label: 'Other saving', actual: 1000000, budget: 0, variance: 1000000, share: null, good: true }
	]);
});

test('a diary grocery under its plan reads the saving in the favourable tone', { meta: { scenario: 'S252' } }, () => {
	diary({ type: 'expense', date: '2026/11/05', amount: '3.000.000', category: 'grocery', expenseType: 'Non-fixed - Essential', owner: 'Personal' });
	plan({ tab: 'expense', amount: '4.000.000', category: 'Grocery', expenseType: 'Non-fixed - Essential', owner: 'Personal' });

	const type = section('Expense').types.find((found) => found.name === 'Non-fixed - Essential')!;

	expect(type.rows).toEqual([{ label: 'Grocery', actual: 3000000, budget: 4000000, variance: -1000000, share: -0.25, good: true }]);
});

function month() {
	diary({ type: 'income', date: '2026/11/05', amount: '10.000.000', category: 'salary' });
	saveDebt(db, alice, { ...carDebt, installment: '2.000.000' });
	savePayments(db, alice, '2026-11', { 'paid-DBT-0001': 'on' }, '2026-11-18');
	buy('2026/11/10', '1.000.000');
	diary({ type: 'expense', date: '2026/11/05', amount: '4.000.000', category: 'grocery', expenseType: 'Non-fixed - Essential', owner: 'Personal' });
}

test('free cash flow is income less debt payment, saving, and expense', { meta: { scenario: 'S253' } }, () => {
	month();

	expect(report().free).toMatchObject({ actual: 3000000 });
});

test('a saving ratio of 10% against a budget of 20% reads −1.000 bps', { meta: { scenario: 'S254' } }, () => {
	month();
	plan({ tab: 'income', amount: '10.000.000', category: 'Salary' });
	plan({ tab: 'saving', dream: 'House', amount: '24.000.000', months: '12', start: '2026/11/01' });

	expect(report().ratios.find((ratio) => ratio.name === 'Saving Ratio')).toEqual({
		name: 'Saving Ratio',
		actual: 0.1,
		budget: 0.2,
		bps: -1000
	});
});

test('a period without income has no actual ratios', { meta: { scenario: 'S255' } }, () => {
	diary({ type: 'expense', date: '2026/11/05', amount: '4.000.000', category: 'grocery', expenseType: 'Non-fixed - Essential', owner: 'Personal' });

	expect(report().ratios.map((ratio) => ratio.actual)).toEqual([null, null, null, null]);
});

test('entries in another currency stay out of the report', () => {
	diary({ type: 'income', date: '2026/11/05', amount: '9.000.000', category: 'salary' });
	diary({ type: 'income', date: '2026/11/05', amount: '100', category: 'salary', currency: 'USD' });

	expect(section('Income').actual).toBe(9000000);
});

test('an account without diary entries or plan items has no report', () => {
	expect(spendingReport(db, alice, '2026-11-01', '2026-11-30')).toBeNull();
});

test('deleting the dream keeps its purchases without a link', { meta: { scenario: 'S258' } }, () => {
	plan({ tab: 'saving', dream: 'House', amount: '120.000.000', months: '24', start: '2026/11/01' });
	const id = dreamId('House');
	buy('2026/11/10', '2.000.000', { dream: id });

	deletePlanItem(db, alice, `s${id}`);

	expect(db.prepare('SELECT dream_id FROM diary_assets').all()).toEqual([{ dream_id: null }]);
});

test('a dream whose months passed before the period, or that starts after it, adds no budget', { meta: { scenario: 'S271' } }, () => {
	plan({ tab: 'saving', dream: 'Car', amount: '12.000.000', months: '12', start: '2025/10/01' });
	plan({ tab: 'saving', dream: 'Trip', amount: '12.000.000', months: '12', start: '2026/12/01' });
	plan({ tab: 'saving', dream: 'House', amount: '12.000.000', months: '12', start: '2026/11/30' });

	expect(report().sections.find((section) => section.name === 'Saving')?.rows.map(({ label, budget }) => [label, budget])).toEqual([['House', 1000000]]);
});
