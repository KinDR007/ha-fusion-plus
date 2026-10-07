<script lang="ts">
	import ButtonConfig from '$lib/Modal/ButtonConfig.svelte';
	import Select from '$lib/Components/Select.svelte';
	import TempHumiButton from '$lib/Plus/TempHumiButton.svelte';
	import { states, lang, entityList } from '$lib/Stores';
	import { entityDevices } from '$lib/Plus/registry';
	import { baseName, findSibling, isSensorOfClass, stateLine } from '$lib/Plus/entities';
	import { getName } from '$lib/Utils';
	import type { TempHumiItem } from '$lib/Types';

	let {
		isOpen,
		sel = $bindable(),
		demo = undefined,
		sectionName = undefined
	}: {
		isOpen: boolean;
		sel: TempHumiItem;
		demo?: string | undefined;
		sectionName?: string | undefined;
	} = $props();

	let humidityOptions = $derived(
		$entityList('sensor').filter((option) => isSensorOfClass(option.id, $states, 'humidity'))
	);

	let detected = $derived(findSibling(sel?.entity_id, $states, $entityDevices, 'humidity'));

	let humidity_id = $derived(sel?.humidity_entity || detected);
</script>

<ButtonConfig
	{isOpen}
	bind:sel
	{demo}
	{sectionName}
	title={$lang('plus_temp_humi_button')}
	entityFilter={(id) => isSensorOfClass(id, $states, 'temperature')}
	namePlaceholder={baseName($states?.[sel?.entity_id])}
	statePlaceholder={stateLine([sel?.entity_id, humidity_id], $states, $lang)}
>
	{#snippet preview(displayOnly)}
		<TempHumiButton {sel} {sectionName} {displayOnly} />
	{/snippet}

	{#snippet extra(set)}
		<h2>{$lang('plus_humidity_entity')}</h2>

		<Select
			options={humidityOptions}
			placeholder={detected
				? `${$lang('auto')}: ${getName(undefined, $states?.[detected]) ?? detected}`
				: $lang('plus_humidity_entity')}
			value={sel?.humidity_entity}
			clearable={true}
			computeIcons={true}
			onchange={(event) => set('humidity_entity', event ?? undefined)}
		/>
	{/snippet}
</ButtonConfig>
