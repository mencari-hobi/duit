import { database } from '#lib/server/db.ts';
import { deleteRecord, listRecords, wipeRecords } from '#lib/server/records.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	records: listRecords(database(), signedInUser(locals).id)
});

export const actions: Actions = {
	delete: async ({ locals, request }) => {
		const form = await request.formData();
		deleteRecord(database(), signedInUser(locals).id, String(form.get('id')));
	},
	wipe: ({ locals }) => {
		wipeRecords(database(), signedInUser(locals).id);
	}
};
