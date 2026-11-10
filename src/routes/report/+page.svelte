<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import FileChartColumnIcon from '@lucide/svelte/icons/file-chart-column';
	import { notes, shown } from '#lib/report.ts';

	let { data } = $props();
	const report = $derived(data.report);

	const indent = ['pl-4', 'pl-7', 'pl-10'];

	function fadeAtEdge(scroller: HTMLElement) {
		const fade = scroller.nextElementSibling as HTMLElement;
		const mark = () => {
			fade.toggleAttribute('data-end', scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1);
		};
		mark();
		scroller.addEventListener('scroll', mark, { passive: true });
		const resize = new ResizeObserver(mark);
		resize.observe(scroller);
		return () => {
			scroller.removeEventListener('scroll', mark);
			resize.disconnect();
		};
	}
</script>

<div>
	<h1 class="text-3xl">Report</h1>
	{#if report}
		<p class="text-muted-foreground">The last 3 reporting months, in millions of {report.currency}</p>
	{/if}
</div>

{#if !report}
	<div class="flex flex-col items-center gap-3 py-16 text-center">
		<div class="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
			<FileChartColumnIcon class="size-6" />
		</div>
		<p class="font-heading text-xl">No data yet.</p>
		<p class="max-w-xs text-sm text-muted-foreground">The report fills in once you add an income, an expense, or an asset.</p>
		<Button href="/add" variant="outline" class="mt-2 h-11 px-6 text-base">Add entry</Button>
	</div>
{:else}
	{#each report.sections as section (section.id)}
		<section id={section.id} aria-labelledby="{section.id}-title" class="scroll-mt-20 overflow-hidden rounded-xl border bg-card">
			<h2 id="{section.id}-title" class="border-b px-4 py-3 text-lg">{section.title}</h2>
			<div class="relative">
				<div class="overflow-x-auto" {@attach fadeAtEdge}>
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr class="border-b">
								<th scope="col" class="sticky left-0 z-[1] bg-card shadow-[inset_-1px_0_0_var(--border)] md:shadow-none"><span class="sr-only">Line</span></th>
								{#each report.months as month (month)}
									<th scope="col" class="px-2.5 py-2 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground tabular-nums md:w-32">{month}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each section.lines as line, index (index)}
								{@const fill = line.total ? 'bg-muted' : 'bg-card'}
								<tr class={['border-b last:border-b-0', line.total && 'border-t-2 border-t-foreground/15', line.strong && 'font-semibold']}>
									<th
										scope="row"
										class={[
											'sticky left-0 z-[1] w-36 min-w-36 py-2 pr-2 text-left leading-snug shadow-[inset_-1px_0_0_var(--border)] md:w-auto md:shadow-none',
											line.strong ? 'font-semibold' : 'font-normal',
											line.depth === 2 && 'text-muted-foreground',
											indent[line.depth],
											fill
										]}
									>
										{line.label}
									</th>
									{#each line.values as value, i (i)}
										<td class={['px-2.5 py-2 text-right whitespace-nowrap tabular-nums last:pr-4', fill, value! < 0 && 'text-out']}>{shown(line, value)}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div
					aria-hidden="true"
					class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-card to-transparent transition-opacity data-[end]:opacity-0"
				></div>
			</div>
		</section>
	{/each}

	<section aria-labelledby="notes-title" class="rounded-xl border bg-card p-4">
		<h2 id="notes-title" class="text-lg">How the numbers are built</h2>
		<ul class="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
			{#each notes(report.currency) as [term, text] (term)}
				<li><b class="font-semibold text-foreground">{term}</b> {text}</li>
			{/each}
		</ul>
	</section>
{/if}
