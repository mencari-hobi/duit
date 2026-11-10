import { CalendarDate } from '@internationalized/date';

export function groupDate(text: string) {
	const digits = text.replace(/\D/g, '').slice(0, 8);
	return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('/');
}

export const slashDate = (date: { toString(): string }) => date.toString().replaceAll('-', '/');

export function isoDate(text: string) {
	const match = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(text);
	if (!match) return null;
	const iso = `${match[1]}-${match[2]}-${match[3]}`;
	const date = new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
	return date.toString() === iso ? iso : null;
}
