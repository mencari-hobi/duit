import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';

const baseUrl = inject('baseUrl');

export const uniqueName = () => `user${randomUUID().slice(0, 8)}`;

export function get(path: string, cookie = '') {
	return fetch(`${baseUrl}${path}`, { headers: { cookie }, redirect: 'manual' });
}

export function post(path: string, fields: Record<string, string>, cookie = '') {
	return fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: {
			cookie,
			accept: 'text/html',
			origin: baseUrl.replace('http:', 'https:'),
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams(fields),
		redirect: 'manual'
	});
}

export function sessionSetCookie(response: Response) {
	return response.headers.getSetCookie().find((cookie) => cookie.startsWith('session='));
}

export function sessionCookie(response: Response) {
	return sessionSetCookie(response)?.split(';')[0] ?? '';
}

export async function registered(name = uniqueName()) {
	const response = await post('/register', { name, password: 'password1' });
	return { name, cookie: sessionCookie(response) };
}
