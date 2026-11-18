import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = Database.Database;

export function openDatabase(path: string): Db {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	const exists = (name: string) =>
		db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;
	for (const [old, renamed] of [['entries', 'diary_entries'], ['assets', 'diary_assets']]) {
		if (exists(old) && !exists(renamed)) db.exec(`ALTER TABLE ${old} RENAME TO ${renamed}`);
	}
	db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL UNIQUE COLLATE NOCASE,
			password_hash TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS settings (
			user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			currency TEXT NOT NULL,
			start_day INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS diary_entries (
			id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
			date TEXT NOT NULL,
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			category TEXT NOT NULL,
			expense_type TEXT,
			owner TEXT,
			note TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS diary_assets (
			id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			date TEXT NOT NULL,
			name TEXT NOT NULL,
			class TEXT NOT NULL,
			value REAL NOT NULL,
			currency TEXT NOT NULL,
			source TEXT,
			term TEXT,
			acquisition REAL,
			note TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS plan_entries (
			id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			timeframe TEXT NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
			category TEXT NOT NULL,
			expense_type TEXT,
			owner TEXT,
			note TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS plan_savings (
			id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			dream TEXT NOT NULL,
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			months INTEGER NOT NULL CHECK (months >= 1)
		);
		CREATE TABLE IF NOT EXISTS plan_debts (
			id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			category TEXT NOT NULL,
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			start TEXT NOT NULL,
			end TEXT NOT NULL
		);
	`);
	const columns = db.prepare('PRAGMA table_info(diary_assets)').all() as { name: string }[];
	const added = {
		sale_id: 'INTEGER REFERENCES diary_entries(id) ON DELETE CASCADE',
		weight: 'REAL',
		price: 'REAL',
		code: 'TEXT',
		unit: 'REAL',
		unit_currency: 'TEXT'
	};
	for (const [name, type] of Object.entries(added)) {
		if (!columns.some((column) => column.name === name)) db.exec(`ALTER TABLE diary_assets ADD COLUMN ${name} ${type}`);
	}
	codeOldAssets(db);
	return db;
}

const renamedTypes = { Investments: 'Mutual Fund', Goldbar: 'Gold', Property: 'Property & Land' };

export function nextAssetCode(db: Db, userId: number) {
	const row = db
		.prepare("SELECT max(CAST(substr(code, 5) AS INTEGER)) AS last FROM diary_assets WHERE user_id = ? AND code IS NOT NULL")
		.get(userId) as { last: number | null };
	return `AST-${String((row.last ?? 0) + 1).padStart(4, '0')}`;
}

function codeOldAssets(db: Db) {
	db.transaction(() => {
		for (const [old, renamed] of Object.entries(renamedTypes)) {
			db.prepare('UPDATE diary_assets SET class = ? WHERE class = ?').run(renamed, old);
		}
		db.exec("UPDATE diary_assets SET unit = weight WHERE class = 'Gold' AND unit IS NULL AND weight IS NOT NULL");
		const uncoded = db
			.prepare(
				`SELECT user_id AS userId, name FROM diary_assets
				WHERE code IS NULL AND class != 'Liability'
				GROUP BY user_id, name ORDER BY user_id, min(date), min(id)`
			)
			.all() as { userId: number; name: string }[];
		const assign = db.prepare(
			"UPDATE diary_assets SET code = ? WHERE user_id = ? AND name = ? AND code IS NULL AND class != 'Liability'"
		);
		for (const { userId, name } of uncoded) assign.run(nextAssetCode(db, userId), userId, name);
	})();
}

let shared: Db | undefined;

export function database(): Db {
	shared ??= openDatabase(process.env.DATABASE_PATH ?? 'data/duit.db');
	return shared;
}
