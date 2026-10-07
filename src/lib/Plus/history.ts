import type { Connection } from 'home-assistant-js-websocket';

export interface Point {
	x: Date;
	y: number;
}

export type Series = Record<string, Point[]>;

interface StatisticsRow {
	start: number | string;
	mean?: number | null;
	state?: number | null;
}

interface HistoryRow {
	s: string;
	lu: number;
}

/**
 * Long-term statistics are cheap but only exist for entities with a
 * state_class, everything else is read from the recorder history
 */
export async function fetchSeries(
	conn: Connection,
	entity_ids: string[],
	hours: number,
	now = Date.now()
): Promise<Series> {
	const start_time = new Date(now - hours * 3600_000).toISOString();
	const end_time = new Date(now).toISOString();
	const series: Series = {};

	const statistics = await conn.sendMessagePromise<Record<string, StatisticsRow[]>>({
		type: 'recorder/statistics_during_period',
		start_time,
		end_time,
		statistic_ids: entity_ids,
		period: hours <= 24 ? '5minute' : 'hour',
		types: ['mean', 'state']
	});

	for (const id of entity_ids) {
		const points = (statistics?.[id] ?? [])
			.map((row) => ({ x: new Date(row.start), y: Number(row.mean ?? row.state) }))
			.filter((point) => Number.isFinite(point.y));
		if (points.length > 1) series[id] = points;
	}

	const missing = entity_ids.filter((id) => !series[id]);
	if (missing.length) {
		const history = await conn.sendMessagePromise<Record<string, HistoryRow[]>>({
			type: 'history/history_during_period',
			start_time,
			end_time,
			entity_ids: missing,
			minimal_response: true,
			no_attributes: true,
			significant_changes_only: false
		});

		for (const id of missing) {
			const points = (history?.[id] ?? [])
				.filter((row) => row.s !== '' && Number.isFinite(Number(row.s)))
				.map((row) => ({ x: new Date(row.lu * 1000), y: Number(row.s) }));
			if (points.length > 1) series[id] = points;
		}
	}

	return series;
}
