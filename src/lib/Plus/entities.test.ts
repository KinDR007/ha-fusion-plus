import { describe, expect, it } from 'vitest';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import {
	baseName,
	deviceSiblings,
	escapeHtml,
	findSibling,
	formatState,
	stateLine
} from './entities';

function entity(entity_id: string, state: string, attributes: Record<string, any> = {}) {
	return { entity_id, state, attributes } as HassEntity;
}

const states = {
	'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.5', {
		device_class: 'temperature',
		unit_of_measurement: '°C',
		friendly_name: 'TH Kitchen Temperature'
	}),
	'sensor.kitchen_humidity': entity('sensor.kitchen_humidity', '55', {
		device_class: 'humidity',
		unit_of_measurement: '%'
	}),
	'sensor.room_t': entity('sensor.room_t', '20', { device_class: 'temperature' }),
	'sensor.room_rh': entity('sensor.room_rh', '40', { device_class: 'humidity' }),
	'sensor.room_battery': entity('sensor.room_battery', '90', { device_class: 'battery' })
} as unknown as HassEntities;

const translate = (key: string) =>
	({ unavailable: 'N/A', unknown: 'Unknown', on: 'On' })[key] ?? key;

describe('findSibling', () => {
	it('pairs sensors of the same device regardless of naming', () => {
		const devices = { 'sensor.room_t': 'd1', 'sensor.room_rh': 'd1', 'sensor.room_battery': 'd1' };
		expect(findSibling('sensor.room_t', states, devices, 'humidity')).toBe('sensor.room_rh');
		expect(findSibling('sensor.room_rh', states, devices, 'temperature')).toBe('sensor.room_t');
	});

	it('falls back to the entity_id suffix without registry data', () => {
		expect(findSibling('sensor.kitchen_temperature', states, {}, 'humidity')).toBe(
			'sensor.kitchen_humidity'
		);
	});

	it('returns undefined when there is no pair', () => {
		expect(findSibling('sensor.room_t', states, {}, 'humidity')).toBeUndefined();
		expect(findSibling(undefined, states, {}, 'humidity')).toBeUndefined();
	});
});

describe('deviceSiblings', () => {
	it('lists other entities of the device', () => {
		const devices = { 'sensor.a': 'd1', 'sensor.c': 'd1', 'sensor.b': 'd2' };
		expect(deviceSiblings('sensor.a', devices)).toEqual(['sensor.c']);
		expect(deviceSiblings('sensor.x', devices)).toEqual([]);
	});
});

describe('formatState', () => {
	it('appends the unit like StateLogic', () => {
		expect(formatState(states['sensor.kitchen_temperature'], translate)).toBe('21.5 °C');
	});

	it('translates unavailable, unknown and missing states', () => {
		expect(
			formatState(entity('sensor.x', 'unavailable', { unit_of_measurement: 'W' }), translate)
		).toBe('N/A');
		expect(formatState(entity('sensor.x', 'unknown'), translate)).toBe('Unknown');
		expect(formatState(undefined, translate)).toBe('Unknown');
	});
});

describe('stateLine', () => {
	it('joins the values and skips missing ids', () => {
		expect(
			stateLine(
				['sensor.kitchen_temperature', undefined, 'sensor.kitchen_humidity'],
				states,
				translate
			)
		).toBe('21.5 °C / 55 %');
	});
});

describe('baseName', () => {
	it('drops a trailing device class word', () => {
		expect(baseName(states['sensor.kitchen_temperature'])).toBe('TH Kitchen');
		expect(baseName(entity('sensor.x', '1', { friendly_name: 'Teplota' }))).toBe('Teplota');
	});
});

describe('escapeHtml', () => {
	it('escapes markup', () => {
		expect(escapeHtml(`<b a="1">'&'</b>`)).toBe(
			'&lt;b a=&quot;1&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;'
		);
	});
});
