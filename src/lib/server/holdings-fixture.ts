import { savePurchase, saveUpdates } from './assets';
import type { Db } from './db';
import { addEntry } from './entries';

type Holding = Record<string, string> & { date: string; name: string; amount: string };

const renamed: Record<string, string> = { Investments: 'Mutual Fund', Goldbar: 'Gold', Property: 'Property & Land' };

export function recordHolding(db: Db, userId: number, holding: Holding) {
	const { date, name, amount, currency = 'IDR', cls = 'Cash', source = 'Salary', acquisition, term = '' } = holding;
	if (cls === 'Liability') {
		addEntry(db, userId, { type: 'debt', date, name, amount, currency, term, note: '' });
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
