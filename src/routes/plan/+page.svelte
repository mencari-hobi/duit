<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import AmountField from '#lib/AmountField.svelte';
	import { group, parseAmount, regroup } from '#lib/amount.ts';
	import { capitalize, expenseDefaults, expenseTypes, owners } from '#lib/category.ts';
	import { groupDate } from '#lib/date.ts';
	import { debtCategories, planIncomeCategories, ratioPercent, tabs, timeframe, timeframes } from '#lib/plan.ts';
	import type { Row } from '#lib/server/plan.ts';
	import type { PageProps } from './$types';

	type Form = { added?: boolean; error?: string; field?: string; values?: Record<string, string> } | null;

	let { data, form: action }: PageProps = $props();
	const form = $derived(action as Form);
	const editing = $derived(data.editing);
	const kept = $derived(form?.values ?? editing ?? {});
	const tab = $derived(form?.values?.tab ?? data.tab);
	const home = $derived(data.settings!.currency);

	const expenseCategories = Object.keys(expenseDefaults).map(capitalize);

	let amount = $derived(kept.amount ?? '');
	let currency = $derived(kept.currency ?? home);
	let category = $derived(kept.category ?? (tab === 'expense' ? expenseCategories[0] : ''));
	let expenseType = $derived(
		(category === kept.category && kept.expenseType) || expenseDefaults[category.toLowerCase()] || expenseTypes[0]
	);
	let dreamAmount = $derived(kept.amount ?? '');
	let months = $derived(kept.months ?? '');
	let start = $derived(kept.start ?? (tab === 'saving' ? data.today : ''));
	let end = $derived(kept.end ?? '');

	const perMonth = $derived.by(() => {
		const needed = parseAmount(dreamAmount);
		const count = Number(months);
		return needed && Number.isInteger(count) && count >= 1 ? group(String(Math.round(needed / count))) : null;
	});

	const view = $derived(timeframe(data.view));
	const shown = (n: number) => (n < 0 ? '−' : '') + group(String(Math.round(Math.abs(n))));

	const flagged = (name: string) =>
		form?.field === name ? { 'aria-invalid': true, 'aria-describedby': 'message' } : {};

	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const field = 'h-11 text-base md:text-base';
	const tint: Record<string, string> = {
		income: 'bg-in-muted text-in',
		expense: 'bg-out-muted text-out',
		saving: 'bg-chart-5/15 text-chart-5',
		debt: 'bg-chart-4/15 text-chart-4',
		budget: 'bg-muted text-foreground'
	};
	const saveAction = $derived(`?/save&tab=${tab}${editing ? `&edit=${editing.id}` : ''}`);
</script>

