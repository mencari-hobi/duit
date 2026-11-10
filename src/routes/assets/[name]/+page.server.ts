import { error, fail, redirect } from '@sveltejs/kit';
import { addValuation, assetPage, deleteValuation, saveDetails, saveValuation, valuationForm } from '#lib/server/assets.ts';
import { database } from '#lib/server/db.ts';
import { formValues } from '#lib/server/form-values.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, url }) => {
	const user = signedInUser(locals);
	const asset = assetPage(database(), user.id, params.name);
	if (!asset) error(404, 'Asset not found');
	const key = url.searchParams.get('edit');
	const editing = key ? valuationForm(database(), user.id, params.name, key) : null;
	if (key && !editing) error(404, 'Valuation not found');
	return { asset, editing };
};

const here = (name: string) => `/assets/${encodeURIComponent(name)}`;

export const actions: Actions = {
	valuation: async ({ locals, params, request }) => {
		const fields = await formValues(request);
		const userId = signedInUser(locals).id;
		const result = fields.id
			? saveValuation(database(), userId, params.name, fields)
			: addValuation(database(), userId, params.name, fields);
		if ('missing' in result) error(404, 'Asset not found');
		if ('message' in result) return fail(400, { form: 'valuation', error: result.message, field: result.field, values: fields });
		redirect(303, here(params.name));
	},
	delete: async ({ locals, params, request }) => {
		const fields = await formValues(request);
		deleteValuation(database(), signedInUser(locals).id, params.name, fields.id);
		redirect(303, assetPage(database(), signedInUser(locals).id, params.name) ? here(params.name) : '/assets');
	},
	details: async ({ locals, params, request }) => {
		const fields = await formValues(request);
		const result = saveDetails(database(), signedInUser(locals).id, params.name, fields);
		if ('message' in result) return fail(400, { form: 'details', error: result.message, field: result.field, values: fields });
		redirect(303, here(result.name));
	}
};
