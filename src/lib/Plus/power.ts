import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { deviceClass, deviceSiblings } from '$lib/Plus/entities';

const WATT_FACTORS: Record<string, number> = { mW: 0.001, W: 1, kW: 1000, MW: 1_000_000 };
const ENERGY_UNITS = ['Wh', 'kWh', 'MWh'];

export function isPowerSensor(entity: HassEntity | undefined): boolean {
	if (!entity?.entity_id?.startsWith('sensor.')) return false;
	const unit = entity.attributes?.unit_of_measurement;
	return deviceClass(entity) === 'power' || (unit !== undefined && unit in WATT_FACTORS);
}

export function isEnergySensor(entity: HassEntity | undefined): boolean {
	if (!entity?.entity_id?.startsWith('sensor.')) return false;
	return (
		deviceClass(entity) === 'energy' ||
		ENERGY_UNITS.includes(entity.attributes?.unit_of_measurement ?? '')
	);
}

/** numeric power in watts, undefined when unavailable or not a power unit */
export function toWatts(entity: HassEntity | undefined): number | undefined {
	const factor = WATT_FACTORS[entity?.attributes?.unit_of_measurement ?? 'W'];
	const value = Number(entity?.state);
	if (!factor || entity?.state === '' || !Number.isFinite(value)) return undefined;
	return value * factor;
}

/**
 * Power and energy sensors that belong to `entity_id`: the entity itself when it
 * is a meter, sensors of the same device, then `<object_id>_power` / `_energy`
 */
export function findPowerSensors(
	entity_id: string | undefined,
	states: HassEntities | undefined,
	devices: Record<string, string>
): { power?: string; energy?: string } {
	if (!entity_id || !states) return {};
	const entity = states[entity_id];
	const siblings = deviceSiblings(entity_id, devices).filter((id) => states[id]);
	const objectId = entity_id.split('.')[1]?.replace(/_(power|energy)$/, '');

	const pick = (test: (e: HassEntity | undefined) => boolean, suffix: string) => {
		if (test(entity)) return entity_id;
		const sibling = siblings.find((id) => test(states[id]));
		if (sibling) return sibling;
		const candidate = `sensor.${objectId}_${suffix}`;
		return test(states[candidate]) ? candidate : undefined;
	};

	return { power: pick(isPowerSensor, 'power'), energy: pick(isEnergySensor, 'energy') };
}
