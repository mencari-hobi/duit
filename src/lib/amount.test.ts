import { expect, test } from 'vitest';
import { group, sizeOf } from './amount';

test('typing 1250000 into the amount shows 1.250.000', { meta: { scenario: 'S56' } }, () => {
	expect(group('1250000')).toBe('1.250.000');
});

test('a comma in the amount keeps the decimals after the grouped thousands', () => {
	expect(group('1250000,75')).toBe('1.250.000,75');
});

test('typing 0001234 into the amount drops the leading zeros and shows 1.234', () => {
	expect(group('0001234')).toBe('1.234');
});

test('a single zero before the comma stays in the amount', () => {
	expect(group('0,5')).toBe('0,5');
});

test('an amount longer than 21 characters takes the smallest text size', () => {
	expect(sizeOf('1.000.000.000.000.000,5')).toBe('text-lg');
});
