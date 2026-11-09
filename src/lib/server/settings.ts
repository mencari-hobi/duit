import type { Db } from './db';

export type Settings = { currency: string; startDay: number };

const DEFAULTS: Settings = { currency: 'IDR', startDay: 1 };

const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

export const isCurrency = (code: string) => CURRENCIES.has(code);

export function readSettings(db: Db, userId: number): Settings {
	const row = db
		.prepare('SELECT currency, start_day AS startDay FROM settings WHERE user_id = ?')
		.get(userId) as Settings | undefined;
	return row ?? DEFAULTS;
}

function reportingStartDay(raw: string) {
	return Math.min(28, Math.max(1, Math.round(Number(raw)) || 1));
}

export function saveSettings(db: Db, userId: number, form: { currency: string; startDay: string }) {
	if (!isCurrency(form.currency)) return { message: 'Pick a currency from the list.' };
	db.prepare(
		`INSERT INTO settings (user_id, currency, start_day) VALUES (?, ?, ?)
		ON CONFLICT (user_id) DO UPDATE SET currency = excluded.currency, start_day = excluded.start_day`
	).run(userId, form.currency, reportingStartDay(form.startDay));
	return { saved: true };
}
