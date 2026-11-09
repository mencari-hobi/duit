import { submitAccount } from '#lib/server/account-form.ts';
import { login } from '#lib/server/auth.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: ({ request, cookies }) => submitAccount(request, cookies, login)
};
