import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, expect, inject, test } from 'vitest';
import { registered } from './app';

const baseUrl = inject('baseUrl');
const phoneWidth = 360;

let browser: Browser;

beforeAll(async () => {
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser.close();
});

async function openOnPhone(path: string, cookie = '') {
	const context = await browser.newContext({ viewport: { width: phoneWidth, height: 640 } });
	if (cookie) {
		const split = cookie.indexOf('=');
		await context.addCookies([
			{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url: baseUrl }
		]);
	}
	const page = await context.newPage();
	await page.goto(`${baseUrl}${path}`);
	return page;
}

function pageWidth(page: Page) {
	return page.evaluate(() => document.documentElement.scrollWidth);
}

async function expectWholeOnScreen(page: Page, button: string) {
	const box = (await page.getByRole('button', { name: button }).boundingBox())!;
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(phoneWidth);
}

test(
	'the login page fits a 360 px wide screen and shows the whole "Log in" button',
	{ meta: { scenario: 'S17' } },
	async () => {
		const page = await openOnPhone('/login');

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
		await expectWholeOnScreen(page, 'Log in');
	}
);

test(
	'the home page fits a 360 px wide screen and shows the whole "Log out" button',
	{ meta: { scenario: 'S18' } },
	async () => {
		const { cookie } = await registered();

		const page = await openOnPhone('/', cookie);

		expect(await pageWidth(page)).toBeLessThanOrEqual(phoneWidth);
		await expectWholeOnScreen(page, 'Log out');
	}
);
