<script lang="ts">
	import { BarChart } from 'layerchart';
	import { group } from '#lib/amount.ts';
	import Fit from '#lib/Fit.svelte';

	type Props = { id: string; rows: { name: string; amount: number }[]; color: string; name?: (name: string) => string };
	let { id, rows, color, name = (text) => text }: Props = $props();

	const step = 44;
	const height = $derived(rows.length * step + 6);
	const max = $derived(Math.max(...rows.map((row) => row.amount), 1));
</script>

<Fit {id}>
	{#snippet children(width)}
		<div class="relative" style:height="{height}px">
			<BarChart
				{width}
				{height}
				data={rows}
				x="amount"
				y="name"
				orientation="horizontal"
				xDomain={[0, max]}
				padding={{ top: 6, right: 0, bottom: 0, left: 0 }}
				bandPadding={0.62}
				axis={false}
				grid={false}
				rule={false}
				tooltipContext={false}
				highlight={false}
				series={[{ key: 'amount', color }]}
				props={{ bars: { stroke: 'none', radius: 3 } }}
			>
				{#snippet belowMarks({ context })}
					{#each rows as row (row.name)}
						<rect x="0" y={context.yScale(row.name)} width={context.width} height={context.yScale.bandwidth!()} rx="3" class="fill-muted" />
					{/each}
				{/snippet}
				{#snippet aboveMarks({ context })}
					{#each rows as row (row.name)}
						{@const top = context.yScale(row.name) - 6}
						<text x="0" y={top} class="fill-foreground text-xs">{name(row.name)}</text>
						<text x={context.width} y={top} text-anchor="end" class="fill-muted-foreground text-xs tabular-nums">{group(String(row.amount))}</text>
					{/each}
				{/snippet}
			</BarChart>
		</div>
	{/snippet}
</Fit>
