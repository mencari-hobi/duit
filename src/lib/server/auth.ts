import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Db } from './db';

export type User = { id: number; name: string };

export type AuthResult = { user: User } | { message: string };

export const SESSION_SECONDS = 30 * 24 * 60 * 60;

const KEY_BYTES = 64;

function hashPassword(password: string) {
	const salt = randomBytes(16);
	return `${salt.toString('hex')}:${scryptSync(password, salt, KEY_BYTES).toString('hex')}`;
}

function verifyPassword(password: string, stored: string) {
	const [salt, hash] = stored.split(':');
	return timingSafeEqual(scryptSync(password, Buffer.from(salt, 'hex'), KEY_BYTES), Buffer.from(hash, 'hex'));
}

export function register(db: Db, rawName: string, password: string): AuthResult {
	const name = rawName.trim();
	if (!name) return { message: 'Name is required.' };
	if (password.length < 8) return { message: 'Password must be at least 8 characters.' };
	if (db.prepare('SELECT 1 FROM users WHERE name = ?').get(name)) {
		return { message: 'That name is taken.' };
	}
	const { lastInsertRowid } = db
		.prepare('INSERT INTO users (name, password_hash) VALUES (?, ?)')
		.run(name, hashPassword(password));
	return { user: { id: Number(lastInsertRowid), name } };
}

export function login(db: Db, rawName: string, password: string): AuthResult {
	const row = db
		.prepare('SELECT id, name, password_hash FROM users WHERE name = ?')
		.get(rawName.trim()) as (User & { password_hash: string }) | undefined;
	if (!row || !verifyPassword(password, row.password_hash)) {
		return { message: 'Wrong name or password.' };
	}
	return { user: { id: row.id, name: row.name } };
}

const sessionId = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(db: Db, userId: number) {
	const token = randomBytes(32).toString('base64url');
	db.prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)').run(
		sessionId(token),
		userId,
		Date.now()
	);
	return token;
}

export function sessionUser(db: Db, token: string): User | null {
	const row = db
		.prepare(
			`SELECT users.id, users.name FROM sessions JOIN users ON users.id = sessions.user_id
			 WHERE sessions.id = ? AND sessions.created_at > ?`
		)
		.get(sessionId(token), Date.now() - SESSION_SECONDS * 1000) as User | undefined;
	return row ?? null;
}

export function deleteSession(db: Db, token: string) {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId(token));
}
