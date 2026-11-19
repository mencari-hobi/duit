<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import DateField from '#lib/DateField.svelte';
	import { group, parseAmount, regroup } from '#lib/amount.ts';
	import { isoDate, slashDate } from '#lib/date.ts';
	import { debtCategories, paymentCount, paymentTypes, scheduledEnd } from '#lib/debt.ts';

	type Props = {
		kept: Record<string, string>;
		editing: boolean;
		currency: string;
		nextCode: string;
		error?: string;
		invalid?: string;
		saved?: string;
	};

	let { kept, editing, currency, nextCode, error, invalid, saved }: Props = $props();

	let category = $derived(kept.category ?? debtCategories[0]);
	let amount = $derived(kept.amount ?? '');
	let tenor = $derived(kept.tenor ?? '');
	let paymentType = $derived(kept.paymentType ?? 'Monthly');
	let start = $derived(kept.start ?? '');
	let end = $derived(kept.end ?? '');
	let installment = $derived(kept.installment ?? '');

	const months = $derived(/^\d+$/.test(tenor) && Number(tenor) >= 1 ? Number(tenor) : null);
	const payments = $derived(months ? paymentCount(months, paymentType) : null);
	const total = $derived.by(() => {
		const each = parseAmount(installment);
		return payments && each ? each * payments : null;
	});
	const interest = $derived.by(() => {
		const debt = parseAmount(amount);
		return total && debt ? `${((total / debt - 1) * 100).toFixed(1)}%` : '–';
	});
	const expectedEnd = $derived.by(() => {
		const from = isoDate(start);
		const to = isoDate(end);
		if (!from || !to || !months) return null;
		const scheduled = scheduledEnd(from, months, paymentType);
		return scheduled === to ? null : slashDate(scheduled);
	});

	const flagged = (name: string) => (invalid === name ? { 'aria-invalid': true, 'aria-describedby': 'message' } : {});
	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const field = 'h-11 text-base md:text-base';
	const shown = 'flex h-11 items-center rounded-lg bg-primary/10 px-3 font-semibold text-primary tabular-nums';
</script>

<form method="POST" action="?tab=debt" novalidate class="flex flex-col gap-5">
	<input type="hidden" name="type" value="debt" />
	{#if editing}
		<input type="hidden" name="id" value={kept.id} />
	{/if}
	<div class="grid gap-4 md:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<Label for="category">Debt category</Label>
			<select id="category" name="category" bind:value={category} class={select} {...flagged('category')}>
				{#each debtCategories as option (option)}
					<option>{option}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="amount">Debt amount ({currency})</Label>
			<Input
				id="amount"
				name="amount"
				inputmode="decimal"
				autocomplete="off"
				value={amount}
				oninput={(event) => (amount = regroup(event))}
				{...flagged('amount')}
				class={field}
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="tenor">Tenor (months)</Label>
			<Input id="tenor" name="tenor" inputmode="numeric" autocomplete="off" bind:value={tenor} {...flagged('tenor')} class={field} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="payment-type">Payment type</Label>
			<select id="payment-type" name="paymentType" bind:value={paymentType} class={select} {...flagged('paymentType')}>
				{#each paymentTypes as option (option)}
					<option>{option}</option>
				{/each}
			</select>
		</div>
		<DateField id="start" name="start" label="Start payment" bind:value={start} invalid={invalid === 'start'} />
		<DateField id="end" name="end" label="End payment" bind:value={end} invalid={invalid === 'end'} />
		<div class="flex flex-col gap-1.5">
			<Label for="installment">Installment amount ({currency})</Label>
			<Input
				id="installment"
				name="installment"
				inputmode="decimal"
				autocomplete="off"
				value={installment}
				oninput={(event) => (installment = regroup(event))}
				{...flagged('installment')}
				class={field}
			/>
			<p class="text-sm text-muted-foreground">Per payment (daily, weekly or monthly as chosen)</p>
		</div>
		{#if expectedEnd}
			<p class="self-end text-sm font-medium text-chart-4">The end payment differs from start + tenor ({expectedEnd}).</p>
		{/if}
		<div role="group" aria-labelledby="total-label" class="flex flex-col gap-1.5">
			<p id="total-label" class="text-sm font-medium">Total debt &amp; interest</p>
			<p class={shown}>{total === null ? '–' : `${currency} ${group(String(Math.round(total)))}`}</p>
			<p class="text-sm text-muted-foreground">Installment × {payments ?? '–'} payments</p>
		</div>
		<div role="group" aria-labelledby="interest-label" class="flex flex-col gap-1.5">
			<p id="interest-label" class="text-sm font-medium">Interest (flat)</p>
			<p class={shown}>{interest}</p>
			<p class="text-sm text-muted-foreground">Total debt &amp; interest ÷ Debt amount − 1</p>
		</div>
	</div>
	<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
		<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">{editing ? 'Save changes' : 'Save debt'}</Button>
		{#if error}
			<p id="message" role="alert" class="font-semibold text-destructive">{error}</p>
		{:else if saved}
			<p id="message" role="status" class="font-semibold text-in">Saved {saved} ✓</p>
		{:else if !editing}
			<p class="text-sm text-muted-foreground">This debt gets the code {nextCode}.</p>
		{/if}
	</div>
</form>
