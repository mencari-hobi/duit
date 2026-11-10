<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { day, label, money, tone, types, type Record } from '#lib/record.ts';

	let { data } = $props();
	const records = $derived(data.records);
	const days = $derived(Map.groupBy(records, day));

	const dot = { income: 'bg-in', expense: 'bg-out', asset: 'bg-chart-5' };
	const editHref = (record: Record) =>
		record.kind === 'asset' ? `/assets/${encodeURIComponent(record.name!)}?edit=${record.id}` : `/add?edit=${record.id}`;
</script>

{#snippet remove(record: Record)}
	<form method="POST" action="?/delete" class="contents">
		<input type="hidden" name="id" value={record.id} />
		<Button
			type="submit"
			variant="ghost"
			size="icon"
			aria-label="Delete {label(record)} of {day(record)}"
			class="size-11 shrink-0 text-muted-foreground hover:text-destructive lg:size-8"
		>
			<Trash2Icon />
		</Button>
	</form>
{/snippet}

<div class="flex items-center justify-between gap-3">
	<h1 class="text-3xl">Records</h1>
	{#if records.length}
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="destructive" class="h-11 px-3 text-base">
						<Trash2Icon />
						Delete all data
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Delete all data</Dialog.Title>
					<Dialog.Description>Delete ALL records? This cannot be undone.</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Dialog.Close>
						{#snippet child({ props })}
							<Button {...props} variant="outline" class="h-11 text-base sm:h-9 sm:text-sm">Cancel</Button>
						{/snippet}
					</Dialog.Close>
					<form method="POST" action="?/wipe" class="contents">
						<Button type="submit" class="h-11 bg-destructive text-base text-white hover:bg-destructive/85 sm:h-9 sm:text-sm dark:text-background">
							Delete all
						</Button>
					</form>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>

{#if !records.length}
	<div class="flex flex-col items-center gap-3 py-16 text-center">
		<div class="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
			<InboxIcon class="size-6" />
		</div>
		<p class="font-heading text-xl">Nothing here yet.</p>
		<p class="max-w-xs text-sm text-muted-foreground">Every income, expense, and asset you add lists here, newest first.</p>
		<Button href="/add" variant="outline" class="mt-2 h-11 px-6 text-base">Add entry</Button>
	</div>
{:else}
	<div class="flex flex-col gap-5 lg:hidden">
		{#each days as [date, rows] (date)}
			<section class="flex flex-col gap-1.5">
				<h2 class="sticky top-14 z-[5] -mx-4 bg-background/95 px-4 py-1.5 text-sm font-semibold text-muted-foreground tabular-nums backdrop-blur">
					{date}
				</h2>
				<ul class="divide-y rounded-xl border bg-card">
					{#each rows as record (record.id)}
						<li class="flex items-center pr-1">
							<a
								href={editHref(record)}
								aria-label="Edit {label(record)} of {date}"
								class="flex min-w-0 flex-1 items-start gap-3 py-3 pl-3 text-foreground no-underline hover:no-underline"
							>
								<span class={['mt-1.5 size-2.5 shrink-0 rounded-full', dot[record.kind]]}></span>
								<span class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="leading-snug font-medium break-words">{label(record)}</span>
									<span class="text-xs text-muted-foreground">
										{types[record.kind]}{#if record.kind === 'expense'}&nbsp;· {record.expenseType} · {record.owner}{/if}
									</span>
								</span>
								<span class="flex shrink-0 flex-col items-end">
									<span class={['font-semibold tabular-nums', tone[record.kind]]}>{money(record.amount)}</span>
									<span class="text-xs text-muted-foreground">{record.currency}</span>
								</span>
							</a>
							{@render remove(record)}
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	<div class="hidden rounded-xl border bg-card lg:block">
		<Table.Root>
			<Table.Header>
				<Table.Row class="hover:bg-transparent">
					<Table.Head class="pl-4">Type</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head>Expense type</Table.Head>
					<Table.Head>Owner</Table.Head>
					<Table.Head class="text-right">Amount</Table.Head>
					<Table.Head><span class="sr-only">Actions</span></Table.Head>
				</Table.Row>
			</Table.Header>
			{#each days as [date, rows] (date)}
				<Table.Body class="[&_tr:last-child]:border-b">
					<tr class="border-b bg-muted/60">
						<th colspan="6" scope="colgroup" class="px-4 py-1.5 text-left text-xs font-semibold text-muted-foreground tabular-nums">{date}</th>
					</tr>
					{#each rows as record (record.id)}
						<Table.Row>
							<Table.Cell class="pl-4">
								<span class="inline-flex items-center gap-2">
									<span class={['size-2 rounded-full', dot[record.kind]]}></span>
									{types[record.kind]}
								</span>
							</Table.Cell>
							<Table.Cell class="min-w-48 whitespace-normal">{label(record)}</Table.Cell>
							<Table.Cell class="whitespace-normal text-muted-foreground xl:whitespace-nowrap">{record.expenseType ?? '–'}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{record.owner ?? '–'}</Table.Cell>
							<Table.Cell class="text-right">
								<span class={['font-semibold tabular-nums', tone[record.kind]]}>{money(record.amount)}</span>
								<span class="text-xs text-muted-foreground">{record.currency}</span>
							</Table.Cell>
							<Table.Cell class="pr-2 text-right">
								<span class="inline-flex gap-1">
									<Button href={editHref(record)} variant="ghost" size="sm"><PencilIcon />Edit</Button>
									{@render remove(record)}
								</span>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			{/each}
		</Table.Root>
	</div>
{/if}
