<script lang="ts">
	import ButtonConfig from '$lib/Modal/ButtonConfig.svelte';
	import Select from '$lib/Components/Select.svelte';
	import InputClear from '$lib/Components/InputClear.svelte';
	import MetricButton from '$lib/Plus/MetricButton.svelte';
	import { lang, entityList } from '$lib/Stores';
	import { entityDevices } from '$lib/Plus/registry';
	import { deviceSiblings } from '$lib/Plus/entities';
	import type { MetricItem } from '$lib/Types';

	let {
		isOpen,
		sel = $bindable(),
		demo = undefined,
		sectionName = undefined
	}: {
		isOpen: boolean;
		sel: MetricItem;
		demo?: string | undefined;
		sectionName?: string | undefined;
	} = $props();

	let labels = $state<Record<number, string | undefined>>({
		1: sel?.secondary_1_label,
		2: sel?.secondary_2_label
	});

	// sensors of the same device first, e.g. the other values of an inverter
	let options = $derived.by(() => {
		const siblings = new Set(deviceSiblings(sel?.entity_id, $entityDevices));
		const all = $entityList('sensor');
		return [
			...all.filter((option) => siblings.has(option.id)),
			...all.filter((option) => !siblings.has(option.id))
		];
	});
</script>

<ButtonConfig {isOpen} bind:sel {demo} {sectionName} title={$lang('plus_metric_button')}>
	{#snippet preview(displayOnly)}
		<MetricButton {sel} {sectionName} {displayOnly} />
	{/snippet}

	{#snippet extra(set)}
		{#each [1, 2] as n (n)}
			<h2>{$lang('plus_secondary')} {n}</h2>

			<div class="secondary">
				<Select
					{options}
					placeholder={$lang('entity')}
					value={sel?.[`secondary_${n}` as keyof MetricItem] as string | undefined}
					clearable={true}
					computeIcons={true}
					onchange={(event) => set(`secondary_${n}`, event ?? undefined)}
				/>

				<InputClear
					condition={labels[n]}
					onclear={() => {
						labels[n] = undefined;
						set(`secondary_${n}_label`);
					}}
				>
					{#snippet children(padding)}
						<input
							class="input"
							type="text"
							placeholder={$lang('plus_label')}
							autocomplete="off"
							spellcheck="false"
							bind:value={labels[n]}
							oninput={(event) => set(`secondary_${n}_label`, event)}
							style:padding
						/>
					{/snippet}
				</InputClear>
			</div>
		{/each}
	{/snippet}
</ButtonConfig>

<style>
	.secondary {
		display: grid;
		gap: 0.6rem;
	}
</style>
