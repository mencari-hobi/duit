import { capitalize } from '#lib/category.ts';
import type { Line, Report } from '#lib/report.ts';
import { expenseTypes, latestHoldings, monthOf } from './dashboard';
import type { Db } from './db';
import { readSettings } from './settings';

type Flow = { kind: 'income' | 'expense'; date: string; amount: number; category: string; expenseType: string | null };

type Holding = { date: string; name: string; class: string; value: number; source: string | null; term: string | null; acquisition: number | null };

type Bag = { [key: string]: number };

type Monthly<T> = T & { month: string };

const nonLiquid = ['Investments', 'Other', 'Property'];
const classes = ['Cash', ...nonLiquid];
const installmentCategories = ['mortgage', 'car installment', 'debt payment', 'other installment'];

const add = (bag: Bag, key: string, amount: number) => (bag[key] = (bag[key] ?? 0) + amount);
const total = (bag: Bag) => Object.values(bag).reduce((sum, amount) => sum + amount, 0);
const ratio = (part: number, whole: number) => (whole ? part / whole : null);

function nextMonth(month: string) {
	const [year, number] = month.split('/').map(Number);
	return number === 12 ? `${year + 1}/01` : `${year}/${String(number + 1).padStart(2, '0')}`;
}

function ownFunded(holdings: Holding[]) {
	const bag: Bag = {};
	for (const row of holdings) if (row.source !== 'Debt') add(bag, row.class, row.value);
	return bag;
}

function monthFigures(flows: Monthly<Flow>[], updates: Monthly<Holding>[], month: string, before: string | undefined) {
	const income: Bag = {};
	const expense: { [type: string]: Bag } = {};
	let fixed = 0;
	let installments = 0;
	let mortgage = 0;
	for (const row of flows.filter((row) => row.month === month)) {
		if (row.kind === 'income') {
			add(income, row.category, row.amount);
			continue;
		}
		const type = row.expenseType ?? '';
		add((expense[type] ??= {}), row.category, row.amount);
		if (type.startsWith('Fixed')) fixed += row.amount;
		if (installmentCategories.includes(row.category)) installments += row.amount;
		if (row.category === 'mortgage') mortgage += row.amount;
	}
	const holdings = latestHoldings(updates, month);
	const own = ownFunded(holdings);
	const ownBefore = before ? ownFunded(latestHoldings(updates, before)) : {};
	const saving: Bag = {};
	for (const name of classes) {
		const change = (own[name] ?? 0) - (ownBefore[name] ?? 0);
		if (change) saving[name] = change;
	}
	const assets: Bag = {};
	const cost: Bag = {};
	const debt: Bag = {};
	for (const row of holdings) {
		if (row.class === 'Liability') add(debt, row.term || 'Unspecified', row.value);
		else {
			add(assets, row.class, row.value);
			add(cost, row.class, row.acquisition ?? row.value);
		}
	}
	const incomeTotal = total(income);
	const expenseTotal = Object.values(expense).reduce((sum, bag) => sum + total(bag), 0);
	const assetTotal = total(assets);
	const debtTotal = total(debt);
	return {
		income,
		expense,
		saving,
		assets,
		cost,
		debt,
		fixed,
		installments,
		mortgage,
		incomeTotal,
		expenseTotal,
		savingTotal: total(saving),
		liquid: assets.Cash ?? 0,
		assetTotal,
		costTotal: total(cost),
		debtTotal,
		worth: assetTotal - debtTotal
	};
}

