import { fail } from '@sveltejs/kit';
import { database } from '#lib/server/db.ts';
import { addEntry, entryCategories } from '#lib/server/entries.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	categories: entryCategories(database(), signedInUser(locals).id)
});

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const values = Object.fromEntries(
			[...(await request.formData())].map(([name, value]) => [name, String(value)])
		);
		const result = addEntry(database(), signedInUser(locals).id, values);
		if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
		const { type, date, category, currency, cls } = values;
		return { added: true, values: { type, date, category, currency, cls } };
	}
};
