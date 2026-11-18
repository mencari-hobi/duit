export const capitalize = (name: string) =>
	name
		.toLowerCase()
		.replace(/(^|[ /])(\S)/g, (_, gap: string, letter: string) => gap + letter.toUpperCase())
		.replace(/ Of(?= )/g, ' of');

export const sale = 'sales of asset';

export const expenseTypes = ['Fixed - Essential', 'Non-fixed - Essential', 'Fixed - Non-essential', 'Non-fixed - Non-essential'];

export const owners = ['Personal', 'Children', 'Spouse', 'Family', 'Extended Family', 'Friends', 'Other'];

export const expenseDefaults: Record<string, string> = {
	grocery: 'Non-fixed - Essential',
	'eating out': 'Non-fixed - Non-essential',
	electricity: 'Non-fixed - Essential',
	'gasoline & tolls': 'Non-fixed - Essential',
	'school tuition': 'Fixed - Essential',
	'phone credit': 'Fixed - Essential',
	internet: 'Fixed - Essential',
	'self care/entertainment': 'Non-fixed - Non-essential',
	clothes: 'Non-fixed - Non-essential',
	'sports/gym': 'Fixed - Non-essential',
	healthcare: 'Non-fixed - Essential',
	courses: 'Non-fixed - Non-essential',
	'gift & charity': 'Non-fixed - Non-essential',
	'house maintenance': 'Non-fixed - Essential',
	'car maintenance': 'Non-fixed - Essential',
	housekeeping: 'Fixed - Non-essential',
	'birthday/anniversary/holiday': 'Non-fixed - Non-essential'
};
