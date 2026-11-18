import { savePurchase, saveUpdates } from './assets';
import type { Db } from './db';
import { isoDate } from '#lib/date.ts';
import { parseAmount } from '#lib/amount.ts';

type Holding = Record<string, string> & { date: string; name: string; amount: string };

const renamed: Record<string, string> = { Investments: 'Mutual Fund', Goldbar: 'Gold', Property: 'Property & Land' };

export function recordHolding(db: Db, userId: number, holding: Holding) {
	const { date, name, amount, currency = 'IDR', cls = 'Cash', source = 'Salary', acquisition, term = '' } = holding;
	if (cls === 'Liability') {
		oldLiability(db, userId, { date, name, amount, currency, term });
		return;
	}
	const known = db
		.prepare('SELECT code FROM diary_assets WHERE user_id = ? AND name = ? AND code IS NOT NULL LIMIT 1')
		.get(userId, name) as { code: string } | undefined;
	const code =
		known?.code ??
		(() => {
			const result = savePurchase(db, userId, {
				date,
				cls: renamed[cls] ?? cls,
				source,
				unit: '1',
				unitCurrency: currency,
				amount: acquisition || amount,
				currency,
				note: name
			});
			if (!('saved' in result)) throw new Error(JSON.stringify(result));
			return result.saved;
		})();
	if (known || acquisition) saveUpdates(db, userId, { [`date-${code}`]: date, [`value-${code}`]: amount });
}

export function oldLiability(db: Db, userId: number, row: Record<string, string>) {
	const { date, name, amount, currency = 'IDR', term = '' } = row;
	db.prepare(
		`INSERT INTO diary_assets (user_id, date, name, class, value, currency, term, note)
		VALUES (?, ?, ?, 'Liability', ?, ?, ?, '')`
	).run(userId, isoDate(date), name, parseAmount(amount), currency, term);
}
