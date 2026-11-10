import { group } from '#lib/amount.ts';

export type Line = {
	label: string;
	depth: 0 | 1 | 2;
	strong?: true;
	total?: true;
	percent?: true;
	values: (number | null)[];
};

export type Report = { currency: string; months: string[]; sections: { id: string; title: string; lines: Line[] }[] };

const sign = (n: number) => (n < 0 ? '−' : '');

export const millions = (n: number) => (n === 0 ? '–' : sign(n) + group(Math.abs(n / 1e6).toFixed(2).replace('.', ',')));

const percent = (n: number | null) => (n === null ? '–' : sign(n) + Math.abs(n * 100).toFixed(1) + '%');

export const shown = (line: Line, n: number | null) => (line.percent ? percent(n) : millions(n ?? 0));

export const notes = (currency: string) => [
	['Amounts', `are in millions of ${currency}, the default currency. An entry in another currency stays out of every total.`],
	['Total saving', 'is the change in assets over the month, split by asset class, with market gains and losses. An asset funded by debt stays out.'],
	['Remaining', 'is income − saving − expenses.'],
	['Liquid assets', 'are the Cash assets.'],
	['Installments', 'are the expense categories Mortgage, Car Installment, Debt Payment, and Other Installment. Non-mortgage installments leave out Mortgage.'],
	['Fixed expenses', 'are the expenses of both "Fixed" expense types.'],
	['Acquisition value', 'is the cost entered per asset. An asset without one counts its market value as cost, so its gain is 0.'],
	['Liabilities', 'need a term, short or long. Set it with Edit on the Records page.']
];
