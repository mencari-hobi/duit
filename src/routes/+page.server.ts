import { fail, redirect } from '@sveltejs/kit';
import { database } from '#lib/server/db.ts';
import { endSession, signedInUser } from '#lib/server/session.ts';
import { loadDashboard } from '#lib/server/dashboard.ts';
import { saveSettings } from '#lib/server/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const user = signedInUser(locals);
	const range = (name: string) => url.searchParams.get(name) ?? '';
	return { user, dashboard: loadDashboard(database(), user.id, range('from'), range('to')) };
};

export const actions: Actions = {
	logout: ({ cookies }) => {
		endSession(cookies);
		redirect(303, '/login');
	},
	settings: async ({ locals, request }) => {
		const form = await request.formData();
		const result = saveSettings(database(), signedInUser(locals).id, {
			currency: String(form.get('currency')),
			startDay: String(form.get('startDay'))
		});
		if ('message' in result) return fail(400, { currency: result.message });
	}
};
