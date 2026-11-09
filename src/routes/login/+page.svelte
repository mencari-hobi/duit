<script lang="ts">
	import AccountForm from '#lib/AccountForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<AccountForm
	title="Log in"
	submit="Log in"
	{form}
	password="current-password"
	other={{ href: '/register', label: 'Create an account' }}
/>
