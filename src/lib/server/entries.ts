import { parseAmount } from '#lib/amount.ts';
import { isoDate } from '#lib/date.ts';
import type { Db } from './db';
import { isCurrency } from './settings';

type EntryFields = Record<string, string | undefined>;

type Refusal = { message: string; field: 'date' | 'amount' | 'name' | 'currency' };

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

function addAsset(db: Db, userId: number, fields: EntryFields, common: Common): Refusal | Added {
	const name = field(fields, 'name');
	if (!name) return { message: 'Please enter a name for the asset.', field: 'name' };
	const cls = field(fields, 'cls');
	const liability = cls === 'Liability';
	const acquisition = liability
		? null
		: (parseAmount(field(fields, 'acquisition')) ?? lastAcquisition(db, userId, name) ?? common.amount);
	db.prepare(
		`INSERT INTO assets (user_id, date, name, class, value, currency, source, term, acquisition, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
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

function addIncomeOrExpense(db: Db, userId: number, fields: EntryFields, common: Common): Added {
	const expense = fields.type === 'expense';
	db.prepare(
		`INSERT INTO entries (user_id, kind, date, amount, currency, category, expense_type, owner, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
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

export function addEntry(db: Db, userId: number, fields: EntryFields): Refusal | Added {
	const common = parseCommon(fields);
	if ('message' in common) return common;
	return fields.type === 'asset'
		? addAsset(db, userId, fields, common)
		: addIncomeOrExpense(db, userId, fields, common);
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
