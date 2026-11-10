<script lang="ts">
	import { BarChart } from 'layerchart';
	import Fit from '#lib/Fit.svelte';
	import { barSeries, chartData, mio, percent, stackBase, tickLabel, ticks, type MonthChart } from '#lib/chart.ts';

	let { id, rows, series, layout = 'group', line }: MonthChart = $props();

	const height = 240;
	const data = $derived(chartData(rows, series));
	const steps = $derived(ticks(rows, series, layout, line));
	const pad = { top: 10, right: 6, bottom: 24, left: 0 };
	const y = (value: number) => pad.top + (1 - value / steps.at(-1)!) * (height - pad.top - pad.bottom);
	const labeled = (wide: number) => {
		const every = Math.ceil(50 / (wide / Math.max(rows.length, 1)));
		return rows.filter((_, i) => (rows.length - 1 - i) % every === 0).map((row) => row.month);
	};
</script>

<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
	{#each [...series, ...(line ? [line] : [])] as s (s.key)}
		<li class="flex items-center gap-1.5">
			<span class={['inline-block', s === line ? 'h-0.5 w-3' : 'size-2.5 rounded-sm']} style:background={s.color}></span>
			{s.label}
		</li>
	{/each}
</ul>

<Fit {id}>
	{#snippet children(width)}
		{@const wide = width - 40}
		<div class="flex">
			<div class="relative w-10 shrink-0 text-[11px] text-muted-foreground tabular-nums" style:height="{height}px" aria-hidden="true">
				{#each steps as step (step)}
					<span class="absolute right-1.5 -translate-y-1/2" style:top="{y(step)}px">{tickLabel(step)}</span>
				{/each}
			</div>
			<div class="relative" style:width="{wide}px" style:height="{height}px">
				<BarChart
					width={wide}
					{height}
					{data}
					x="month"
					series={barSeries(series)}
					seriesLayout={layout}
					yDomain={[0, steps.at(-1)!]}
					yNice={false}
					padding={pad}
					axis="x"
					tooltipContext={false}
					highlight={false}
					bandPadding={layout === 'group' ? 0.25 : 0.3}
					props={{ bars: { stroke: 'none', radius: 3 }, xAxis: { ticks: labeled(wide), tickLabelProps: { class: 'text-[11px]' } } }}
				>
					{#snippet aboveMarks({ context })}
						{@const band = context.xScale.bandwidth!()}
						{#if layout === 'stack'}
							{#each rows as row (row.month)}
								{@const x = context.xScale(row.month) + band / 2}
								{#each series as s, i (s.key)}
									{@const below = stackBase(series, i, row)}
									{@const y0 = context.yScale(below)}
									{@const y1 = context.yScale(below + mio(s.value(row)))}
									{#if s.share && band >= 24 && y0 - y1 >= 13}
										<text {x} y={(y0 + y1) / 2} dy="0.35em" text-anchor="middle" class="fill-card text-[10px] font-semibold">
											{percent(s.share(row))}
										</text>
									{/if}
								{/each}
							{/each}
						{/if}
						{#if line}
							{@const points = rows.map((row) => [context.xScale(row.month) + band / 2, context.yScale(mio(line.value(row)))])}
							<path d={'M' + points.map((p) => p.join(',')).join('L')} fill="none" stroke={line.color} stroke-width="2" />
							{#each points as [cx, cy], i (i)}
								<circle {cx} {cy} r="3" style:fill={line.color} style:stroke="var(--card)" stroke-width="1.5" />
							{/each}
						{/if}
					{/snippet}
				</BarChart>
			</div>
		</div>
	{/snippet}
</Fit>
