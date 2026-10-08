<script>
	import {
		allCreatedRecangles,
		styleSheet,
		allClasses,
		importedCssText,
		importedHasBody,
		globalJs,
		importedResources
	} from '$lib/js/store.svelte';
	import { goto } from '$app/navigation';
	import { serializeDocument, serializeHtml, downloadTextFile } from '$lib/js/serializer';
	let { resetCanvas, showImportDialog = $bindable(false), activeProjectName } = $props();

	// Serialize the logical editor tree into plain JSON. Unlike the live editor
	// tree, the exported document contains no HTMLElement references, making it
	// safe to persist, transmit to a backend, version, or later compile again.
	function exportDocumentJson() {
		const documentData = serializeDocument(allCreatedRecangles.value, styleSheet.value, {
			allClasses: allClasses.value,
			importedCss: importedCssText.value,
			hasBody: importedHasBody.value,
			globalJs: globalJs.value,
			importedJs: globalJs.value,
			importedResources: importedResources.value
		});
		const json = JSON.stringify(documentData, null, 2);
		downloadTextFile(json, 'visual-web-document.json', 'application/json');
	}

	// Export the same document as a standalone webpage. The serializer reads the
	// existing hierarchy and stylesheet, so absolute/static/relative/fixed/sticky
	// positioning remains part of the exported result. `hasBody` tells it whether
	// `allCreatedRecangles` wraps the original imported <body> in a
	// `.starterWrapper` element that needs to be unwrapped back onto <body>.
	function exportDocumentHtml() {
		const html = serializeHtml(allCreatedRecangles.value, styleSheet.value, {
			allClasses: allClasses.value,
			importedCss: importedCssText.value,
			hasBody: importedHasBody.value,
			globalJs: globalJs.value,
			importedJs: globalJs.value,
			importedResources: importedResources.value
		});
		downloadTextFile(html, 'visual-web-document.html', 'text/html;charset=utf-8');
	}
</script>

<header
	class="w-full h-10 max-h-[40px] bg-white border-b border-slate-200/90 select-none flex items-center justify-between px-3 z-50 text-xs font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 transition-colors duration-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:shadow-none"
>
	<!-- LEFT: Brand & Project Name -->
	<div class="flex items-center gap-2.5 min-w-0">
		<button
			type="button"
			onclick={() => (window.location.href = '/')}
			title="All projects"
			class="flex items-center gap-1.5 text-slate-900 hover:text-indigo-600 font-bold transition-colors group dark:text-slate-100 dark:hover:text-indigo-300"
		>
			<img src="/favicon.png" alt="" class="w-7 rounded-md">
			<span>WebMold</span>
		</button>

		{#if activeProjectName}
			<span class="text-slate-400 text-xs font-bold">/</span>

			<div
				class="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-slate-900 font-bold dark:text-slate-100"
				title={activeProjectName}
			>
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
				<button
					onclick={() => (window.location.href = '/')}
					class="truncate max-w-[130px] md:max-w-[200px] text-xs font-bold text-slate-900 dark:text-slate-100"
					>{activeProjectName}</button
				>
			</div>
		{/if}
	</div>

	<!-- CENTER: Canvas Action Controls -->
	<div class="flex items-center gap-1">
		<button
			type="button"
			onclick={() => {
				showImportDialog = true;
				//alert(showImportDialog);
			}}
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border hover:border-indigo-200 transition-all text-[11px] font-bold dark:text-indigo-300 dark:hover:text-indigo-200 dark:border-slate-700 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-400/40"
			title="Import HTML / CSS / JS code into canvas"
		>
			<svg
				class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.25"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
				></path>
			</svg>
			<span>Import HTML</span>
		</button>

		<div class="h-3.5 w-[1px] bg-slate-300 mx-0.5 dark:bg-slate-700"></div>

		<button
			type="button"
			onclick={resetCanvas}
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-rose-700 hover:text-rose-800 hover:bg-rose-50 border hover:border-rose-200 transition-all text-[11px] font-bold dark:text-rose-300 dark:hover:text-rose-200 dark:border-slate-700 dark:hover:bg-rose-500/10 dark:hover:border-rose-400/40"
			title="Resets the canvas to the default ZoomFactor"
		>
			<svg class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.25"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				></path>
			</svg>
			<span>Reset Zoom</span>
		</button>
	</div>

	<!-- RIGHT: Exports & Docs -->
	<div class="flex items-center gap-1.5">
		<button
			type="button"
			onclick={exportDocumentJson}
			class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:shadow transition-all text-[11px] font-bold active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600"
			title="Export canvas layout as JSON"
		>
			<svg class="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
				></path>
			</svg>
			<span class="hidden sm:inline">Export JSON</span>
			<span class="sm:hidden">JSON</span>
		</button>

		<button
			type="button"
			onclick={exportDocumentHtml}
			class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all text-[11px] font-bold active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
			title="Export production-ready HTML and Tailwind CSS"
		>
			<svg
				class="w-3.5 h-3.5 text-indigo-100"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l4 4m0 0l4-4m-4 4V4"
				></path>
			</svg>
			<span class="hidden sm:inline">Export HTML</span>
			<span class="sm:hidden">HTML</span>
		</button>

		<div class="h-3.5 w-[1px] bg-slate-300 mx-0.5 dark:bg-slate-700"></div>

		<button
			type="button"
			onclick={() => goto('/docs')}
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-800 hover:text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-[11px] font-bold dark:text-slate-200 dark:hover:text-indigo-200 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-400/40"
			title="Open WebMold documentation"
		>
			<svg class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.25"
					d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
				></path>
			</svg>
			<span class="hidden md:inline">Docs</span>
		</button>
	</div>
</header>