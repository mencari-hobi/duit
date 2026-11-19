import { group, parseAmount } from '#lib/amount.ts';
import { assetLabel, typeNames, unitOf } from '#lib/asset.ts';
import { isoDate, slashDate } from '#lib/date.ts';
import { money } from '#lib/record.ts';
import { nextAssetCode, type Db } from './db';
import { isCurrency } from './settings';

type Fields = Record<string, string | undefined>;

type Refusal = { message: string; field: string };

export type AssetRow = {
	id: number;
	date: string;
	name: string;
	class: string;
	value: number;
	currency: string;
	source: string | null;
	acquisition: number | null;
	code: string;
	unit: number | null;
	unit_currency: string | null;
	sale_id: number | null;
	dream_id: number | null;
};

const field = (fields: Fields, name: string) => (fields[name] ?? '').trim();

const assetRows = (db: Db, userId: number) =>
	db
		.prepare("SELECT * FROM diary_assets WHERE user_id = ? AND code IS NOT NULL ORDER BY date, id")
		.all(userId) as AssetRow[];

export function purchaseOf(db: Db, userId: number, id: number) {
	const row = db.prepare('SELECT code FROM diary_assets WHERE id = ? AND user_id = ?').get(id, userId) as
		| { code: string | null }
		| undefined;
	if (!row?.code) return null;
	const first = assetRows(db, userId).find((found) => found.code === row.code)!;
	return first.id === id ? first : null;
}

export function savePurchase(db: Db, userId: number, fields: Fields): Refusal | { saved: string } | { missing: true } {
	const date = isoDate(field(fields, 'date'));
	if (!date) return { message: 'Please pick a date.', field: 'date' };
	const cls = field(fields, 'cls');
	if (!typeNames.includes(cls)) return { message: 'Pick an asset type from the list.', field: 'cls' };
	const unit = parseAmount(field(fields, 'unit'));
	if (!unit) return { message: 'Please enter the unit (numbers only).', field: 'unit' };
	const unitCurrency = unitOf(cls) ? null : field(fields, 'unitCurrency') || field(fields, 'currency');
	if (unitCurrency !== null && !isCurrency(unitCurrency)) return { message: 'Pick a currency from the list.', field: 'unitCurrency' };
	const cost = parseAmount(field(fields, 'amount'));
	if (!cost) return { message: 'Please enter the acquisition cost (numbers only).', field: 'amount' };
	const currency = field(fields, 'currency');
	if (!isCurrency(currency)) return { message: 'Pick a currency from the list.', field: 'currency' };
	const dream = field(fields, 'dream');
	const dreamId =
		dream && db.prepare('SELECT 1 FROM plan_savings WHERE id = ? AND user_id = ?').get(Number(dream), userId) ? Number(dream) : null;
	const asset = {
		cls,
		source: field(fields, 'source') || null,
		unit,
		unitCurrency,
		name: field(fields, 'note'),
		acquisition: cost
	};
	if (fields.id) {
		const purchase = purchaseOf(db, userId, Number(/^a(\d+)$/.exec(fields.id)?.[1]));
		if (!purchase) return { missing: true };
		db.transaction(() => {
			db.prepare(
				`UPDATE diary_assets SET class = ?, source = ?, unit = ?, unit_currency = ?, name = ?, acquisition = ?, dream_id = ?
				WHERE user_id = ? AND code = ?`
			).run(asset.cls, asset.source, asset.unit, asset.unitCurrency, asset.name, asset.acquisition, dreamId, userId, purchase.code);
			db.prepare('UPDATE diary_assets SET date = ?, value = ?, currency = ? WHERE id = ?').run(date, cost, currency, purchase.id);
		})();
		return { saved: purchase.code };
	}
	const code = nextAssetCode(db, userId);
	db.prepare(
		`INSERT INTO diary_assets (user_id, date, name, class, value, currency, source, acquisition, note, code, unit, unit_currency, dream_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)`
	).run(userId, date, asset.name, cls, cost, currency, asset.source, cost, code, unit, unitCurrency, dreamId);
	return { saved: code };
}

