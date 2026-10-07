import { describe, expect, it } from 'vitest';
import { gridSize, itemSpan, rowsHeight } from './grid';

describe('gridSize', () => {
	it('uses defaults and clamps out of range or broken values', () => {
		expect(gridSize({})).toEqual({ span_cols: 1, span_rows: 2, columns: 2 });
		expect(gridSize({ span_cols: 9, span_rows: 0, columns: '3' })).toEqual({
			span_cols: 4,
			span_rows: 1,
			columns: 3
		});
		expect(gridSize({ span_cols: 1.6, span_rows: 'x' })).toEqual({
			span_cols: 2,
			span_rows: 2,
			columns: 2
		});
	});
});

describe('itemSpan', () => {
	it('only sizes grid items', () => {
		expect(itemSpan({ type: 'flex_grid', span_cols: 2, span_rows: 3 })).toEqual([2, 3]);
		expect(itemSpan({ type: 'button', span_cols: 2 })).toBeUndefined();
	});
});

describe('rowsHeight', () => {
	it('adds the gaps between rows', () => {
		expect(rowsHeight(2, 61.35)).toBe('calc(61.35px * 2 + 0.4rem * 1)');
	});
});
