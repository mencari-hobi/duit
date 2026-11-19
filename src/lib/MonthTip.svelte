<script lang="ts">
	import { money, percent, type MonthRow, type Series } from '#lib/chart.ts';

	type Props = { row: MonthRow; series: Series[]; line?: Series };
	let { row, series, line }: Props = $props();

	const shown = $derived([...series.filter((s) => s.value(row) !== 0).reverse(), ...(line ? [line] : [])]);
</script>

<div role="tooltip" class="min-w-44 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
	<p class="mb-1.5 font-medium">{row.month}</p>
	<ul class="flex flex-col gap-1">
		{#each shown as s (s.key)}
			<li class="flex items-center gap-2">
				<span class={['inline-block shrink-0', s === line ? 'h-0.5 w-3' : 'size-2.5 rounded-sm']} style:background={s.color}></span>
				<span class="whitespace-nowrap text-muted-foreground">{s.label}</span>
				<span class="ml-auto pl-3 font-medium whitespace-nowrap tabular-nums">
					{money(s.value(row))}
					{#if s.share}<span class="text-muted-foreground">· {percent(s.share(row))}</span>{/if}
				</span>
			</li>
		{/each}
	</ul>
</div>
