<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { regroup, sizeOf } from '#lib/amount.ts';
	import { capitalize } from '#lib/category.ts';
	import { groupDate, isoDate, slashDate } from '#lib/date.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
	import type { PageProps } from './$types';

	type Kind = 'income' | 'expense' | 'asset';
	type Form = { added?: boolean; error?: string; field?: string; values?: Record<string, string> } | null;

	let { data, form: action }: PageProps = $props();
	const form = $derived(action as Form);
	const sent = untrack(() => form?.values);

	const defaults = {
		income: ['salary', 'freelance', 'dividend', 'bonus', 'other'],
		expense: [
			'grocery', 'eating out', 'electricity', 'gasoline & tolls', 'school tuition', 'phone credit',
			'internet', 'self care/entertainment', 'clothes', 'sports/gym', 'healthcare', 'courses',
			'gift & charity', 'house maintenance', 'car maintenance', 'housekeeping',
			'birthday/anniversary/holiday', 'mortgage', 'car installment', 'debt payment', 'other installment'
		]
	};
	const expenseTypes = ['Fixed - Essential', 'Non-fixed - Essential', 'Fixed - Non-essential', 'Non-fixed - Non-essential'];
	const owners = ['Personal', 'Spouse', 'Children', 'Family', 'Extended Family'];
	const classes = ['Cash', 'Investments', 'Property', 'Other', 'Liability'];
	const sources = ['Salary', 'Freelance', 'Dividend', 'Bonus', 'Other', 'Debt'];
	const terms = ['Short term', 'Long term'];
	const types: [Kind, string][] = [
		['income', 'Income'],
		['expense', 'Expense'],
		['asset', 'Asset / Liability']
	];
	const tint: Record<Kind, string> = {
		income: 'has-checked:bg-in-muted has-checked:text-in',
		expense: 'has-checked:bg-out-muted has-checked:text-out',
		asset: 'has-checked:bg-chart-5/15 has-checked:text-chart-5'
	};

	const kept = $derived(form?.values ?? {});
	let date = $state(sent?.date ?? slashDate(today(getLocalTimeZone())));
	let calendarOpen = $state(false);
	const picked = $derived(isoDate(date) ? parseDate(isoDate(date)!) : undefined);
	let type = $state((sent?.type ?? 'income') as Kind);
	let cls = $state(sent?.cls ?? 'Cash');
	const liability = $derived(type === 'asset' && cls === 'Liability');
	const sign = $derived(type === 'expense' ? '−' : '+');
	const signColor = $derived(type === 'income' ? 'text-in' : type === 'expense' ? 'text-out' : 'text-chart-5');

	const list = $derived(
		type === 'asset' ? [] : [...new Set([...defaults[type], ...data.categories[type]])]
	);
	let category = $derived((kept.type === type && kept.category) || list[0]);
	let open = $state(false);
	let search = $state('');
	const typed = $derived(search.trim().toLowerCase());
	const shown = $derived(typed ? list.filter((name) => name.includes(typed)) : list);
	const isNew = $derived(typed !== '' && !list.includes(typed));

	const pick = (name: string) => {
		category = name;
		search = '';
		open = false;
	};

	const names = new Intl.DisplayNames('en', { type: 'currency' });
	const currencies = Intl.supportedValuesOf('currency');
	let currency = $state(sent?.currency ?? untrack(() => data.settings!.currency));
	let currencyPicker = $state(false);
	let currencyQuery = $state('');
	const currencyTyped = $derived(currencyQuery.trim().toLowerCase());
	const currencyShown = $derived(
		currencyTyped
			? currencies.filter((code) => `${code} ${names.of(code)}`.toLowerCase().includes(currencyTyped))
			: currencies
	);

	let amount = $state(sent?.amount ?? '');

	const flagged = (name: string) =>
		form?.field === name ? { 'aria-invalid': true, 'aria-describedby': 'message' } : {};

	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const field = 'h-11 text-base md:text-base';
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

