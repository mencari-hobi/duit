<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import type { Settings } from '#lib/server/settings.ts';

	let { settings }: { settings: Settings } = $props();

	const names = new Intl.DisplayNames('en', { type: 'currency' });
	const currencies = Intl.supportedValuesOf('currency');
	let currency = $derived(settings.currency);
	let currencyOpen = $state(false);
	const hint = $derived(
		settings.startDay === 1
			? 'A report month is a calendar month.'
			: `A report month runs from day ${settings.startDay} to day ${settings.startDay - 1} of the next month.`
	);
	const error = $derived(page.form?.currency as string | undefined);
</script>

<form
	method="POST"
	action="/?/settings"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
	class="mt-auto flex flex-col gap-4 border-t pt-4">
	<h2 class="font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase">
		Report settings
	</h2>
	<div class="flex flex-col gap-1.5">
		<Label for="currency">Default currency</Label>
		<input type="hidden" name="currency" value={currency} />
		<Popover.Root bind:open={currencyOpen}>
			<Popover.Trigger id="currency">
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						role="combobox"
						aria-expanded={currencyOpen}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? 'currency-error' : undefined}
						class="h-11 w-full justify-between px-2.5 text-base font-normal aria-invalid:border-destructive"
					>
						<span class="truncate">{currency} · {names.of(currency)}</span>
						<ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-(--bits-popover-anchor-width) p-0" align="start">
				<Command.Root>
					<Command.Input placeholder="Search currency" class="text-base" />
					<Command.List>
						<Command.Empty>No currency found.</Command.Empty>
						<Command.Group>
							{#each currencies as code (code)}
								<Command.Item
									value={code}
									keywords={[names.of(code) ?? '']}
									onSelect={() => {
										currency = code;
										currencyOpen = false;
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
		{#if error}
			<p id="currency-error" role="alert" class="text-sm font-semibold text-destructive">
				{error}
			</p>
		{/if}
	</div>
	<div class="flex flex-col gap-1.5">
		<Label for="start-day">Reporting start day</Label>
		<Input
			id="start-day"
			name="startDay"
			type="number"
			inputmode="numeric"
			min="1"
			max="28"
			value={settings.startDay}
			class="h-11 text-base md:text-base"
			aria-describedby="start-day-hint"
		/>
		<p id="start-day-hint" class="text-sm text-muted-foreground">{hint}</p>
	</div>
	<Button type="submit" class="h-11 w-full text-base">Save</Button>
</form>
