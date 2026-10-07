<script lang="ts">
	import ButtonConfig from '$lib/Modal/ButtonConfig.svelte';
	import Select from '$lib/Components/Select.svelte';
	import InputClear from '$lib/Components/InputClear.svelte';
	import PowerButton from '$lib/Plus/PowerButton.svelte';
	import { states, lang, entityList } from '$lib/Stores';
	import { getDomain, getName } from '$lib/Utils';
	import { entityDevices } from '$lib/Plus/registry';
	import { findPowerSensors, isEnergySensor, isPowerSensor } from '$lib/Plus/power';
	import type { PowerItem } from '$lib/Types';

	let {
		isOpen,
		sel = $bindable(),
		demo = undefined,
		sectionName = undefined
	}: {
		isOpen: boolean;
		sel: PowerItem;
		demo?: string | undefined;
		sectionName?: string | undefined;
	} = $props();

	let threshold = $state(sel?.on_threshold);

	let sensors = $derived($entityList('sensor'));
	let powerOptions = $derived(sensors.filter((option) => isPowerSensor($states?.[option.id])));
	let energyOptions = $derived(sensors.filter((option) => isEnergySensor($states?.[option.id])));
	let found = $derived(findPowerSensors(sel?.entity_id, $states, $entityDevices));
	let meter = $derived(getDomain(sel?.entity_id) === 'sensor');

	function auto(entity_id: string | undefined, fallback: string) {
		return entity_id
			? `${$lang('auto')}: ${getName(undefined, $states?.[entity_id]) ?? entity_id}`
			: fallback;
	}
</script>

<ButtonConfig {isOpen} bind:sel {demo} {sectionName} title={$lang('plus_power_button')}>
	{#snippet preview(displayOnly)}
		<PowerButton {sel} {sectionName} {displayOnly} />
	{/snippet}

	{#snippet extra(set)}
		<h2>{$lang('plus_power_sensor')}</h2>

		<Select
			options={powerOptions}
			placeholder={auto(found.power, $lang('plus_power_sensor'))}
			value={sel?.power_sensor}
			clearable={true}
			computeIcons={true}
			onchange={(event) => set('power_sensor', event ?? undefined)}
		/>

		<h2>{$lang('plus_energy_sensor')}</h2>

		<Select
			options={energyOptions}
			placeholder={auto(found.energy, $lang('plus_energy_sensor'))}
			value={sel?.energy_sensor}
			clearable={true}
			computeIcons={true}
			onchange={(event) => set('energy_sensor', event ?? undefined)}
		/>

		{#if meter}
			<h2>{$lang('plus_on_threshold')}</h2>

			<InputClear
				condition={threshold !== undefined && threshold !== null}
				onclear={() => {
					threshold = undefined;
					set('on_threshold');
				}}
			>
				{#snippet children(padding)}
					<input
						class="input"
						type="number"
						min="0"
						step="any"
						placeholder="1"
						autocomplete="off"
						bind:value={threshold}
						oninput={() =>
							set(
								'on_threshold',
								Number.isFinite(Number(threshold)) && threshold !== null
									? Number(threshold)
									: undefined
							)}
						style:padding
					/>
				{/snippet}
			</InputClear>
		{/if}
	{/snippet}
</ButtonConfig>
