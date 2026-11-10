import { beforeEach, expect, test } from 'vitest';
import { register } from './auth';
import { openDatabase, type Db } from './db';
import { readSettings, saveSettings } from './settings';

let db: Db;

beforeEach(() => {
	db = openDatabase(':memory:');
});

function newAccount(name = 'alice') {
	const result = register(db, name, 'password1');
	if (!('user' in result)) throw new Error(result.message);
	return result.user.id;
}

test('a new account has the default currency IDR', { meta: { scenario: 'S26' } }, () => {
	const alice = newAccount();

	expect(readSettings(db, alice).currency).toBe('IDR');
});

test(
	'after one account sets the default currency to USD, a second account keeps IDR',
	{ meta: { scenario: 'S27' } },
	() => {
		const alice = newAccount('alice');
		const bob = newAccount('bob');

		saveSettings(db, alice, { currency: 'USD', startDay: '1' });

		expect(readSettings(db, bob).currency).toBe('IDR');
	}
);

test(
	'saving a code outside ISO 4217 fails and keeps the stored currency',
	{ meta: { scenario: 'S28' } },
	() => {
		const alice = newAccount();
		saveSettings(db, alice, { currency: 'USD', startDay: '1' });

		const result = saveSettings(db, alice, { currency: 'ABC', startDay: '1' });

		expect(result).toEqual({ message: 'Pick a currency from the list.' });
		expect(readSettings(db, alice).currency).toBe('USD');
	}
);

test('a new account has the reporting start day 1', { meta: { scenario: 'S30' } }, () => {
	const alice = newAccount();

	expect(readSettings(db, alice).startDay).toBe(1);
});

test('saving 31 as the reporting start day stores 28', { meta: { scenario: 'S31' } }, () => {
	const alice = newAccount();

	saveSettings(db, alice, { currency: 'IDR', startDay: '31' });

	expect(readSettings(db, alice).startDay).toBe(28);
});

test('saving 0 as the reporting start day stores 1', { meta: { scenario: 'S32' } }, () => {
	const alice = newAccount();
	saveSettings(db, alice, { currency: 'IDR', startDay: '25' });

	saveSettings(db, alice, { currency: 'IDR', startDay: '0' });

	expect(readSettings(db, alice).startDay).toBe(1);
});
