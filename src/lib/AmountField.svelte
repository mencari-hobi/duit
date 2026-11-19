<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { regroup, sizeOf } from '#lib/amount.ts';

	type Props = {
		label: string;
		sign: string;
		signColor: string;
		amount: string;
		currency: string;
		invalid?: string;
	};

	let { label, sign, signColor, amount = $bindable(), currency = $bindable(), invalid }: Props = $props();

	const names = new Intl.DisplayNames('en', { type: 'currency' });
	const currencies = Intl.supportedValuesOf('currency');
	let open = $state(false);
	let query = $state('');
	const typed = $derived(query.trim().toLowerCase());
	const shown = $derived(
		typed ? currencies.filter((code) => `${code} ${names.of(code)}`.toLowerCase().includes(typed)) : currencies
	);

	const flagged = (name: string) =>
		invalid === name ? { 'aria-invalid': true, 'aria-describedby': 'message' } : {};
</script>

<div class="flex flex-col gap-1.5">
	<Label for="amount" class="text-muted-foreground">{label}</Label>
	<div
		class={[
			'flex items-baseline gap-2 border-b-2 pb-1 focus-within:border-ring',
			invalid === 'amount' ? 'border-destructive' : 'border-input'
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
			oninput={(event) => (amount = regroup(event))}
			{...flagged('amount')}
			class={[
				'h-11 w-full min-w-0 bg-transparent font-heading font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50',
				sizeOf(amount)
			]}
		/>
		<input type="hidden" name="currency" value={currency} />
		<Popover.Root bind:open>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						role="combobox"
						aria-label="Currency, {currency} · {names.of(currency)}"
						aria-expanded={open}
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
					<Command.Input placeholder="Search currency" bind:value={query} class="text-base" />
					<Command.List>
						<Command.Empty>No currency found.</Command.Empty>
						<Command.Group>
							{#each shown as code (code)}
								<Command.Item
									value={code}
									onSelect={() => {
										currency = code;
										query = '';
										open = false;
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
