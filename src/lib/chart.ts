import { group } from '#lib/amount.ts';

export type Layout = 'group' | 'stack';
export type Series = {
	key: string;
	label: string;
	color: string;
	value: (row: any) => number;
	share?: (row: any) => number | null;
};
export type MonthRow = { month: string };
export type MonthChart = { id: string; rows: MonthRow[]; series: Series[]; layout?: Layout; line?: Series };

export const mio = (value: number) => value / 1e6;
export const tickLabel = (value: number) => group(String(Math.round(value)));
export const percent = (share: number | null | undefined) => (share == null ? '' : `${Math.round(share)}%`);

export const chartData = (rows: MonthRow[], series: Series[]) =>
	rows.map((row) => ({ month: row.month, ...Object.fromEntries(series.map((s) => [s.key, mio(s.value(row))])) }));

export const barSeries = (series: Series[]) => series.map(({ key, label, color }) => ({ key, label, color }));

export const stackBase = (series: Series[], index: number, row: MonthRow) =>
	series.slice(0, index).reduce((sum, s) => sum + mio(s.value(row)), 0);

export function ticks(rows: MonthRow[], series: Series[], layout: Layout, line?: Series) {
	const max = Math.max(
		...rows.map((row) => {
			const values = series.map((s) => mio(s.value(row)));
			return layout === 'stack' ? values.reduce((a, b) => a + b, 0) : Math.max(...values);
		}),
		...(line ? rows.map((row) => mio(line.value(row))) : [0])
	);
	const rough = Math.max(max, 1) / 5;
	const power = 10 ** Math.floor(Math.log10(rough));
	const step = [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= rough)!;
	return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}
