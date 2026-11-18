import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { inject } from 'vitest';
import { post } from './app';

const renamed: Record<string, string> = { Investments: 'Mutual Fund', Goldbar: 'Gold', Property: 'Property & Land' };

const codes = new Map<string, Map<string, string>>();

export async function addHolding(cookie: string, holding: Record<string, string>) {
	const { date, name, amount, currency = 'IDR', cls = 'Cash', source = 'Salary', term = '' } = holding;
	if (cls === 'Liability') {
		const db = new Database(inject('databasePath'));
		db.prepare(
			`INSERT INTO diary_assets (user_id, date, name, class, value, currency, term, note)
			VALUES ((SELECT user_id FROM sessions WHERE id = ?), ?, ?, 'Liability', ?, ?, ?, '')`
		).run(createHash('sha256').update(cookie.slice(cookie.indexOf('=') + 1)).digest('hex'), date.replaceAll('/', '-'), name, Number(amount.replaceAll('.', '')), currency, term);
		db.close();
		return;
	}
	const known = codes.get(cookie) ?? new Map<string, string>();
	codes.set(cookie, known);
	const code = known.get(name);
	if (code) {
		await post('/diary', { type: 'updates', [`date-${code}`]: date, [`value-${code}`]: amount }, cookie);
		return;
	}
	known.set(name, `AST-${String(known.size + 1).padStart(4, '0')}`);
	await post(
		'/diary',
		{ type: 'asset', date, cls: renamed[cls] ?? cls, source, unit: '1', unitCurrency: currency, amount, currency, note: name },
		cookie
	);
}
