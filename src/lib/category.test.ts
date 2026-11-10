import { expect, test } from 'vitest';
import { capitalize } from './category';

test(
	'a category stored as "gasoline & tolls" shows as "Gasoline & Tolls"',
	{ meta: { scenario: 'S45' } },
	() => {
		expect(capitalize('gasoline & tolls')).toBe('Gasoline & Tolls');
	}
);

test('a category shows a capital letter after each slash', () => {
	expect(capitalize('self care/entertainment')).toBe('Self Care/Entertainment');
});

test(
	'an income stored as "sales of asset" shows as "Sales of Asset"',
	{ meta: { scenario: 'S122' } },
	() => {
		expect(capitalize('sales of asset')).toBe('Sales of Asset');
	}
);
