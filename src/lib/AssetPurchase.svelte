<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import DateField from '#lib/DateField.svelte';
	import { group, parseAmount, regroup } from '#lib/amount.ts';
	import { sources, typeNames, unitOf } from '#lib/asset.ts';

	type Props = {
		kept: Record<string, string>;
		editing: boolean;
		currency: string;
		today: string;
		nextCode: string;
		dreams: { id: number; dream: string }[];
		error?: string;
		invalid?: string;
		saved?: string;
	};

	let { kept, editing, currency, today, nextCode, dreams, error, invalid, saved }: Props = $props();

	const unitCurrencies = ['IDR', 'USD', 'SGD', 'EUR', 'AUD', 'JPY', 'GBP', 'CHF', 'HKD', 'CNY', 'MYR'];

	let date = $derived(kept.date ?? today);
	let cls = $derived(kept.cls ?? typeNames[0]);
	let unit = $derived(kept.unit ?? '');
	let unitCurrency = $derived(kept.unitCurrency || currency);
	let cost = $derived(kept.amount ?? '');
	const unitName = $derived(unitOf(cls));
	const perUnit = $derived.by(() => {
		const total = parseAmount(cost);
		const count = parseAmount(unit);
		if (!total || !count) return null;
		return `${currency} ${group(String(Math.round(total / count)))} per ${unitName ?? unitCurrency}`;
	});

	const flagged = (name: string) => (invalid === name ? { 'aria-invalid': true, 'aria-describedby': 'message' } : {});
	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const field = 'h-11 text-base md:text-base';
</script>

<form method="POST" action="?tab=asset" novalidate class="flex flex-col gap-5">
	<input type="hidden" name="type" value="asset" />
	<input type="hidden" name="currency" value={kept.currency ?? currency} />
	{#if editing}
		<input type="hidden" name="id" value={kept.id} />
	{/if}
	<div class="grid gap-4 md:grid-cols-2">
		<DateField id="date" name="date" label="Purchase date" bind:value={date} invalid={invalid === 'date'} />
		<div class="flex flex-col gap-1.5">
			<Label for="cls">Asset type</Label>
			<select id="cls" name="cls" bind:value={cls} class={select} {...flagged('cls')}>
				{#each typeNames as option (option)}
					<option>{option}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="source">Source</Label>
			<select id="source" name="source" class={select}>
				{#each sources as option (option)}
					<option selected={option === kept.source}>{option}</option>
				{/each}
			</select>
			<p class="text-sm text-muted-foreground">Where the money came from</p>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="unit">{unitName ? `Unit (${unitName})` : 'Unit'}</Label>
			<div class="flex gap-2">
				<Input
					id="unit"
					name="unit"
					inputmode="decimal"
					autocomplete="off"
					value={unit}
					oninput={(event) => (unit = regroup(event.currentTarget))}
					{...flagged('unit')}
					class={field}
				/>
				{#if !unitName}
					<select name="unitCurrency" aria-label="Unit currency" bind:value={unitCurrency} class={[select, 'w-24 shrink-0']}>
						{#each unitCurrencies as code (code)}
							<option>{code}</option>
						{/each}
					</select>
				{/if}
			</div>
			<p class="text-sm text-muted-foreground">Gold gr · Property & Land sqm · Stock lot · Mutual Fund & Other unit · the rest in a currency</p>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="amount">Acquisition cost ({currency})</Label>
			<Input
				id="amount"
				name="amount"
				inputmode="decimal"
				autocomplete="off"
				value={cost}
				oninput={(event) => (cost = regroup(event.currentTarget))}
				{...flagged('amount')}
				class={field}
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<p class="text-sm font-medium">Cost / unit</p>
			<p class="flex h-11 items-center rounded-lg bg-primary/10 px-3 font-semibold text-primary tabular-nums">{perUnit ?? '–'}</p>
			<p class="text-sm text-muted-foreground">Acquisition cost ÷ Unit</p>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="dream">Linked dream</Label>
			<select id="dream" name="dream" class={select}>
				<option value="">None</option>
				{#each dreams as option (option.id)}
					<option value={String(option.id)} selected={String(option.id) === kept.dream}>{option.dream}</option>
				{/each}
			</select>
			<p class="text-sm text-muted-foreground">A dream from the Financial Plan this purchase saves for</p>
		</div>
		<div class="flex flex-col gap-1.5 md:col-span-2">
			<Label for="note">Note (optional)</Label>
			<Input id="note" name="note" value={kept.note ?? ''} placeholder="e.g. Antam bar" class={field} />
		</div>
	</div>
	<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
		<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">{editing ? 'Save changes' : 'Save purchase'}</Button>
		{#if error}
			<p id="message" role="alert" class="font-semibold text-destructive">{error}</p>
		{:else if saved}
			<p id="message" role="status" class="font-semibold text-in">Saved {saved} ✓</p>
		{:else if !editing}
			<p class="text-sm text-muted-foreground">This purchase gets the code {nextCode}.</p>
		{/if}
	</div>
</form>
