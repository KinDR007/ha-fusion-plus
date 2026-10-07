/**
 * Converts dashboards of the Svelte 4 fork (KinDR007/ha-fusion) to the item
 * types of this fork. Pure and dependency free so the server load, the CLI
 * (scripts/migrate-fusion-plus.mjs) and tests share it.
 *
 *   temp_humi_button  kept
 *   power_button      kept, on_color -> color, off_color/auto_power dropped
 *   victron_button    -> metric_button, icon_color -> color
 *   grid_button       -> flex_grid 1 column wide, 2 cell columns
 *   info_grid         -> flex_grid, inner_cols -> columns
 *   flex_grid (old)   -> flex_grid, inner_cols -> columns
 *   grid cells        label -> name, template.label -> template.name, numeric ids
 */

type Item = Record<string, any>;

export interface MigrationResult {
	dashboard: any;
	changes: string[];
}

const LEGACY_GRIDS = ['grid_button', 'info_grid'];
const DROPPED = ['show_all_entities', 'device', 'auto_power', 'off_color', 'inner_rows'];

/** dashboard rows a grid needs so its cells are not squeezed */
export function neededRows(cellCount: number, columns: number, header: boolean) {
	const cellRows = Math.ceil(Math.max(1, cellCount) / Math.max(1, columns));
	// a compact cell is readable from about 40px, measured in the lab
	const contentPx = cellRows * 40 + (header ? 30 : 0) + 13;
	return Math.max(1, Math.ceil((contentPx + 6.4) / (61.35 + 6.4)));
}

function collectIds(node: any, ids: Set<unknown>) {
	if (Array.isArray(node)) node.forEach((child) => collectIds(child, ids));
	else if (node && typeof node === 'object') {
		if ('id' in node) ids.add(node.id);
		Object.values(node).forEach((child) => collectIds(child, ids));
	}
}

function isLegacyItem(item: Item) {
	return (
		LEGACY_GRIDS.includes(item?.type) ||
		item?.type === 'victron_button' ||
		(item?.type === 'flex_grid' && ('inner_cols' in item || 'inner_rows' in item)) ||
		(['temp_humi_button', 'power_button'].includes(item?.type) &&
			DROPPED.some((key) => key in item)) ||
		(Array.isArray(item?.cells) &&
			item.cells.some((cell: any) => cell && ('label' in cell || typeof cell.id !== 'number')))
	);
}

export function needsMigration(dashboard: any): boolean {
	let found = false;
	forEachItem(dashboard, (item) => {
		if (isLegacyItem(item)) found = true;
	});
	return found;
}

function forEachItem(dashboard: any, visit: (item: Item, replace: (next: Item) => void) => void) {
	const walk = (sections: any[] | undefined) => {
		for (const section of sections ?? []) {
			if (Array.isArray(section?.items)) {
				section.items.forEach((item: Item, index: number) =>
					visit(item, (next) => (section.items[index] = next))
				);
			}
			if (Array.isArray(section?.sections)) walk(section.sections);
		}
	};
	for (const view of dashboard?.views ?? []) walk(view?.sections);
}

export function migrateDashboard(input: any, random: () => number = Math.random): MigrationResult {
	const dashboard = JSON.parse(JSON.stringify(input ?? {}));
	const changes: string[] = [];
	const ids = new Set<unknown>();
	collectIds(dashboard, ids);

	const newId = () => {
		let id: number;
		do id = Math.floor(random() * 9e12) + 1e12;
		while (ids.has(id));
		ids.add(id);
		return id;
	};

	const drop = (item: Item) => DROPPED.forEach((key) => delete item[key]);

	const migrateCell = (cell: any) => {
		if (!cell || typeof cell !== 'object' || !cell.entity_id) return undefined;
		const next: Item = { ...cell, id: typeof cell.id === 'number' ? cell.id : newId() };
		if ('label' in next) {
			if (next.name === undefined && next.label) next.name = next.label;
			delete next.label;
		}
		if (next.template && typeof next.template === 'object') {
			next.template = { ...next.template };
			if ('label' in next.template) {
				next.template.name ??= next.template.label;
				delete next.template.label;
			}
		}
		for (const key of ['clickable', 'empty', 'info']) delete next[key];
		return next;
	};

	forEachItem(dashboard, (item, replace) => {
		if (!isLegacyItem(item)) return;
		const type = item.type;
		const next: Item = { ...item };

		if (type === 'temp_humi_button' || type === 'power_button') {
			if (type === 'power_button' && next.on_color && !next.color) next.color = next.on_color;
			delete next.on_color;
			drop(next);
		} else if (type === 'victron_button') {
			next.type = 'metric_button';
			if (next.icon_color && !next.color) next.color = next.icon_color;
			delete next.icon_color;
			drop(next);
		} else if (type === 'grid_button' || type === 'info_grid' || type === 'flex_grid') {
			next.type = 'flex_grid';
			const cells = (Array.isArray(item.cells) ? item.cells : [])
				.slice(0, type === 'grid_button' ? 6 : undefined)
				.map(migrateCell)
				.filter(Boolean);
			next.cells = cells;
			next.columns = type === 'grid_button' ? 2 : Number(item.inner_cols) || 2;
			delete next.inner_cols;
			next.span_cols = type === 'grid_button' ? 1 : Number(item.span_cols) || 1;
			const needed = neededRows(cells.length, next.columns, Boolean(next.name || next.icon));
			const current = type === 'grid_button' ? 0 : Number(item.span_rows) || 2;
			next.span_rows = Math.min(6, Math.max(current, needed));
			drop(next);
		}

		replace(next);
		changes.push(`${item.id}: ${type} -> ${next.type}`);
	});

	return { dashboard, changes };
}
