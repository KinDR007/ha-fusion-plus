<script lang="ts">
	import Button from '$lib/Main/Button.svelte';
	import { states, lang } from '$lib/Stores';
	import { openModal } from '$lib/Modals';
	import { escapeHtml, formatState } from '$lib/Plus/entities';

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

	let secondary = $derived(
		[1, 2]
			.map((n) => ({ entity_id: sel?.[`secondary_${n}`], label: sel?.[`secondary_${n}_label`] }))
			.filter((item): item is { entity_id: string; label: string | undefined } =>
				Boolean(item.entity_id)
			)
	);

	// "1 250 W · Today 4.2 kWh · 74 %"
	let line = $derived.by(() => {
		if (!entity_id) return '';
		return [
			formatState($states?.[entity_id], $lang),
			...secondary.map(({ entity_id: id, label }) =>
				[label, formatState($states?.[id], $lang)].filter(Boolean).join(' ')
			)
		].join(' · ');
	});

	let view = $derived({
		...sel,
		entity_id,
		state: sel?.state ?? (sel?.template?.state || !line ? undefined : escapeHtml(line))
	});

	function openConfig() {
		openModal(() => import('$lib/Plus/MetricConfig.svelte'), { sel, sectionName });
	}

	function openDetails() {
		openModal(() => import('$lib/Plus/HistoryModal.svelte'), {
			sel: view,
			entity_ids: [entity_id, ...secondary.map((item) => item.entity_id)].filter(Boolean)
		});
	}
</script>

<Button sel={view} {sectionName} {displayOnly} {openConfig} {openDetails} />
