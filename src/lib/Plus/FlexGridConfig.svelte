<script lang="ts">
	import { dashboard, lang, motion, ripple, entityList } from '$lib/Stores';
	import ConfigModal from '$lib/Modal/ConfigModal.svelte';
	import InputClear from '$lib/Components/InputClear.svelte';
	import Select from '$lib/Components/Select.svelte';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import FlexGrid from '$lib/Plus/FlexGrid.svelte';
	import { GRID_LIMITS, gridSize } from '$lib/Plus/grid';
	import { generateId } from '$lib/Utils';
	import { openModal } from '$lib/Modals';
	import { slide } from 'svelte/transition';

	let {
		isOpen,
		sel = $bindable(),
		sectionName = undefined
	}: {
		isOpen: boolean;
		sel: any;
		sectionName?: string | undefined;
	} = $props();

	let name = $state(sel?.name);
	let icon = $state(sel?.icon);
	let size = $derived(gridSize(sel));
	let cells = $derived((sel?.cells ?? []).filter((cell: any) => cell && typeof cell === 'object'));
	let options = $derived($entityList(''));

	const range = ([min, max]: readonly [number, number]) =>
		Array.from({ length: max - min + 1 }, (_, i) => min + i);

	const scales = [0.85, 1, 1.15, 1.3];

	function setCells(set: (key: string, event?: any) => void, next: any[]) {
		set('cells', next);
	}

	function editCell(cell: any) {
		openModal(() => import('$lib/Modal/ButtonConfig.svelte'), {
			sel: cell,
			title: $lang('plus_cell'),
			sectionName
		});
	}
</script>

<ConfigModal {isOpen} bind:sel title={$lang('plus_flex_grid')}>
	{#snippet children(set)}
		<h2>{$lang('preview')}</h2>

		<div
			class="preview"
			style:width="min(100%, calc(14.5rem * {size.span_cols} + 0.4rem * {size.span_cols - 1}))"
		>
			<FlexGrid {sel} {sectionName} />
		</div>

		<h2>{$lang('name')}</h2>

		<InputClear
			condition={name}
			onclear={() => {
				name = undefined;
				set('name');
			}}
		>
			{#snippet children(padding)}
				<input
					class="input"
					type="text"
					placeholder={$lang('name')}
					autocomplete="off"
					spellcheck="false"
					bind:value={name}
					oninput={(event) => set('name', event)}
					style:padding
				/>
			{/snippet}
		</InputClear>

		<h2>{$lang('icon')}</h2>

		<InputClear
			condition={icon}
			onclear={() => {
				icon = undefined;
				set('icon');
			}}
		>
			{#snippet children(padding)}
				<input
					class="input"
					type="text"
					placeholder="mdi:sofa"
					autocomplete="off"
					spellcheck="false"
					bind:value={icon}
					oninput={(event) => set('icon', event)}
					style:padding
				/>
			{/snippet}
		</InputClear>

		<h2>{$lang('plus_grid_width')}</h2>

		<div class="button-container">
			{#each range(GRID_LIMITS.span_cols) as value (value)}
				<button
					class:selected={size.span_cols === value}
					onclick={() => set('span_cols', value)}
					use:Ripple={$ripple}
				>
					{value}
				</button>
			{/each}
		</div>

		<h2>{$lang('plus_grid_height')}</h2>

		<div class="button-container">
			{#each range(GRID_LIMITS.span_rows) as value (value)}
				<button
					class:selected={size.span_rows === value}
					onclick={() => set('span_rows', value)}
					use:Ripple={$ripple}
				>
					{value}
				</button>
			{/each}
		</div>

		<h2>{$lang('plus_grid_columns')}</h2>

		<div class="button-container">
			{#each range(GRID_LIMITS.columns) as value (value)}
				<button
					class:selected={size.columns === value}
					onclick={() => set('columns', value)}
					use:Ripple={$ripple}
				>
					{value}
				</button>
			{/each}
		</div>

		<h2>{$lang('plus_font_size')}</h2>

		<div class="button-container">
			{#each scales as value (value)}
				<button
					class:selected={(Number(sel?.font_scale) || 1) === value}
					onclick={() => set('font_scale', value === 1 ? undefined : value)}
					use:Ripple={$ripple}
				>
					{Math.round(value * 100)} %
				</button>
			{/each}
		</div>

		<h2>{$lang('plus_cells')}</h2>

		{#each cells as cell, index (cell.id ?? index)}
			<div class="cell-row" transition:slide={{ duration: $motion }}>
				<div class="select">
					<Select
						computeIcons={true}
						placeholder={$lang('entity')}
						{options}
						value={cell.entity_id || ''}
						clearable={true}
						onchange={(event) => {
							// a new array reference so the change invalidates reactively
							const next = event
								? cells.map((c: any, i: number) => (i === index ? { ...c, entity_id: event } : c))
								: cells.filter((_: any, i: number) => i !== index);
							setCells(set, next);
						}}
					/>
				</div>

				<button
					class="icon-gallery"
					title={$lang('edit')}
					disabled={!cell.id}
					onclick={() => editCell(cell)}
					use:Ripple={$ripple}
				>
					<Icon icon="solar:pen-2-bold-duotone" height="none" width="100%" />
				</button>
			</div>
		{/each}

		<button
			class="options action"
			onclick={() => setCells(set, [...cells, { id: generateId($dashboard) }])}
			disabled={cells.some((cell: any) => !cell.entity_id)}
		>
			{$lang('add')}
		</button>
	{/snippet}
</ConfigModal>

<style>
	.preview {
		max-width: 100%;
	}

	.cell-row {
		display: flex;
		gap: 0.8rem;
		margin-bottom: 0.6rem;
	}

	.select {
		flex: 1;
		min-width: 0;
	}

	.icon-gallery {
		padding: 0.75rem;
		flex-shrink: 0;
	}

	.action:disabled {
		opacity: 0.4;
		cursor: unset;
	}
</style>
