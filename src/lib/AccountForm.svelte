<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';

	type Props = {
		title: string;
		submit: string;
		form: { name: string; message: string } | null;
		other: { href: string; label: string };
		password: 'current-password' | 'new-password';
	};

	let { title, submit, form, other, password }: Props = $props();
</script>

<main class="flex min-h-dvh flex-col gap-6 px-4 py-8 sm:items-center sm:justify-center">
	<div class="flex flex-col gap-1 sm:items-center">
		<span class="font-heading text-4xl font-bold">duit</span>
		<p class="text-muted-foreground">Your money, in and out.</p>
	</div>
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<h1 class="text-3xl">{title}</h1>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<form method="POST" class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="name">Name</Label>
					<Input
						id="name"
						name="name"
						autocomplete="username"
						required
						value={form?.name ?? ''}
						class="h-11 text-base"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete={password}
						required
						class="h-11 text-base"
					/>
				</div>
				{#if form?.message}
					<p
						role="alert"
						class="rounded-md border-l-4 border-destructive bg-out-muted p-3 font-semibold text-destructive"
					>
						{form.message}
					</p>
				{/if}
				<Button type="submit" class="h-11 w-full text-base">{submit}</Button>
			</form>
			<p class="text-center"><a href={other.href}>{other.label}</a></p>
		</Card.Content>
	</Card.Root>
</main>
