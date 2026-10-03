<script>
	import {
		classBox,
		selectedElementStyles,
		selectedElement,
		allCreatedRecangles,
		selectedClass,
		editorPanel,
		findNodeByElement,
		listDivCss,
		listClassStyles,
		listGlobalSelectorStyles,
		setNodeStyles,
		setGlobalClassStyles,
		setGlobalSelectorStyles,
		setGlobalJs,
		normalizeStyleArray,
		listElementClasses,
		globalJs,
		selectedGlobalSelector,
		addClassToElement,
		isDraggableGlobalClass
	} from '$lib/js/store.svelte';
	import { isElement } from '$lib/js/webmoldDOM';
	import { onDestroy } from 'svelte';
	import SmartEditor from './SmartEditor.svelte';

	let { disabled = false } = $props();

	let editorValue = $state('');
	let debounceTimeout;
	let lastSelectedElement = null;

	let elementClasses = $derived(
		selectedElement.value && allCreatedRecangles.value ? listElementClasses(selectedElement.value) : []
	);

	// Choose the initial Smart Editor panel for each newly selected element:
	// direct styles win when present; otherwise fall back to its classes.
	// Elements with neither stay on Styles as the neutral/default panel.
	// This effect only ever *chooses a panel* — it never touches editorValue.
	$effect(() => {
		const element = selectedElement.value;
		if (element === lastSelectedElement) return;
		lastSelectedElement = element;

		clearTimeout(debounceTimeout);
		selectedClass.value = null;
		selectedGlobalSelector.value = null;

		if (element) {
			// listDivCss() still runs for its side effects (populating classBox /
			// selectedElementStyles for the editor itself). The panel decision below
			// reads the DOM directly for "has inline styles", since that's always
			// synchronous and can't be stale from a previous element.
			listDivCss();
			const hasStyles = isElement(element) && element.style.length > 0;
			const hasClasses = listElementClasses(element).length > 0;
			const nextPanel = !hasStyles && hasClasses ? 'classes' : 'styles';
			switchPanel(nextPanel);
		}
	});

	// Single source of truth for editorValue. Whatever store this reads
	// during its (synchronous) run becomes a dependency, so it reruns
	// whenever editorPanel / selectedClass / selectedGlobalSelector / globalJs
	// change — and nothing else competes with it to write editorValue.
	$effect(() => {
		syncEditorValue();
	});

	function syncEditorValue() {
		if (editorPanel.value === 'styles') {
			listDivCss();
			editorValue = classBox.value || '';
		} else if (editorPanel.value === 'classes') {
			if (selectedClass.value) {
				listClassStyles(selectedClass.value);
				editorValue = classBox.value || '';
			} else {
				selectedElementStyles.value = [];
				classBox.value = '';
				editorValue = '';
			}
		} else if (editorPanel.value === 'selectors') {
			if (selectedGlobalSelector.value) {
				listGlobalSelectorStyles(selectedGlobalSelector.value);
				editorValue = classBox.value || '';
			} else {
				editorValue = '';
			}
		} else if (editorPanel.value === 'js') {
			editorValue = globalJs.value || '';
		}
	}

	// Only ever updates stores. Never writes editorValue directly —
	// that's syncEditorValue's job, triggered by the effect above.
	function switchPanel(panel) {
		clearTimeout(debounceTimeout);
		if (panel !== 'classes') selectedClass.value = null;
		if (panel !== 'selectors') selectedGlobalSelector.value = null;
		editorPanel.value = panel;
	}

	function selectElementClass(classname) {
		selectedClass.value = classname;
		editorPanel.value = 'classes';
		// editorValue is derived by the sync effect once these stores update —
		// no need to duplicate listClassStyles()/editorValue assignment here.
	}

	function handleEditorInput() {
		// editorValue is already kept in sync by SmartEditor's bind:value.
		// Keep typing local to the SmartEditor until the debounce commits it.
		// Updating classBox on every keystroke triggers the reactive sync above,
		// which can re-read the old persisted styles and fight the editor input.
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(updateEditorValue, 800);
	}

	function updateEditorValue() {
		if (editorPanel.value === 'js') {
			setGlobalJs(editorValue);
			return;
		}

		if (editorPanel.value === 'classes') {
			if (!selectedClass.value) return;
			setGlobalClassStyles(selectedClass.value, editorValue.split(';'));
			return;
		}

		if (editorPanel.value === 'selectors') {
			if (!selectedGlobalSelector.value) return;
			setGlobalSelectorStyles(selectedGlobalSelector.value, editorValue.split(';'));
			return;
		}

		const element = selectedElement.value;
		if (!isElement(element)) return;

		const node = findNodeByElement(allCreatedRecangles.value, element);
		if (!node) return;

		const declarations = normalizeStyleArray(editorValue.split(';'));
		setNodeStyles(node, declarations);
		selectedElementStyles.value = [...declarations];
		classBox.value = declarations.join('\n');
	}

	onDestroy(() => clearTimeout(debounceTimeout));

	function allowClassDrop(event) {
		if (!selectedElement.value) return;
		event.preventDefault();
		// Set the dropEffect to 'copy' to indicate that the dragged data will be copied to the drop target.
		// This is a visual cue for the user, showing that dropping the class will add it to the selected element
		// without removing it from its original location.
		event.dataTransfer.dropEffect = 'copy';
	}

	function handleClassDrop(event) {
		event.preventDefault();
		if (!selectedElement.value) return;
		const classname =
			event.dataTransfer.getData('text/x-visual-editor-class') ||
			event.dataTransfer.getData('text/plain');
		if (!classname || !isDraggableGlobalClass(classname)) return;
		addClassToElement(selectedElement.value, classname);
	}
