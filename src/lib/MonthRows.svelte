<script lang="ts">
	import { BarChart } from 'layerchart';
	import Fit from '#lib/Fit.svelte';
	import { barSeries, chartData, mio, percent, stackBase, tickLabel, ticks, type MonthChart } from '#lib/chart.ts';

	let { id, rows, series, layout = 'group', line }: MonthChart = $props();

	const newest = $derived([...rows].reverse());
	const data = $derived(chartData(newest, series));
	const steps = $derived(ticks(rows, series, layout, line));
	const step = $derived(layout === 'group' ? 34 : 28);
	const pad = { top: 4, right: 10, bottom: 22, left: 54 };
	const height = $derived(rows.length * step + pad.top + pad.bottom);
</script>

<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
	{#each [...series, ...(line ? [line] : [])] as s (s.key)}
		<li class="flex items-center gap-1.5">
			<span class={['inline-block', s === line ? 'size-2.5 rounded-full' : 'size-2.5 rounded-sm']} style:background={s.color}></span>
			{s.label}
		</li>
	{/each}
</ul>

<Fit {id}>
	{#snippet children(width)}
		<div class="relative" style:height="{height}px">
			<BarChart
				{width}
				{height}
				{data}
				y="month"
				orientation="horizontal"
				series={barSeries(series)}
				seriesLayout={layout}
				xDomain={[0, steps.at(-1)!]}
				xNice={false}
				padding={pad}
				tooltipContext={false}
				highlight={false}
				bandPadding={layout === 'group' ? 0.2 : 0.25}
				props={{
					bars: { stroke: 'none', radius: 3 },
					xAxis: { ticks: steps, format: tickLabel, tickLabelProps: { class: 'text-[11px]' } },
					yAxis: { tickLabelProps: { class: 'text-[11px] tabular-nums' } }
				}}
			>
				{#snippet aboveMarks({ context })}
					{@const band = context.yScale.bandwidth!()}
					{#if layout === 'stack'}
						{#each newest as row (row.month)}
							{@const y = context.yScale(row.month) + band / 2}
							{#each series as s, i (s.key)}
								{@const before = stackBase(series, i, row)}
								{@const x0 = context.xScale(before)}
								{@const x1 = context.xScale(before + mio(s.value(row)))}
								{#if s.share && x1 - x0 >= 28}
									<text x={(x0 + x1) / 2} {y} dy="0.35em" text-anchor="middle" class="fill-card text-[10px] font-semibold">
										{percent(s.share(row))}
									</text>
								{/if}
							{/each}
						{/each}
					{/if}
					{#if line}
						{@const points = newest.map((row) => [context.xScale(mio(line.value(row))), context.yScale(row.month) + band / 2])}
						<path d={'M' + points.map((p) => p.join(',')).join('L')} fill="none" stroke={line.color} stroke-width="2" />
						{#each points as [cx, cy], i (i)}
							<circle {cx} {cy} r="3.5" style:fill={line.color} style:stroke="var(--card)" stroke-width="1.5" />
						{/each}
					{/if}
				{/snippet}
			</BarChart>
		</div>
	{/snippet}
</Fit>
