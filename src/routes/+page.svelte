<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<header
		class="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b bg-card px-4 py-2 md:px-8"
	>
		<a href="/" class="font-heading text-xl font-bold text-foreground no-underline">
			duit
		</a>
		<form method="POST" action="?/logout">
			<Button type="submit" variant="outline" class="h-11 px-5 text-base">Log out</Button>
		</form>
	</header>
	<main class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 pb-12 md:px-8">
		<h1 class="text-3xl">Welcome, {data.user.name}</h1>
	</main>
</div>
