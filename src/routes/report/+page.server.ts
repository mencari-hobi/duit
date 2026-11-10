import { database } from '#lib/server/db.ts';
import { loadReport } from '#lib/server/report.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	report: loadReport(database(), signedInUser(locals).id)
});
