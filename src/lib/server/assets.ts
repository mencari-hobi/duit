import { money } from '#lib/record.ts';
import { slashDate } from '#lib/date.ts';
import type { Db } from './db';
import { addEntry, assetNamed, saveEntry } from './entries';
import { deleteRecord, recordKey } from './records';

type Fields = Record<string, string | undefined>;

type Row = {
	id: number;
	date: string;
	name: string;
	class: string;
	value: number;
	currency: string;
	source: string | null;
	term: string | null;
	acquisition: number | null;
	weight: number | null;
	price: number | null;
	note: string;
	sale_id: number | null;
};

export type Holding = { name: string; cls: string; value: number; acquisition: number | null; currency: string; gain: string | null };

const rowsOf = (db: Db, userId: number) =>
	db.prepare('SELECT * FROM assets WHERE user_id = ? ORDER BY date, id').all(userId) as Row[];

const sign = (n: number) => (n < 0 ? '−' : n > 0 ? '+' : '');

function gainOf(row: Row) {
	if (row.acquisition == null) return null;
	const gain = row.value - row.acquisition;
	const amount = `${sign(gain)}${money(Math.abs(gain))}`;
	if (!row.acquisition) return amount;
	const share = (gain / row.acquisition) * 100;
	return `${amount} (${sign(Number(share.toFixed(1)))}${Math.abs(share).toFixed(1)}%)`;
}

export function listAssets(db: Db, userId: number) {
	const latest = [...new Map(rowsOf(db, userId).map((row) => [row.name, row])).values()].sort((a, b) => b.value - a.value);
	const pick = (test: (row: Row) => boolean) =>
		latest.filter(test).map(
			(row): Holding => ({
				name: row.name,
				cls: row.class,
				value: row.value,
				acquisition: row.acquisition,
				currency: row.currency,
				gain: row.class === 'Liability' ? null : gainOf(row)
			})
		);
	return {
		assets: pick((row) => row.class !== 'Liability' && row.value > 0),
		liabilities: pick((row) => row.class === 'Liability'),
		sold: pick((row) => row.class !== 'Liability' && row.value <= 0)
	};
}

function rowsNamed(db: Db, userId: number, name: string) {
	return rowsOf(db, userId).filter((row) => row.name === name);
}

export function assetPage(db: Db, userId: number, name: string) {
	const rows = rowsNamed(db, userId, name);
	const latest = rows.at(-1);
	if (!latest) return null;
	return {
		name,
		cls: latest.class,
		source: latest.source,
		term: latest.term,
		currency: latest.currency,
		weight: latest.weight,
		valuations: rows.reverse().map((row) => ({
			id: `a${row.id}`,
			date: slashDate(row.date),
			value: row.value,
			acquisition: row.acquisition,
			weight: row.weight,
			price: row.price,
			note: row.note,
			sold: row.sale_id !== null
		}))
	};
}

function entryFields(latest: Row, fields: Fields) {
	const gold = latest.class === 'Goldbar';
	const acquisition = fields.acquisition?.trim() || (latest.acquisition == null ? '' : money(latest.acquisition));
	return {
		type: 'asset',
		date: fields.date,
		amount: gold ? acquisition : fields.amount,
		acquisition: gold ? '' : fields.acquisition,
		weight: fields.weight,
		price: fields.price,
		currency: latest.currency,
		name: latest.name,
		cls: latest.class,
		source: latest.source ?? '',
		term: latest.term ?? '',
		note: fields.note
	};
}

export function addValuation(db: Db, userId: number, name: string, fields: Fields) {
	const latest = rowsNamed(db, userId, name).at(-1);
	if (!latest) return { missing: true } as const;
	return addEntry(db, userId, entryFields(latest, fields));
}

function editable(db: Db, userId: number, name: string, key: string | undefined) {
	const id = key ? recordKey(key) : null;
	if (id?.table !== 'assets') return null;
	return rowsNamed(db, userId, name).find((row) => row.id === id.id && row.sale_id === null) ?? null;
}

export function valuationForm(db: Db, userId: number, name: string, key: string) {
	const row = editable(db, userId, name, key);
	if (!row) return null;
	const shown = (n: number | null) => (n == null ? '' : money(n));
	return {
		id: key,
		date: slashDate(row.date),
		amount: money(row.value),
		acquisition: shown(row.acquisition),
		weight: shown(row.weight),
		price: shown(row.price),
		note: row.note
	};
}

export function saveValuation(db: Db, userId: number, name: string, fields: Fields) {
	const row = editable(db, userId, name, fields.id);
	if (!row) return { missing: true } as const;
	return saveEntry(db, userId, { ...entryFields(row, fields), id: fields.id }, false);
}

export function deleteValuation(db: Db, userId: number, name: string, key: string) {
	if (editable(db, userId, name, key)) deleteRecord(db, userId, key);
}

export function saveDetails(db: Db, userId: number, name: string, fields: Fields) {
	const renamed = fields.name?.trim() ?? '';
	if (!renamed) return { message: 'Please enter a name for the asset.', field: 'name' } as const;
	if (renamed.toLowerCase() !== name.toLowerCase() && assetNamed(db, userId, renamed)) {
		return { message: 'Another asset has that name.', field: 'name' } as const;
	}
	const liability = fields.cls === 'Liability';
	db.prepare('UPDATE assets SET name = ?, class = ?, source = ?, term = ? WHERE user_id = ? AND name = ?').run(
		renamed,
		fields.cls,
		liability ? null : (fields.source ?? null),
		liability ? (fields.term ?? null) : null,
		userId,
		name
	);
	return { name: renamed };
}