{#snippet choice(id: string, name: string, label: string, options: string[], chosen?: string)}
	<div class="flex flex-col gap-1.5">
		<Label for={id}>{label}</Label>
		<select {id} {name} class={select}>
			{#each options as option (option)}
				<option selected={option === chosen}>{option}</option>
			{/each}
		</select>
	</div>
{/snippet}

{#snippet timeframePicker(help: string)}
	<div class="flex flex-col gap-1.5">
		<Label for="timeframe">Timeframe</Label>
		<select id="timeframe" name="timeframe" class={select}>
			{#each timeframes as option (option.value)}
				<option value={option.value} selected={option.value === (kept.timeframe ?? 'monthly')}>{option.label}</option>
			{/each}
		</select>
		<p class="text-sm text-muted-foreground">{help}</p>
	</div>
{/snippet}

{#snippet dateField(id: string, label: string, value: string, set: (text: string) => void)}
	<div class="flex flex-col gap-1.5">
		<Label for={id}>{label}</Label>
		<Input
			{id}
			name={id}
			inputmode="numeric"
			autocomplete="off"
			placeholder="YYYY/MM/DD"
			{value}
			oninput={(event) => set(groupDate(event.currentTarget.value))}
			{...flagged(id)}
			class={field}
		/>
	</div>
{/snippet}

{#snippet itemRow(row: Row, depth: number)}
	<tr class="border-b">
		<th scope="row" class={['py-2 pr-2 text-left font-normal [overflow-wrap:anywhere]', depth === 2 ? 'pl-7 text-muted-foreground md:pl-10' : 'pl-4 md:pl-7']}>{row.label}</th>
		<td class="py-2 text-right whitespace-nowrap tabular-nums">{row.currency === home ? "" : `${row.currency} `}{shown(row.amount)}</td>
		<td class="w-24 py-1 pr-2">
			<div class="flex justify-end">
				<Button href="/plan?edit={row.key}" variant="ghost" size="icon" aria-label="Edit {row.label}" class="size-11 lg:size-8">
					<PencilIcon />
				</Button>
				<form method="POST" action="?/delete&tab=budget&view={view.value}" class="contents">
					<input type="hidden" name="id" value={row.key} />
					<Button type="submit" variant="ghost" size="icon" aria-label="Delete {row.label}" class="size-11 text-muted-foreground hover:text-destructive lg:size-8">
						<Trash2Icon />
					</Button>
				</form>
			</div>
		</td>
	</tr>
{/snippet}

<div class="flex w-full max-w-2xl flex-col gap-5">
	{#if editing}
		<div class="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 py-1 pr-1 pl-3 text-sm">
			<span>Editing a plan item</span>
			<Button href="/plan?tab=budget" variant="ghost" class="h-11 px-3 text-base text-primary">Cancel edit</Button>
		</div>
	{/if}
	<h1 class="text-3xl">Financial Plan</h1>
	<nav aria-label="Plan tabs" class="flex flex-wrap rounded-3xl border bg-card p-1">
		{#each tabs as item (item.value)}
			<a
				href="/plan?tab={item.value}"
				aria-current={tab === item.value ? 'page' : undefined}
				class={[
					'flex h-10 flex-auto items-center justify-center rounded-full px-3 text-base font-medium whitespace-nowrap text-muted-foreground no-underline hover:no-underline',
					tab === item.value && tint[item.value]
				]}
			>
				{item.label}
			</a>
		{/each}
	</nav>

	{#if tab === 'budget'}
		<form method="GET" class="flex flex-col gap-1.5">
			<input type="hidden" name="tab" value="budget" />
			<Label for="view">Timeframe</Label>
			<select id="view" name="view" class={select} onchange={(event) => event.currentTarget.form?.requestSubmit()}>
				{#each timeframes as option (option.value)}
					<option value={option.value} selected={option.value === view.value}>{option.label}</option>
				{/each}
			</select>
			<p class="text-sm text-muted-foreground">Every plan item is converted to this timeframe, for example weekly income × 4 for monthly.</p>
		</form>

		{#if !data.budget}
			<p class="py-12 text-center font-heading text-xl">Nothing planned yet.</p>
		{:else}
			<div class="relative overflow-x-auto rounded-xl border bg-card">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="border-b text-xs text-muted-foreground">
							<th scope="col" class="px-4 py-2 text-left font-semibold">Item</th>
							<th scope="col" class="py-2 text-right font-semibold whitespace-nowrap">{data.settings!.currency} per {view.unit}</th>
							<th scope="col"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.budget.groups as part (part.name)}
							<tr class="border-b bg-muted font-semibold">
								<th scope="row" class="px-4 py-2 text-left">{part.name}</th>
								<td class="py-2 text-right tabular-nums">{shown(part.total)}</td>
								<td></td>
							</tr>
							{#if part.types.length}
								{#each part.types as type (type.name)}
									<tr class="border-b font-semibold">
										<th scope="row" class="py-2 pl-7 text-left">{type.name}</th>
										<td class="py-2 text-right tabular-nums">{shown(type.total)}</td>
										<td></td>
									</tr>
									{#each type.rows as row (row.key)}
										{@render itemRow(row, 2)}
									{/each}
								{/each}
							{:else}
								{#each part.rows as row (row.key)}
									{@render itemRow(row, 1)}
								{/each}
							{/if}
						{/each}
						<tr class="bg-in-muted text-in">
							<th scope="row" class="px-4 py-2 text-left">
								<span class="block font-semibold">Free Cash Flow</span>
								<span class="text-xs font-normal">Income − Debt payment − Saving − Expense</span>
							</th>
							<td class="py-2 text-right font-semibold tabular-nums">{shown(data.budget.free)}</td>
							<td></td>
						</tr>
					</tbody>
				</table>
			</div>

			{#if data.budget.idle.length}
				<section aria-labelledby="idle-title" class="relative overflow-x-auto rounded-xl border bg-card">
					<h2 id="idle-title" class="px-4 pt-3 text-base">Not counted today</h2>
					<p class="px-4 pb-2 text-sm text-muted-foreground">Installments outside their start and end payment, and items in a currency other than {home}.</p>
					<table class="w-full border-collapse text-sm">
						<tbody>
							{#each data.budget.idle as row (row.key)}
								{@render itemRow(row, 1)}
							{/each}
						</tbody>
					</table>
				</section>
			{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.budget.ratios as ratio (ratio.name)}
					<div class="rounded-xl border bg-card p-4">
						<p class="text-sm text-muted-foreground">{ratio.name}</p>
						<p class="font-heading text-2xl font-semibold tabular-nums">{ratioPercent(ratio.value)}</p>
						<p class="text-xs text-muted-foreground">{ratio.formula}</p>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<form method="POST" action={saveAction} novalidate class="flex flex-col gap-5">
			<input type="hidden" name="tab" value={tab} />
			{#if editing}
				<input type="hidden" name="id" value={editing.id} />
			{/if}

			{#if tab === 'saving'}
				<input type="hidden" name="currency" value={currency} />
				<div class="flex flex-col gap-1.5">
					<Label for="dream">My dream</Label>
					<Input id="dream" name="dream" placeholder="e.g. Emergency fund" value={kept.dream ?? ''} {...flagged('dream')} class={field} />
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<Label for="amount">Amount I need ({currency})</Label>
						<Input
							id="amount"
							name="amount"
							inputmode="decimal"
							autocomplete="off"
							value={dreamAmount}
							oninput={(event) => (dreamAmount = regroup(event))}
							{...flagged('amount')}
							class={field}
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="months">I will achieve this in (months)</Label>
						<Input id="months" name="months" inputmode="numeric" autocomplete="off" bind:value={months} {...flagged('months')} class={field} />
					</div>
					{@render dateField('start', 'Start saving', start, (text) => (start = text))}
				</div>
				<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/10 px-4 py-3 text-primary">
					<div>
						<p class="font-semibold">I need to save</p>
						<p class="text-xs">Amount I need ÷ months</p>
					</div>
					<p class="font-heading text-2xl font-semibold tabular-nums">
						{perMonth ? `${currency} ${perMonth} per month` : '–'}
					</p>
				</div>
			{:else if tab === 'debt'}
				<div class="flex flex-col gap-1.5">
					<Label for="category">Debt category</Label>
					<select id="category" name="category" class={select}>
						{#each debtCategories as option (option)}
							<option selected={option === kept.category}>{option}</option>
						{/each}
					</select>
				</div>
				<AmountField label="Monthly installment" sign="−" signColor="text-chart-4" bind:amount bind:currency invalid={form?.field} />
				<div class="grid gap-4 md:grid-cols-2">
					{@render dateField('start', 'Start payment', start, (text) => (start = text))}
					{@render dateField('end', 'End payment', end, (text) => (end = text))}
				</div>
				<p class="text-sm text-muted-foreground">The installment counts in the budget only between the start and end payment.</p>
			{:else}
				<AmountField
					label="Amount"
					sign={tab === 'expense' ? '−' : '+'}
					signColor={tab === 'expense' ? 'text-out' : 'text-in'}
					bind:amount
					bind:currency
					invalid={form?.field}
				/>
				<div class="grid gap-4 md:grid-cols-2">
					{@render timeframePicker(tab === 'expense' ? 'How often you spend this amount' : 'How often you receive this amount')}
					{#if tab === 'expense'}
						<div class="flex flex-col gap-1.5">
							<Label for="category">Category</Label>
							<select id="category" name="category" class={select} bind:value={category}>
								{#each expenseCategories as option (option)}
									<option>{option}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="expense-type">Expense type</Label>
							<select id="expense-type" name="expenseType" class={select} value={expenseType} onchange={(event) => (expenseType = event.currentTarget.value)}>
								{#each expenseTypes as option (option)}
									<option>{option}</option>
								{/each}
							</select>
							<p class="text-sm text-muted-foreground">Filled from the category, can be changed</p>
						</div>
						{@render choice('owner', 'owner', 'Expense owner', owners, kept.owner)}
					{:else}
						{@render choice('category', 'category', 'Category', planIncomeCategories, kept.category)}
					{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="note">Note (optional)</Label>
					<Input id="note" name="note" value={kept.note ?? ''} class={field} />
				</div>
			{/if}

			<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
				<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">{editing ? 'Save changes' : 'Add to plan'}</Button>
				{#if form?.error}
					<p id="message" role="alert" class="font-semibold text-destructive">{form.error}</p>
				{:else if form?.added}
					<p id="message" role="status" class="font-semibold text-in">Added ✓</p>
				{/if}
			</div>
		</form>
	{/if}
</div>
