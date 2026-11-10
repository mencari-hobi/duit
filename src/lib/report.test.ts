import { expect, test } from 'vitest';
import { millions, notes, shown, type Line } from './report';

const amountLine: Line = { label: 'Total Saving', depth: 0, values: [] };
const percentLine: Line = { label: 'Saving rate', depth: 0, percent: true, values: [] };

test('a negative amount of 2.000.000 reads −2,00', () => {
	expect(millions(-2000000)).toBe('−2,00');
});

test('a percent line reads 0.2 as 20.0%, −0.1 as −10.0%, and no value as a dash', () => {
	expect([shown(percentLine, 0.2), shown(percentLine, -0.1), shown(percentLine, null)]).toEqual([
		'20.0%',
		'−10.0%',
		'–'
	]);
});

test('an amount line reads no value as a dash', () => {
	expect(shown(amountLine, null)).toBe('–');
});

test('the amounts note names the default currency', () => {
	expect(notes('USD')[0][1]).toMatch(/^are in millions of USD, the default currency\./);
});
