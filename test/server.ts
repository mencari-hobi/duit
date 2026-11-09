import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		baseUrl: string;
		databasePath: string;
	}
}

function freePort(): Promise<number> {
	return new Promise((resolve) => {
		const server = createServer().listen(0, () => {
			const { port } = server.address() as { port: number };
			server.close(() => resolve(port));
		});
	});
}

async function waitFor(url: string) {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			await fetch(url);
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
	throw new Error(`${url} never answered`);
}

export default async function setup(project: TestProject) {
	execFileSync('pnpm', ['exec', 'vite', 'build'], { stdio: 'ignore' });
	const dir = mkdtempSync(join(tmpdir(), 'duit-'));
	const databasePath = join(dir, 'duit.db');
	const port = await freePort();
	const server = spawn('node', ['build'], {
		env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath },
		stdio: 'inherit'
	});
	const baseUrl = `http://localhost:${port}`;
	await waitFor(`${baseUrl}/login`);
	project.provide('baseUrl', baseUrl);
	project.provide('databasePath', databasePath);
	return () => {
		server.kill();
		rmSync(dir, { recursive: true, force: true });
	};
}
