<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { group } from '#lib/amount.ts';

	type Row = { code: string; category: string; total: number; due: number; paid: boolean; remaining: number };
	type Table = { rows: Row[]; total: { total: number; due: number; unpaid: number; remaining: number } } | null;

	type Props = {
		table: Table;
		months: { value: string; label: string }[];
		month: string;
		currency: string;
		paid?: boolean;
	};

	let { table, months, month, currency, paid }: Props = $props();

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
						<th scope="col" class={[head, 'pr-4 text-right']}>Remaining debt ({currency})</th>
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
									checked={row.paid}
									class="size-5 accent-primary"
								/>
							</td>
							<td class={[amount, 'pr-4']}>{shown(row.remaining)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="bg-muted font-semibold">
						<th scope="row" colspan="2" class="py-2 pl-4 text-left">Total</th>
						<td class={amount}>{shown(table.total.total)}</td>
						<td class={amount}>{shown(table.total.due)}</td>
						<td class="px-2 py-2 text-center whitespace-nowrap">{table.total.unpaid} unpaid</td>
						<td class={[amount, 'pr-4']}>{shown(table.total.remaining)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
		<p class="text-sm text-muted-foreground">
			Due amount = installments falling in the selected reporting month. Remaining debt = Debt &amp; interest amount −
			cumulative due up to this month. Ticking Paid records the payment status only.
		</p>
		<div class="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start md:gap-4">
			<Button type="submit" class="h-11 w-full text-base md:w-auto md:px-8">Save payments</Button>
			{#if paid}
				<p id="message" role="status" class="font-semibold text-in">Saved ✓</p>
			{/if}
		</div>
	</form>
{/if}
