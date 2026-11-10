<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import SettingsForm from '#lib/SettingsForm.svelte';
	import type { Settings } from '#lib/server/settings.ts';

	type Props = {
		settings: Settings;
		children: Snippet;
	};

	let { settings, children }: Props = $props();

	let open = $state(false);

	const menu = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/add', label: 'Add' },
		{ href: '/assets', label: 'Assets' },
		{ href: '/records', label: 'Records' },
		{ href: '/report', label: 'Report' }
	];
</script>

<div class="flex min-h-dvh flex-col">
	<header
		class="sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b bg-card px-4 py-2 md:px-6"
	>
		<Button
			variant="outline"
			class="h-11 px-4 text-base md:hidden"
			aria-expanded={open}
			aria-controls="sidebar"
			onclick={() => (open = !open)}
		>
			Menu
		</Button>
		<a href="/" class="font-heading text-xl font-bold text-foreground no-underline">duit</a>
		<form method="POST" action="/?/logout" class="ml-auto">
			<Button type="submit" variant="outline" class="h-11 px-4 text-base">Log out</Button>
		</form>
	</header>

	<div class="flex flex-1">
		{#if open}
			<button
				class="fixed inset-0 z-20 bg-foreground/40 md:hidden"
				aria-label="Close the menu"
				onclick={() => (open = false)}
			></button>
		{/if}
		<aside
			id="sidebar"
			class={[
				'w-72 shrink-0 flex-col gap-6 border-r bg-card p-4',
				'md:sticky md:top-14 md:flex md:h-[calc(100dvh-3.5rem)] md:w-64',
				open ? 'fixed inset-y-0 left-0 z-30 flex overflow-y-auto shadow-xl' : 'hidden'
			]}
		>
			<Button
				variant="outline"
				class="h-11 self-start px-4 text-base md:hidden"
				onclick={() => (open = false)}
			>
				Close
			</Button>
			<nav aria-label="Menu">
				<ul class="flex flex-col gap-1">
					{#each menu as item (item.href)}
						{@const current = page.url.pathname === item.href}
						<li>
							<a
								href={item.href}
								aria-current={current ? 'page' : undefined}
								onclick={() => (open = false)}
								class={[
									'flex h-11 items-center rounded-md px-3 text-base text-foreground no-underline hover:bg-muted hover:no-underline',
									current && 'bg-primary/10 font-semibold text-primary hover:bg-primary/15'
								]}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<SettingsForm {settings} />
		</aside>

		<main class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 pt-6 pb-12 md:px-8">
			{@render children()}
		</main>
	</div>
</div>
