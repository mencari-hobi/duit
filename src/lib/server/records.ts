import { sale } from '#lib/category.ts';
import { day, money, type Record } from '#lib/record.ts';
import { editablePurchase, purchaseOf } from './assets';
import type { Db } from './db';
import { debtOf, editableDebt } from './debts';

type Row = Omit<Record, 'id'> & { id: number };

export function listRecords(db: Db, userId: number): Record[] {
	const flows = db
		.prepare(
			`SELECT id, kind, date, amount, currency, note, category, expense_type AS expenseType, owner
			FROM diary_entries WHERE user_id = ?`
		)
		.all(userId) as Row[];
	const holdings = db
		.prepare(
			`SELECT id, 'asset' AS kind, date, value AS amount, currency, note, name, class AS cls, source, term, acquisition, code
			FROM diary_assets WHERE user_id = ?`
		)
		.all(userId) as Row[];
	const debts = db
		.prepare(
			`SELECT id, 'debt' AS kind, start AS date, amount, currency, '' AS note, category AS name, code, tenor,
			payment_type AS paymentType, installment
			FROM diary_debts WHERE user_id = ?`
		)
		.all(userId) as Row[];
	return [...flows, ...holdings, ...debts]
		.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
		.map((row) => ({ ...row, id: `${prefix[row.kind]}${row.id}` }));
}

const prefix = { income: 'e', expense: 'e', asset: 'a', debt: 'd' };

const tables: { [letter: string]: string } = { e: 'diary_entries', a: 'diary_assets', d: 'diary_debts' };

export function recordKey(key: string) {
	const match = /^([ead])(\d+)$/.exec(key);
	if (!match) return null;
	return { table: tables[match[1]], id: Number(match[2]) };
}

export function editableRecord(db: Db, userId: number, key: string): { [field: string]: string } | null {
	const record = listRecords(db, userId).find((row) => row.id === key);
	if (!record) return null;
	if (record.kind === 'debt') return editableDebt(debtOf(db, userId, recordKey(key)!.id)!);
	const common = {
		id: record.id,
		type: record.kind,
		date: day(record),
		amount: money(record.amount),
		currency: record.currency
	};
	if (record.kind === 'asset') {
		const id = recordKey(key)!.id;
		if (record.cls === 'Liability') return null;
		const purchase = purchaseOf(db, userId, id);
		return purchase ? editablePurchase(purchase) : { id: key, type: 'asset', view: 'list' };
	}
	return {
		...common,
		category: record.category!,
		...(record.category === sale ? { asset: soldAsset(db, recordKey(key)!.id) } : {}),
		...(record.kind === 'expense' ? { expenseType: record.expenseType!, owner: record.owner! } : {}),
		note: record.note
	};
}

function soldAsset(db: Db, saleId: number) {
	const row = db.prepare('SELECT code FROM diary_assets WHERE sale_id = ?').get(saleId) as { code: string } | undefined;
	return row?.code ?? '';
}

export function deleteRecord(db: Db, userId: number, key: string) {
	const record = recordKey(key);
	if (!record) return;
	const purchase = record.table === 'diary_assets' ? purchaseOf(db, userId, record.id) : null;
	if (purchase) db.prepare('DELETE FROM diary_assets WHERE user_id = ? AND code = ?').run(userId, purchase.code);
	else db.prepare(`DELETE FROM ${record.table} WHERE id = ? AND user_id = ?`).run(record.id, userId);
}

export function wipeRecords(db: Db, userId: number) {
	db.transaction(() => {
		db.prepare('DELETE FROM diary_entries WHERE user_id = ?').run(userId);
		db.prepare('DELETE FROM diary_assets WHERE user_id = ?').run(userId);
		db.prepare('DELETE FROM diary_debts WHERE user_id = ?').run(userId);
	})();
}
