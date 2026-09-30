<script>
	import Toast from './Toast.svelte';
	import { dismissToast, toasts } from '../js/toastStore.svelte';
</script>

{#if toasts.value}
	<section>
		{#each toasts.value as toast (toast.id)}
			<Toast
				type={toast.type}
				dismissible={toast.dismissible}
				ondismiss={() => dismissToast(toast.id)}>{toast.message}</Toast
			>
		{/each}
	</section>
{/if}

<style lang="postcss">
	section {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		display: flex;
		margin-top: 1rem;
		justify-content: center;
		flex-direction: column;
		z-index: 1000;
	}
</style>
