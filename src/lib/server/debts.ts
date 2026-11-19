import { CalendarDate, endOfMonth, getLocalTimeZone, today } from '@internationalized/date';
import { parseAmount } from '#lib/amount.ts';
import { debtCategories, paymentCount, paymentDates, paymentTypes } from '#lib/debt.ts';
import { isoDate, slashDate } from '#lib/date.ts';
import { money } from '#lib/record.ts';
import { monthOf } from './dashboard';
import type { Db } from './db';
import { readSettings } from './settings';

type Fields = Record<string, string | undefined>;

export type DebtRow = {
	id: number;
	code: string;
	category: string;
	amount: number;
	tenor: number;
	payment_type: string;
	start: string;
	end: string;
	installment: number;
	currency: string;
};

export const todayIso = () => today(getLocalTimeZone()).toString();

const field = (fields: Fields, name: string) => (fields[name] ?? '').trim();

const debtRows = (db: Db, userId: number) =>
	db.prepare('SELECT * FROM diary_debts WHERE user_id = ? ORDER BY code').all(userId) as DebtRow[];

export const debtOf = (db: Db, userId: number, id: number) =>
	db.prepare('SELECT * FROM diary_debts WHERE id = ? AND user_id = ?').get(id, userId) as DebtRow | undefined;

export function nextDebtCode(db: Db, userId: number) {
	const row = db
		.prepare('SELECT max(CAST(substr(code, 5) AS INTEGER)) AS last FROM diary_debts WHERE user_id = ?')
		.get(userId) as { last: number | null };
	return `DBT-${String((row.last ?? 0) + 1).padStart(4, '0')}`;
}

