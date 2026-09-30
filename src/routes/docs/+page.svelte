<script>
	import { title, description } from '$lib/js/store.svelte';

	const sections = [
		{
			category: 'Viewport & Navigation',
			title: 'Canvas basics',
			icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z M9 9h6v6H9z',
			items: [
				'Create elements directly on the canvas and select them to inspect their properties.',
				'Use the mouse wheel to zoom the canvas. Hold the middle mouse button and drag to pan.',
				'When middle-button panning starts, the editor is temporarily hidden so the gesture does not insert primary-selection text.'
			]
		},
		{
			category: 'Canvas Editing',
			title: 'Draw Mode',
			icon: 'M4 6h16M6 6v12m12-12v12M4 18h16',
			items: [
				'<strong>Draw Mode</strong> adds a 1px black border to every <code class="px-1 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-semibold text-slate-700">.rectangle</code> on the canvas.',
				'Use it while drawing or arranging nested elements so each rectangle remains visually distinct, especially when parent and child elements share the same background color.',
				"The drawing border is separate from the editor's selection and hover <em>outline</em>, so those interaction highlights remain independent.",
				'Draw Mode is a toggle next to Dev Mode and its state is persisted with the project, so reopening a project restores your previous setting.'
			]
		},
		{
			category: 'DOM Tree Management',
			title: 'Hierarchy & Selection',
			icon: 'M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
			items: [
				'The hierarchy on the right reflects the elements currently managed by the project.',
				'Click an element in the canvas or in the <strong>Components</strong> section of the right sidebar to select it and display its properties in the left sidebar.',
				'Keyboard shortcuts are ignored while typing in <strong>inputs, textareas, or the editor.</strong>'
			]
		},
		{
			category: 'Keyboard Shortcuts',
			title: 'Copy, Paste & Delete',
			icon: 'M8 8h10a2 2 0 012 2v9a2 2 0 01-2 2H8a2 2 0 01-2-2V10a2 2 0 012-2zm-2 8H5a2 2 0 01-2-2V5a2 2 0 012-2h9a2 2 0 012 2v1',
			items: [
				'Select any element on the canvas or from the <strong>Components</strong> section in the right sidebar, then press <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-semibold text-slate-700 shadow-2xs">Ctrl + C</kbd> to copy the selected node.',
				'Press <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-semibold text-slate-700 shadow-2xs">Ctrl + V</kbd> to paste the copied node into the current selected parent component.',
				'Press <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-semibold text-slate-700 shadow-2xs">Ctrl + Delete</kbd> to delete the selected node. These shortcuts do not fire while you are editing a form field or content-editable area.'
			]
		},
		{
			category: 'Shared CSS Styles',
			title: 'Global classes',
			icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
			items: [
				'Global classes are shared CSS class definitions available across the project.',
				'Use the <strong>+ Add class</strong> control to create one. Double-click a global class to rename it.',
				"Drag a global class into the selected element's <em>Element classes</em> drop area to attach it.",
				"In the selected element's <em>Element classes</em> section, right-click a class chip to remove that class from the element."
			]
		},
		{
			category: 'Code Inspection & Scripting',
			title: 'Dev Mode',
			icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
			items: [
				'Dev Mode opens the code-oriented editor for the selected element or project-level code.',
				'<strong>Styles</strong> edits ID styles, <strong>Classes</strong> manages class tokens, and <strong>JS</strong> opens global JavaScript.',
				'Global class rules can also be opened from the Global classes section and edited directly in the code editor.'
			]
		},
		{
			category: 'Asset Ingestion Pipeline',
			title: 'Import HTML / CSS / JS',
			icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
			items: [
				'Use <strong>Import HTML</strong> in the canvas toolbar to open the importer modal.',
				'Imported HTML is mapped to hierarchy, while classes and ID styles are made available to the editor.',
				'Imported JavaScript is seamlessly inserted into the project DOM as the global project script.'
			]
		},
		{
			category: 'localForage & IndexedDB',
			title: 'Projects & Storage',
			icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
			items: [
				'Projects are managed from the Projects page. Each project has isolated localForage storage.',
				'Your canvas tree, classes, imported CSS, global JavaScript, Dev Mode state and Draw Mode state are persisted in real time.',
				"Open another project from the Projects page to restore that project's canvas and editor state."
			]
		}
	];

	let activeIndex = $state(0);