export function loadReport(db: Db, userId: number): Report | null {
	const { currency, startDay } = readSettings(db, userId);
	const flows = (
		db
			.prepare(
				`SELECT kind, date, amount, category, expense_type AS expenseType
				FROM entries WHERE user_id = ? AND currency = ?`
			)
			.all(userId, currency) as Flow[]
	).map((row) => ({ ...row, month: monthOf(row.date, startDay) }));
	const updates = (
		db
			.prepare(
				`SELECT date, name, class, value, source, term, acquisition
				FROM assets WHERE user_id = ? AND currency = ? ORDER BY date, id`
			)
			.all(userId, currency) as Holding[]
	).map((row) => ({ ...row, month: monthOf(row.date, startDay) }));
	const known = [...flows, ...updates].map((row) => row.month).sort();
	if (!known.length) return null;
	const span = [known[0]];
	while (span.at(-1)! < known.at(-1)!) span.push(nextMonth(span.at(-1)!));

	const months = span.slice(-3);
	const columns = months.map((month) => monthFigures(flows, updates, month, span[span.indexOf(month) - 1]));
	type Column = (typeof columns)[number];
	const keys = (bag: (column: Column) => Bag | undefined) =>
		[...new Set(columns.flatMap((column) => Object.keys(bag(column) ?? {})))].sort(
			(a, b) => columns.reduce((sum, column) => sum + ((bag(column) ?? {})[b] ?? 0) - ((bag(column) ?? {})[a] ?? 0), 0)
		);
	const inAnyColumn = (bag: (column: Column) => Bag) => (key: string) => columns.some((column) => bag(column)[key]);
	const line = (label: string, depth: Line['depth'], value: (column: Column) => number | null, extra: Partial<Line> = {}): Line => ({
		label,
		depth,
		...extra,
		values: columns.map(value)
	});
	const sum = (label: string, value: (column: Column) => number) => line(label, 0, value, { strong: true });
	const grand = (label: string, value: (column: Column) => number) => line(label, 0, value, { strong: true, total: true });
	const share = (label: string, value: (column: Column) => number | null) => line(label, 0, value, { percent: true });

	const flow = [
		sum('Total Income', (c) => c.incomeTotal),
		...keys((c) => c.income).map((name) => line(capitalize(name), 1, (c) => c.income[name] ?? 0)),
		sum('Total Saving', (c) => c.savingTotal),
		...classes.filter(inAnyColumn((c) => c.saving)).map((name) => line(name, 1, (c) => c.saving[name] ?? 0)),
		sum('Total Expense', (c) => c.expenseTotal),
		...expenseTypes
			.filter((type) => columns.some((c) => c.expense[type]))
			.flatMap((type) => [
				line(type, 1, (c) => total(c.expense[type] ?? {}), { strong: true }),
				...keys((c) => c.expense[type]).map((name) => line(capitalize(name), 2, (c) => c.expense[type]?.[name] ?? 0))
			]),
		grand('Remaining Amount (income − saving − expense)', (c) => c.incomeTotal - c.savingTotal - c.expenseTotal)
	];
	const worth = [
		sum('Liquid assets', (c) => c.liquid),
		...['Cash'].filter(inAnyColumn((c) => c.assets)).map((name) => line(name, 1, (c) => c.assets[name] ?? 0)),
		sum('Non-liquid assets', (c) => c.assetTotal - c.liquid),
		...nonLiquid.filter(inAnyColumn((c) => c.assets)).map((name) => line(name, 1, (c) => c.assets[name] ?? 0)),
		grand('Total Assets (market value)', (c) => c.assetTotal),
		sum('Acquisition value', (c) => c.costTotal),
		...classes.filter(inAnyColumn((c) => c.cost)).map((name) => line(name, 1, (c) => c.cost[name] ?? 0)),
		sum('Capital gain (market − acquisition)', (c) => c.assetTotal - c.costTotal),
		...classes.filter(inAnyColumn((c) => c.cost)).map((name) => line(name, 1, (c) => (c.assets[name] ?? 0) - (c.cost[name] ?? 0))),
		share('Capital gain % of acquisition value', (c) => ratio(c.assetTotal - c.costTotal, c.costTotal)),
		sum('Liabilities', (c) => c.debtTotal),
		...['Short term', 'Long term', 'Unspecified'].filter(inAnyColumn((c) => c.debt)).map((term) => line(term, 1, (c) => c.debt[term] ?? 0)),
		grand('Net Worth (assets − liabilities)', (c) => c.worth)
	];
	const ratios = [
		share('1. Saving rate (saving ÷ income)', (c) => ratio(c.savingTotal, c.incomeTotal)),
		share('2. Fixed expense ÷ income', (c) => ratio(c.fixed, c.incomeTotal)),
		share('3. Debt ÷ total assets', (c) => ratio(c.debtTotal, c.assetTotal)),
		share('4. Liquidity ratio (liquid ÷ total assets)', (c) => ratio(c.liquid, c.assetTotal)),
		share('5. Liquid assets ÷ net worth', (c) => ratio(c.liquid, c.worth)),
		share('6. Debt service ratio (installments ÷ income)', (c) => ratio(c.installments, c.incomeTotal)),
		share('7. Non-mortgage service ratio (non-mortgage installments ÷ income)', (c) =>
			ratio(c.installments - c.mortgage, c.incomeTotal)
		),
		share('8. Non-cash assets ÷ net worth', (c) => ratio(c.assetTotal - c.liquid, c.worth)),
		share('9. Net worth ÷ total assets', (c) => ratio(c.worth, c.assetTotal))
	];
	return {
		currency,
		months,
		sections: [
			{ id: 'flow', title: 'Income vs Expense Report', lines: flow },
			{ id: 'worth', title: 'Asset Report (market value unless stated)', lines: worth },
			{ id: 'ratios', title: 'Ratios', lines: ratios }
		]
	};
}
