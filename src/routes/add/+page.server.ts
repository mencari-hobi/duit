import { error, fail, redirect } from '@sveltejs/kit';
import { database } from '#lib/server/db.ts';
import { entryCategories, heldAssets, saveEntry } from '#lib/server/entries.ts';
import { formValues } from '#lib/server/form-values.ts';
import { editableRecord } from '#lib/server/records.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const user = signedInUser(locals);
	const key = url.searchParams.get('edit');
	const editing = key ? editableRecord(database(), user.id, key) : null;
	if (key && !editing) error(404, 'Entry not found');
	return { categories: entryCategories(database(), user.id), held: heldAssets(database(), user.id), editing };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const values = await formValues(request);
		const result = saveEntry(database(), signedInUser(locals).id, values);
		if ('missing' in result) error(404, 'Entry not found');
		if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
		if (values.id) redirect(303, '/records');
		const { type, date, category, currency, cls } = values;
		return { added: true, values: { type, date, category, currency, cls } };
	}
};
