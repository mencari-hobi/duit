import { redirect, type Cookies } from '@sveltejs/kit';
import { createSession, deleteSession, SESSION_SECONDS, sessionUser } from './auth';
import { database } from './db';

const COOKIE = 'session';

export function startSession(cookies: Cookies, userId: number) {
	cookies.set(COOKIE, createSession(database(), userId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: SESSION_SECONDS
	});
}

export function currentUser(cookies: Cookies) {
	const token = cookies.get(COOKIE);
	return token ? sessionUser(database(), token) : null;
}

export function signedInUser(locals: App.Locals) {
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

export function endSession(cookies: Cookies) {
	const token = cookies.get(COOKIE);
	if (token) deleteSession(database(), token);
	cookies.delete(COOKIE, { path: '/' });
}
