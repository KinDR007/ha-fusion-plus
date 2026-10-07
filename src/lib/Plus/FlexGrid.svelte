<script lang="ts">
	import Button from '$lib/Main/Button.svelte';
	import { editMode, itemHeight, lang, ripple } from '$lib/Stores';
	import { openModal } from '$lib/Modals';
	import Icon from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';
	import { gridSize, rowsHeight } from '$lib/Plus/grid';

	let {
		sel,
		sectionName = undefined,
		demo = undefined
	}: {
		sel: any;
		sectionName?: string | undefined;
		/** entity_ids shown when the grid has no cells yet (item type picker) */
		demo?: string[] | undefined;
	} = $props();

	let size = $derived(gridSize(sel));

	let cells = $derived.by(() => {
		const configured = (sel?.cells ?? []).filter((cell: any) => cell && typeof cell === 'object');
		if (configured.length || !demo) return configured;
		return demo.map((entity_id, index) => ({ id: -(index + 1), entity_id }));
	});

	let rows = $derived(Math.max(1, Math.ceil(cells.length / size.columns)));
	let scale = $derived(Number(sel?.font_scale) || 1);

	function openConfig() {
		if ($editMode) openModal(() => import('$lib/Plus/FlexGridConfig.svelte'), { sel, sectionName });
	}

	function openCellConfig(cell: any) {
		openModal(() => import('$lib/Modal/ButtonConfig.svelte'), {
			sel: cell,
			title: $lang('plus_cell')
		});
	}
</script>

<div
	class="container"
	style:height={rowsHeight(size.span_rows, $itemHeight)}
	style:--tile-scale={scale}
	style:cursor={$editMode ? 'pointer' : 'default'}
	onclick={openConfig}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') openConfig();
	}}
	role="button"
	tabindex="-1"
	use:Ripple={{ ...$ripple, opacity: $editMode ? $ripple.opacity : 0 }}
>
	{#if sel?.name || sel?.icon}
		<div class="header">
			{#if sel?.icon}
				<span class="header-icon"><Icon icon={sel.icon} height="none" width="100%" /></span>
			{/if}
			<span class="header-name">{sel?.name ?? ''}</span>
		</div>
	{/if}

	{#if cells.length}
		<div
			class="cells"
			style:grid-template-columns="repeat({size.columns}, minmax(0, 1fr))"
			style:grid-template-rows="repeat({rows}, minmax(0, 1fr))"
		>
			{#each cells as cell, index (cell.id ?? index)}
				<div
					class="cell"
					style:--tile-scale={cell.font_scale ? scale * Number(cell.font_scale) : undefined}
				>
					<Button sel={cell} {sectionName} compact openConfig={() => openCellConfig(cell)} />
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty">{$lang('plus_no_cells')}</div>
	{/if}
</div>

<style>
	/* card styled like Main/Entities.svelte */
	.container {
		background-color: var(--theme-button-background-color-off);
		border-radius: 0.65rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0.4rem;
		gap: 0.4rem;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.25rem 0.35rem 0 0.35rem;
		font-weight: 500;
		color: var(--theme-button-name-color-off);
		white-space: nowrap;
		overflow: hidden;
	}

	.header-icon {
		width: 1.1rem;
		height: 1.1rem;
		flex-shrink: 0;
		display: flex;
	}

	.header-name {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cells {
		flex: 1;
		min-height: 0;
		display: grid;
		gap: 0.3rem;
	}

	.cell {
		min-width: 0;
		min-height: 0;
		display: grid;
		container: plus-cell / size;
	}

	.empty {
		flex: 1;
		display: grid;
		place-items: center;
		color: var(--theme-button-state-color-off);
		font-size: 0.9rem;
	}

	/* Phone and Tablet (portrait): items wrap in a flex row there, so a taller
	   grid next to a button would stretch it; take the full row instead */
	@media all and (max-width: 768px) {
		.container {
			width: calc(100vw - 2.5rem);
		}
	}
</style>
