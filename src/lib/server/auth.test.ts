import { beforeEach, expect, test } from 'vitest';
import { login, register } from './auth';
import { openDatabase, type Db } from './db';

let db: Db;

beforeEach(() => {
	db = openDatabase(':memory:');
});

const accountCount = () => (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;

test(
	'registering a name in use is refused as taken and adds no account',
	{ meta: { scenario: 'S6' } },
	() => {
		register(db, 'alice', 'password1');

		const result = register(db, 'alice', 'password2');

		expect(result).toEqual({ message: 'That name is taken.' });
		expect(accountCount()).toBe(1);
	}
);

test(
	'registering a name differing only in case from an existing account is refused as taken',
	{ meta: { scenario: 'S7' } },
	() => {
		register(db, 'alice', 'password1');

		const result = register(db, 'ALICE', 'password1');

		expect(result).toEqual({ message: 'That name is taken.' });
	}
);

test(
	'registering with a blank name is refused and adds no account',
	{ meta: { scenario: 'S8' } },
	() => {
		const result = register(db, '   ', 'password1');

		expect(result).toEqual({ message: 'Name is required.' });
		expect(accountCount()).toBe(0);
	}
);

test(
	'registering with a 7-character password is refused and adds no account',
	{ meta: { scenario: 'S9' } },
	() => {
		const result = register(db, 'alice', 'abc1234');

		expect(result).toEqual({ message: 'Password must be at least 8 characters.' });
		expect(accountCount()).toBe(0);
	}
);

test(
	'the account row stored on registering lacks the typed password',
	{ meta: { scenario: 'S10' } },
	() => {
		register(db, 'alice', 'secret-password');

		const row = db.prepare('SELECT * FROM users').get();

		expect(JSON.stringify(row)).not.toContain('secret-password');
	}
);

test(
	'logging in with a registered name and a wrong password is refused',
	{ meta: { scenario: 'S12' } },
	() => {
		register(db, 'alice', 'password1');

		const result = login(db, 'alice', 'password2');

		expect(result).toEqual({ message: 'Wrong name or password.' });
	}
);

test(
	'logging in with an unregistered name is refused',
	{ meta: { scenario: 'S13' } },
	() => {
		const result = login(db, 'nobody', 'password1');

		expect(result).toEqual({ message: 'Wrong name or password.' });
	}
);
