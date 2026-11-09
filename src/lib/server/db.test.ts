import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { database } from './db';

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
