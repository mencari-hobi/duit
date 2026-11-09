import type { Handle } from '@sveltejs/kit/hooks';
import { currentUser } from '#lib/server/session.ts';

export const handle: Handle = ({ event, resolve }) => {
	event.locals.user = currentUser(event.cookies);
	return resolve(event);
};
