import { CalendarDate, parseDate } from '@internationalized/date';

export const debtCategories = ['Credit card', 'Mortgage', 'Car installment', 'Non-collateral loan', 'Other loan'];

export const paymentTypes = ['Daily', 'Weekly', 'Monthly'];

const perMonth: Record<string, number> = { Daily: 30, Weekly: 4, Monthly: 1 };

export const paymentCount = (tenor: number, paymentType: string) => tenor * (perMonth[paymentType] ?? 1);

const step = (start: CalendarDate, paymentType: string, k: number) =>
	paymentType === 'Daily'
		? start.add({ days: k })
		: paymentType === 'Weekly'
			? start.add({ weeks: k })
			: start.add({ months: k });

export const scheduledEnd = (start: string, tenor: number, paymentType: string) =>
	step(parseDate(start), paymentType, paymentCount(tenor, paymentType) - 1).toString();

export type Schedule = { start: string; end: string; tenor: number; paymentType: string };

export function paymentDates(debt: Schedule) {
	const start = parseDate(debt.start);
	const dates: string[] = [];
	for (let k = 0; k < paymentCount(debt.tenor, debt.paymentType); k++) {
		const date = step(start, debt.paymentType, k).toString();
		if (date > debt.end) break;
		dates.push(date);
	}
	return dates;
}
