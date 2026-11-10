<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { getLocalTimeZone, today } from '@internationalized/date';
	import DateField from '#lib/DateField.svelte';
	import { regroup } from '#lib/amount.ts';
	import { assetClasses, fundSources, liabilityTerms } from '#lib/asset.ts';
	import { slashDate } from '#lib/date.ts';
	import { money } from '#lib/record.ts';
	import type { PageProps } from './$types';

	type Form = { form?: 'valuation' | 'details'; error?: string; field?: string; values?: Record<string, string> } | null;

	let { data, form: action }: PageProps = $props();
	const form = $derived(action as Form);
	const asset = $derived(data.asset);
	const editing = $derived(data.editing);
	const liability = $derived(asset.cls === 'Liability');
	const gold = $derived(asset.cls === 'Goldbar');

	const kept = $derived(
		(form?.form === 'valuation' && form.values) ||
			editing || { weight: asset.weight == null ? '' : money(asset.weight) }
	);
	const details = $derived((form?.form === 'details' && form.values) || {});
	let date = $state(untrack(() => kept.date ?? slashDate(today(getLocalTimeZone()))));
	let cls = $state(untrack(() => details.cls ?? asset.cls));


	const flagged = (which: 'valuation' | 'details', name: string) =>
		form?.form === which && form.field === name ? { 'aria-invalid': true, 'aria-describedby': `${which}-message` } : {};

	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const field = 'h-11 text-base md:text-base';
</script>

{#snippet amountField(id: string, label: string, value: string | undefined)}
	<div class="flex flex-col gap-1.5">
		<Label for={id} class="leading-snug">{label}</Label>
		<Input
			{id}
			name={id}
			inputmode="decimal"
			autocomplete="off"
			value={value ?? ''}
			oninput={(event) => regroup(event.currentTarget)}
			{...flagged('valuation', id)}
			class={field}
		/>
	</div>
{/snippet}

{#snippet choice(id: string, label: string, options: string[], chosen: string | null | undefined)}
	<div class="flex flex-col gap-1.5">
		<Label for={id}>{label}</Label>
		<select {id} name={id} class={select}>
			{#each options as option (option)}
				<option selected={option === chosen}>{option}</option>
			{/each}
		</select>
	</div>
{/snippet}

{#snippet message(which: 'valuation' | 'details')}
	{#if form?.form === which && form.error}
		<p id="{which}-message" role="alert" class="font-semibold text-destructive">{form.error}</p>
	{/if}
{/snippet}

<a href="/assets" class="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeftIcon class="size-4" />Assets</a>

<div class="flex flex-col gap-1">
	<h1 class="text-3xl break-words">{asset.name}</h1>
	<p class="text-muted-foreground">
		{asset.cls}{#if asset.source}&nbsp;· funded by {asset.source}{/if}{#if asset.term}&nbsp;· {asset.term}{/if}
	</p>
</div>

<section class="flex flex-col gap-3 rounded-xl border bg-card p-4">
	<h2 class="text-xl">{editing ? 'Edit valuation' : 'Add valuation'}</h2>
	<form method="POST" action="?/valuation" class="grid gap-4 md:grid-cols-2">
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}
		<div class="flex flex-col gap-1.5">
			<Label for="date">Date</Label>
			<DateField bind:value={date} {...flagged('valuation', 'date')} />
		</div>
		{#if gold}
			{@render amountField('weight', 'Weight (grams)', kept.weight)}
			{@render amountField('price', 'Market price per gram', kept.price)}
		{:else}
			{@render amountField('amount', liability ? 'Balance' : 'Market value', kept.amount)}
		{/if}
		{#if !liability}
			{@render amountField('acquisition', 'Acquisition value (total cost) – blank = keep latest', kept.acquisition)}
		{/if}
		<div class="flex flex-col gap-1.5 md:col-span-2">
			<Label for="note">Note (optional)</Label>
			<Input id="note" name="note" value={kept.note ?? ''} class={field} />
		</div>
		<div class="flex flex-col gap-2 md:col-span-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
			<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">{editing ? 'Save changes' : 'Add valuation'}</Button>
			{#if editing}
				<Button href="/assets/{encodeURIComponent(asset.name)}" data-sveltekit-reload variant="ghost" class="h-11 text-base">Cancel edit</Button>
			{/if}
			{@render message('valuation')}
		</div>
	</form>
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-xl">Valuations</h2>
	<ul aria-label="Valuations" class="divide-y rounded-xl border bg-card">
		{#each asset.valuations as row (row.id)}
			<li class="flex items-center gap-2 py-2 pr-1 pl-3">
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="text-sm text-muted-foreground tabular-nums">{row.date}</span>
					<span class="font-semibold tabular-nums">
						{money(row.value)} <span class="text-xs font-normal text-muted-foreground">{asset.currency}</span>
					</span>
					<span class="text-xs break-words text-muted-foreground">
						{[
							row.weight != null && row.price != null && `${money(row.weight)} g × ${money(row.price)}`,
							row.acquisition != null && `cost ${money(row.acquisition)}`,
							row.note
						]
							.filter(Boolean)
							.join(' · ')}
					</span>
				</span>
				{#if row.sold}
					<span class="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Sold</span>
				{:else}
					<Button
						href="?edit={row.id}"
						data-sveltekit-reload
						variant="ghost"
						size="icon"
						aria-label="Edit valuation of {row.date}"
						class="size-11 shrink-0 text-muted-foreground lg:size-8"
					>
						<PencilIcon />
					</Button>
					<form method="POST" action="?/delete" class="contents">
						<input type="hidden" name="id" value={row.id} />
						<Button
							type="submit"
							variant="ghost"
							size="icon"
							aria-label="Delete valuation of {row.date}"
							class="size-11 shrink-0 text-muted-foreground hover:text-destructive lg:size-8"
						>
							<Trash2Icon />
						</Button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
</section>

<section class="flex flex-col gap-3 rounded-xl border bg-card p-4">
	<h2 class="text-xl">Details</h2>
	<form method="POST" action="?/details" class="grid gap-4 md:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<Label for="name">Name</Label>
			<Input id="name" name="name" value={details.name ?? asset.name} {...flagged('details', 'name')} class={field} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="cls">Class</Label>
			<select id="cls" name="cls" bind:value={cls} class={select}>
				{#each assetClasses as option (option)}
					<option>{option}</option>
				{/each}
			</select>
		</div>
		{#if cls === 'Liability'}
			{@render choice('term', 'Liability term', liabilityTerms, details.term ?? asset.term)}
		{:else}
			{@render choice('source', 'Source of fund', fundSources, details.source ?? asset.source)}
		{/if}
		<div class="flex flex-col gap-2 md:col-span-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
			<Button type="submit" variant="outline" class="h-11 w-full text-base md:w-auto md:px-8">Save details</Button>
			{@render message('details')}
		</div>
	</form>
</section>
