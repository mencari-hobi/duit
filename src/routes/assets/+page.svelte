<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { money } from '#lib/record.ts';
	import type { Holding } from '#lib/server/assets.ts';

	let { data } = $props();
	const empty = $derived(!data.assets.length && !data.liabilities.length && !data.sold.length);
</script>

{#snippet holdings(rows: Holding[], label: string)}
	<ul aria-label={label} class="divide-y rounded-xl border bg-card">
		{#each rows as row (row.name)}
			<li>
				<a
					href="/assets/{encodeURIComponent(row.name)}"
					class="flex items-center gap-3 px-3 py-3 text-foreground no-underline hover:bg-muted/50 hover:no-underline"
				>
					<span class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="leading-snug font-medium break-words">{row.name}</span>
						<span class="text-xs text-muted-foreground">
							{row.cls}{#if row.acquisition != null}&nbsp;· cost {money(row.acquisition)}{/if}
						</span>
					</span>
					<span class="flex shrink-0 flex-col items-end">
						<span class="font-semibold tabular-nums">
							{money(row.value)} <span class="text-xs font-normal text-muted-foreground">{row.currency}</span>
						</span>
						{#if row.gain}
							<span class={['text-xs tabular-nums', row.gain.startsWith('−') ? 'text-out' : 'text-in']}>{row.gain}</span>
						{/if}
					</span>
					<ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

<h1 class="text-3xl">Assets</h1>

{#if empty}
	<Card.Root>
		<Card.Content class="py-6 text-center text-base text-muted-foreground">
			No assets yet. Add your first asset on the <a href="/add">Add page</a>.
		</Card.Content>
	</Card.Root>
{:else}
	{#if data.assets.length}
		{@render holdings(data.assets, 'Assets')}
	{/if}
	{#if data.liabilities.length}
		<section class="flex flex-col gap-2">
			<h2 class="text-xl">Liabilities</h2>
			{@render holdings(data.liabilities, 'Liabilities')}
		</section>
	{/if}
	{#if data.sold.length}
		<section class="flex flex-col gap-2">
			<h2 class="text-xl">Sold</h2>
			{@render holdings(data.sold, 'Sold')}
		</section>
	{/if}
{/if}
