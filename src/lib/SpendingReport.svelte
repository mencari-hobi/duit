<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import DateField from '#lib/DateField.svelte';
	import { group } from '#lib/amount.ts';
	import { slashDate } from '#lib/date.ts';
	import { ratioPercent } from '#lib/plan.ts';
	import { noteKey } from '#lib/spending.ts';
	import { page } from '$app/state';
	import type { SpendingReport } from '#lib/server/spending.ts';

	type Chosen = { period: string; date: string; from: string; to: string; start?: string; end?: string; error?: string };

	type Props = { report: SpendingReport | null; chosen: Chosen; periods: { value: string; label: string }[]; saved?: boolean };

	let { report, chosen, periods, saved }: Props = $props();

	const notesAction = $derived(`${page.url.search ? `${page.url.search}&` : '?'}/notes`);

	let period = $derived(chosen.period);
	let date = $derived(slashDate(chosen.date));
	let from = $derived(slashDate(chosen.from));
	let to = $derived(slashDate(chosen.to));

	const amount = (n: number) => `${n < 0 ? '−' : ''}${group(String(Math.round(Math.abs(n))))}`;
	const signed = (n: number) => `${n > 0 ? '+' : ''}${amount(n)}`;
	const percent = (share: number | null) =>
		share === null ? '–' : `${share > 0 ? '+' : share < 0 ? '−' : ''}${Math.abs(share * 100).toFixed(1)}%`;
	const tone = (good: boolean | null) => (good === null ? '' : good ? 'text-in' : 'text-out');
	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const head = 'px-2.5 py-2 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground';
	const cell = 'px-2.5 py-2 text-right whitespace-nowrap tabular-nums';
	const indent = ['pl-4', 'pl-7', 'pl-10'];
</script>

{#snippet line(row: { label: string; actual: number; budget: number; variance: number; share: number | null; good: boolean | null }, depth: number, strong: boolean, key: string)}
	<tr class={['border-b last:border-b-0', strong && 'bg-muted font-semibold']}>
		<th scope="row" class={['py-2 pr-2 text-left leading-snug', strong ? 'font-semibold' : 'font-normal', indent[depth]]}>{row.label}</th>
		<td class={cell}>{amount(row.actual)}</td>
		<td class={cell}>{amount(row.budget)}</td>
		<td class={[cell, tone(row.good)]}>{signed(row.variance)}</td>
		<td class={[cell, tone(row.good)]}>{percent(row.share)}</td>
		<td class="py-1 pr-4 pl-2.5">
			<input
				name="note:{key}"
				aria-label="Note, {key}"
				value={report?.notes[key] ?? ''}
				autocomplete="off"
				class="h-9 w-full min-w-40 rounded-md border border-input bg-transparent px-2 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
			/>
		</td>
	</tr>
{/snippet}

<form method="GET" class="flex flex-wrap items-end gap-3">
	<div class="flex w-full flex-col gap-1.5 sm:w-48">
		<Label for="period">Period</Label>
		<select id="period" name="period" bind:value={period} class={select}>
			{#each periods as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
	{#if period === 'on' || period === 'before'}
		<div class="w-full sm:w-56"><DateField id="date" name="date" label="Date" bind:value={date} /></div>
	{:else if period === 'between'}
		<div class="w-full sm:w-56"><DateField id="from" name="from" label="From" bind:value={from} /></div>
		<div class="w-full sm:w-56"><DateField id="to" name="to" label="To" bind:value={to} invalid={!!chosen.error} /></div>
	{/if}
	<Button type="submit" variant="outline" class="h-11 w-full px-6 text-base sm:w-auto">Show</Button>
</form>

{#if chosen.error}
	<p id="message" role="alert" class="font-semibold text-destructive">{chosen.error}</p>
{:else if report}
	<p class="text-muted-foreground">
		<span class="tabular-nums">{slashDate(report.start)} – {slashDate(report.end)}</span>, in {report.currency}
	</p>
	<form method="POST" action={notesAction} class="flex flex-col gap-4">
	<input type="hidden" name="start" value={report.start} />
	<input type="hidden" name="end" value={report.end} />
	<section aria-labelledby="spending-title" class="overflow-hidden rounded-xl border bg-card">
		<h2 id="spending-title" class="border-b px-4 py-3 text-lg">Actual against budget</h2>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b">
						<th scope="col"><span class="sr-only">Line</span></th>
						<th scope="col" class={head}>Actual</th>
						<th scope="col" class={head}>Budget</th>
						<th scope="col" class={head}>Variance</th>
						<th scope="col" class={head}>%</th>
						<th scope="col" class={[head, 'pr-4 text-left']}>Note</th>
					</tr>
				</thead>
				<tbody>
					{#each report.sections as section (section.name)}
						{@render line(section, 0, true, noteKey(section.name))}
						{#if section.types.length}
							{#each section.types as type (type.name)}
								{@render line(type, 1, false, noteKey(section.name, type.name))}
								{#each type.rows as row (row.label)}
									{@render line(row, 2, false, noteKey(section.name, type.name, row.label))}
								{/each}
							{/each}
						{:else}
							{#each section.rows as row (row.label)}
								{@render line(row, 1, false, noteKey(section.name, row.label))}
							{/each}
						{/if}
					{/each}
					{@render line(report.free, 0, true, noteKey(report.free.label))}
				</tbody>
			</table>
		</div>
	</section>
	<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
		<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">Save notes</Button>
		{#if saved}
			<p id="message" role="status" class="font-semibold text-in">Saved ✓</p>
		{/if}
	</div>
	</form>
	<section aria-labelledby="ratios-title" class="overflow-hidden rounded-xl border bg-card">
		<h2 id="ratios-title" class="border-b px-4 py-3 text-lg">Ratios</h2>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b">
						<th scope="col"><span class="sr-only">Ratio</span></th>
						<th scope="col" class={head}>Actual</th>
						<th scope="col" class={head}>Budget</th>
						<th scope="col" class={[head, 'pr-4']}>Difference</th>
					</tr>
				</thead>
				<tbody>
					{#each report.ratios as ratio (ratio.name)}
						<tr class="border-b last:border-b-0">
							<th scope="row" class="py-2 pr-2 pl-4 text-left font-normal">{ratio.name}</th>
							<td class={cell}>{ratioPercent(ratio.actual)}</td>
							<td class={cell}>{ratioPercent(ratio.budget)}</td>
							<td class={[cell, 'pr-4']}>{ratio.bps === null ? '–' : `${ratio.bps > 0 ? '+' : ratio.bps < 0 ? '−' : ''}${group(String(Math.abs(ratio.bps)))} bps`}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
	<p class="text-sm text-muted-foreground">
		Budget = the Plan's monthly amount × 1 for exactly one reporting month, or × days ÷ 30. Variance = Actual − Budget.
		Green is favourable: income, saving, and free cash flow above budget, debt payment and expense below it.
	</p>
{/if}
