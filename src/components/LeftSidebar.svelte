<script>
	import {
		selectedElement,
		allCreatedRecangles,
		setSeletedElementProps,
		selectedElementType,
		selectedElementID,
		selectedElementName,
		selectedElementStyles,
		styleSheet,
		allClasses,
		selectedClass,
		listClassStyles,
		selectedGlobalSelector,
		listGlobalSelectorStyles,
		renameGlobalClass,
		deleteGlobalClass,
		renameGlobalSelector,
		deleteGlobalSelector,
		addGlobalSelector,
		addClassToElement,
		removeClassFromElement,
		globalJs,
		classBox,
		globalSelectors,
		editorPanel,
		devMode,
		listElementClasses,
		elementType,
		findNodeById,
		normalizeStyleArray,
		syncNodeStyleRule,
		highlightRectangleToButton,
		highlightHoverRectangleToButton,
		isDraggableGlobalClass
	} from '$lib/js/store.svelte';

	import { onDestroy, tick } from 'svelte';

	let { canvasSize = { width: 0, height: 0 } } = $props();

	/* ------------------------------------------------------------------
	 * Local properties
	 * ------------------------------------------------------------------ */

	let selectedElementSrc = $state('');
	let selectedElementAlt = $state('');
	let selectedElementInputType = $state('');
	let selectedElementPlaceholder = $state('');
	let selectedElementRow = $state('');
	let selectedElementFor = $state('');
	let selectedElementHref = $state('');
	let expandedGlobalClasses = $state({});
	let expandedGlobalSelectors = $state({});
	let showClassModal = $state(false);
	let classModalName = $state('');
	let editingClassName = $state(null);
	let editingSelectorName = $state(null);

	// Recompute the visible element classes whenever the logical node tree changes.
	// addClassToElement() replaces the top-level store array, so this keeps the UI
	// reactive even though the selected DOM element reference itself is unchanged.
	let elementClasses = $derived(
		selectedElement.value && allCreatedRecangles.value
			? listElementClasses(selectedElement.value)
			: []
	);

	function openAddClassModal() {
		editingClassName = null;
		editingSelectorName = null;
		classModalName = '';
		showClassModal = true;
	}

	function openEditClassModal(classname) {
		editingClassName = classname;
		editingSelectorName = null;
		classModalName = `.${classname}`;
		showClassModal = true;
	}

	function openEditSelectorModal(selector) {
		editingClassName = null;
		editingSelectorName = selector;
		classModalName = selector;
		showClassModal = true;
	}

	function closeClassModal() {
		showClassModal = false;
		editingClassName = null;
		editingSelectorName = null;
		classModalName = '';
	}

	function saveGlobalClass() {
		const raw = classModalName.trim();
		if (!raw) return;

		if (editingClassName) {
			const name = raw.replace(/^\./, '');
			const success = renameGlobalClass(editingClassName, name);
			if (!success) return;
		} else if (editingSelectorName) {
			const success = renameGlobalSelector(editingSelectorName, raw);
			if (!success) return;
		} else if (raw.startsWith('.')) {
			const name = raw.slice(1).trim();
			if (!name || allClasses.value.some((item) => item.classname === name)) return;
			allClasses.value = [
				...allClasses.value,
				{ classname: name, selector: `.${name}`, styles: [] }
			];
		} else {
			const selector = raw;
			addGlobalSelector(selector);
		}
		closeClassModal();
	}

	function classifySelectorInput(value) {
		const raw = String(value ?? '').trim();
		if (!raw) return 'Enter a selector';
		if (!raw.startsWith('.')) return 'Global selector';
		const body = raw.slice(1);
		const simpleClass = /^[A-Za-z_][A-Za-z0-9_-]*$/;
		return simpleClass.test(body) ? 'Class selector' : 'Compound class / state selector';
	}

	function handleDeleteClassOrSelector() {
		const success = editingClassName
			? deleteGlobalClass(editingClassName)
			: editingSelectorName
				? deleteGlobalSelector(editingSelectorName)
				: false;
		if (success) closeClassModal();
	}

	function handleTextContentInput(event) {
		if (!selectedElement.value) return;
		const value = event.currentTarget.value;
		// Only leaf nodes are editable here. Changing textContent on a parent
		// would remove its child elements from the editor DOM.
		if (selectedElement.value.children.length > 0) return;
		selectedElement.value.textContent = value;
	}

	function handleGlobalJsClick() {
		if (!devMode.value) return;
		selectedClass.value = null;
		editorPanel.value = 'js';
		classBox.value = globalJs.value || '';
	}

	function toggleGlobalClass(classname) {
		expandedGlobalClasses = {
			...expandedGlobalClasses,
			[classname]: !expandedGlobalClasses[classname]
		};
	}

	function handleGlobalClassDragStart(event, classname) {
		if (!isDraggableGlobalClass(classname)) {
			event.preventDefault();
			return;
		}
		//notifies the browser that we are copying data, not moving/cutting.
		event.dataTransfer.effectAllowed = 'copy';
		//dataTransfer.setData() is used to set the data type and the value of the dragged data. Here we are using a custom MIME type 'text/x-visual-editor-class' to identify our class name.
		event.dataTransfer.setData('text/x-visual-editor-class', classname);
		// For compatibility with other applications that might not recognize our custom MIME type, we also set the data as 'text/plain' as fallback. This way, if the drop target doesn't recognize our custom type, it can still access the class name as plain text.
		event.dataTransfer.setData('text/plain', classname);
	}

	function handleGlobalClassClick(classname) {
		if (!devMode.value) return;
		selectedGlobalSelector.value = null;
		selectedClass.value = classname;
		editorPanel.value = 'classes';
		listClassStyles(classname);
	}

	function handleElementClassContextMenu(event, classname) {
		event.preventDefault();
		event.stopPropagation();
		if (!selectedElement.value) return;

		const removed = removeClassFromElement(selectedElement.value, classname);
		if (!removed) return;

		// If the class being edited was removed from this element, leave the
		// element in the neutral Styles panel rather than editing a detached class.
		if (selectedClass.value === classname) {
			selectedClass.value = null;
			editorPanel.value = 'styles';
		}
	}

	function toggleGlobalSelector(selector) {
		expandedGlobalSelectors = {
			...expandedGlobalSelectors,
			[selector]: !expandedGlobalSelectors[selector]
		};
	}

	function handleGlobalSelectorClick(selector) {
		if (!devMode.value) return;
		selectedClass.value = null;
		selectedGlobalSelector.value = selector;
		editorPanel.value = 'selectors';
		listGlobalSelectorStyles(selector);
	}

	/* ------------------------------------------------------------------
	 * Debounce timers
	 * ------------------------------------------------------------------ */

	let debounceIDPropTimeout;
	let debounceTAGPropTimeout;

	onDestroy(() => {
		clearTimeout(debounceIDPropTimeout);
		clearTimeout(debounceTAGPropTimeout);
	});

	/* ------------------------------------------------------------------
	 * Synchronize sidebar values whenever selectedElement changes
	 * ------------------------------------------------------------------ */

	$effect(() => {
		if (selectedElement.value) {
			syncSelectedElementProperties(selectedElement.value);
		}
	});

	function syncSelectedElementProperties(element) {
		selectedElementSrc = element.getAttribute('src') ?? '';
		selectedElementAlt = element.getAttribute('alt') ?? '';
		selectedElementInputType = element.getAttribute('type') ?? '';
		selectedElementPlaceholder = element.getAttribute('placeholder') ?? '';
		selectedElementRow = element.getAttribute('rows') ?? '';
		selectedElementFor = element.getAttribute('for') ?? '';
		selectedElementHref = element.getAttribute('href') ?? '';
	}

	/* ------------------------------------------------------------------
	 * ID
	 * ------------------------------------------------------------------ */

	function handleElementIDProp(event) {
		// Explicitly update the store value from the actual input value.
		selectedElementID.value = event.currentTarget.value;

		clearTimeout(debounceIDPropTimeout);

		debounceIDPropTimeout = setTimeout(() => {
			updateDynamicIDProp();
		}, 2500);
	}

	function updateDynamicIDProp() {
		if (!selectedElement.value) return;

		const node = findNodeById(allCreatedRecangles.value, selectedElement.value.id);
		if (!node) return;

		const previousID = selectedElement.value.id;
		const newID = selectedElementID.value.trim();

		selectedElement.value.id = newID;
		node.label = newID;
		node.element = selectedElement.value;
		allCreatedRecangles.value = [...allCreatedRecangles.value];

		if (previousID !== newID) {
			// Re-render the exact authored declarations under the new selector.
			syncNodeStyleRule(node);
		}
	}

	/* ------------------------------------------------------------------
	 * Generic property updater
	 *
	 * IMPORTANT:
	 * We get the value directly from event.currentTarget.value.
	 * This removes the dependency on whether bind:value has already
	 * updated the variable/store when the handler executes.
	 * ------------------------------------------------------------------ */

	function markProjectTreeDirty() {
		// Re-emit the tree so canvas persistence subscribers are notified after
		// direct DOM/attribute edits that do not otherwise touch a store.
		allCreatedRecangles.value = [...allCreatedRecangles.value];
	}

	async function updateDynamicElementProp(type, event) {
		if (!selectedElement.value) return;

		const value = event?.currentTarget?.value ?? '';

		switch (type) {
			case 'name':
				selectedElementName.value = value;

				await tick();

				selectedElement.value.name = value;
				selectedElement.value.setAttribute('name', value);
				markProjectTreeDirty();
				break;

			case 'src':
				selectedElementSrc = value;

				await tick();

				selectedElement.value.src = value;
				selectedElement.value.setAttribute('src', value);
				markProjectTreeDirty();
				break;

			case 'alt':
				selectedElementAlt = value;

				await tick();

				selectedElement.value.alt = value;
				selectedElement.value.setAttribute('alt', value);
				markProjectTreeDirty();
				break;

			case 'input-type':
				selectedElementInputType = value;

				await tick();

				selectedElement.value.type = value;
				selectedElement.value.setAttribute('type', value);
				markProjectTreeDirty();
				break;

			case 'placeholder':
				selectedElementPlaceholder = value;

				await tick();

				selectedElement.value.placeholder = value;
				selectedElement.value.setAttribute('placeholder', value);
				markProjectTreeDirty();
				break;

			case 'row':
				selectedElementRow = value;

				await tick();

				selectedElement.value.rows = Number(value) || 1;
				selectedElement.value.setAttribute('rows', value);
				markProjectTreeDirty();
				break;

			case 'for':
				selectedElementFor = value;

				await tick();

				// HTMLLabelElement uses htmlFor.
				selectedElement.value.htmlFor = value;
				selectedElement.value.setAttribute('for', value);
				markProjectTreeDirty();
				break;

			case 'href':
				selectedElementHref = value;

				await tick();

				selectedElement.value.setAttribute('href', value);
				markProjectTreeDirty();
				break;

			case 'type':
				// The tag field is special because changing it means
				// replacing the entire DOM element.
				selectedElementType.value = value.trim().toLowerCase();

				clearTimeout(debounceTAGPropTimeout);

				debounceTAGPropTimeout = setTimeout(() => {
					changeElementTag(selectedElement.value, selectedElementType.value);
				}, 2500);

				break;
		}
	}

	/* ------------------------------------------------------------------
	 * Change element tag
	 * ------------------------------------------------------------------ */

	function changeElementTag(oldElement, newTagName) {
		if (!oldElement || !newTagName) return oldElement;

		const normalizedTag = newTagName.trim().toLowerCase();

		// Only allow valid HTML custom element/tag syntax.
		if (!/^[a-z][a-z0-9-]*$/.test(normalizedTag)) {
			return oldElement;
		}

		// Avoid replacing the element if the tag did not actually change.
		if (oldElement.tagName.toLowerCase() === normalizedTag) {
			return oldElement;
		}

		const newElement = document.createElement(normalizedTag);

		/* Copy all attributes. */
		Array.from(oldElement.attributes).forEach((attr) => {
			newElement.setAttribute(attr.name, attr.value);
		});

		/* Move all child nodes. */
		while (oldElement.firstChild) {
			newElement.appendChild(oldElement.firstChild);
		}

		/* Replace old element in the DOM. */
		if (oldElement.parentNode) {
			oldElement.parentNode.replaceChild(newElement, oldElement);
		}

		const node = findNodeById(allCreatedRecangles.value, oldElement.id);
		if (node) {
			node.element = newElement;
			node.label = normalizedTag;
			node.styles = normalizeStyleArray(node.styles || []);
			allCreatedRecangles.value = [...allCreatedRecangles.value];
			newElement.dataset.index = node.index;
			syncNodeStyleRule(node);
		}

		/* Select the newly created element. */
		selectedElement.value = newElement;

		/* Refresh selected element properties. */
		setSeletedElementProps(newElement);
		syncSelectedElementProperties(newElement);

		/* Reattach required event listeners. */
		newElement.addEventListener('click', (event) => {
			highlightRectangleToButton(event);
		});

		newElement.addEventListener('mouseover', (event) => {
			highlightHoverRectangleToButton(event);
		});

		return newElement;
	}
