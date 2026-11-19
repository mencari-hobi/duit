import Database from 'better-sqlite3';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { database, openDatabase } from './db';

const cwd = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'duit-db-'));

afterEach(() => {
	database().close();
	process.chdir(cwd);
	vi.unstubAllEnvs();
	rmSync(dir, { recursive: true, force: true });
});

test('the database opens at data/duit.db under the working directory when DATABASE_PATH is unset', () => {
	vi.stubEnv('DATABASE_PATH', undefined);
	process.chdir(dir);

	database();

	expect(existsSync(join(dir, 'data', 'duit.db'))).toBe(true);
});

test('a database file opens a second time without an error', () => {
	const path = join(dir, 'reopened.db');
	openDatabase(path).close();

	const reopened = () => openDatabase(path).close();

	expect(reopened).not.toThrow();
});

const tables = (db: Database.Database) =>
	(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
		(table) => table.name
	);

test('a database written before goldbars gains the weight and price columns when it opens', () => {
	const path = join(dir, 'before-goldbar.db');
	mkdirSync(dir, { recursive: true });
	const old = new Database(path);
	old.exec(`CREATE TABLE assets (
		id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, date TEXT NOT NULL, name TEXT NOT NULL,
		class TEXT NOT NULL, value REAL NOT NULL, currency TEXT NOT NULL, source TEXT, term TEXT,
		acquisition REAL, note TEXT NOT NULL, sale_id INTEGER REFERENCES entries(id) ON DELETE CASCADE
	)`);
	old.close();

	const db = openDatabase(path);
	const columns = (db.prepare('PRAGMA table_info(diary_assets)').all() as { name: string }[]).map(
		(column) => column.name
	);
	db.close();

	expect(columns).toEqual(expect.arrayContaining(['sale_id', 'weight', 'price']));
});

test(
	'a new database has the diary and plan tables and lacks entries and assets',
	{ meta: { scenario: 'S148' } },
	() => {
		const db = openDatabase(':memory:');

		const names = tables(db);

		expect(names).toEqual(expect.arrayContaining(['diary_entries', 'diary_assets', 'plan_entries']));
		expect(names).not.toContain('entries');
		expect(names).not.toContain('assets');
	}
);

test(
	'opening a database with entries and assets moves every row into the diary tables, and a sale keeps its asset link',
	{ meta: { scenario: 'S149' } },
	() => {
		const path = join(dir, 'before-rename.db');
		mkdirSync(dir, { recursive: true });
		openDatabase(path).close();
		const old = new Database(path);
		old.exec(`
			ALTER TABLE diary_entries RENAME TO entries;
			ALTER TABLE diary_assets RENAME TO assets;
			DROP TABLE plan_entries;
			INSERT INTO users (id, name, password_hash) VALUES (1, 'alice', 'x');
			INSERT INTO entries (id, user_id, kind, date, amount, currency, category, note)
				VALUES (7, 1, 'income', '2026-11-03', 150000000, 'IDR', 'sales of asset', 'Sale of Car');
			INSERT INTO assets (user_id, date, name, class, value, currency, acquisition, note, sale_id)
				VALUES (1, '2026-11-03', 'Car', 'Property', 0, 'IDR', 0, '', 7);
		`);
		old.close();

		const db = openDatabase(path);
		const entries = db.prepare('SELECT id, category FROM diary_entries').all();
		db.prepare('DELETE FROM diary_entries WHERE id = 7').run();
		const assetsLeft = db.prepare('SELECT count(*) AS count FROM diary_assets').get();
		const names = tables(db);
		db.close();

		expect(entries).toEqual([{ id: 7, category: 'sales of asset' }]);
		expect(assetsLeft).toEqual({ count: 0 });
		expect(names).not.toContain('entries');
		expect(names).not.toContain('assets');
	}
);

const withOldAssets = (rows: [string, string, string][]) => {
	const path = join(dir, `old-assets-${rows.length}.db`);
	mkdirSync(dir, { recursive: true });
	const old = new Database(path);
	old.exec(`
		CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL);
		CREATE TABLE diary_assets (
			id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, date TEXT NOT NULL, name TEXT NOT NULL,
			class TEXT NOT NULL, value REAL NOT NULL, currency TEXT NOT NULL, source TEXT, term TEXT,
			acquisition REAL, note TEXT NOT NULL
		);
		INSERT INTO users (id, name, password_hash) VALUES (1, 'alice', 'x');
	`);
	const insert = old.prepare(
		`INSERT INTO diary_assets (user_id, date, name, class, value, currency, acquisition, note) VALUES (1, ?, ?, ?, 1, 'IDR', 1, '')`
	);
	for (const [date, name, cls] of rows) insert.run(date, name, cls);
	old.close();
	return openDatabase(path);
};

test(
	'opening a database with investments, goldbar, and property assets moves them to the spec types',
	{ meta: { scenario: 'S209' } },
	() => {
		const db = withOldAssets([
			['2026-10-01', 'Fund', 'Investments'],
			['2026-10-02', 'Antam', 'Goldbar'],
			['2026-10-03', 'House', 'Property']
		]);

		const classes = db.prepare('SELECT name, class FROM diary_assets ORDER BY id').all();
		db.close();

		expect(classes).toEqual([
			{ name: 'Fund', class: 'Mutual Fund' },
			{ name: 'Antam', class: 'Gold' },
			{ name: 'House', class: 'Property & Land' }
		]);
	}
);

test(
	'opening a database with savings account and car codes them in order of their first date, each update sharing its code',
	{ meta: { scenario: 'S210' } },
	() => {
		const db = withOldAssets([
			['2026-11-01', 'Car', 'Other'],
			['2026-10-01', 'Savings account', 'Cash'],
			['2026-11-05', 'Savings account', 'Cash'],
			['2026-11-06', 'Mortgage loan', 'Liability']
		]);

		const codes = db.prepare('SELECT name, code FROM diary_assets ORDER BY id').all();
		db.close();

		expect(codes).toEqual([
			{ name: 'Car', code: 'AST-0002' },
			{ name: 'Savings account', code: 'AST-0001' },
			{ name: 'Savings account', code: 'AST-0001' },
			{ name: 'Mortgage loan', code: null }
		]);
	}
);

test(
	'opening on 2026/11/19 a database whose dream house lacks a start date stores start saving 2026/11/19',
	{ meta: { scenario: 'S272' } },
	() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 19, 9));
		const path = join(mkdtempSync(join(tmpdir(), 'duit-dream-')), 'old.db');
		const old = new Database(path);
		old.exec(`
			CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
			CREATE TABLE plan_savings (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, dream TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, months INTEGER NOT NULL CHECK (months >= 1));
			INSERT INTO users (id, name, password_hash) VALUES (1, 'alice', 'x');
			INSERT INTO plan_savings (user_id, dream, amount, currency, months) VALUES (1, 'House', 120000000, 'IDR', 24);
		`);
		old.close();

		const db = openDatabase(path);
		const dreams = db.prepare('SELECT dream, start FROM plan_savings').all();
		db.close();
		vi.useRealTimers();

		expect(dreams).toEqual([{ dream: 'House', start: '2026-11-19' }]);
	}
);
