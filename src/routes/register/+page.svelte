<script lang="ts">
	import AccountForm from '#lib/AccountForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<AccountForm
	title="Create an account"
	submit="Register"
	{form}
	password="new-password"
	other={{ href: '/login', label: 'I have an account' }}
/>
