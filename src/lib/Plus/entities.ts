import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';

type Translate = (key: string) => string;

const SUFFIX_SWAPS: Record<string, [RegExp, string][]> = {
	humidity: [
		[/_temperature$/, '_humidity'],
		[/_temp$/, '_humidity'],
		[/_temp$/, '_humi']
	],
	temperature: [
		[/_humidity$/, '_temperature'],
		[/_humi$/, '_temp']
	]
};

export function deviceClass(entity: HassEntity | undefined): string | undefined {
	return entity?.attributes?.device_class;
}

export function isSensorOfClass(
	entity_id: string,
	states: HassEntities | undefined,
	cls: 'temperature' | 'humidity'
): boolean {
	if (!entity_id.startsWith('sensor.')) return false;
	const dc = deviceClass(states?.[entity_id]);
	if (dc) return dc === cls;
	return cls === 'temperature'
		? /_(temperature|temp)$/.test(entity_id)
		: /_(humidity|humi)$/.test(entity_id);
}

/**
 * First sensor of the class, preferring one with a paired sibling, for previews
 */
export function demoEntity(
	states: HassEntities | undefined,
	cls: 'temperature' | 'humidity'
): string | undefined {
	const ids = Object.keys(states ?? {})
		.filter((id) => isSensorOfClass(id, states, cls))
		.sort();
	const other = cls === 'temperature' ? 'humidity' : 'temperature';
	return ids.find((id) => findSibling(id, states, {}, other)) ?? ids[0];
}

/**
 * Other entities of the same device, ordered by entity_id
 */
export function deviceSiblings(
	entity_id: string | undefined,
	devices: Record<string, string>
): string[] {
	const device = entity_id && devices[entity_id];
	if (!device) return [];
	return Object.keys(devices)
		.filter((id) => id !== entity_id && devices[id] === device)
		.sort();
}

/**
 * Finds the sensor of `cls` that belongs to the same device as `entity_id`,
 * falling back to entity_id suffix conventions (`_temperature` -> `_humidity`)
 */
export function findSibling(
	entity_id: string | undefined,
	states: HassEntities | undefined,
	devices: Record<string, string>,
	cls: 'temperature' | 'humidity'
): string | undefined {
	if (!entity_id || !states) return undefined;

	const byDevice = deviceSiblings(entity_id, devices).find(
		(id) => states[id] && isSensorOfClass(id, states, cls)
	);
	if (byDevice) return byDevice;

	for (const [pattern, replacement] of SUFFIX_SWAPS[cls] ?? []) {
		const candidate: string = entity_id.replace(pattern, replacement);
		if (candidate !== entity_id && states[candidate]) return candidate;
	}
	return undefined;
}

/**
 * State with unit, formatted like StateLogic so values match regular buttons
 */
export function formatState(entity: HassEntity | undefined, translate: Translate): string {
	const state = entity?.state;
	if (state === undefined || state === '') return translate('unknown');
	if (state === 'unavailable' || state === 'unknown') return translate(state);
	const unit = entity?.attributes?.unit_of_measurement;
	return unit ? `${translate(state)} ${unit}` : translate(state);
}

/**
 * "21.5 °C / 55 %" for the given entities, skipping missing ones
 */
export function stateLine(
	entity_ids: (string | undefined)[],
	states: HassEntities | undefined,
	translate: Translate
): string {
	return entity_ids
		.filter((id): id is string => Boolean(id))
		.map((id) => formatState(states?.[id], translate))
		.join(' / ');
}

/**
 * friendly_name without a trailing device class word,
 * "TH Kitchen Temperature" -> "TH Kitchen"
 */
export function baseName(entity: HassEntity | undefined): string | undefined {
	const name: string | undefined = entity?.attributes?.friendly_name;
	return name?.replace(/\s+(temperature|teplota|humidity|vlhkost)$/i, '').trim() || name;
}

export function escapeHtml(text: string): string {
	return text.replace(
		/[&<>"']/g,
		(char) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string
	);
}
