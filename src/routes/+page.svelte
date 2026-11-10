<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { group } from '#lib/amount.ts';
	import { capitalize } from '#lib/category.ts';
	import { groupDate, isoDate, slashDate } from '#lib/date.ts';
	import { parseDate } from '@internationalized/date';
	import type { Series } from '#lib/chart.ts';
	import Months from '#lib/Months.svelte';
	import RankBars from '#lib/RankBars.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const board = $derived(data.dashboard);

	const money = (n: number) => (n < 0 ? '−' : '') + group(String(Math.abs(Math.round(n))));
	const signed = (n: number) => (n > 0 ? '+' : '') + money(n);

	const classes: [string, string][] = [['Cash', 'var(--chart-1)'], ['Investments', 'var(--chart-2)'], ['Property', 'var(--chart-4)'], ['Other', 'var(--chart-5)']];
	const types: [string, string][] = [
		['Fixed - Essential', 'var(--chart-3)'],
		['Non-fixed - Essential', 'var(--chart-4)'],
		['Fixed - Non-essential', 'var(--chart-5)'],
		['Non-fixed - Non-essential', 'var(--chart-1)']
	];
	const cashflow: Series[] = [
		{ key: 'income', label: 'Income', color: 'var(--in)', value: (m) => m.income },
		{ key: 'expenses', label: 'Expenses', color: 'var(--out)', value: (m) => m.expenses }
	];
	const worth: Series[] = [
		{ key: 'liabilities', label: 'Liabilities', color: 'var(--out)', value: (m) => m.liabilities },
		{ key: 'equity', label: 'Equity', color: 'var(--in)', value: (m) => m.equity }
	];
	const netWorth: Series = { key: 'netWorth', label: 'Net worth', color: 'var(--chart-5)', value: (m) => m.netWorth };
	const byClass: Series[] = classes.map(([key, color]) => ({ key, label: key, color, value: (m) => m.byClass[key].value, share: (m) => m.byClass[key].share }));
	const byType: Series[] = types.map(([key, color]) => ({ key, label: key, color, value: (m) => m.byType[key].value, share: (m) => m.byType[key].share }));

	let from = $derived(board.from);
	let to = $derived(board.to);
	let filter = $state<HTMLFormElement>();
	const apply = () => filter?.requestSubmit();

	type Row = { cls: string; change: number | null; changePct: number | null };
	const rowTone = (row: Row) => (row.change === null || (row.cls === 'Liability' ? row.change <= 0 : row.change >= 0) ? 'text-in' : 'text-out');
	const rowChange = (row: Row) => {
		if (row.change === null) return '–';
		if (row.changePct === null) return signed(row.change);
		return `${signed(row.change)} (${row.changePct.toFixed(1).replace('-', '−')}%)`;
	};
</script>

