import { describe, expect, it } from 'vitest';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { findPowerSensors, isEnergySensor, toWatts } from './power';

function entity(entity_id: string, state: string, attributes: Record<string, any> = {}) {
	return { entity_id, state, attributes } as HassEntity;
}

const states = {
	'switch.washer': entity('switch.washer', 'on'),
	'sensor.washer_power': entity('sensor.washer_power', '450', {
		device_class: 'power',
		unit_of_measurement: 'W'
	}),
	'sensor.washer_energy': entity('sensor.washer_energy', '12.5', {
		device_class: 'energy',
		unit_of_measurement: 'kWh'
	}),
	'switch.plug': entity('switch.plug', 'off'),
	'sensor.plug_load': entity('sensor.plug_load', '0.8', { unit_of_measurement: 'kW' }),
	'sensor.plug_total': entity('sensor.plug_total', '3', { unit_of_measurement: 'kWh' }),
	'sensor.power_consumption': entity('sensor.power_consumption', '100', {
		device_class: 'power',
		unit_of_measurement: 'W'
	}),
	'sensor.water_consumption': entity('sensor.water_consumption', '5', {
		unit_of_measurement: 'm³'
	})
} as unknown as HassEntities;

describe('findPowerSensors', () => {
	it('uses entity_id suffixes without registry data', () => {
		expect(findPowerSensors('switch.washer', states, {})).toEqual({
			power: 'sensor.washer_power',
			energy: 'sensor.washer_energy'
		});
	});

	it('prefers sensors of the same device', () => {
		const devices = { 'switch.plug': 'd', 'sensor.plug_load': 'd', 'sensor.plug_total': 'd' };
		expect(findPowerSensors('switch.plug', states, devices)).toEqual({
			power: 'sensor.plug_load',
			energy: 'sensor.plug_total'
		});
	});

	it('treats a power sensor as its own meter and never takes it for energy', () => {
		expect(findPowerSensors('sensor.power_consumption', states, {})).toEqual({
			power: 'sensor.power_consumption',
			energy: undefined
		});
	});
});

describe('isEnergySensor', () => {
	it('ignores consumption sensors that are not energy', () => {
		expect(isEnergySensor(states['sensor.water_consumption'])).toBe(false);
		expect(isEnergySensor(states['sensor.power_consumption'])).toBe(false);
	});
});

describe('toWatts', () => {
	it('normalises units and rejects non numeric states', () => {
		expect(toWatts(states['sensor.plug_load'])).toBe(800);
		expect(toWatts(states['sensor.washer_power'])).toBe(450);
		expect(
			toWatts(entity('sensor.x', 'unavailable', { unit_of_measurement: 'W' }))
		).toBeUndefined();
		expect(toWatts(entity('sensor.x', '5', { unit_of_measurement: 'kWh' }))).toBeUndefined();
	});
});
