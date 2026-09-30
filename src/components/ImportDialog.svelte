<script>
	let { onImport = () => {}, onClose = () => {} } = $props();

	let html = $state('');
	let css = $state('');
	let js = $state('');
	let error = $state('');

	function submitImport() {
		error = '';
		if (!html.trim() && !css.trim() && !js.trim()) {
			error = 'Enter HTML, CSS or JS before importing.';
			return;
		}
		onImport({ html, css, js });
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 p-4">
	<div class="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-300">
		<div class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
			<div>
				<h2 class="text-base font-bold text-slate-800">Import HTML / CSS / JS</h2>
				<p class="text-xs text-slate-500">Paste any combination of HTML, CSS and JavaScript.</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				class="rounded px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
				aria-label="Close import dialog">×</button
			>
		</div>

		<div class="grid gap-4 p-5 md:grid-cols-3">
			<label class="flex flex-col gap-1 text-xs font-semibold text-slate-700">
				<span>HTML</span>
				<textarea
					bind:value={html}
					class="h-72 resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"
					placeholder="<div id=&quot;hero&quot; class=&quot;card&quot;>Hello</div>"
					spellcheck="false"
				></textarea>
			</label>

			<label class="flex flex-col gap-1 text-xs font-semibold text-slate-700">
				<span>CSS</span>
				<textarea
					bind:value={css}
					class="h-72 resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"
					placeholder={'.card { background-color: white; padding: 1rem; }'}
					spellcheck="false"
				></textarea>
			</label>

			<label class="flex flex-col gap-1 text-xs font-semibold text-slate-700">
				<span>JS</span>
				<textarea
					bind:value={js}
					class="h-72 resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-blue-500"
					placeholder="document.querySelector('#hero')?.addEventListener('click', ...);"
					spellcheck="false"
				></textarea>
			</label>
		</div>

		{#if error}
			<p class="px-5 pb-2 text-xs font-semibold text-red-600">{error}</p>
		{/if}

		<div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
			<button
				type="button"
				onclick={onClose}
				class="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={submitImport}
				class="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
			>
				Import
			</button>
		</div>
	</div>
</div>
