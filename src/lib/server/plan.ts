import { parseAmount } from '#lib/amount.ts';
import { capitalize, expenseTypes } from '#lib/category.ts';
import { isoDate } from '#lib/date.ts';
import { timeframe } from '#lib/plan.ts';
import { money } from '#lib/record.ts';
import type { Db } from './db';
import { isCurrency } from './settings';

type Fields = Record<string, string | undefined>;

type Refusal = { message: string; field: string };

type Saved = { added: true };

const tables = { p: 'plan_entries', s: 'plan_savings', d: 'plan_debts' } as const;

type Prefix = keyof typeof tables;

const prefixOf = (tab: string | undefined): Prefix => (tab === 'saving' ? 's' : tab === 'debt' ? 'd' : 'p');

const field = (fields: Fields, name: string) => (fields[name] ?? '').trim();

function itemKey(key: string) {
	const match = /^([psd])(\d+)$/.exec(key);
	return match ? { table: tables[match[1] as Prefix], id: Number(match[2]) } : null;
}

function parseMoney(fields: Fields): Refusal | { amount: number; currency: string } {
	const amount = parseAmount(field(fields, 'amount'));
	if (!amount) return { message: 'Please enter an amount (numbers only).', field: 'amount' };
	const currency = field(fields, 'currency');
	if (!isCurrency(currency)) return { message: 'Pick a currency from the list.', field: 'currency' };
	return { amount, currency };
}

