<script lang="ts">
	import '../app.css';
	import Shell from '#lib/Shell.svelte';

	let { data, children } = $props();
</script>

{#if data.user}
	<Shell settings={data.settings}>
		{@render children()}
	</Shell>
{:else}
	{@render children()}
{/if}
