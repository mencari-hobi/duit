export function group(text: string) {
	const [whole, ...decimals] = text.replace(/[^\d,]/g, '').split(',');
	const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return decimals.length ? `${grouped},${decimals.join('')}` : grouped;
}

export function regroup(input: HTMLInputElement) {
	const caret = input.selectionStart ?? input.value.length;
	const kept = input.value.slice(0, caret).replace(/[^\d,]/g, '').length;
	const text = group(input.value);
	input.value = text;
	let at = 0;
	for (let seen = 0; at < text.length && seen < kept; at++) if (text[at] !== '.') seen++;
	input.setSelectionRange(at, at);
	return text;
}

export function parseAmount(text: string) {
	if (!/^\d{1,3}(\.?\d{3})*(,\d+)?$/.test(text)) return null;
	return Number(text.replaceAll('.', '').replace(',', '.'));
}

const sizes = ['text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg'];

export function sizeOf(text: string) {
	const step = [9, 13, 17, 21].findIndex((most) => text.length <= most);
	return sizes[step === -1 ? sizes.length - 1 : step];
}
