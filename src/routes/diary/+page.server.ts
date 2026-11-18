import { error, fail, redirect } from '@sveltejs/kit';
import { assetLabel } from '#lib/asset.ts';
import { assetList, heldAssets, savePurchase, saveUpdates } from '#lib/server/assets.ts';
import { database, nextAssetCode } from '#lib/server/db.ts';
import { currentMonth, debtTable, nextDebtCode, reportingMonths, saveDebt, savePayments, todayIso } from '#lib/server/debts.ts';
import { entryCategories, saveEntry } from '#lib/server/entries.ts';
import { planDreams } from '#lib/server/plan.ts';
import { editableRecord } from '#lib/server/records.ts';
import { readSettings } from '#lib/server/settings.ts';
import { signedInUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

const tabs = ['income', 'expense', 'asset', 'debt'];

export const load: PageServerLoad = ({ locals, url }) => {
	const user = signedInUser(locals);
	const key = url.searchParams.get('edit');
	const editing = key ? editableRecord(database(), user.id, key) : null;
	if (key && !editing) error(404, 'Entry not found');
	if (editing?.view === 'list') redirect(303, '/diary?tab=asset&view=list');
	const tab = url.searchParams.get('tab') ?? '';
	const view = url.searchParams.get('view') === 'list' ? 'list' : 'purchase';
	const debtView = url.searchParams.get('view') === 'payments' && !editing ? 'payments' : 'add';
	const filter = url.searchParams.get('type') ?? '';
	const { currency } = readSettings(database(), user.id);
	const today = todayIso();
	const months = debtView === 'payments' ? reportingMonths(database(), user.id, today) : [];
	const asked = url.searchParams.get('month') ?? '';
	const month = months.some((option) => option.value === asked) ? asked : currentMonth(database(), user.id, today);
	return {
		tab: editing?.type === 'debt' ? 'debt' : tabs.includes(tab) ? tab : 'income',
		view,
		debtView,
		filter,
		months,
		month,
		debts: debtView === 'payments' ? debtTable(database(), user.id, month) : null,
		nextDebtCode: nextDebtCode(database(), user.id),
		categories: entryCategories(database(), user.id),
		held: heldAssets(database(), user.id).map((row) => ({ code: row.code, label: assetLabel(row.code, row.name) })),
		nextCode: nextAssetCode(database(), user.id),
		dreams: planDreams(database(), user.id),
		assets: view === 'list' ? assetList(database(), user.id, currency, filter) : null,
		editing
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const values = Object.fromEntries(
			[...(await request.formData())].map(([name, value]) => [name, String(value)])
		);
		const userId = signedInUser(locals).id;
		if (values.type === 'payments') {
			if (!/^\d{4}-\d{2}$/.test(values.month ?? '')) error(400, 'Pick a reporting month.');
			savePayments(database(), userId, values.month, values, todayIso());
			return { paid: true, values: { type: 'debt' } };
		}
		if (values.type === 'debt') {
			const result = saveDebt(database(), userId, values);
			if ('missing' in result) error(404, 'Entry not found');
			if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
			if (values.id) redirect(303, '/records');
			return { saved: result.saved, values: { type: 'debt' } };
		}
		if (values.type === 'updates') {
			const result = saveUpdates(database(), userId, values);
			if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
			return { updated: result.updated, values: { type: 'asset' } };
		}
		if (values.type === 'asset') {
			const result = savePurchase(database(), userId, values);
			if ('missing' in result) error(404, 'Entry not found');
			if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
			if (values.id) redirect(303, '/records');
			return { saved: result.saved, values: { type: 'asset', date: values.date, cls: values.cls, source: values.source, dream: values.dream } };
		}
		const result = saveEntry(database(), userId, values);
		if ('missing' in result) error(404, 'Entry not found');
		if ('message' in result) return fail(400, { error: result.message, field: result.field, values });
		if (values.id) redirect(303, '/records');
		const { type, date, category, currency } = values;
		return { added: true, values: { type, date, category, currency } };
	}
};
