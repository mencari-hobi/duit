import { parseAmount } from '#lib/amount.ts';
import { sale } from '#lib/category.ts';
import { isoDate } from '#lib/date.ts';
import type { Db } from './db';
import { recordKey } from './records';
import { isCurrency } from './settings';

type EntryFields = Record<string, string | undefined>;

type Refusal = { message: string; field: 'date' | 'amount' | 'name' | 'currency' | 'asset' };

type Added = { added: true };

type Common = { date: string; amount: number; currency: string; note: string };

const field = (fields: EntryFields, name: string) => (fields[name] ?? '').trim();

function parseCommon(fields: EntryFields): Refusal | Common {
	const date = isoDate(field(fields, 'date'));
	if (!date) return { message: 'Please pick a date.', field: 'date' };
	const amount = parseAmount(field(fields, 'amount'));
	if (amount === null) return { message: 'Please enter an amount (numbers only).', field: 'amount' };
	const currency = field(fields, 'currency');
	if (!isCurrency(currency)) return { message: 'Pick a currency from the list.', field: 'currency' };
	return { date, amount, currency, note: field(fields, 'note') };
}

function lastAcquisition(db: Db, userId: number, name: string) {
	const row = db
		.prepare(
			`SELECT acquisition FROM assets WHERE user_id = ? AND name = ? AND acquisition IS NOT NULL
			ORDER BY date DESC, id DESC LIMIT 1`
		)
		.get(userId, name) as { acquisition: number } | undefined;
	return row?.acquisition;
}

function addAsset(db: Db, userId: number, fields: EntryFields, common: Common, id: number | null): Refusal | Added {
	const name = field(fields, 'name');
	if (!name) return { message: 'Please enter a name for the asset.', field: 'name' };
	const cls = field(fields, 'cls');
	const liability = cls === 'Liability';
	const acquisition = liability
		? null
		: (parseAmount(field(fields, 'acquisition')) ?? lastAcquisition(db, userId, name) ?? common.amount);
	db.prepare(
		`INSERT INTO assets (id, user_id, date, name, class, value, currency, source, term, acquisition, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		userId,
		common.date,
		name,
		cls,
		common.amount,
		common.currency,
		liability ? null : field(fields, 'source'),
		liability ? field(fields, 'term') : null,
		acquisition,
		common.note
	);
	return { added: true };
}

type Holding = { name: string; class: string; value: number; currency: string; source: string | null };

function latestHoldings(db: Db, userId: number) {
	const rows = db
		.prepare('SELECT name, class, value, currency, source FROM assets WHERE user_id = ? ORDER BY date, id')
		.all(userId) as Holding[];
	const latest = new Map(rows.map((row) => [row.name, row]));
	return [...latest.values()].filter((row) => row.class !== 'Liability' && row.value > 0);
}

export function heldAssets(db: Db, userId: number) {
	return latestHoldings(db, userId)
		.map((row) => row.name)
		.sort();
}

function addSale(db: Db, userId: number, fields: EntryFields, common: Common, id: number | null): Refusal | Added {
	const sold = latestHoldings(db, userId).find((row) => row.name === field(fields, 'asset'));
	if (!sold) return { message: 'Choose the asset that was sold.', field: 'asset' };
	const entry = db
		.prepare(
			`INSERT INTO entries (id, user_id, kind, date, amount, currency, category, note)
			VALUES (?, ?, 'income', ?, ?, ?, ?, ?)`
		)
		.run(id, userId, common.date, common.amount, common.currency, sale, common.note || `Sale of ${sold.name}`);
	db.prepare(
		`INSERT INTO assets (user_id, date, name, class, value, currency, source, acquisition, note, sale_id)
		VALUES (?, ?, ?, ?, 0, ?, ?, 0, '', ?)`
	).run(userId, common.date, sold.name, sold.class, sold.currency, sold.source, entry.lastInsertRowid);
	return { added: true };
}

function addIncomeOrExpense(db: Db, userId: number, fields: EntryFields, common: Common, id: number | null): Refusal | Added {
	const expense = fields.type === 'expense';
	if (!expense && field(fields, 'category').toLowerCase() === sale) return addSale(db, userId, fields, common, id);
	db.prepare(
		`INSERT INTO entries (id, user_id, kind, date, amount, currency, category, expense_type, owner, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		userId,
		expense ? 'expense' : 'income',
		common.date,
		common.amount,
		common.currency,
		field(fields, 'category').toLowerCase() || 'other',
		expense ? field(fields, 'expenseType') : null,
		expense ? field(fields, 'owner') : null,
		common.note
	);
	return { added: true };
}

function insert(db: Db, userId: number, fields: EntryFields, id: number | null): Refusal | Added {
	const common = parseCommon(fields);
	if ('message' in common) return common;
	return fields.type === 'asset'
		? addAsset(db, userId, fields, common, id)
		: addIncomeOrExpense(db, userId, fields, common, id);
}

export function addEntry(db: Db, userId: number, fields: EntryFields): Refusal | Added {
	return insert(db, userId, fields, null);
}

class Refused extends Error {
	constructor(readonly refusal: Refusal) {
		super(refusal.message);
	}
}

export function saveEntry(db: Db, userId: number, fields: EntryFields): Refusal | Added | { missing: true } {
	if (!fields.id) return addEntry(db, userId, fields);
	const old = recordKey(fields.id);
	if (!old || !db.prepare(`SELECT 1 FROM ${old.table} WHERE id = ? AND user_id = ?`).get(old.id, userId)) {
		return { missing: true };
	}
	const table = fields.type === 'asset' ? 'assets' : 'entries';
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

export function entryCategories(db: Db, userId: number) {
	const rows = db
		.prepare('SELECT DISTINCT kind, category FROM entries WHERE user_id = ? ORDER BY category')
		.all(userId) as { kind: 'income' | 'expense'; category: string }[];
	return {
		income: rows.filter((row) => row.kind === 'income').map((row) => row.category),
		expense: rows.filter((row) => row.kind === 'expense').map((row) => row.category)
	};
}
