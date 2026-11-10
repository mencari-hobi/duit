<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { id: string; children: Snippet<[number]> };
	let { id, children }: Props = $props();

	let width = $state(0);
</script>

<div data-chart={id} class="min-w-0" bind:clientWidth={width}>
	{#if width}{@render children(width)}{/if}
</div>
