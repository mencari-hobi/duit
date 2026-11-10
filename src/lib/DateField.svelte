<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { parseDate } from '@internationalized/date';
	import { groupDate, isoDate, slashDate } from '#lib/date.ts';

	let { value = $bindable(), ...rest }: { value: string; [attribute: string]: unknown } = $props();

	let open = $state(false);
	const picked = $derived(isoDate(value) ? parseDate(isoDate(value)!) : undefined);
</script>

<div class="flex gap-2">
	<Input
		id="date"
		name="date"
		inputmode="numeric"
		autocomplete="off"
		placeholder="YYYY/MM/DD"
		bind:value
		oninput={(event) => (value = groupDate(event.currentTarget.value))}
		{...rest}
		class="h-11 text-base md:text-base"
	/>
	<Popover.Root bind:open>
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
				onValueChange={(day) => {
					if (day) value = slashDate(day);
					open = false;
				}}
			/>
		</Popover.Content>
	</Popover.Root>
</div>
