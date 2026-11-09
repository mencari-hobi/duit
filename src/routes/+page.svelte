<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main>
	<h1>Welcome, {data.user.name}</h1>
	<form method="POST" action="?/logout">
		<button>Log out</button>
	</form>
</main>
