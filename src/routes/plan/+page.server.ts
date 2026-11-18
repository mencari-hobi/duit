import { error, fail, redirect } from '@sveltejs/kit';
import { database } from '#lib/server/db.ts';
import { budget, deletePlanItem, editablePlanItem, savePlanItem } from '#lib/server/plan.ts';
import { readSettings } from '#lib/server/settings.ts';
import { signedInUser } from '#lib/server/session.ts';
import { tabs, timeframe } from '#lib/plan.ts';
import type { Actions, PageServerLoad } from './$types';

const localDay = () => {
	const now = new Date();
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const load: PageServerLoad = ({ locals, url }) => {
	const user = signedInUser(locals);
	const key = url.searchParams.get('edit');
	const editing = key ? editablePlanItem(database(), user.id, key) : null;
	if (key && !editing) error(404, 'Plan item not found');
	const view = timeframe(url.searchParams.get('view')).value;
	const { currency } = readSettings(database(), user.id);
	return {
		tab: editing?.tab ?? tabs.find((item) => item.value === url.searchParams.get('tab'))?.value ?? 'income',
		view,
		editing,
		budget: budget(database(), user.id, currency, view, localDay())
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const values = Object.fromEntries(
			[...(await request.formData())].map(([name, value]) => [name, String(value)])
		);
		const result = savePlanItem(database(), signedInUser(locals).id, values);
		if ('missing' in result) error(404, 'Plan item not found');
		if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
		if (values.id) redirect(303, '/plan?tab=budget');
		const { tab, currency, timeframe } = values;
		return { added: true, values: { tab, currency, timeframe } };
	},
	delete: async ({ locals, request }) => {
		const form = await request.formData();
		deletePlanItem(database(), signedInUser(locals).id, String(form.get('id')));
	}
};
