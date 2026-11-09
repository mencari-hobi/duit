import type { Cookies } from '@sveltejs/kit';
import { beforeEach, expect, test, vi } from 'vitest';
import { submitAccount } from './account-form';
import { register } from './auth';

beforeEach(() => {
	vi.stubEnv('DATABASE_PATH', ':memory:');
});

const submitted = (fields: Record<string, string>) =>
	new Request('http://localhost/register', { method: 'POST', body: new URLSearchParams(fields) });

const cookiesUnused = {} as Cookies;

test('submitting a form without a name field is refused as a blank name', async () => {
	const result = await submitAccount(submitted({ password: 'password1' }), cookiesUnused, register);

	expect(result).toMatchObject({ status: 400, data: { name: '', message: 'Name is required.' } });
});

test('submitting a form without a password field is refused as a short password', async () => {
	const result = await submitAccount(submitted({ name: 'alice' }), cookiesUnused, register);

	expect(result).toMatchObject({
		status: 400,
		data: { name: 'alice', message: 'Password must be at least 8 characters.' }
	});
});
