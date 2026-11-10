import { sale } from '#lib/category.ts';
import { day, money, type Record } from '#lib/record.ts';
import type { Db } from './db';

type Row = Omit<Record, 'id'> & { id: number };

export function listRecords(db: Db, userId: number): Record[] {
	const flows = db
		.prepare(
			`SELECT id, kind, date, amount, currency, note, category, expense_type AS expenseType, owner
			FROM entries WHERE user_id = ?`
		)
		.all(userId) as Row[];
	const holdings = db
		.prepare(
			`SELECT id, 'asset' AS kind, date, value AS amount, currency, note, name, class AS cls, source, term, acquisition, weight, price
			FROM assets WHERE user_id = ?`
		)
		.all(userId) as Row[];
	return [...flows, ...holdings]
		.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
		.map((row) => ({ ...row, id: `${row.kind === 'asset' ? 'a' : 'e'}${row.id}` }));
}

export function recordKey(key: string) {
	const match = /^([ea])(\d+)$/.exec(key);
	if (!match) return null;
	return { table: match[1] === 'a' ? 'assets' : 'entries', id: Number(match[2]) };
}

export function editableRecord(db: Db, userId: number, key: string): { [field: string]: string } | null {
	const record = listRecords(db, userId).find((row) => row.id === key);
	if (!record || record.kind === 'asset') return null;
	const common = {
		id: record.id,
		type: record.kind,
		date: day(record),
		amount: money(record.amount),
		currency: record.currency
	};
	return {
		...common,
		category: record.category!,
		...(record.category === sale ? { asset: soldAsset(db, recordKey(key)!.id) } : {}),
		...(record.kind === 'expense' ? { expenseType: record.expenseType!, owner: record.owner! } : {}),
		note: record.note
	};
}

function soldAsset(db: Db, saleId: number) {
	const row = db.prepare('SELECT name FROM assets WHERE sale_id = ?').get(saleId) as { name: string } | undefined;
	return row?.name ?? '';
}

export function deleteRecord(db: Db, userId: number, key: string) {
	const record = recordKey(key);
	if (record) db.prepare(`DELETE FROM ${record.table} WHERE id = ? AND user_id = ?`).run(record.id, userId);
}

export function wipeRecords(db: Db, userId: number) {
	db.transaction(() => {
		db.prepare('DELETE FROM entries WHERE user_id = ?').run(userId);
		db.prepare('DELETE FROM assets WHERE user_id = ?').run(userId);
	})();
}
