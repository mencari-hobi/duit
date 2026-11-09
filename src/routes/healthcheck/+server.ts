import { database } from '#lib/server/db.ts';

export function GET() {
	database().prepare('SELECT 1').get();
	return new Response('OK');
}
