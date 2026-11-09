<script lang="ts">
	type Props = {
		title: string;
		submit: string;
		form: { name: string; message: string } | null;
		other: { href: string; label: string };
		password: 'current-password' | 'new-password';
	};

	let { title, submit, form, other, password }: Props = $props();
</script>

<main>
	<h1>{title}</h1>
	<form method="POST">
		<label>
			Name
			<input name="name" autocomplete="username" required value={form?.name ?? ''} />
		</label>
		<label>
			Password
			<input name="password" type="password" autocomplete={password} required />
		</label>
		{#if form?.message}
			<p role="alert">{form.message}</p>
		{/if}
		<button>{submit}</button>
	</form>
	<p><a href={other.href}>{other.label}</a></p>
</main>
