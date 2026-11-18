export const assetTypes = [
	{ name: 'Cash', unit: null },
	{ name: 'Term Deposit', unit: null },
	{ name: 'Foreign Exchanges', unit: null },
	{ name: 'Mutual Fund', unit: 'unit' },
	{ name: 'Bond', unit: null },
	{ name: 'Stock', unit: 'lot' },
	{ name: 'Gold', unit: 'gr' },
	{ name: 'Property & Land', unit: 'sqm' },
	{ name: 'Other', unit: 'unit' }
];

export const typeNames = assetTypes.map((type) => type.name);

export const liquidTypes = ['Cash', 'Term Deposit', 'Foreign Exchanges', 'Mutual Fund'];

export const unitOf = (type: string) => assetTypes.find((found) => found.name === type)?.unit ?? null;

export const sources = ['Salary', 'Freelance', 'Dividend', 'Bonus', 'Other', 'Debt'];

export const assetLabel = (code: string | null | undefined, name: string | null | undefined) =>
	code ? (name ? `${code} · ${name}` : code) : (name ?? '');