{#snippet dateField(id: string, label: string, value: string, set: (text: string) => void)}
	<div class="flex min-w-0 flex-col gap-1.5 sm:w-48">
		<Label for={id}>{label}</Label>
		<div class="relative">
			<Input
				{id}
				name={id}
				inputmode="numeric"
				autocomplete="off"
				placeholder="YYYY/MM/DD"
				{value}
				oninput={(event) => {
					const text = groupDate(event.currentTarget.value);
					set(text);
					if (text === '' || isoDate(text)) apply();
				}}
				class="h-11 min-w-0 pr-11 pl-2.5 text-base md:text-base"
			/>
			<Popover.Root>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon" class="absolute top-1 right-1 size-9" aria-label="Open calendar for {label}">
							<CalendarIcon class="size-4" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0" align="end">
					<Calendar
						type="single"
						value={isoDate(value) ? parseDate(isoDate(value)!) : undefined}
						onValueChange={(picked) => {
							if (!picked) return;
							set(slashDate(picked));
							setTimeout(apply);
						}}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>
	</div>
{/snippet}

{#snippet change(value: number | null, upIsGood: boolean)}
	{#if value !== null}
		{@const good = value >= 0 === upIsGood}
		<span class={good ? 'text-in' : 'text-out'}>{value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev. month</span>
	{/if}
{/snippet}

{#snippet figure(label: string, value: string, tone: string, detail: import('svelte').Snippet | string | null)}
	<div class="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0 md:flex-col md:items-start md:justify-start md:gap-0.5 md:px-4 md:py-0 md:first:pl-0 md:last:pr-0">
		<div class="min-w-0 md:contents">
			<p class="text-sm text-muted-foreground md:order-1">{label}</p>
			{#if typeof detail === 'string'}
				<p class="text-xs text-muted-foreground md:order-3">{detail}</p>
			{:else if detail}
				<p class="text-xs md:order-3">{@render detail()}</p>
			{/if}
		</div>
		<p class={['shrink-0 font-heading text-xl font-semibold tabular-nums md:order-2 md:text-2xl', tone]}>{value}</p>
	</div>
{/snippet}
{#snippet chart(title: string, note: string, body: import('svelte').Snippet, phone = '', wide = '')}
	<Card.Root class="min-w-0">
		<Card.Header>
			<Card.Title class="font-heading text-lg">{title}</Card.Title>
			<Card.Description><span class="md:hidden">{note}{phone}</span><span class="hidden md:inline">{note}{wide}</span></Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">{@render body()}</Card.Content>
	</Card.Root>
{/snippet}

<div>
	<h1 class="text-3xl">Dashboard</h1>
	<p class="text-muted-foreground">Welcome, {data.user.name}</p>
</div>

{#if !board.cards}
	<Card.Root>
		<Card.Content class="py-6 text-center text-base text-muted-foreground">
			No data yet. Add your first entry on the <a href="/add">Add page</a>.
		</Card.Content>
	</Card.Root>
{:else}
	{@const cards = board.cards}
	<form method="GET" bind:this={filter} data-sveltekit-keepfocus data-sveltekit-noscroll class="grid grid-cols-2 items-end gap-x-3 gap-y-2 sm:flex sm:flex-wrap">
		{@render dateField('from', 'From', from, (text) => (from = text))}
		{@render dateField('to', 'To', to, (text) => (to = text))}
		<div class="col-span-2 flex items-center justify-between gap-3 sm:contents">
			<p class="text-sm text-muted-foreground sm:order-last sm:basis-full">
				{board.months[0].month} – {cards.month} · amounts in {board.currency}
			</p>
			<Button href="/" variant="outline" class="h-11 px-4 text-base">All time</Button>
		</div>
	</form>

	{#if board.leftOut}
		<p class="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
			<InfoIcon class="mt-0.5 size-4 shrink-0" />
			{board.leftOut === 1 ? '1 entry in another currency is left out.' : `${board.leftOut} entries in other currencies are left out.`}
		</p>
	{/if}

	{#snippet incomeChange()}{@render change(cards.incomeChange, true)}{/snippet}
	{#snippet expensesChange()}{@render change(cards.expensesChange, false)}{/snippet}
	{#snippet worthChange()}{@render change(cards.netWorthChange, true)}{/snippet}

	<section aria-labelledby="cash-flow" class="grid gap-4">
		<h2 id="cash-flow" class="text-xl">Cash flow · {cards.month}</h2>
		<Card.Root size="sm" class="min-w-0">
			<Card.Content class="divide-y md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
				{@render figure('Income', money(cards.income), '', incomeChange)}
				{@render figure('Expenses', money(cards.expenses), '', expensesChange)}
				{@render figure('Net cash flow', money(cards.net), cards.net < 0 ? 'text-out' : 'text-in', `Savings rate ${cards.savingsRate === null ? '–' : cards.savingsRate + '%'}`)}
			</Card.Content>
		</Card.Root>
		{#snippet incomeChart()}<Months id="cashflow" rows={board.months} series={cashflow} />{/snippet}
		{@render chart('Income vs expense', `Millions of ${board.currency}`, incomeChart, ', newest month on top', ', per month')}
	</section>

	<section aria-labelledby="net-worth" class="grid gap-4 xl:grid-cols-2 xl:items-start">
		<h2 id="net-worth" class="text-xl xl:col-span-2">Net worth</h2>
		<Card.Root size="sm" class="min-w-0 xl:col-span-2">
			<Card.Content class="divide-y md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
				{@render figure('Net worth', money(cards.netWorth), '', worthChange)}
				{@render figure(`Saved into assets · ${cards.month}`, cards.saved === null ? '–' : signed(cards.saved), (cards.saved ?? 0) < 0 ? 'text-out' : '', null)}
				{@render figure('Own-funded assets', money(cards.own), '', `${cards.ownShare ?? 0}% of assets · debt-funded ${money(cards.debtFunded)}`)}
			</Card.Content>
		</Card.Root>
		{#snippet worthChart()}<Months id="worth" rows={board.months} series={worth} layout="stack" line={netWorth} />{/snippet}
		{#snippet classChart()}<Months id="classes" rows={board.months} series={byClass} layout="stack" />{/snippet}
		{@render chart('Net worth growth', `Millions of ${board.currency}: liabilities and equity as bars, net worth as the`, worthChart, ' dot', ' line')}
		{@render chart('Asset movement by type', `Millions of ${board.currency} · label = share of the month's assets`, classChart)}
		<Card.Root class="min-w-0 xl:col-span-2">
			<Card.Header>
				<Card.Title class="font-heading text-lg">Assets &amp; liabilities</Card.Title>
				<Card.Description>Latest value against the update before</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="divide-y md:hidden">
					{#each board.table as row (row.name)}
						<li class="flex items-start justify-between gap-3 py-2.5">
							<div class="min-w-0">
								<p class="font-medium">{row.name}</p>
								<p class="text-xs text-muted-foreground">{row.cls} · {row.source ?? '–'}</p>
							</div>
							<div class="text-right tabular-nums">
								<p>{money(row.value)}</p>
								<p class={['text-xs', rowTone(row)]}>{rowChange(row)}</p>
							</div>
						</li>
					{/each}
				</ul>
				<div class="-mx-4 hidden md:block">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-4">Name</Table.Head>
								<Table.Head>Class</Table.Head>
								<Table.Head>Funded by</Table.Head>
								<Table.Head class="text-right">Value</Table.Head>
								<Table.Head class="pr-4 text-right">Change</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each board.table as row (row.name)}
								<Table.Row>
									<Table.Cell class="pl-4 font-medium">{row.name}</Table.Cell>
									<Table.Cell>{row.cls}</Table.Cell>
									<Table.Cell>{row.source ?? '–'}</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{money(row.value)}</Table.Cell>
									<Table.Cell class={['pr-4 text-right tabular-nums', rowTone(row)]}>{rowChange(row)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</section>

	<section aria-labelledby="spending" class="grid gap-4 xl:grid-cols-2 xl:items-start">
		<h2 id="spending" class="text-xl xl:col-span-2">Spending</h2>
		{#snippet typeChart()}<Months id="types" rows={board.months} series={byType} layout="stack" />{/snippet}
		{#snippet ownerChart()}<RankBars id="owners" rows={board.owners} color="var(--chart-5)" />{/snippet}
		{#snippet categoryChart()}<RankBars id="categories" rows={board.categories} color="var(--out)" name={capitalize} />{/snippet}
		<div class="xl:col-span-2">
			{@render chart('Expenses by type', `Millions of ${board.currency} · label = share of the month's expenses`, typeChart)}
		</div>
		{@render chart('Expenses by owner', `${board.currency}, whole range`, ownerChart)}
		{@render chart('Top expense categories', `${board.currency}, whole range, top 8`, categoryChart)}
	</section>
{/if}
