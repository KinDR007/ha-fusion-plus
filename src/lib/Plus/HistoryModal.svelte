<script lang="ts">
	import { states, connection, lang, selectedLanguage, ripple } from '$lib/Stores';
	import Modal from '$lib/Modal/Index.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import ComputeIcon from '$lib/Components/ComputeIcon.svelte';
	import Toggle from '$lib/Components/Toggle.svelte';
	import { callService } from 'home-assistant-js-websocket';
	import Ripple from '$lib/Actions/ripple';
	import HistoryChart from '$lib/Plus/HistoryChart.svelte';
	import { fetchSeries, type Point, type Series } from '$lib/Plus/history';
	import { entityDevices } from '$lib/Plus/registry';
	import { baseName, deviceClass, deviceSiblings, formatState } from '$lib/Plus/entities';
	import { getDomain, getName } from '$lib/Utils';

	let {
		isOpen,
		sel,
		entity_ids,
		toggle_entity = undefined
	}: {
		isOpen: boolean;
		sel: any;
		/** charted entities */
		entity_ids: string[];
		/** switch-like entity shown with a toggle above the charts */
		toggle_entity?: string | undefined;
	} = $props();

	const periods = [
		{ hours: 24, label: 'day' },
		{ hours: 24 * 7, label: 'week' },
		{ hours: 24 * 30, label: 'month' }
	];

	let hours = $state(24);
	let series = $state<Series>({});
	let loading = $state(true);
	let hovered = $state<Record<string, Point | undefined>>({});
	let request = 0;

	let primary = $derived(toggle_entity ?? entity_ids[0]);
	let main = $derived($states?.[primary]);
	let base = $derived(baseName(main));
	let toggleOn = $derived($states?.[toggle_entity ?? '']?.state === 'on');

	// depends on the ids, the period and the connection only, never on $states,
	// so state changes elsewhere in Home Assistant don't trigger new queries
	$effect(() => {
		const conn = $connection;
		const ids = entity_ids;
		const range = hours;
		if (!conn || !ids.length) return;

		const current = ++request;
		loading = true;
		fetchSeries(conn, ids, range)
			.then((result) => {
				if (current === request) series = result;
			})
			.catch((error) => {
				console.error('history:', error);
				if (current === request) series = {};
			})
			.finally(() => {
				if (current === request) loading = false;
			});
	});

	let related = $derived(
		deviceSiblings(primary, $entityDevices).filter(
			(id) =>
				!entity_ids.includes(id) &&
				$states?.[id] &&
				['sensor', 'binary_sensor'].includes(getDomain(id) ?? '')
		)
	);

	function label(entity_id: string) {
		const cls = deviceClass($states?.[entity_id]);
		if (['temperature', 'humidity', 'power', 'energy'].includes(cls ?? '')) {
			return $lang(`plus_${cls}`);
		}
		return getName(undefined, $states?.[entity_id]) ?? entity_id;
	}

	/** sibling name without the device prefix, "TH Kitchen Battery" -> "Battery" */
	function shortName(entity_id: string) {
		const name = getName(undefined, $states?.[entity_id]) ?? entity_id;
		return base && name.startsWith(`${base} `) ? name.slice(base.length + 1) : name;
	}

	function hoverText(entity_id: string, point: Point) {
		const value = Intl.NumberFormat($selectedLanguage, { maximumFractionDigits: 1 }).format(
			point.y
		);
		const unit = $states?.[entity_id]?.attributes?.unit_of_measurement ?? '';
		const time = Intl.DateTimeFormat(
			$selectedLanguage,
			hours <= 24
				? { timeStyle: 'short' }
				: { weekday: 'short', hour: 'numeric', minute: '2-digit' }
		).format(point.x);
		return `${value} ${unit} · ${time}`;
	}
</script>

{#if isOpen}
	<Modal>
		{#snippet title()}<h1>{getName(sel, main)}</h1>{/snippet}

		{#if toggle_entity}
			<h2>{$lang('toggle')}</h2>

			<Toggle
				checked={toggleOn}
				onchange={() =>
					callService($connection, 'homeassistant', 'toggle', { entity_id: toggle_entity })}
			/>
		{/if}

		{#if entity_ids.length}
			<h2>{$lang('period')}</h2>

			<div class="button-container">
				{#each periods as period (period.hours)}
					<button
						class:selected={hours === period.hours}
						onclick={() => (hours = period.hours)}
						use:Ripple={$ripple}
					>
						{$lang(period.label)}
					</button>
				{/each}
			</div>

			{#each entity_ids as entity_id (entity_id)}
				<h2>
					{label(entity_id)}
					<span class="align-right">
						{hovered[entity_id]
							? hoverText(entity_id, hovered[entity_id] as Point)
							: formatState($states?.[entity_id], $lang)}
					</span>
				</h2>

				{#if series[entity_id]}
					<HistoryChart
						points={series[entity_id]}
						onhover={(point) => (hovered = { ...hovered, [entity_id]: point })}
					/>
				{:else}
					<div class="empty">{loading ? $lang('loading') : $lang('plus_no_history')}</div>
				{/if}
			{/each}
		{/if}

		{#if related.length}
			<h2>{$lang('plus_device')}</h2>

			<div class="rows">
				{#each related as entity_id (entity_id)}
					<div class="row">
						<div class="icon"><ComputeIcon {entity_id} size="1.3rem" /></div>
						<div class="name">{shortName(entity_id)}</div>
						<div class="state">{formatState($states?.[entity_id], $lang)}</div>
					</div>
				{/each}
			</div>
		{/if}

		<ConfigButtons />
	</Modal>
{/if}

<style>
	.empty {
		height: 7rem;
		display: grid;
		place-items: center;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background-color: rgba(0, 0, 0, 0.2);
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
	}

	/* rows styled like Main/Entities.svelte */
	.rows {
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background-color: rgba(0, 0, 0, 0.2);
		padding: 0.3rem;
	}

	.row {
		display: grid;
		grid-template-columns: min-content auto max-content;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.5rem;
	}

	.icon {
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.state {
		color: rgba(255, 255, 255, 0.7);
		white-space: nowrap;
	}
</style>