</script>

<main class="w-full h-full">
	<div class="w-full h-full flex flex-col gap-2">
		<!-- Live iframe/canvas dimensions. These values come from a ResizeObserver
		     on the real iframe in CanvasEditor, so zooming and panning do not
		     affect the numbers displayed here. -->
		<nav class="flex gap-3 font-semibold text-xs">
			<button class="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300" type="button"> Canvas Properties </button>
		</nav>

		<div class="grid grid-cols-2 gap-2 w-full">
			<div class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/60">
				<span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Width</span>
				<span class="mt-0.5 flex items-baseline gap-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{canvasSize.width}<span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">px</span></span>
			</div>
			<div class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/60">
				<span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Height</span>
				<span class="mt-0.5 flex items-baseline gap-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{canvasSize.height}<span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">px</span></span>
			</div>
		</div>

		<hr />

		<nav class="flex gap-3 font-semibold text-xs">
			<button class="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300" type="button"> HTML Tag Properties </button>
		</nav>

		<main class="w-full h-full flex flex-col gap-1">
			<div class="flex flex-col w-full items-center gap-2">
				{#if selectedElement.value}
					<!-- ID -->
					<div class="flex flex-col w-full gap-1 p-0.5">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</span>

						<input
							oninput={handleElementIDProp}
							bind:value={selectedElementID.value}
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
							type="text"
						/>
					</div>

					<!-- Name -->
					<div class="flex flex-col w-full gap-1 p-0.5">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</span>

						<input
							oninput={(event) => updateDynamicElementProp('name', event)}
							bind:value={selectedElementName.value}
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
							type="text"
						/>
					</div>

					<!-- Tag -->
					<div class="flex flex-col w-full gap-1 p-0.5">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</span>

						<input
							oninput={(event) => updateDynamicElementProp('type', event)}
							bind:value={selectedElementType.value}
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
							type="text"
						/>
					</div>

					{#if ['DIV', 'P', 'SECTION', 'MAIN', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'SPAN', 'A', 'BUTTON', 'LABEL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(selectedElement.value.tagName)}
						<div class="flex flex-col w-full p-0.5 gap-1">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Text content</span>
							<textarea
								value={selectedElement.value.textContent || ''}
								oninput={handleTextContentInput}
								disabled={selectedElement.value.children.length > 0}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15 min-h-[4rem] resize-y disabled:cursor-not-allowed disabled:opacity-50"
								title={selectedElement.value.children.length > 0
									? 'Text content is read-only for elements containing child elements.'
									: 'Edit the text content of this element.'}
							></textarea>
						</div>
					{/if}

					<!-- IMG -->
					{#if selectedElement.value.tagName === 'IMG'}
						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source</span>

							<input
								oninput={(event) => updateDynamicElementProp('src', event)}
								bind:value={selectedElementSrc}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="text"
							/>
						</div>

						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alt text</span>

							<input
								oninput={(event) => updateDynamicElementProp('alt', event)}
								bind:value={selectedElementAlt}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="text"
							/>
						</div>
					{/if}

					<!-- INPUT -->
					{#if selectedElement.value.tagName === 'INPUT'}
						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Input type</span>

							<input
								oninput={(event) => updateDynamicElementProp('input-type', event)}
								bind:value={selectedElementInputType}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="text"
							/>
						</div>

						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Placeholder</span>

							<input
								oninput={(event) => updateDynamicElementProp('placeholder', event)}
								bind:value={selectedElementPlaceholder}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="text"
							/>
						</div>
					{/if}

					<!-- TEXTAREA -->
					{#if selectedElement.value.tagName === 'TEXTAREA'}
						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rows</span>

							<input
								oninput={(event) => updateDynamicElementProp('row', event)}
								bind:value={selectedElementRow}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="number"
								min="1"
							/>
						</div>
					{/if}

					<!-- A -->
					{#if selectedElement.value.tagName === 'A'}
						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Link (href)</span>

							<input
								oninput={(event) => updateDynamicElementProp('href', event)}
								bind:value={selectedElementHref}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="text"
							/>
						</div>
					{/if}

					<!-- LABEL -->
					{#if selectedElement.value.tagName === 'LABEL'}
						<div class="flex flex-col w-full gap-1 p-0.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">For (input id)</span>

							<input
								oninput={(event) => updateDynamicElementProp('for', event)}
								bind:value={selectedElementFor}
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-950 dark:focus:ring-indigo-400/15"
								type="text"
							/>
						</div>
					{/if}
				{:else}
					<img src="/noData.svg" alt="" class="w-8 mt-5 dark:invert dark:opacity-60" />

					<p class="font-medium my-3 text-xs">No Properties</p>
				{/if}
			</div>

			<hr />

			<button class="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300 my-2 text-xs w-fit font-bold">
				Element classes
			</button>

			{#if !selectedElement.value}
				<div class="w-full flex flex-col items-center">
					<img src="/noData.svg" alt="" class="w-8 mt-5 dark:invert dark:opacity-60" />
					<p class="font-medium my-3 text-xs text-center">Select an element to manage classes</p>
				</div>
			{:else if elementClasses.length > 0}
				<div class="flex flex-wrap gap-1.5 mb-2">
					{#each elementClasses as classname}
						<button
							type="button"
							onclick={() => handleGlobalClassClick(classname)}
							oncontextmenu={(event) => handleElementClassContextMenu(event, classname)}
							class:selectedClassChip={selectedClass.value === classname}
							class="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-500/15"
							title={devMode.value
								? `Edit .${classname} — right-click to remove from this element`
								: `.${classname} — right-click to remove from this element`}>.{classname}</button
						>
					{/each}
				</div>
			{:else}
				<div class="text-xs font-semibold text-slate-500 mb-2 dark:text-slate-400">This element has no classes</div>
			{/if}

			<hr class="" />
			<div class="flex items-center justify-between my-2">
				<button class="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300 my-2 text-xs w-fit font-bold">
					Global classes
				</button>
				<button
					type="button"
					onclick={openAddClassModal}
					class="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-indigo-300 dark:hover:text-indigo-200">+ Add class</button
				>
			</div>

			{#if allClasses.value.length === 0}
				<div class="w-full flex flex-col items-center">
					<img src="/noData.svg" alt="" class="w-10 mt-2 dark:invert dark:opacity-60" />
					<p class="font-medium my-3 text-xs">No Global Classes Available</p>
				</div>
			{:else}
				<div class="flex flex-col gap-1.5">
					{#each allClasses.value as classData (classData.classname)}
						<div class="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
							<div class="flex items-center gap-1">
								<button
									type="button"
									onclick={(event) => {
										event.stopPropagation();
										toggleGlobalClass(classData.classname);
									}}
									class="w-7 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
									aria-label={expandedGlobalClasses[classData.classname]
										? 'Collapse class'
										: 'Expand class'}
									>{expandedGlobalClasses[classData.classname] ? '▼' : '▶'}</button
								>
								<button
									type="button"
									draggable={isDraggableGlobalClass(classData.classname)}
									ondragstart={(event) => handleGlobalClassDragStart(event, classData.classname)}
									onclick={() => handleGlobalClassClick(classData.classname)}
									ondblclick={(event) => {
										event.stopPropagation();
										openEditClassModal(classData.classname);
									}}
									class:selectedGlobalClass={selectedClass.value === classData.classname}
									class="flex-1 text-left py-1.5 px-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 truncate dark:text-slate-200 dark:hover:bg-slate-800/70 cursor-grab active:cursor-grabbing"
									title={devMode.value ? `Edit .${classData.classname}` : `.${classData.classname}`}
									>.{classData.classname}</button
								>
							</div>

							{#if expandedGlobalClasses[classData.classname]}
								<div class="border-t border-slate-200 bg-slate-50 p-2 flex flex-col gap-1 dark:border-slate-700 dark:bg-slate-950/50">
									{#if classData.styles.length}
										{#each classData.styles as declaration}
											<code class="text-[10px] break-all text-slate-600 dark:text-slate-300">{declaration}</code>
										{/each}
									{:else}
										<span class="text-[10px] text-slate-400">No declarations</span>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if globalSelectors.value.length > 0}
				<div class="mt-3">
					<div class="flex items-center justify-between my-2">
						<button class="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300 my-2 text-xs w-fit font-bold">
							Global selectors
						</button>
						<span class="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-indigo-300 dark:hover:text-indigo-200">selectors</span>
					</div>
					<div class="flex flex-col gap-1.5">
						{#each globalSelectors.value as selectorData (selectorData.selector)}
							<div class="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
								<div class="flex items-center gap-1">
									<button
										type="button"
										onclick={(event) => {
											event.stopPropagation();
											toggleGlobalSelector(selectorData.selector);
										}}
										class="w-7 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
										aria-label={expandedGlobalSelectors[selectorData.selector]
											? 'Collapse selector'
											: 'Expand selector'}
										>{expandedGlobalSelectors[selectorData.selector] ? '▼' : '▶'}</button
									>
									<button
										type="button"
										onclick={() => handleGlobalSelectorClick(selectorData.selector)}
										ondblclick={(event) => {
											event.stopPropagation();
											openEditSelectorModal(selectorData.selector);
										}}
										class:selectedGlobalClass={selectedGlobalSelector.value ===
											selectorData.selector}
										class="flex-1 text-left py-1.5 px-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 truncate dark:text-slate-200 dark:hover:bg-slate-800/70"
										title={`${selectorData.selector} — click to edit, double-click to rename/delete`}
										><code class="truncate">{selectorData.selector}</code></button
									>
								</div>
								{#if expandedGlobalSelectors[selectorData.selector]}
									<div class="border-t border-slate-200 bg-slate-50 p-2 flex flex-col gap-1 dark:border-slate-700 dark:bg-slate-950/50">
										{#if selectorData.styles.length}
											{#each selectorData.styles as declaration}
												<code class="text-[10px] break-all text-slate-600 dark:text-slate-300">{declaration}</code>
											{/each}
										{:else}
											<span class="text-[10px] text-slate-400">No declarations</span>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<hr class="my-3" />
			<div class="flex items-center justify-between my-2">
				<button class="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300 text-xs w-fit font-bold">
					Global JS
				</button>
				<button
					type="button"
					onclick={handleGlobalJsClick}
					class:selectedGlobalClass={editorPanel.value === 'js'}
					class="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
					title={devMode.value ? 'Edit global JavaScript' : 'Global project JavaScript'}>JS</button
				>
			</div>
			<pre
				class="max-h-[280px] min-h-[270px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">{globalJs.value ||
					'No global JavaScript.'}</pre>
		</main>

		{#if showClassModal}
			<div class="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] dark:bg-black/60">
				<div class="w-full max-w-sm rounded-xl bg-white border border-slate-300 shadow-2xl p-4 dark:bg-slate-900 dark:border-slate-700">
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-bold text-slate-800 dark:text-slate-100">
							{editingClassName
								? 'Edit class'
								: editingSelectorName
									? 'Edit global selector'
									: 'Add class or selector'}
						</h3>
						<button
							type="button"
							onclick={closeClassModal}
							class="text-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200">×</button
						>
					</div>
					<label class="flex flex-col gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
						<span>{editingSelectorName ? 'Selector' : 'Class or selector'}</span>
						<input
							bind:value={classModalName}
							onkeydown={(event) => event.key === 'Enter' && saveGlobalClass()}
							autofocus
							class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
							placeholder="my-class"
						/>
						<div class="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
							{classifySelectorInput(classModalName)}
						</div>
					</label>
					<div class="flex justify-end gap-2 mt-4">
						{#if editingClassName || editingSelectorName}
							<button
								type="button"
								onclick={handleDeleteClassOrSelector}
								class="mr-auto rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:border-rose-400/30 dark:text-rose-300"
								>Delete</button
							>
						{/if}
						<button
							type="button"
							onclick={closeClassModal}
							class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
							>Cancel</button
						>
						<button
							type="button"
							onclick={saveGlobalClass}
							class="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
							>{editingClassName || editingSelectorName ? 'Update' : 'Add'}</button
						>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.selectedClassChip,
	.selectedGlobalClass {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	/* `html.dark` keeps this stronger than Tailwind's own dark: utilities. */
	:global(html.dark) .selectedClassChip,
	:global(html.dark) .selectedGlobalClass {
		background-color: rgb(99 102 241 / 0.25);
		color: #c7d2fe;
	}
</style>
