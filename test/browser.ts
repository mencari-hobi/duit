import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, inject } from 'vitest';

const baseUrl = inject('baseUrl');

let browser: Browser;

beforeAll(async () => {
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser.close();
});

export async function openPage(path: string, cookie = '', width = 1280) {
	const context = await browser.newContext({
		viewport: { width, height: 800 },
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	});
	if (cookie) {
		const split = cookie.indexOf('=');
		await context.addCookies([
			{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url: baseUrl }
		]);
	}
	const page = await context.newPage();
	await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
	return page;
}