<form method="POST" novalidate class="flex w-full max-w-2xl flex-col gap-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-3xl">Add</h1>
		<fieldset class="flex w-full rounded-full border bg-card p-1 sm:w-auto">
			<legend class="sr-only">Entry type</legend>
			{#each types as [value, label] (value)}
				<label
					class={[
						'flex h-10 flex-auto cursor-pointer items-center justify-center rounded-full px-3 text-base font-medium whitespace-nowrap text-muted-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:px-4',
						tint[value]
					]}
				>
					<input class="sr-only" type="radio" name="type" {value} bind:group={type} />
					{label}
				</label>
			{/each}
		</fieldset>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="amount" class="text-muted-foreground">{type === 'asset' ? 'Current value' : 'Amount'}</Label>
		<div
			class={[
				'flex items-baseline gap-2 border-b-2 pb-1 focus-within:border-ring',
				form?.field === 'amount' ? 'border-destructive' : 'border-input'
			]}
		>
			<span class={['self-center font-heading text-3xl', signColor]}>{sign}</span>
			<input
				id="amount"
				name="amount"
				inputmode="decimal"
				autocomplete="off"
				placeholder="0"
				value={amount}
				oninput={(event) => (amount = regroup(event.currentTarget))}
				{...flagged('amount')}
				class={[
					'h-11 w-full min-w-0 bg-transparent font-heading font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50',
					sizeOf(amount)
				]}
			/>
			<input type="hidden" name="currency" value={currency} />
			<Popover.Root bind:open={currencyPicker}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							role="combobox"
							aria-label="Currency, {currency} · {names.of(currency)}"
							aria-expanded={currencyPicker}
							{...flagged('currency')}
							class="h-9 shrink-0 gap-1 self-center px-2 text-sm font-semibold"
						>
							{currency}
							<ChevronsUpDownIcon class="size-3.5 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-72 max-w-[calc(100vw-2rem)] p-0" align="end">
					<Command.Root shouldFilter={false}>
						<Command.Input placeholder="Search currency" bind:value={currencyQuery} class="text-base" />
						<Command.List>
							<Command.Empty>No currency found.</Command.Empty>
							<Command.Group>
								{#each currencyShown as code (code)}
									<Command.Item
										value={code}
										onSelect={() => {
											currency = code;
											currencyQuery = '';
											currencyPicker = false;
										}}
									>
										<CheckIcon class={['size-4', code !== currency && 'text-transparent']} />
										{code} · {names.of(code)}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<Label for="date">Date</Label>
			<div class="flex gap-2">
				<Input
					id="date"
					name="date"
					inputmode="numeric"
					autocomplete="off"
					placeholder="YYYY/MM/DD"
					bind:value={date}
					oninput={(event) => (date = groupDate(event.currentTarget.value))}
					{...flagged('date')}
					class={field}
				/>
				<Popover.Root bind:open={calendarOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="outline" size="icon" class="size-11 shrink-0" aria-label="Open calendar">
								<CalendarIcon class="size-4" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="end">
						<Calendar
							type="single"
							value={picked}
							onValueChange={(value) => {
								if (value) date = slashDate(value);
								calendarOpen = false;
							}}
						/>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>

		{#if type === 'asset'}
			<div class="flex flex-col gap-1.5">
				<Label for="name">Name</Label>
				<Input
					id="name"
					name="name"
					placeholder="e.g. Savings account"
					value={kept.name ?? ''}
					{...flagged('name')}
					class={field}
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="class">Class</Label>
				<select id="class" name="cls" bind:value={cls} class={select}>
					{#each classes as option (option)}
						<option>{option}</option>
					{/each}
				</select>
			</div>
			{#if liability}
				{@render choice('term', 'term', 'Liability term', terms, kept.term ?? 'Long term')}
			{:else}
				{@render choice('source', 'source', 'Source of fund', sources, kept.source)}
				<div class="flex flex-col gap-1.5 md:col-span-2">
					<Label for="acquisition" class="leading-snug">
						Acquisition value (total cost) – blank = keep previous
					</Label>
					<Input
						id="acquisition"
						name="acquisition"
						inputmode="decimal"
						autocomplete="off"
						value={kept.acquisition ?? ''}
						oninput={(event) => regroup(event.currentTarget)}
						class={field}
					/>
				</div>
			{/if}
		{:else}
			<div class="flex flex-col gap-1.5">
				<Label for="category">Category</Label>
				<input type="hidden" name="category" value={category} />
				<Popover.Root bind:open>
					<Popover.Trigger id="category">
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								role="combobox"
								aria-expanded={open}
								class="h-11 w-full justify-between px-2.5 text-base font-normal"
							>
								<span class="truncate">{capitalize(category)}</span>
								<ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-(--bits-popover-anchor-width) p-0" align="start">
						<Command.Root shouldFilter={false}>
							<Command.Input placeholder="+ New category" bind:value={search} class="text-base" />
							<Command.List>
								{#if isNew}
									<Command.Group>
										<Command.Item value={typed} onSelect={() => pick(typed)} class="font-medium text-primary">
											<PlusIcon class="size-4" />
											Add "{capitalize(typed)}"
										</Command.Item>
									</Command.Group>
								{/if}
								<Command.Group>
									{#each shown as name (name)}
										<Command.Item value={name} onSelect={() => pick(name)}>
											<CheckIcon class={['size-4', name !== category && 'text-transparent']} />
											{capitalize(name)}
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
			{#if type === 'expense'}
				{@render choice('expense-type', 'expenseType', 'Expense type', expenseTypes, kept.expenseType)}
				{@render choice('owner', 'owner', 'Expense owner', owners, kept.owner)}
			{/if}
		{/if}
		<div class="flex flex-col gap-1.5 md:col-span-2">
			<Label for="note">Note (optional)</Label>
			<Input id="note" name="note" value={kept.note ?? ''} class={field} />
		</div>
	</div>

	<div
		class="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur md:static md:mx-0 md:flex-row-reverse md:items-center md:justify-start md:gap-4 md:border-0 md:bg-transparent md:p-0"
	>
		<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">Add entry</Button>
		{#if form?.error}
			<p id="message" role="alert" class="font-semibold text-destructive">{form.error}</p>
		{:else if form?.added}
			<p id="message" role="status" class="font-semibold text-in">Added ✓</p>
		{/if}
	</div>
</form>
