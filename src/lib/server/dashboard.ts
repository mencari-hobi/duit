import { sale } from '#lib/category.ts';
import { isoDate } from '#lib/date.ts';
import type { Db } from './db';
import { readSettings } from './settings';

type Flow = {
	kind: 'income' | 'expense';
	date: string;
	amount: number;
	currency: string;
	category: string;
	expenseType: string | null;
	owner: string | null;
};

type Holding = {
	date: string;
	name: string;
	class: string;
	value: number;
	currency: string;
	source: string | null;
	term: string | null;
};

const classes = ['Cash', 'Investments', 'Goldbar', 'Property', 'Other'];
export const expenseTypes = [
	'Fixed - Essential',
	'Non-fixed - Essential',
	'Fixed - Non-essential',
	'Non-fixed - Non-essential'
];

export function monthOf(date: string, startDay: number) {
	let [year, month] = date.split('-').map(Number);
	if (startDay > 1 && Number(date.slice(8, 10)) >= startDay) month++;
	if (month > 12) [year, month] = [year + 1, 1];
	return `${year}/${String(month).padStart(2, '0')}`;
}

const sum = <T>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
const share = (part: number, whole: number) => (whole ? (part * 100) / whole : null);
const change = (now: number, before: number) => (before ? ((now - before) * 100) / Math.abs(before) : null);

type Monthly<T> = T & { month: string };

export function latestHoldings<T extends { name: string; month: string }>(updates: T[], month: string) {
	const latest = new Map<string, T>();
	for (const row of updates.filter((row) => row.month <= month)) latest.set(row.name, row);
	return [...latest.values()];
}

function monthSummary(month: string, flows: Monthly<Flow>[], updates: Monthly<Holding>[]) {
	const flow = flows.filter((row) => row.month === month);
	const income = sum(flow.filter((row) => row.kind === 'income' && row.category !== sale), (row) => row.amount);
	const spent = flow.filter((row) => row.kind === 'expense');
	const expenses = sum(spent, (row) => row.amount);
	const holding = latestHoldings(updates, month);
	const owned = holding.filter((row) => row.class !== 'Liability');
	const assets = sum(owned, (row) => row.value);
	const liabilities = sum(holding.filter((row) => row.class === 'Liability'), (row) => row.value);
	const byClass = Object.fromEntries(
		classes.map((name) => {
			const value = sum(owned.filter((row) => row.class === name), (row) => row.value);
			return [name, { value, share: share(value, assets) }];
		})
	);
	const byType = Object.fromEntries(
		expenseTypes.map((name) => {
			const value = sum(spent.filter((row) => row.expenseType === name), (row) => row.amount);
			return [name, { value, share: share(value, expenses) }];
		})
	);
	return {
		month,
		income,
		expenses,
		assets,
		liabilities,
		equity: assets - liabilities,
		netWorth: assets - liabilities,
		own: sum(owned.filter((row) => row.source !== 'Debt'), (row) => row.value),
		byClass,
		byType
	};
}

type MonthSummary = ReturnType<typeof monthSummary>;

function summaryCards(latest: MonthSummary, before: MonthSummary | undefined) {
	return {
		month: latest.month,
		income: latest.income,
		incomeChange: before ? change(latest.income, before.income) : null,
		expenses: latest.expenses,
		expensesChange: before ? change(latest.expenses, before.expenses) : null,
		net: latest.income - latest.expenses,
		savingsRate: latest.income
			? Math.round(((latest.income - latest.expenses) * 100) / latest.income)
			: null,
		netWorth: latest.netWorth,
		netWorthChange: before ? change(latest.netWorth, before.netWorth) : null,
		saved: before ? latest.own - before.own : null,
		own: latest.own,
		ownShare: latest.assets ? Math.round((latest.own * 100) / latest.assets) : null,
		debtFunded: latest.assets - latest.own
	};
}

function totals(spent: Flow[], key: 'owner' | 'category') {
	const sums = new Map<string, number>();
	for (const row of spent) {
		const name = row[key] ?? '';
		sums.set(name, (sums.get(name) ?? 0) + row.amount);
	}
	return [...sums]
		.map(([name, amount]) => ({ name, amount }))
		.sort((a, b) => b.amount - a.amount);
}

function assetTable(updates: Holding[]) {
	return [...new Set(updates.map((row) => row.name))]
		.map((name) => {
			const history = updates.filter((row) => row.name === name);
			const now = history.at(-1)!;
			const was = history.at(-2);
			return {
				name,
				cls: now.class,
				source: now.source ?? now.term,
				value: now.value,
				change: was ? now.value - was.value : null,
				changePct: was ? change(now.value, was.value) : null
			};
		})
		.sort((a, b) => b.value - a.value);
}

export function loadDashboard(db: Db, userId: number, from: string, to: string) {
	const { currency, startDay } = readSettings(db, userId);
	const allFlows = db
		.prepare(
			`SELECT kind, date, amount, currency, category, expense_type AS expenseType, owner
			FROM entries WHERE user_id = ?`
		)
		.all(userId) as Flow[];
	const allHoldings = db
		.prepare(
			'SELECT date, name, class, value, currency, source, term FROM assets WHERE user_id = ? ORDER BY date, id'
		)
		.all(userId) as Holding[];
	const leftOut = [...allFlows, ...allHoldings].filter((row) => row.currency !== currency).length;
	const inCurrency = <T extends { currency: string; date: string }>(rows: T[]) =>
		rows
			.filter((row) => row.currency === currency)
			.map((row) => ({ ...row, month: monthOf(row.date, startDay) }));
	const flows = inCurrency(allFlows);
	const updates = inCurrency(allHoldings);
	const known = [...new Set([...flows, ...updates].map((row) => row.month))].sort();
	const fromDate = isoDate(from);
	const toDate = isoDate(to);
	const first = fromDate ? monthOf(fromDate, startDay) : known[0];
	const last = toDate ? monthOf(toDate, startDay) : known.at(-1)!;
	const inRange = (month: string) => month >= first && month <= last;
	const base = { currency, from: fromDate ? from : '', to: toDate ? to : '', leftOut };

	const months = known.filter(inRange).map((month) => monthSummary(month, flows, updates));
	if (!months.length) return { ...base, months, cards: null, owners: [], categories: [], table: [] };

	const spentInRange = flows.filter((row) => row.kind === 'expense' && inRange(row.month));
	return {
		...base,
		months,
		cards: summaryCards(months.at(-1)!, months.at(-2)),
		owners: totals(spentInRange, 'owner'),
		categories: totals(spentInRange, 'category').slice(0, 8),
		table: assetTable(updates.filter((row) => row.month <= last))
	};
}
