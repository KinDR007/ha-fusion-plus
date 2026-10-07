import { writable } from 'svelte/store';
import type { Connection } from 'home-assistant-js-websocket';
import { connection } from '$lib/Stores';

/**
 * entity_id -> device_id, from `config/entity_registry/list_for_display`
 * (allowed for non-admin users). Used to pair sensors of one device,
 * e.g. temperature and humidity of a climate sensor.
 */
export const entityDevices = writable<Record<string, string>>({});

let loadedFor: Connection | undefined;

async function load(conn: Connection | undefined) {
	if (!conn || conn === loadedFor) return;
	loadedFor = conn;

	try {
		const result = await conn.sendMessagePromise<{
			entities?: { ei: string; di?: string }[];
		}>({ type: 'config/entity_registry/list_for_display' });

		const map: Record<string, string> = {};
		for (const entry of result?.entities ?? []) {
			if (entry.di) map[entry.ei] = entry.di;
		}
		entityDevices.set(map);
	} catch (error) {
		loadedFor = undefined;
		console.error('entity registry:', error);
	}
}

connection.subscribe((conn) => load(conn));
