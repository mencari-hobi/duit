import { redirect } from '@sveltejs/kit';
import { endSession } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	return { user: locals.user };
};

export const actions: Actions = {
	logout: ({ cookies }) => {
		endSession(cookies);
		redirect(303, '/login');
	}
};