</script>

<svelte:head>
	<title>{title.value}</title>
	<meta name="description" content={description.value} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<main
	class="min-h-screen flex flex-col relative overflow-hidden font-sans bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-800"
	style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;"
>
	<!-- Ambient subtle background lighting -->
	<div
		class="pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 w-[1100px] h-[480px] bg-gradient-to-b from-indigo-100/60 via-purple-50/40 to-transparent blur-3xl -z-10"
	></div>
	<div
		class="pointer-events-none absolute top-1/4 -right-48 w-96 h-96 rounded-full bg-blue-100/50 blur-[120px] -z-10"
	></div>

	<!-- Header Section -->
	<header
		class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-all"
	>
		<div class="mx-auto max-w-7xl px-6 py-5">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div
						class="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm"
					>
						<span class="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
						WebMold
					</div>
					<h1 class="mt-2 text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
						Documentation
					</h1>
				</div>

				<button
					type="button"
					class="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow transition-all duration-200 active:scale-95 self-start sm:self-center"
					onclick={() => window.history.back()}
				>
					<svg
						class="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							d="M15 19l-7-7 7-7"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						></path>
					</svg>
					<span>Go back</span>
				</button>
			</div>
		</div>
	</header>

	<!-- Body: sidebar + content -->
	<div
		class="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 flex flex-col md:flex-row gap-8"
	>
		<!-- Sidebar -->
		<aside class="md:w-72 shrink-0">
			<div class="md:sticky md:top-24">
				<div
					class="mb-3 px-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
				>
					<span>{sections.length} Modules</span>
				</div>
				<nav
					class="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
				>
					{#each sections as section, i}
						<button
							type="button"
							class="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-150 shrink-0 md:shrink border
								{activeIndex === i
								? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
								: 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}"
							onclick={() => (activeIndex = i)}
						>
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors
									{activeIndex === i
									? 'bg-white/15 text-white'
									: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={section.icon}
									/>
								</svg>
							</span>
							<span class="whitespace-nowrap md:whitespace-normal">{section.title}</span>
						</button>
					{/each}
				</nav>
			</div>
		</aside>

		<!-- Content panel -->
		<section class="flex-1 min-w-0">
			{#each sections as section, i}
				{#if activeIndex === i}
					<article class="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
						<div class="flex items-center gap-4 pb-5 border-b border-slate-100">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/80 text-indigo-600 shadow-sm"
							>
								<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={section.icon}
									/>
								</svg>
							</div>
							<div>
								<span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600"
									>Module {String(i + 1).padStart(2, '0')} · {section.category}</span
								>
								<h2 class="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
									{section.title}
								</h2>
							</div>
						</div>

						<ul class="mt-6 space-y-4">
							{#each section.items as item}
								<li class="flex items-start gap-3 text-sm leading-6 text-slate-700">
									<div class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></div>
									<span>{@html item}</span>
								</li>
							{/each}
						</ul>
					</article>
				{/if}
			{/each}

			<!-- Pro-tip Banner -->
			<div
				class="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-indigo-50/60 to-purple-50/60 p-5 md:p-6 text-sm text-indigo-950 shadow-sm flex flex-col sm:flex-row items-start gap-4"
			>
				<div class="p-2 rounded-xl bg-indigo-100/80 text-indigo-700 shrink-0">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div class="leading-relaxed text-xs md:text-sm">
					<span class="font-bold text-indigo-900 block sm:inline">Pro Tip:</span>
					Most project changes are persisted automatically to client storage. When working with imported
					code or global styling, keep the visual hierarchy and class cascade in mind because global
					class updates will reflect across every bound node in your project canvas.
				</div>
			</div>

			<!-- Bottom footer stats -->
			<div
				class="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500"
			>
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
					<span>Documentation synchronized with client engine</span>
				</div>
				<span>WebMold · Local Workspace</span>
			</div>
		</section>
	</div>
</main>