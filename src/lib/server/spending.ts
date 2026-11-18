import { parseDate } from '@internationalized/date';
import { capitalize, expenseTypes, sale } from '#lib/category.ts';
import { isoDate } from '#lib/date.ts';
import { timeframe } from '#lib/plan.ts';
import { monthOf } from './dashboard';
import type { Db } from './db';
import { dueIn, reportingWindow, type DebtRow } from './debts';
import { readSettings } from './settings';

type Query = { period?: string; date?: string; from?: string; to?: string };

export const periods = [
	{ value: 'on', label: 'On' },
	{ value: 'before', label: 'Before' },
	{ value: 'between', label: 'Between' },
	{ value: 'last7', label: 'Last 7 days' },
	{ value: 'lastmonth', label: 'Last month' }
];

const previousMonth = (today: string, startDay: number) => {
	const [year, month] = monthOf(today, startDay).split('/').map(Number);
	return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
};

function earliestDate(db: Db, userId: number) {
	const row = db
		.prepare(
			`SELECT min(date) AS date FROM (
				SELECT date FROM diary_entries WHERE user_id = ?
				UNION ALL SELECT date FROM diary_assets WHERE user_id = ?
				UNION ALL SELECT paid_date FROM diary_debt_payments JOIN diary_debts ON diary_debts.id = debt_id WHERE user_id = ?
			)`
		)
		.get(userId, userId, userId) as { date: string | null };
	return row.date;
}

export type Chosen = { period: string; date: string; from: string; to: string; start?: string; end?: string; error?: string };

export function periodOf(db: Db, userId: number, query: Query, today: string): Chosen {
	const period = periods.some((option) => option.value === query.period) ? query.period! : 'lastmonth';
	const day = (text: string | undefined) => isoDate((text ?? '').trim()) ?? today;
	const date = day(query.date);
	const from = day(query.from);
	const to = day(query.to);
	const chosen = { period, date, from, to };
	if (period === 'on') return { ...chosen, start: date, end: date };
	if (period === 'before') {
		const end = parseDate(date).subtract({ days: 1 }).toString();
		const earliest = earliestDate(db, userId);
		return { ...chosen, start: earliest && earliest < end ? earliest : end, end };
	}
	if (period === 'between') {
		if (to < from) return { ...chosen, error: 'The end date cannot be before the start date.' };
		return { ...chosen, start: from, end: to };
	}
	if (period === 'last7') return { ...chosen, start: parseDate(today).subtract({ days: 6 }).toString(), end: today };
	const window = reportingWindow(previousMonth(today, readSettings(db, userId).startDay), readSettings(db, userId).startDay);
	return { ...chosen, start: window.start.toString(), end: window.end.toString() };
}

type Line = { label: string; actual: number; budget: number; variance: number; share: number | null; good: boolean | null };

type Bag = Map<string, { actual: number; budget: number }>;

const add = (bag: Bag, label: string, part: 'actual' | 'budget', amount: number) => {
	const entry = bag.get(label) ?? { actual: 0, budget: 0 };
	entry[part] += amount;
	bag.set(label, entry);
};

const line = (label: string, actual: number, budget: number, higherIsGood: boolean): Line => {
	const variance = actual - budget;
	return {
		label,
		actual,
		budget,
		variance,
		share: budget ? variance / budget : null,
		good: variance === 0 ? null : variance > 0 === higherIsGood
	};
};

const lines = (bag: Bag, higherIsGood: boolean) =>
	[...bag].map(([label, { actual, budget }]) => line(label, actual, budget, higherIsGood));

const totalOf = (rows: Line[], name: string, higherIsGood: boolean) =>
	line(name, rows.reduce((sum, row) => sum + row.actual, 0), rows.reduce((sum, row) => sum + row.budget, 0), higherIsGood);

type PlanEntry = { kind: 'income' | 'expense'; amount: number; timeframe: string; category: string; expense_type: string | null };

type DiaryFlow = { kind: 'income' | 'expense'; amount: number; category: string; expense_type: string | null };

