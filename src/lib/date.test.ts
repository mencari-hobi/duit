import { expect, test } from 'vitest';
import { groupDate } from './date';

test('typing 20261103 into the date field shows 2026/11/03', { meta: { scenario: 'S63' } }, () => {
	expect(groupDate('20261103')).toBe('2026/11/03');
});

test('typing 20261 into the date field shows 2026/1', () => {
	expect(groupDate('20261')).toBe('2026/1');
});