function insert(db: Db, userId: number, fields: Fields, id: number | null): Refusal | Saved {
	const tab = field(fields, 'tab');
	const value = parseMoney(fields);
	if ('message' in value) return value;
	const { amount, currency } = value;
	if (tab === 'saving') {
		const dream = field(fields, 'dream');
		if (!dream) return { message: 'Please name your dream.', field: 'dream' };
		const months = field(fields, 'months');
		if (!/^\d+$/.test(months) || Number(months) < 1) {
			return { message: 'Please enter a whole number of months, 1 or more.', field: 'months' };
		}
		db.prepare('INSERT INTO plan_savings (id, user_id, dream, amount, currency, months) VALUES (?, ?, ?, ?, ?, ?)').run(
			id,
			userId,
			dream,
			amount,
			currency,
			Number(months)
		);
		return { added: true };
	}
	if (tab === 'debt') {
		const start = isoDate(field(fields, 'start'));
		if (!start) return { message: 'Please pick a date.', field: 'start' };
		const end = isoDate(field(fields, 'end'));
		if (!end) return { message: 'Please pick a date.', field: 'end' };
		if (end < start) return { message: "The end payment can't be before the start payment.", field: 'end' };
		db.prepare(
			'INSERT INTO plan_debts (id, user_id, category, amount, currency, start, end) VALUES (?, ?, ?, ?, ?, ?, ?)'
		).run(id, userId, field(fields, 'category'), amount, currency, start, end);
		return { added: true };
	}
	const expense = tab === 'expense';
	db.prepare(
		`INSERT INTO plan_entries (id, user_id, kind, amount, currency, timeframe, category, expense_type, owner, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		userId,
		expense ? 'expense' : 'income',
		amount,
		currency,
		timeframe(field(fields, 'timeframe')).value,
		field(fields, 'category').toLowerCase() || 'other',
		expense ? field(fields, 'expenseType') : null,
		expense ? field(fields, 'owner') : null,
		field(fields, 'note')
	);
	return { added: true };
}

class Refused extends Error {
	constructor(readonly refusal: Refusal) {
		super(refusal.message);
	}
}

export function savePlanItem(db: Db, userId: number, fields: Fields): Refusal | Saved | { missing: true } {
	if (!fields.id) return insert(db, userId, fields, null);
	const old = itemKey(fields.id);
	if (!old || !db.prepare(`SELECT 1 FROM ${old.table} WHERE id = ? AND user_id = ?`).get(old.id, userId)) {
		return { missing: true };
	}
	const table = tables[prefixOf(fields.tab)];
	try {
		return db.transaction(() => {
			db.prepare(`DELETE FROM ${old.table} WHERE id = ?`).run(old.id);
			const result = insert(db, userId, fields, table === old.table ? old.id : null);
			if ('message' in result) throw new Refused(result);
			return result;
		})();
	} catch (error) {
		if (error instanceof Refused) return error.refusal;
		throw error;
	}
}

export const planDreams = (db: Db, userId: number) =>
	db.prepare('SELECT id, dream FROM plan_savings WHERE user_id = ? ORDER BY id').all(userId) as { id: number; dream: string }[];

export function deletePlanItem(db: Db, userId: number, key: string) {
	const item = itemKey(key);
	if (item) db.prepare(`DELETE FROM ${item.table} WHERE id = ? AND user_id = ?`).run(item.id, userId);
}

type Entry = {
	id: number;
	kind: 'income' | 'expense';
	amount: number;
	currency: string;
	timeframe: string;
	category: string;
	expense_type: string | null;
	owner: string | null;
	note: string;
};

type Saving = { id: number; dream: string; amount: number; currency: string; months: number };

type Debt = { id: number; category: string; amount: number; currency: string; start: string; end: string };

const entries = (db: Db, userId: number) =>
	db.prepare('SELECT * FROM plan_entries WHERE user_id = ? ORDER BY id').all(userId) as Entry[];

const savings = (db: Db, userId: number) =>
	db.prepare('SELECT * FROM plan_savings WHERE user_id = ? ORDER BY id').all(userId) as Saving[];

const debts = (db: Db, userId: number) =>
	db.prepare('SELECT * FROM plan_debts WHERE user_id = ? ORDER BY id').all(userId) as Debt[];

const slash = (date: string) => date.replaceAll('-', '/');

export function editablePlanItem(db: Db, userId: number, key: string): Record<string, string> | null {
	const item = itemKey(key);
	if (!item) return null;
	const row = db.prepare(`SELECT * FROM ${item.table} WHERE id = ? AND user_id = ?`).get(item.id, userId);
	if (!row) return null;
	if (item.table === 'plan_savings') {
		const saving = row as Saving;
		return { id: key, tab: 'saving', dream: saving.dream, amount: money(saving.amount), currency: saving.currency, months: String(saving.months) };
	}
	if (item.table === 'plan_debts') {
		const debt = row as Debt;
		return {
			id: key,
			tab: 'debt',
			category: debt.category,
			amount: money(debt.amount),
			currency: debt.currency,
			start: slash(debt.start),
			end: slash(debt.end)
		};
	}
	const entry = row as Entry;
	return {
		id: key,
		tab: entry.kind,
		amount: money(entry.amount),
		currency: entry.currency,
		timeframe: entry.timeframe,
		category: capitalize(entry.category),
		...(entry.kind === 'expense' ? { expenseType: entry.expense_type ?? '', owner: entry.owner ?? '' } : {}),
		note: entry.note
	};
}

export type Row = { key: string; label: string; amount: number; currency: string };

export type Section = { name: string; total: number; rows: Row[] };

export type Group = Section & { types: Section[] };

export type Ratio = { name: string; formula: string; value: number | null };

export type Budget = { groups: Group[]; idle: Row[]; free: number; ratios: Ratio[] };

const sum = (rows: Row[]) => rows.reduce((total, row) => total + row.amount, 0);

const section = (name: string, rows: Row[]): Section => ({ name, total: sum(rows), rows });

export function budget(db: Db, userId: number, currency: string, view: string, today: string): Budget | null {
	const per = timeframe(view).perMonth;
	const counted = (item: { currency: string }) => item.currency === currency;
	const active = (item: Debt) => counted(item) && item.start <= today && today <= item.end;
	const entryRow = (entry: Entry): Row => ({
		key: `p${entry.id}`,
		label: capitalize(entry.category),
		amount: (entry.amount * timeframe(entry.timeframe).perMonth) / per,
		currency: entry.currency
	});
	const debtRow = (item: Debt): Row => ({ key: `d${item.id}`, label: item.category, amount: item.amount / per, currency: item.currency });
	const savingRow = (item: Saving): Row => ({
		key: `s${item.id}`,
		label: item.dream,
		amount: item.amount / item.months / per,
		currency: item.currency
	});
	const allEntries = entries(db, userId);
	const allDebts = debts(db, userId);
	const allSavings = savings(db, userId);
	const planned = allEntries.filter(counted);
	const income = planned.filter((entry) => entry.kind === 'income').map(entryRow);
	const spent = planned.filter((entry) => entry.kind === 'expense');
	const debt = allDebts.filter(active).map(debtRow);
	const saving = allSavings.filter(counted).map(savingRow);
	const idle = [
		...allEntries.filter((entry) => !counted(entry)).map(entryRow),
		...allDebts.filter((item) => !active(item)).map(debtRow),
		...allSavings.filter((item) => !counted(item)).map(savingRow)
	];
	const types = expenseTypes
		.map((type) => section(type, spent.filter((entry) => entry.expense_type === type).map(entryRow)))
		.filter((type) => type.rows.length);
	const expense = types.flatMap((type) => type.rows);
	const groups = [
		{ ...section('Income', income), types: [] },
		{ ...section('Debt payment', debt), types: [] },
		{ ...section('Saving', saving), types: [] },
		{ ...section('Expense', expense), types }
	].filter((group) => group.rows.length);
	if (!groups.length && !idle.length) return null;
	const totalOf = (name: string) => groups.find((group) => group.name === name)?.total ?? 0;
	const earned = totalOf('Income');
	const free = earned - totalOf('Debt payment') - totalOf('Saving') - totalOf('Expense');
	const essential = types
		.filter((type) => type.name.endsWith('- Essential'))
		.reduce((total, type) => total + type.total, 0);
	const share = (part: number) => (earned === 0 ? null : part / earned);
	return {
		groups,
		idle,
		free,
		ratios: [
			{ name: 'Debt Service Ratio', formula: 'Debt payment ÷ Income', value: share(totalOf('Debt payment')) },
			{ name: 'Saving Ratio', formula: 'Saving ÷ Income', value: share(totalOf('Saving')) },
			{ name: 'Essential Expense Ratio', formula: '(Fixed + Non-fixed Essential) ÷ Income', value: share(essential) },
			{ name: 'Free Cash Flow Ratio', formula: 'Free Cash Flow ÷ Income', value: share(free) }
		]
	};
}
