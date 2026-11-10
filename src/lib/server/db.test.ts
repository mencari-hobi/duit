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
	const columns = (db.prepare('PRAGMA table_info(assets)').all() as { name: string }[]).map((column) => column.name);
	db.close();

	expect(columns).toEqual(expect.arrayContaining(['sale_id', 'weight', 'price']));
});