</script>

<main>
	<div
		class="w-[60rem] h-auto bottom-[1%] left-[25%] flex flex-col gap-2 absolute justify-between px-2 z-[2000]"
	>
		<div class="flex items-center gap-1 rounded-lg bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 p-1 shadow-md">
			<button
				onclick={() => switchPanel('styles')}
				class:activePanel={editorPanel.value === 'styles'}
				class="px-4 py-1.5 rounded-md text-xs font-bold hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Styles</button
			>
			<button
				onclick={() => switchPanel('classes')}
				class:activePanel={editorPanel.value === 'classes'}
				class="px-4 py-1.5 rounded-md text-xs font-bold hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Classes</button
			>
			<button
				onclick={() => switchPanel('js')}
				class:activePanel={editorPanel.value === 'js'}
				class="px-4 py-1.5 rounded-md text-xs font-bold hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">JS</button
			>
		</div>

		{#if editorPanel.value === 'selectors'}
			<div class="rounded-lg bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 p-2 shadow-md">
				<p class="px-1 text-[10px] text-slate-500 dark:text-slate-400">Editing {selectedGlobalSelector.value}</p>
			</div>
		{:else if editorPanel.value === 'classes'}
			<div class="rounded-lg bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 p-2 shadow-md">
				<div class="flex items-center gap-1.5 flex-wrap">
					<!-- drop classes indicator zone -->
					<div
						aria-roledescription="class drop target"
						role="button"
						tabindex="0"
						class="w-fit flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-2 py-1 text-center transition-colors border-blue-400 bg-blue-50 dark:border-indigo-400/60 dark:bg-indigo-500/10"
						ondragover={allowClassDrop}
						ondrop={handleClassDrop}
					>
						<span class="text-xs font-semibold text-slate-500 dark:text-slate-400"
							>Drop a global class here to add +</span
						>
					</div>
					{#if elementClasses.length}
						{#each elementClasses as classname}
							<button
								onclick={() => selectElementClass(classname)}
								class:selectedClassChip={selectedClass.value === classname}
								class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
								>.{classname}</button
							>
						{/each}
					{:else}
						<span class="px-1 text-xs text-slate-400 dark:text-slate-500">This element has no classes.</span>
					{/if}
				</div>
				{#if selectedClass.value}
					<p class="mt-1 px-1 text-[10px] text-slate-500 dark:text-slate-400">Editing .{selectedClass.value}</p>
				{/if}
			</div>
		{:else if editorPanel.value === 'js'}
			<div class="rounded-lg bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 px-3 py-2 shadow-md">
				<p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Global project JavaScript</p>
			</div>
		{/if}

		<SmartEditor
			bind:value={editorValue}
			{disabled}
			language={editorPanel.value === 'js' ? 'js' : 'css'}
			oninput={handleEditorInput}
		/>
	</div>
</main>

<style>
	.activePanel {
		background: #2563eb;
		color: white;
	}

	.selectedClassChip {
		background: #dbeafe;
		color: #1d4ed8;
	}

	/* `html.dark` keeps these stronger than Tailwind's own dark: utilities. */
	:global(html.dark) .activePanel {
		background: #4f46e5;
		color: white;
	}
	:global(html.dark) .selectedClassChip {
		background: rgb(99 102 241 / 0.28);
		color: #c7d2fe;
	}
</style>