export function saveDebt(db: Db, userId: number, fields: Fields) {
	const category = field(fields, 'category');
	if (!debtCategories.includes(category)) return { message: 'Pick a debt category from the list.', field: 'category' };
	const amount = parseAmount(field(fields, 'amount'));
	if (!amount) return { message: 'Please enter the debt amount (numbers only).', field: 'amount' };
	const tenor = Number(field(fields, 'tenor'));
	if (!Number.isInteger(tenor) || tenor < 1) {
		return { message: 'Please enter the tenor as a whole number of months (1 or more).', field: 'tenor' };
	}
	const paymentType = field(fields, 'paymentType');
	if (!paymentTypes.includes(paymentType)) return { message: 'Pick a payment type from the list.', field: 'paymentType' };
	const start = isoDate(field(fields, 'start'));
	if (!start) return { message: 'Please pick a date.', field: 'start' };
	const end = isoDate(field(fields, 'end'));
	if (!end) return { message: 'Please pick a date.', field: 'end' };
	if (end < start) return { message: 'The end payment cannot be before the start payment.', field: 'end' };
	const installment = parseAmount(field(fields, 'installment'));
	if (!installment) return { message: 'Please enter the installment amount (numbers only).', field: 'installment' };
	const values = [category, amount, tenor, paymentType, start, end, installment];
	if (fields.id) {
		const debt = debtOf(db, userId, Number(/^d(\d+)$/.exec(fields.id)?.[1]));
		if (!debt) return { missing: true as const };
		db.prepare(
			`UPDATE diary_debts SET category = ?, amount = ?, tenor = ?, payment_type = ?, start = ?, end = ?, installment = ?
			WHERE id = ?`
		).run(...values, debt.id);
		return { saved: debt.code };
	}
	const code = nextDebtCode(db, userId);
	db.prepare(
		`INSERT INTO diary_debts (user_id, code, category, amount, tenor, payment_type, start, end, installment, currency)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(userId, code, ...values, readSettings(db, userId).currency);
	return { saved: code };
}

export const editableDebt = (debt: DebtRow) => ({
	id: `d${debt.id}`,
	type: 'debt',
	category: debt.category,
	amount: money(debt.amount),
	tenor: String(debt.tenor),
	paymentType: debt.payment_type,
	start: slashDate(debt.start),
	end: slashDate(debt.end),
	installment: money(debt.installment)
});

const schedule = (debt: DebtRow) => paymentDates({ start: debt.start, end: debt.end, tenor: debt.tenor, paymentType: debt.payment_type });

export function dueIn(debt: DebtRow, month: string, startDay: number) {
	const { start, end } = reportingWindow(month, startDay);
	const [from, to] = [start.toString(), end.toString()];
	return debt.installment * schedule(debt).filter((date) => date >= from && date <= to).length;
}

const totalOf = (debt: DebtRow) => debt.installment * paymentCount(debt.tenor, debt.payment_type);

const paidMonths = (db: Db, debt: DebtRow) =>
	new Set((db.prepare('SELECT month FROM diary_debt_payments WHERE debt_id = ?').all(debt.id) as { month: string }[]).map((row) => row.month));

function standing(debt: DebtRow, month: string, startDay: number, paid: Set<string>) {
	let remaining = totalOf(debt);
	let overdue = 0;
	for (let step = monthKey(debt.start, startDay); step <= month; step = monthKey(reportingWindow(step, startDay).end.add({ days: 1 }).toString(), startDay)) {
		const due = dueIn(debt, step, startDay);
		if (paid.has(step)) remaining -= due;
		else if (step < month) overdue += due;
	}
	return { remaining, overdue };
}

export function reportingWindow(month: string, startDay: number) {
	const [year, number] = month.split('-').map(Number);
	const first = new CalendarDate(year, number, 1);
	if (startDay === 1) return { start: first, end: endOfMonth(first) };
	return { start: first.subtract({ months: 1 }).set({ day: startDay }), end: first.set({ day: startDay - 1 }) };
}

const monthKey = (date: string, startDay: number) => monthOf(date, startDay).replace('/', '-');

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const short = (date: CalendarDate) => `${date.day} ${monthNames[date.month - 1]}`;

export function reportingMonths(db: Db, userId: number, today: string) {
	const { startDay } = readSettings(db, userId);
	const current = monthKey(today, startDay);
	const starts = debtRows(db, userId).map((debt) => monthKey(debt.start, startDay));
	let month = starts.length ? starts.sort()[0] : current;
	if (month > current) month = current;
	const months: { value: string; label: string }[] = [];
	for (;;) {
		const { start, end } = reportingWindow(month, startDay);
		months.unshift({ value: month, label: `${month} (${short(start)} – ${short(end)} ${end.year})${month === current ? ' · current' : ''}` });
		if (month === current) return months;
		month = monthKey(end.add({ days: 1 }).toString(), startDay);
	}
}

export const currentMonth = (db: Db, userId: number, today: string) => monthKey(today, readSettings(db, userId).startDay);

export function debtTable(db: Db, userId: number, month: string) {
	const debts = debtRows(db, userId);
	if (!debts.length) return null;
	const { startDay } = readSettings(db, userId);
	const { start, end } = reportingWindow(month, startDay);
	const [from, to] = [start.toString(), end.toString()];
	const paid = new Set(
		(
			db
				.prepare(
					`SELECT debt_id AS id FROM diary_debt_payments JOIN diary_debts ON diary_debts.id = debt_id
					WHERE user_id = ? AND month = ?`
				)
				.all(userId, month) as { id: number }[]
		).map((row) => row.id)
	);
	const rows = debts
		.map((debt) => ({ debt, dates: schedule(debt) }))
		.filter(({ dates }) => dates.length && dates[0] <= to && dates.at(-1)! >= from)
		.map(({ debt, dates }) => ({
			code: debt.code,
			category: debt.category,
			total: totalOf(debt),
			due: debt.installment * dates.filter((date) => date >= from && date <= to).length,
			paid: paid.has(debt.id),
			...standing(debt, month, startDay, paidMonths(db, debt))
		}));
	const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
	return {
		rows,
		total: {
			total: sum((row) => row.total),
			due: sum((row) => row.due),
			unpaid: rows.filter((row) => !row.paid).length,
			remaining: sum((row) => row.remaining),
			overdue: sum((row) => row.overdue)
		}
	};
}

export function savePayments(db: Db, userId: number, month: string, fields: Fields, today: string) {
	const debts = debtRows(db, userId);
	let paid = 0;
	db.transaction(() => {
		for (const debt of debts) {
			if (fields[`paid-${debt.code}`]) {
				paid++;
				db.prepare('INSERT OR IGNORE INTO diary_debt_payments (debt_id, month, paid_date) VALUES (?, ?, ?)').run(debt.id, month, today);
			} else db.prepare('DELETE FROM diary_debt_payments WHERE debt_id = ? AND month = ?').run(debt.id, month);
		}
	})();
	return { paid };
}

export function debtHoldings(db: Db, userId: number, currency: string, startDay: number, today: string) {
	const current = monthKey(today, startDay);
	return debtRows(db, userId)
		.filter((debt) => debt.currency === currency)
		.flatMap((debt) => {
			const paid = paidMonths(db, debt);
			const rows = [];
			let month = monthKey(debt.start, startDay);
			while (month <= current) {
				const { end } = reportingWindow(month, startDay);
				const to = end.toString();
				const { remaining: value } = standing(debt, month, startDay, paid);
				rows.push({
					date: to,
					name: debt.category,
					class: 'Liability',
					value,
					currency: debt.currency,
					source: null,
					term: debt.tenor > 12 ? 'Long term' : 'Short term',
					acquisition: null,
					code: debt.code
				});
				if (value <= 0) break;
				month = monthKey(end.add({ days: 1 }).toString(), startDay);
			}
			return rows;
		});
}
