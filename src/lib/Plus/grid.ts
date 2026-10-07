/** item types from this fork that size themselves with span_cols/span_rows */
const SPANNED_TYPES = ['flex_grid'];

export const GRID_LIMITS = {
	span_cols: [1, 4],
	span_rows: [1, 6],
	columns: [1, 6]
} as const;

export const GRID_DEFAULTS = { span_cols: 1, span_rows: 2, columns: 2 };

export function clampInt(value: unknown, [min, max]: readonly [number, number], fallback: number) {
	const number = Math.round(Number(value));
	return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function gridSize(item: any) {
	return {
		span_cols: clampInt(item?.span_cols, GRID_LIMITS.span_cols, GRID_DEFAULTS.span_cols),
		span_rows: clampInt(item?.span_rows, GRID_LIMITS.span_rows, GRID_DEFAULTS.span_rows),
		columns: clampInt(item?.columns, GRID_LIMITS.columns, GRID_DEFAULTS.columns)
	};
}

/**
 * [columns, rows] the item occupies in the section grid,
 * undefined for item types that don't use spans
 */
export function itemSpan(item: any): [number, number] | undefined {
	if (!SPANNED_TYPES.includes(item?.type)) return undefined;
	const { span_cols, span_rows } = gridSize(item);
	return [span_cols, span_rows];
}

/** css height of `rows` dashboard rows including the gaps between them */
export function rowsHeight(rows: number, itemHeight: number) {
	return `calc(${itemHeight}px * ${rows} + 0.4rem * ${rows - 1})`;
}
