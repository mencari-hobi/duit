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
