<script>
	import { fade } from 'svelte/transition';
	import SuccessIcon from './SuccessIcon.svelte';
	import ErrorIcon from './ErrorIcon.svelte';
	import InfoIcon from './InfoIcon.svelte';
	import CloseIcon from './CloseIcon.svelte';

	let { type = 'error', dismissible = true, ondismiss, children } = $props();
</script>

<article class={type} role="alert" transition:fade>
	{#if type === 'success'}
		<SuccessIcon width="1.1em" />
	{:else if type === 'error'}
		<ErrorIcon width="1.1em" />
	{:else}
		<InfoIcon width="1.1em" />
	{/if}

	<div class="text font-bold">
		{@render children?.()}
	</div>

	{#if dismissible}
		<button class="close" onclick={() => ondismiss?.()}>
			<CloseIcon width="0.8em" />
		</button>
	{/if}
</article>

<style lang="postcss">
	article {
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.35);
		display: flex;
		align-items: center;
		margin: 0 auto 0.5rem auto;
		width: 20rem;
	}
	.error {
		background: IndianRed;
	}
	.success {
		background: MediumSeaGreen;
	}
	.info {
		background: SkyBlue;
	}
	.text {
		margin-left: 1rem;
	}
	button {
		color: white;
		background: transparent;
		border: 0 none;
		padding: 0;
		margin: 0 0 0 auto;
		line-height: 1;
		font-size: 1rem;
	}
</style>
