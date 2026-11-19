import { error } from '@sveltejs/kit';
import { isoDate } from '#lib/date.ts';
import { database } from '#lib/server/db.ts';
import { todayIso } from '#lib/server/debts.ts';
import { loadReport } from '#lib/server/report.ts';
import { signedInUser } from '#lib/server/session.ts';
import { periodOf, periods, saveNotes, spendingReport } from '#lib/server/spending.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const userId = signedInUser(locals).id;
	if (url.searchParams.get('view') === 'monthly') return { view: 'monthly' as const, report: loadReport(database(), userId) };
	const query = Object.fromEntries(['period', 'date', 'from', 'to'].map((name) => [name, url.searchParams.get(name) ?? '']));
	const chosen = periodOf(database(), userId, query, todayIso());
	return {
		view: 'spending' as const,
		periods,
		chosen,
		spending: chosen.start && chosen.end ? spendingReport(database(), userId, chosen.start, chosen.end) : null
	};
};

export const actions: Actions = {
	notes: async ({ locals, request }) => {
		const fields = Object.fromEntries([...(await request.formData())].map(([name, value]) => [name, String(value)]));
		const start = isoDate(fields.start ?? '');
		const end = isoDate(fields.end ?? '');
		if (!start || !end || end < start) error(400, 'Pick a period.');
		saveNotes(database(), signedInUser(locals).id, start, end, fields);
		return { saved: true };
	}
};
