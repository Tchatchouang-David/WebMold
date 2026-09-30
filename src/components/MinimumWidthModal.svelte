<script>
	let { minWidth = 1024 } = $props();

	let viewportWidth = $state(0);
	let unsupported = $state(false);

	function updateViewportWidth() {
		if (typeof window === 'undefined') return;
		viewportWidth = window.innerWidth;
		unsupported = viewportWidth < minWidth;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		updateViewportWidth();
		window.addEventListener('resize', updateViewportWidth);

		return () => window.removeEventListener('resize', updateViewportWidth);
	});
</script>

{#if unsupported}
	<div
		class="fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center bg-white px-6 text-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="minimum-width-title"
	>
		<div class="w-full max-w-md">
			<h1 id="minimum-width-title" class="text-xl font-semibold text-slate-900">
				Device width too small
			</h1>
			<p class="mt-3 text-sm leading-6 text-slate-600">
				WebMold requires a device that is at least <strong>{minWidth}px</strong> wide.
				Please open WebMold on a larger screen.
			</p>
			<p class="mt-2 text-xs text-slate-400">Current width: {viewportWidth}px</p>
		</div>
	</div>
{/if}
