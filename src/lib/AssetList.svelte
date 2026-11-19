<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { group, regroup } from '#lib/amount.ts';
	import { groupDate } from '#lib/date.ts';
	import { typeNames } from '#lib/asset.ts';

	type Row = { code: string; label: string; type: string; unit: string; bought: string; cost: number; value: number; gain: number };
	type List = { rows: Row[]; total: { cost: number; value: number; gain: number; share: number | null } } | null;

	type Props = {
		list: List;
		filter: string;
		currency: string;
		today: string;
		error?: string;
		invalid?: string;
		updated?: number;
		sold?: string;
	};

	let { list, filter, currency, today, error, invalid, updated, sold }: Props = $props();

	const shown = (n: number) => group(String(Math.round(n)));
	const signed = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${shown(Math.abs(n))}`;
	const tone = (n: number) => (n < 0 ? 'text-out' : n > 0 ? 'text-in' : '');
	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const cell = 'h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
	const head = 'px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground';
	const flagged = (name: string) => (invalid === name ? { 'aria-invalid': true, 'aria-describedby': 'message' } : {});
</script>

{#if !list}
	<p class="py-12 text-center font-heading text-xl">No assets yet. Save a purchase first.</p>
	{#if sold}
		<p id="message" role="status" class="text-center font-semibold text-in">Sold {sold} ✓</p>
	{/if}
{:else}
	<form method="GET" class="flex flex-col gap-1.5 sm:max-w-xs">
		<input type="hidden" name="tab" value="asset" />
		<input type="hidden" name="view" value="list" />
		<Label for="filter">Filter</Label>
		<select id="filter" name="type" class={select} onchange={(event) => event.currentTarget.form?.requestSubmit()}>
			<option value="" selected={!filter}>All asset types</option>
			{#each typeNames as option (option)}
				<option selected={option === filter}>{option}</option>
			{/each}
		</select>
	</form>

	<form method="POST" action="?tab=asset&view=list{filter ? `&type=${encodeURIComponent(filter)}` : ''}" novalidate class="flex flex-col gap-4">
		<input type="hidden" name="type" value="updates" />
		<div class="relative overflow-x-auto rounded-xl border bg-card">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b">
						<th scope="col" class={[head, 'pl-4']}>Asset code</th>
						<th scope="col" class={head}>Asset type</th>
						<th scope="col" class={head}>Unit</th>
						<th scope="col" class={head}>Acquisition date</th>
						<th scope="col" class={[head, 'text-right']}>Acquisition cost ({currency})</th>
						<th scope="col" class={head}>Value as of</th>
						<th scope="col" class={head}>Market value ({currency})</th>
						<th scope="col" class={[head, 'text-right']}>Gain / Loss ({currency})</th>
						<th scope="col" class={[head, 'pr-4']}><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each list.rows as row (row.code)}
						<tr class="border-b">
							<th scope="row" class="py-2 pr-2 pl-4 text-left font-medium whitespace-nowrap">{row.label}</th>
							<td class="px-2 py-2 whitespace-nowrap">{row.type}</td>
							<td class="px-2 py-2 whitespace-nowrap tabular-nums">{row.unit}</td>
							<td class="px-2 py-2 tabular-nums">{row.bought}</td>
							<td class="px-2 py-2 text-right tabular-nums">{shown(row.cost)}</td>
							<td class="px-2 py-1">
								<input
									name="date-{row.code}"
									aria-label="Value as of, {row.code}"
									inputmode="numeric"
									autocomplete="off"
									value={today}
									oninput={(event) => (event.currentTarget.value = groupDate(event.currentTarget.value))}
									{...flagged(`date-${row.code}`)}
									class={[cell, 'w-28']}
								/>
							</td>
							<td class="px-2 py-1">
								<input
									name="value-{row.code}"
									aria-label="Market value, {row.code}"
									inputmode="decimal"
									autocomplete="off"
									placeholder={shown(row.value)}
									oninput={(event) => regroup(event.currentTarget)}
									{...flagged(`value-${row.code}`)}
									class={[cell, 'w-36']}
								/>
							</td>
							<td class={['px-2 py-2 text-right whitespace-nowrap tabular-nums', tone(row.gain)]}>{signed(row.gain)}</td>
							<td class="py-1 pr-4 pl-2">
								<Button href="/diary?tab=asset&view=list&sell={row.code}" variant="outline" size="sm" class="h-9">Sell</Button>
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="bg-muted font-semibold">
						<th scope="row" colspan="4" class="py-2 pl-4 text-left">Total</th>
						<td class="px-2 py-2 text-right tabular-nums">{shown(list.total.cost)}</td>
						<td></td>
						<td class="px-2 py-2 tabular-nums">{shown(list.total.value)}</td>
						<td class={['px-2 py-2 text-right whitespace-nowrap tabular-nums', tone(list.total.gain)]}>
							{signed(list.total.gain)}{list.total.share === null ? '' : ` (${(list.total.share * 100).toFixed(1)}%)`}
						</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
		<p class="text-sm text-muted-foreground">Each save adds a new valuation, so the value history is kept. Gain / Loss = Market value − Acquisition cost.</p>
		<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
			<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">Save updates</Button>
			{#if error}
				<p id="message" role="alert" class="font-semibold text-destructive">{error}</p>
			{:else if sold}
				<p id="message" role="status" class="font-semibold text-in">Sold {sold} ✓</p>
			{:else if updated !== undefined}
				<p id="message" role="status" class="font-semibold text-in">Saved ✓</p>
			{/if}
		</div>
	</form>
{/if}
