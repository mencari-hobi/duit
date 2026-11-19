<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import AmountField from '#lib/AmountField.svelte';
	import DateField from '#lib/DateField.svelte';

	type Props = {
		asset: { code: string; label: string };
		kept: Record<string, string>;
		editing: boolean;
		currency: string;
		today: string;
		error?: string;
		invalid?: string;
	};

	let { asset, kept, editing, currency: fallback, today, error, invalid }: Props = $props();

	let date = $state(untrack(() => kept.date ?? today));
	let amount = $state(untrack(() => kept.amount ?? ''));
	let currency = $state(untrack(() => kept.currency ?? fallback));
</script>

<form method="POST" action={editing ? undefined : `?tab=asset&view=list&sell=${asset.code}`} novalidate class="flex flex-col gap-5">
	<h2 class="text-2xl">Sell {asset.label}</h2>
	<input type="hidden" name="type" value="sale" />
	<input type="hidden" name="asset" value={asset.code} />
	{#if editing}
		<input type="hidden" name="id" value={kept.id} />
	{/if}

	<AmountField label="Proceeds" sign="+" signColor="text-in" bind:amount bind:currency {invalid} />

	<div class="grid gap-4 md:grid-cols-2">
		<DateField id="date" name="date" label="Date" bind:value={date} invalid={invalid === 'date'} />
		<div class="flex flex-col gap-1.5 md:col-span-2">
			<Label for="note">Note (optional)</Label>
			<Input id="note" name="note" value={kept.note ?? ''} class="h-11 text-base md:text-base" />
		</div>
	</div>

	<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
		<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">{editing ? 'Save changes' : 'Save sale'}</Button>
		<Button href={editing ? '/records' : '/diary?tab=asset&view=list'} variant="ghost" class="h-11 text-base">Cancel</Button>
		{#if error}
			<p id="message" role="alert" class="font-semibold text-destructive">{error}</p>
		{/if}
	</div>
</form>
