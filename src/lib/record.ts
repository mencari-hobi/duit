import { group } from '#lib/amount.ts';
import { assetLabel } from '#lib/asset.ts';
import { capitalize } from '#lib/category.ts';
import { paymentCount } from '#lib/debt.ts';
import { slashDate } from '#lib/date.ts';

type Kind = 'income' | 'expense' | 'asset' | 'debt';

export type Record = {
	id: string;
	kind: Kind;
	date: string;
	amount: number;
	currency: string;
	note: string;
	category?: string;
	expenseType?: string | null;
	owner?: string | null;
	name?: string;
	cls?: string;
	source?: string | null;
	term?: string | null;
	acquisition?: number | null;
	code?: string | null;
	tenor?: number;
	paymentType?: string;
	installment?: number;
};

export const money = (n: number) => group(String(n).replace('.', ','));

export const label = (record: Record) =>
	record.kind === 'debt'
		? `${record.code} · ${record.name} · ${paymentCount(record.tenor!, record.paymentType!)} × ${money(record.installment!)} ${record.paymentType!.toLowerCase()}`
		: record.kind === 'asset'
		? [
				`${assetLabel(record.code, record.name)} (${record.cls})`,
				record.source && `funded by ${record.source}`,
				record.acquisition != null && `cost ${money(record.acquisition)}`
			]
				.filter(Boolean)
				.join(' · ')
		: capitalize(record.category ?? '');

export const day = (record: Record) => slashDate(record.date);

export const types = { income: 'Income', expense: 'Expense', asset: 'Asset', debt: 'Debt' };

export const tone = { income: 'text-in', expense: 'text-out', asset: 'text-chart-5', debt: 'text-chart-4' };
