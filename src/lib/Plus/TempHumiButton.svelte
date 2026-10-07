<script lang="ts">
	import Button from '$lib/Main/Button.svelte';
	import { states, lang } from '$lib/Stores';
	import { openModal } from '$lib/Modals';
	import { entityDevices } from '$lib/Plus/registry';
	import { baseName, escapeHtml, findSibling, stateLine } from '$lib/Plus/entities';

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

	let humidity_id = $derived(
		sel?.humidity_entity || findSibling(entity_id, $states, $entityDevices, 'humidity')
	);

	let line = $derived(entity_id ? stateLine([entity_id, humidity_id], $states, $lang) : '');

	// Button renders `sel.state` before a state template, so the generated
	// line is only used when neither is configured
	let view = $derived({
		...sel,
		entity_id,
		name: sel?.name ?? baseName($states?.[entity_id as string]),
		state: sel?.state ?? (sel?.template?.state || !line ? undefined : escapeHtml(line))
	});

	function openConfig() {
		openModal(() => import('$lib/Plus/TempHumiConfig.svelte'), { sel, sectionName });
	}

	function openDetails() {
		openModal(() => import('$lib/Plus/HistoryModal.svelte'), {
			sel: view,
			entity_ids: [entity_id, humidity_id].filter(Boolean)
		});
	}
</script>

<Button sel={view} {sectionName} {displayOnly} {openConfig} {openDetails} />
