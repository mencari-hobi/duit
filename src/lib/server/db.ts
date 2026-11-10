import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = Database.Database;

export function openDatabase(path: string): Db {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
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
		CREATE TABLE IF NOT EXISTS entries (
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
		CREATE TABLE IF NOT EXISTS assets (
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
	`);
	const columns = db.prepare('PRAGMA table_info(assets)').all() as { name: string }[];
	const added = { sale_id: 'INTEGER REFERENCES entries(id) ON DELETE CASCADE', weight: 'REAL', price: 'REAL' };
	for (const [name, type] of Object.entries(added)) {
		if (!columns.some((column) => column.name === name)) db.exec(`ALTER TABLE assets ADD COLUMN ${name} ${type}`);
	}
	return db;
}

let shared: Db | undefined;

export function database(): Db {
	shared ??= openDatabase(process.env.DATABASE_PATH ?? 'data/duit.db');
	return shared;
}
