import { readFile, writeFile } from 'fs/promises';
import { json } from '@sveltejs/kit';
import * as yaml from 'js-yaml';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	// clients that were not given the token (see +page.server.ts) must not erase it
	if (body && typeof body === 'object' && !('token' in body)) {
		try {
			const current = yaml.load(await readFile('data/configuration.yaml', 'utf8')) as any;
			if (current?.token) body.token = current.token;
		} catch {
			// no existing configuration
		}
	}

	let data;
	try {
		data = yaml.dump(body);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON - cannot convert to YAML' }), {
			status: 400
		});
	}

	try {
		await writeFile('data/configuration.yaml', data);
		return json({ action: 'saved' });
	} catch (error) {
		return new Response(JSON.stringify({ error: error }), {
			status: 400
		});
	}
};
