import { fail, redirect, type Cookies } from '@sveltejs/kit';
import type { AuthResult } from './auth';
import { database, type Db } from './db';
import { startSession } from './session';

type Step = (db: Db, name: string, password: string) => AuthResult;

export async function submitAccount(request: Request, cookies: Cookies, step: Step) {
	const form = await request.formData();
	const name = String(form.get('name') ?? '');
	const result = step(database(), name, String(form.get('password') ?? ''));
	if ('message' in result) return fail(400, { name, message: result.message });
	startSession(cookies, result.user.id);
	redirect(303, '/');
}
