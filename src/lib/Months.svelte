<script lang="ts">
	import type { MonthChart } from '#lib/chart.ts';
	import MonthRows from '#lib/MonthRows.svelte';
	import MonthBars from '#lib/MonthBars.svelte';

	let { id, rows, series, layout = 'group', line }: MonthChart = $props();
</script>

<div class="flex flex-col gap-3 md:hidden">
	<MonthRows {id} {rows} {series} {layout} {line} />
</div>
<div class="hidden flex-col gap-3 md:flex">
	<MonthBars id="{id}-upright" {rows} {series} {layout} {line} />
</div>
