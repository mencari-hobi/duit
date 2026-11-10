export const capitalize = (name: string) =>
	name.toLowerCase().replace(/(^|[ /])(\S)/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());
