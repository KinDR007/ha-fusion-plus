import { readFile } from 'fs/promises';
import { dev } from '$app/environment';
import * as yaml from 'js-yaml';
import type { Configuration, Dashboard, Translations } from '$lib/Types';
import dotenv from 'dotenv';
import { migrateDashboard, needsMigration } from '$lib/Plus/migrate';

dotenv.config();

/**
 * Loads a yaml/json file and returns parsed data
 */
async function loadFile(file: string) {
	try {
		const data = await readFile(file, 'utf8');
		if (!data.trim()) {
			return {}; // file is empty, early return object
		} else {
			return file.endsWith('.yaml') ? yaml.load(data) : JSON.parse(data);
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			// console.error(`No existing file found for ${file}`);
		} else {
			console.error(`Error reading or parsing ${file}:`, error);
		}
		return {};
	}
}

/**
 * Server load function
 */
export async function load({ request }): Promise<{
	configuration: Configuration;
	dashboard: Dashboard;
	theme: any;
	translations: Translations;
}> {
	// must be loaded first
	const [configuration, loadedDashboard] = await Promise.all([
		loadFile('./data/configuration.yaml'),
		loadFile('./data/dashboard.yaml')
	]);

	// item types of the Svelte 4 fork are converted in memory, the file
	// itself only changes when the dashboard is saved
	let dashboard = loadedDashboard;
	if (needsMigration(loadedDashboard)) {
		const migration = migrateDashboard(loadedDashboard);
		dashboard = migration.dashboard;
		console.log(`dashboard.yaml: migrated ${migration.changes.join(', ')}`);
	}

	// hassUrl from env or server.js
	configuration.hassUrl = process.env.HASS_URL || request.headers.get('X-Proxy-Target');

	// initialize keys if missing
	dashboard.views = dashboard.views || [];
	dashboard.sidebar = dashboard.sidebar || [];

	const dir = dev ? './static' : './build/client';

	// load theme and locale
	const [theme, en, locale] = await Promise.all([
		loadFile(`${dir}/themes/${dashboard.theme || 'godis'}.yaml`),
		loadFile(`${dir}/translations/en.json`),
		configuration?.locale && configuration.locale !== 'en'
			? loadFile(`${dir}/translations/${configuration.locale}.json`)
			: undefined
	]);

	return {
		configuration,
		dashboard,
		theme,
		translations: locale ? { ...locale, _default: en } : en
	};
}
