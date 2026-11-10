import { listAssets } from '#lib/server/assets.ts';
import { database } from '#lib/server/db.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => listAssets(database(), signedInUser(locals).id);
