<script lang="ts">
	import { scaleTime, scaleLinear } from 'd3-scale';
	import { line, area, curveMonotoneX } from 'd3-shape';
	import { extent, bisector } from 'd3-array';
	import type { Point } from '$lib/Plus/history';

	let {
		points,
		onhover = undefined
	}: {
		points: Point[];
		/** called with the hovered point, or undefined when the pointer leaves */
		onhover?: (point: Point | undefined) => void;
	} = $props();

	// styled like Sidebar/Graph.svelte; the svg has no padding around it so
	// the measured size is exactly the drawable area
	let width = $state(0);
	let height = $state(0);
	let hovered = $state<Point>();
	const gradientId = `plus-area-${Math.random().toString(36).slice(2, 9)}`;
	const inset = 3;

	let xScale = $derived(
		scaleTime()
			.domain(extent(points, (d) => d.x) as [Date, Date])
			.range([inset, Math.max(inset, width - inset)])
	);

	let yScale = $derived(
		scaleLinear()
			.domain(extent(points, (d) => d.y) as [number, number])
			.range([Math.max(inset, height - inset), inset])
			.nice()
	);

	let linePath = $derived(
		line<Point>()
			.x((d) => xScale(d.x))
			.y((d) => yScale(d.y))
			.curve(curveMonotoneX)(points)
	);

	let areaPath = $derived(
		area<Point>()
			.x((d) => xScale(d.x))
			.y0(yScale(yScale.domain()[0]))
			.y1((d) => yScale(d.y))
			.curve(curveMonotoneX)(points)
	);

	function handlePointerMove(event: PointerEvent) {
		if (!points.length) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const time = xScale.invert(event.clientX - rect.left);
		const index = Math.min(
			points.length - 1,
			Math.max(0, bisector((d: Point) => d.x).center(points, time))
		);
		hovered = points[index];
		onhover?.(hovered);
	}

	function handlePointerLeave() {
		hovered = undefined;
		onhover?.(undefined);
	}
</script>

<div
	class="chart"
	bind:clientWidth={width}
	bind:clientHeight={height}
	onpointermove={handlePointerMove}
	onpointerleave={handlePointerLeave}
	data-exclude-drag-modal
	role="presentation"
>
	{#if width && height && linePath && !linePath.includes('NaN')}
		<svg {width} {height}>
			<defs>
				<linearGradient id={gradientId} gradientTransform="rotate(90)">
					<stop offset="0%" stop-color="rgb(255, 255, 255, 0.5)" />
					<stop offset="100%" stop-color="rgb(255, 255, 255, 0)" />
				</linearGradient>
			</defs>
			<path d={areaPath} fill="url(#{gradientId})" />
			<path d={linePath} class="line" />
			{#if hovered}
				<line class="cursor" x1={xScale(hovered.x)} x2={xScale(hovered.x)} y1={0} y2={height} />
				<circle class="dot" cx={xScale(hovered.x)} cy={yScale(hovered.y)} r="3.5" />
			{/if}
		</svg>
	{/if}
</div>

<style>
	.chart {
		height: 7rem;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background-color: rgba(0, 0, 0, 0.2);
		overflow: hidden;
		touch-action: pan-y;
	}

	svg {
		display: block;
	}

	.line {
		fill: none;
		stroke: #ffffff;
		stroke-width: 2;
	}

	.cursor {
		stroke: rgba(255, 255, 255, 0.35);
		stroke-width: 1;
	}

	.dot {
		fill: #ffffff;
	}
</style>