const latestByCode = (rows: AssetRow[]) => [...new Map(rows.map((row) => [row.code, row])).values()];

export function heldAssets(db: Db, userId: number) {
	return latestByCode(assetRows(db, userId))
		.filter((row) => row.value > 0)
		.sort((a, b) => a.code.localeCompare(b.code));
}

export function saveUpdates(db: Db, userId: number, fields: Fields): Refusal | { updated: number } {
	const held = new Map(latestByCode(assetRows(db, userId)).map((row) => [row.code, row]));
	const updates: { row: AssetRow; date: string; value: number }[] = [];
	for (const [code, row] of held) {
		const text = field(fields, `value-${code}`);
		if (!text) continue;
		const value = parseAmount(text);
		if (value === null) return { message: 'Please enter the market value (numbers only).', field: `value-${code}` };
		const date = isoDate(field(fields, `date-${code}`));
		if (!date) return { message: 'Please pick a date.', field: `date-${code}` };
		updates.push({ row, date, value });
	}
	db.transaction(() => {
		for (const { row, date, value } of updates) {
			const sameDay = db
				.prepare('SELECT id FROM diary_assets WHERE user_id = ? AND code = ? AND date = ? ORDER BY id DESC LIMIT 1')
				.get(userId, row.code, date) as { id: number } | undefined;
			if (sameDay) {
				db.prepare('UPDATE diary_assets SET value = ? WHERE id = ?').run(value, sameDay.id);
				continue;
			}
			db.prepare(
				`INSERT INTO diary_assets (user_id, date, name, class, value, currency, source, acquisition, note, code, unit, unit_currency)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)`
			).run(userId, date, row.name, row.class, value, row.currency, row.source, row.acquisition, row.code, row.unit, row.unit_currency);
		}
	})();
	return { updated: updates.length };
}

export const unitText = (row: Pick<AssetRow, 'class' | 'unit' | 'unit_currency'>) => {
	if (row.unit == null) return '–';
	const unit = unitOf(row.class);
	return unit ? `${money(row.unit)} ${unit}` : `${row.unit_currency ?? ''} ${money(row.unit)}`.trim();
};

export function assetList(db: Db, userId: number, currency: string, type: string) {
	const rows = assetRows(db, userId).filter((row) => row.currency === currency);
	const bought = new Map<string, string>();
	for (const row of rows) if (!bought.has(row.code)) bought.set(row.code, row.date);
	const owned = latestByCode(rows).filter((row) => row.value > 0);
	if (!owned.length) return null;
	const held = owned
		.filter((row) => !type || row.class === type)
		.map((row) => ({
			code: row.code,
			label: assetLabel(row.code, row.name),
			type: row.class,
			unit: unitText(row),
			bought: slashDate(bought.get(row.code)!),
			cost: row.acquisition ?? row.value,
			value: row.value,
			gain: row.value - (row.acquisition ?? row.value)
		}));
	const cost = held.reduce((sum, row) => sum + row.cost, 0);
	const value = held.reduce((sum, row) => sum + row.value, 0);
	return { rows: held, total: { cost, value, gain: value - cost, share: cost ? (value - cost) / cost : null } };
}

export const signed = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${group(String(Math.round(Math.abs(n))))}`;

export function editablePurchase(row: AssetRow) {
	return {
		id: `a${row.id}`,
		type: 'asset',
		date: slashDate(row.date),
		cls: row.class,
		source: row.source ?? '',
		unit: row.unit == null ? '' : money(row.unit),
		unitCurrency: row.unit_currency ?? '',
		amount: money(row.acquisition ?? row.value),
		currency: row.currency,
		note: row.name,
		dream: row.dream_id == null ? '' : String(row.dream_id)
	};
}
