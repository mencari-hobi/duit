import { database } from '#lib/server/db.ts';
import { readSettings } from '#lib/server/settings.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) return { user: null, settings: null };
	return { user: locals.user, settings: readSettings(database(), locals.user.id) };
};
