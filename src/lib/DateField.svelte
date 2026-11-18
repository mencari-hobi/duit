<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { parseDate } from '@internationalized/date';
	import { groupDate, isoDate, slashDate } from '#lib/date.ts';

	type Props = { id: string; name: string; label: string; value: string; invalid?: boolean };

	let { id, name, label, value = $bindable(), invalid = false }: Props = $props();

	let open = $state(false);
	const picked = $derived(isoDate(value) ? parseDate(isoDate(value)!) : undefined);
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<div class="flex gap-2">
		<Input
			{id}
			{name}
			inputmode="numeric"
			autocomplete="off"
			placeholder="YYYY/MM/DD"
			bind:value
			oninput={(event) => (value = groupDate(event.currentTarget.value))}
			aria-invalid={invalid || undefined}
			aria-describedby={invalid ? 'message' : undefined}
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
					onValueChange={(next) => {
						if (next) value = slashDate(next);
						open = false;
					}}
				/>
			</Popover.Content>
		</Popover.Root>
	</div>
</div>
