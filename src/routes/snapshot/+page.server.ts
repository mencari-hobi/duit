import { database } from '#lib/server/db.ts';
import { todayIso } from '#lib/server/debts.ts';
import { loadReport } from '#lib/server/report.ts';
import { signedInUser } from '#lib/server/session.ts';
import { periodOf, periods, spendingReport } from '#lib/server/spending.ts';
import type { PageServerLoad } from './$types';

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
