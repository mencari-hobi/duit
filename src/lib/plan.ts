export const timeframes = [
	{ value: 'daily', label: 'Daily', unit: 'day', perMonth: 30 },
	{ value: 'weekly', label: 'Weekly', unit: 'week', perMonth: 4 },
	{ value: 'monthly', label: 'Monthly', unit: 'month', perMonth: 1 },
	{ value: 'quarterly', label: 'Quarterly', unit: 'quarter', perMonth: 1 / 3 },
	{ value: 'annually', label: 'Annually', unit: 'year', perMonth: 1 / 12 }
];

export const timeframe = (value: string | null | undefined) =>
	timeframes.find((found) => found.value === value) ?? timeframes[2];

export const planIncomeCategories = ['Salary', 'Freelance', 'Dividend', 'Bonus', 'Other'];

export const debtCategories = ['Credit card', 'Mortgage', 'Car installment', 'Non-collateral loan', 'Other loan'];

export const tabs = [
	{ value: 'income', label: 'Income' },
	{ value: 'expense', label: 'Expense' },
	{ value: 'saving', label: 'Saving' },
	{ value: 'debt', label: 'Debt payment' },
	{ value: 'budget', label: 'View budget' }
];

export const ratioPercent = (value: number | null) => (value === null ? '–' : `${(value * 100).toFixed(1)}%`);
