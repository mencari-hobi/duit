<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { getLocalTimeZone, today } from '@internationalized/date';
	import { group } from '#lib/amount.ts';
	import { groupDate, slashDate } from '#lib/date.ts';

	type Row = { code: string; category: string; total: number; due: number; paid: boolean; remaining: number; overdue: number };
	type Table = { rows: Row[]; paidDates: Record<string, string>; total: { total: number; due: number; unpaid: number; remaining: number; overdue: number } } | null;

	type Props = {
		table: Table;
		months: { value: string; label: string }[];
		month: string;
		currency: string;
		paid?: boolean;
		sent?: Record<string, string>;
		error?: string;
		invalid?: string;
	};

	let { table, months, month, currency, paid, sent, error, invalid }: Props = $props();

	const startTicks = (rows: Row[], kept?: Record<string, string>) =>
		Object.fromEntries(rows.map((row) => [row.code, kept ? Boolean(kept[`paid-${row.code}`]) : row.paid]));
	const startDates = (rows: Row[], stored: Record<string, string>, kept?: Record<string, string>) =>
		Object.fromEntries(
			rows.map((row) => [row.code, kept ? (kept[`paidDate-${row.code}`] ?? '') : stored[row.code] ? slashDate(stored[row.code]) : ''])
		);
	let ticks = $state(untrack(() => startTicks(table?.rows ?? [], sent)));
	let dates = $state(untrack(() => startDates(table?.rows ?? [], table?.paidDates ?? {}, sent)));
	const tick = (code: string, checked: boolean) => (dates[code] = checked ? slashDate(today(getLocalTimeZone())) : '');

	const shown = (n: number) => group(String(Math.round(n)));
	const select =
		'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
	const head = 'px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground';
	const amount = 'px-2 py-2 text-right whitespace-nowrap tabular-nums';
</script>

{#if !table}
	<p class="py-12 text-center font-heading text-xl">No debts yet. Save an additional debt first.</p>
{:else}
	<form method="GET" class="flex flex-col gap-1.5 sm:max-w-sm">
		<input type="hidden" name="tab" value="debt" />
		<input type="hidden" name="view" value="payments" />
		<Label for="month">Reporting month</Label>
		<select id="month" name="month" class={select} onchange={(event) => event.currentTarget.form?.requestSubmit()}>
			{#each months as option (option.value)}
				<option value={option.value} selected={option.value === month}>{option.label}</option>
			{/each}
		</select>
	</form>

	<form method="POST" action="?tab=debt&view=payments&month={month}" class="flex flex-col gap-4">
		<input type="hidden" name="type" value="payments" />
		<input type="hidden" name="month" value={month} />
		<div class="relative overflow-x-auto rounded-xl border bg-card">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b">
						<th scope="col" class={[head, 'pl-4']}>Debt code</th>
						<th scope="col" class={head}>Debt category</th>
						<th scope="col" class={[head, 'text-right']}>Debt &amp; interest amount ({currency})</th>
						<th scope="col" class={[head, 'text-right']}>Due amount ({currency})</th>
						<th scope="col" class={[head, 'text-center']}>Paid</th>
						<th scope="col" class={head}>Paid date</th>
						<th scope="col" class={[head, 'text-right']}>Remaining debt ({currency})</th>
						<th scope="col" class={[head, 'pr-4 text-right']}>Overdue ({currency})</th>
					</tr>
				</thead>
				<tbody>
					{#each table.rows as row (row.code)}
						<tr class="border-b">
							<th scope="row" class="py-2 pr-2 pl-4 text-left font-medium whitespace-nowrap">{row.code}</th>
							<td class="px-2 py-2 whitespace-nowrap">{row.category}</td>
							<td class={amount}>{shown(row.total)}</td>
							<td class={amount}>{shown(row.due)}</td>
							<td class="px-2 py-1 text-center">
								<input
									type="checkbox"
									name="paid-{row.code}"
									aria-label="{row.code} paid"
									bind:checked={ticks[row.code]}
									onchange={(event) => tick(row.code, event.currentTarget.checked)}
									class="size-5 accent-primary"
								/>
							</td>
							<td class="px-2 py-1">
								<input
									name="paidDate-{row.code}"
									aria-label="Paid date of {row.code}"
									inputmode="numeric"
									autocomplete="off"
									placeholder="YYYY/MM/DD"
									disabled={!ticks[row.code]}
									bind:value={dates[row.code]}
									oninput={(event) => (dates[row.code] = groupDate(event.currentTarget.value))}
									aria-invalid={invalid === `paidDate-${row.code}` || undefined}
									aria-describedby={invalid === `paidDate-${row.code}` ? 'message' : undefined}
									class="h-9 w-32 rounded-lg border border-input bg-transparent px-2 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30"
								/>
							</td>
							<td class={amount}>{shown(row.remaining)}</td>
							<td class={[amount, 'pr-4', row.overdue > 0 && 'text-out']}>{shown(row.overdue)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="bg-muted font-semibold">
						<th scope="row" colspan="2" class="py-2 pl-4 text-left">Total</th>
						<td class={amount}>{shown(table.total.total)}</td>
						<td class={amount}>{shown(table.total.due)}</td>
						<td class="px-2 py-2 text-center whitespace-nowrap">{table.total.unpaid} unpaid</td>
						<td></td>
						<td class={amount}>{shown(table.total.remaining)}</td>
						<td class={[amount, 'pr-4', table.total.overdue > 0 && 'text-out']}>{shown(table.total.overdue)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
		<p class="text-sm text-muted-foreground">
			Due amount = installments falling in the selected reporting month. Remaining debt = Debt &amp; interest amount −
			the due amounts ticked Paid up to this month. Overdue = due amounts of earlier months not ticked Paid.
		</p>
		<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
			<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">Save payments</Button>
			{#if error}
				<p id="message" role="alert" class="font-semibold text-destructive">{error}</p>
			{:else if paid}
				<p id="message" role="status" class="font-semibold text-in">Saved ✓</p>
			{/if}
		</div>
	</form>
{/if}
