import { describe, expect, it } from 'vitest';
import { migrateDashboard, needsMigration, neededRows } from './migrate';

function legacy() {
	return {
		views: [
			{
				id: 1,
				sections: [
					{
						id: 2,
						items: [
							{ type: 'button', id: 3, entity_id: 'light.a' },
							{
								type: 'grid_button',
								id: 4,
								name: 'Lights',
								cells: [
									{ entity_id: 'light.a', label: 'A', template: { label: '{{ 1 }}' } },
									{ entity_id: 'light.b', id: '4_cell_1_x', more_info: false },
									{},
									{ entity_id: 'light.c' },
									{ entity_id: 'light.d' },
									{ entity_id: 'light.e' },
									{ entity_id: 'light.f' },
									{ entity_id: 'light.g' }
								]
							},
							{
								type: 'victron_button',
								id: 5,
								entity_id: 'sensor.victron_mqtt_1_battery_512_battery_soc',
								icon_color: 'red',
								secondary_1: 'sensor.x',
								device: 'battery:512',
								show_all_entities: true
							}
						]
					},
					{
						id: 6,
						type: 'horizontal-stack',
						sections: [
							{
								id: 7,
								items: [
									{
										type: 'info_grid',
										id: 8,
										span_cols: 2,
										span_rows: 1,
										inner_cols: 3,
										inner_rows: 4,
										cells: [{ entity_id: 'sensor.t', label: 'T', font_scale: 1.2 }]
									},
									{
										type: 'power_button',
										id: 9,
										entity_id: 'switch.p',
										on_color: 'orange',
										off_color: 'grey',
										auto_power: true
									},
									{ type: 'temp_humi_button', id: 10, entity_id: 'sensor.k_temperature' }
								]
							}
						]
					}
				]
			}
		]
	};
}

describe('migrateDashboard', () => {
	const ids = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
	let n = 0;
	const random = () => ids[n++ % ids.length];
	const { dashboard, changes } = migrateDashboard(legacy(), random);
	const items = dashboard.views[0].sections[0].items;
	const nested = dashboard.views[0].sections[1].sections[0].items;

	it('converts grid_button to a flex_grid that fits its cells', () => {
		const grid = items[1];
		expect(grid).toMatchObject({ type: 'flex_grid', span_cols: 1, columns: 2, span_rows: 3 });
		expect(grid.cells.map((cell: any) => cell.entity_id)).toEqual([
			'light.a',
			'light.b',
			'light.c',
			'light.d',
			'light.e'
		]);
		expect(grid.cells[0]).toEqual({
			entity_id: 'light.a',
			name: 'A',
			template: { name: '{{ 1 }}' },
			id: expect.any(Number)
		});
		expect(grid.cells[1].more_info).toBe(false);
		expect(new Set(grid.cells.map((cell: any) => cell.id)).size).toBe(5);
		expect(grid.cells.every((cell: any) => typeof cell.id === 'number')).toBe(true);
	});

	it('turns victron_button into metric_button', () => {
		expect(items[2]).toEqual({
			type: 'metric_button',
			id: 5,
			entity_id: 'sensor.victron_mqtt_1_battery_512_battery_soc',
			color: 'red',
			secondary_1: 'sensor.x'
		});
	});

	it('handles nested stacks, info_grid and power_button', () => {
		expect(nested[0]).toMatchObject({ type: 'flex_grid', span_cols: 2, span_rows: 1, columns: 3 });
		expect(nested[0]).not.toHaveProperty('inner_rows');
		expect(nested[0].cells[0]).toMatchObject({ name: 'T', font_scale: 1.2 });
		expect(nested[1]).toEqual({
			type: 'power_button',
			id: 9,
			entity_id: 'switch.p',
			color: 'orange'
		});
	});

	it('leaves current items alone and reports changes', () => {
		expect(items[0]).toEqual({ type: 'button', id: 3, entity_id: 'light.a' });
		expect(nested[2]).toEqual({
			type: 'temp_humi_button',
			id: 10,
			entity_id: 'sensor.k_temperature'
		});
		expect(changes).toEqual([
			'4: grid_button -> flex_grid',
			'5: victron_button -> metric_button',
			'8: info_grid -> flex_grid',
			'9: power_button -> power_button'
		]);
	});

	it('is idempotent', () => {
		expect(needsMigration(legacy())).toBe(true);
		expect(needsMigration(dashboard)).toBe(false);
		expect(migrateDashboard(dashboard).changes).toEqual([]);
	});
});

describe('neededRows', () => {
	it('keeps two rows for two cell rows with a header and grows beyond', () => {
		expect(neededRows(4, 2, true)).toBe(2);
		expect(neededRows(6, 2, true)).toBe(3);
		expect(neededRows(4, 4, false)).toBe(1);
	});
});
