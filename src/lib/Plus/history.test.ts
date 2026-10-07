import { describe, expect, it } from 'vitest';
import type { Connection } from 'home-assistant-js-websocket';
import { fetchSeries } from './history';

function mockConnection(responses: Record<string, unknown>) {
	const sent: any[] = [];
	const conn = {
		sendMessagePromise: async (message: any) => {
			sent.push(message);
			return responses[message.type];
		}
	} as unknown as Connection;
	return { conn, sent };
}

describe('fetchSeries', () => {
	it('uses statistics and falls back to history for the rest', async () => {
		const { conn, sent } = mockConnection({
			'recorder/statistics_during_period': {
				'sensor.t': [
					{ start: 0, mean: 20.5 },
					{ start: 300_000, mean: 21 }
				]
			},
			'history/history_during_period': {
				'sensor.h': [
					{ s: '50', lu: 10 },
					{ s: 'unavailable', lu: 20 },
					{ s: '', lu: 25 },
					{ s: '52', lu: 30 }
				]
			}
		});

		const series = await fetchSeries(conn, ['sensor.t', 'sensor.h'], 24, 3600_000 * 24);

		expect(series['sensor.t'].map((p) => p.y)).toEqual([20.5, 21]);
		expect(series['sensor.h'].map((p) => p.y)).toEqual([50, 52]);
		expect(series['sensor.h'][1].x.getTime()).toBe(30_000);
		expect(sent[0]).toMatchObject({ period: '5minute', statistic_ids: ['sensor.t', 'sensor.h'] });
		expect(sent[1]).toMatchObject({ entity_ids: ['sensor.h'], minimal_response: true });
	});

	it('skips history when statistics cover every entity and uses hourly periods for long ranges', async () => {
		const { conn, sent } = mockConnection({
			'recorder/statistics_during_period': {
				'sensor.t': [
					{ start: 0, state: 1 },
					{ start: 3600_000, state: 2 }
				]
			}
		});

		const series = await fetchSeries(conn, ['sensor.t'], 168);

		expect(Object.keys(series)).toEqual(['sensor.t']);
		expect(sent).toHaveLength(1);
		expect(sent[0].period).toBe('hour');
	});
});
