<script lang="ts">
	import Button from '$lib/Main/Button.svelte';
	import { states, lang } from '$lib/Stores';
	import { openModal } from '$lib/Modals';
	import { getDomain } from '$lib/Utils';
	import { entityDevices } from '$lib/Plus/registry';
	import { escapeHtml, formatState } from '$lib/Plus/entities';
	import { findPowerSensors, toWatts } from '$lib/Plus/power';

	let {
		sel,
		sectionName = undefined,
		demo = undefined,
		displayOnly = false
	}: {
		sel: any;
		sectionName?: string | undefined;
		demo?: string | undefined;
		displayOnly?: boolean;
	} = $props();

	let entity_id: string | undefined = $derived(demo || sel?.entity_id);
	let found = $derived(findPowerSensors(entity_id, $states, $entityDevices));
	let power_id: string | undefined = $derived(sel?.power_sensor || found.power);
	let energy_id: string | undefined = $derived(sel?.energy_sensor || found.energy);

	// a sensor as the main entity means meter mode: nothing to toggle,
	// on/off follows the measured power
	let meter = $derived(getDomain(entity_id) === 'sensor');
	let threshold = $derived(
		sel?.on_threshold !== undefined && Number.isFinite(Number(sel.on_threshold))
			? Number(sel.on_threshold)
			: 1
	);
	let watts = $derived(toWatts($states?.[power_id ?? '']));

	let line = $derived.by(() => {
		if (!entity_id) return '';
		const power =
			power_id && power_id !== entity_id ? formatState($states?.[power_id], $lang) : undefined;
		const main = formatState($states?.[entity_id], $lang);
		return power ? `${main} · ${power}` : main;
	});

	// these tiles open a history modal, so unlike plain sensor buttons they are interactive by default
	let view = $derived({
		...sel,
		entity_id,
		displayOnly: sel?.displayOnly ?? false,
		state: sel?.state ?? (sel?.template?.state || !line ? undefined : escapeHtml(line))
	});

	function openConfig() {
		openModal(() => import('$lib/Plus/PowerConfig.svelte'), { sel, sectionName });
	}

	function openDetails() {
		openModal(() => import('$lib/Plus/HistoryModal.svelte'), {
			sel: view,
			entity_ids: [...new Set([power_id, energy_id].filter(Boolean))],
			toggle_entity: meter ? undefined : entity_id
		});
	}
</script>

<Button
	sel={view}
	{sectionName}
	{displayOnly}
	stateOnOverride={meter ? watts !== undefined && watts > threshold : undefined}
	{openConfig}
	{openDetails}
/>