export function spendingReport(db: Db, userId: number, start: string, end: string) {
	const { currency, startDay } = readSettings(db, userId);
	const all = (sql: string, ...params: unknown[]) => db.prepare(sql).all(userId, ...params) as never[];
	const planEntries: PlanEntry[] = all('SELECT * FROM plan_entries WHERE user_id = ? AND currency = ? ORDER BY id', currency);
	const planSavings: { id: number; dream: string; amount: number; months: number }[] = all(
		'SELECT * FROM plan_savings WHERE user_id = ? AND currency = ? ORDER BY id',
		currency
	);
	const planDebts: { category: string; amount: number }[] = all(
		'SELECT * FROM plan_debts WHERE user_id = ? AND currency = ? AND start <= ? AND end >= ? ORDER BY id',
		currency,
		end,
		start
	);
	const flows: DiaryFlow[] = all(
		'SELECT * FROM diary_entries WHERE user_id = ? AND currency = ? AND date BETWEEN ? AND ? ORDER BY date, id',
		currency,
		start,
		end
	);
	const purchases: { date: string; amount: number; dream: string | null }[] = all(
		`SELECT first.date, coalesce(first.acquisition, first.value) AS amount, plan_savings.dream FROM diary_assets AS first
		LEFT JOIN plan_savings ON plan_savings.id = first.dream_id
		WHERE first.user_id = ? AND first.currency = ? AND first.code IS NOT NULL AND first.date BETWEEN ? AND ?
		AND NOT EXISTS (SELECT 1 FROM diary_assets AS earlier WHERE earlier.user_id = first.user_id AND earlier.code = first.code
			AND (earlier.date < first.date OR (earlier.date = first.date AND earlier.id < first.id)))
		ORDER BY first.date, first.id`,
		currency,
		start,
		end
	);
	const paid: (DebtRow & { month: string })[] = all(
		`SELECT diary_debts.*, month FROM diary_debt_payments JOIN diary_debts ON diary_debts.id = debt_id
		WHERE user_id = ? AND currency = ? AND paid_date BETWEEN ? AND ? ORDER BY code, month`,
		currency,
		start,
		end
	);
	const anything = db
		.prepare(
			`SELECT EXISTS (SELECT 1 FROM diary_entries WHERE user_id = @user) OR EXISTS (SELECT 1 FROM diary_assets WHERE user_id = @user)
			OR EXISTS (SELECT 1 FROM diary_debts WHERE user_id = @user) OR EXISTS (SELECT 1 FROM plan_entries WHERE user_id = @user)
			OR EXISTS (SELECT 1 FROM plan_savings WHERE user_id = @user) OR EXISTS (SELECT 1 FROM plan_debts WHERE user_id = @user) AS found`
		)
		.get({ user: userId }) as { found: number };
	if (!anything.found) return null;

	const window = reportingWindow(monthOf(start, startDay).replace('/', '-'), startDay);
	const days = parseDate(end).compare(parseDate(start)) + 1;
	const factor = window.start.toString() === start && window.end.toString() === end ? 1 : days / 30;
	const budgetOf = (entry: PlanEntry) => entry.amount * timeframe(entry.timeframe).perMonth * factor;

	const income: Bag = new Map();
	for (const entry of planEntries.filter((entry) => entry.kind === 'income')) add(income, capitalize(entry.category), 'budget', budgetOf(entry));
	for (const flow of flows.filter((flow) => flow.kind === 'income' && flow.category !== sale)) {
		add(income, capitalize(flow.category), 'actual', flow.amount);
	}

	const debt: Bag = new Map();
	for (const item of planDebts) add(debt, item.category, 'budget', item.amount * factor);
	for (const payment of paid) add(debt, payment.category, 'actual', dueIn(payment, payment.month, startDay));

	const saving: Bag = new Map();
	for (const item of planSavings) add(saving, item.dream, 'budget', (item.amount / item.months) * factor);
	for (const purchase of purchases) add(saving, purchase.dream ?? 'Other saving', 'actual', purchase.amount);

	const types = expenseTypes
		.map((type) => {
			const bag: Bag = new Map();
			for (const entry of planEntries.filter((entry) => entry.kind === 'expense' && entry.expense_type === type)) {
				add(bag, capitalize(entry.category), 'budget', budgetOf(entry));
			}
			for (const flow of flows.filter((flow) => flow.kind === 'expense' && flow.expense_type === type)) {
				add(bag, capitalize(flow.category), 'actual', flow.amount);
			}
			const rows = lines(bag, false);
			return { ...totalOf(rows, type, false), name: type, rows };
		})
		.filter((type) => type.rows.length);

	const section = (name: string, bag: Bag, higherIsGood: boolean) => {
		const rows = lines(bag, higherIsGood);
		return { ...totalOf(rows, name, higherIsGood), name, rows, types: [] as typeof types };
	};
	const expenseRows = types.flatMap((type) => type.rows);
	const sections = [
		section('Income', income, true),
		section('Debt payment', debt, false),
		section('Saving', saving, true),
		{ ...totalOf(expenseRows, 'Expense', false), name: 'Expense', rows: expenseRows, types }
	];
	const [earned, owed, saved, spent] = sections;
	const free = line(
		'Free Cash Flow',
		earned.actual - owed.actual - saved.actual - spent.actual,
		earned.budget - owed.budget - saved.budget - spent.budget,
		true
	);
	const essential = (part: 'actual' | 'budget') =>
		types.filter((type) => type.name.endsWith('- Essential')).reduce((sum, type) => sum + type[part], 0);
	const ratio = (name: string, part: (side: 'actual' | 'budget') => number) => {
		const of = (side: 'actual' | 'budget') => (earned[side] ? part(side) / earned[side] : null);
		const actual = of('actual');
		const budget = of('budget');
		return { name, actual, budget, bps: actual === null || budget === null ? null : Math.round((actual - budget) * 10000) };
	};
	return {
		currency,
		start,
		end,
		sections,
		free,
		ratios: [
			ratio('Debt Service Ratio', (side) => owed[side]),
			ratio('Saving Ratio', (side) => saved[side]),
			ratio('Essential Expense Ratio', essential),
			ratio('Free Cash Flow Ratio', (side) => free[side])
		]
	};
}

export type SpendingReport = NonNullable<ReturnType<typeof spendingReport>>;
