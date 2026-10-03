<script>
	import {
		devMode,
		drawMode,
		canvas_content,
		setSeletedElementProps,
		allCreatedRecangles,
		selectedElement,
		selectedRectangleIndex,
		hoveredRectangleIndex,
		listDivCss,
		selectedTag,
		selectedGroup,
		selectedPositioning,
		elementType,
		findNodeById,
		favoriteTags,
		showFavoriteTagsModal
	} from '$lib/js/store.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import TreeView from '$lib/svelte/TreeView.svelte';
	import FavoriteTagsModal from './FavoriteTagsModal.svelte';

	function DEVMODE(event) {
		devMode.value = Boolean(event.currentTarget.checked);
	}

	function DRAWMODE(event) {
		drawMode.value = Boolean(event.currentTarget.checked);
	}
	//--------------------------------favorite Tags-------------------------------------------------------------------------------

	let positionings = ['absolute', 'static', 'relative', 'fixed', 'sticky'];

	function clearSelectedFavoriteTag() {
		favoriteTags.value = favoriteTags.value.filter((tag) => tag !== selectedTag.value);
	}

	//------------------------------------------groups and subgroups handling--------------------------------

	onMount(() => {
		selectedGroup.value = canvas_content.value;
	});

	// Centralized state
	let openState = $state({});

	function findPath(tree, targetIndex, path = []) {
		for (const node of tree || []) {
			if (Number(node.index) === Number(targetIndex)) return [...path, node.index];
			if (node.children?.length) {
				const found = findPath(node.children, targetIndex, [...path, node.index]);
				if (found) return found;
			}
		}
		return null;
	}

	async function revealSelectedNode(index) {
		if (index == null) return;
		const path = findPath(allCreatedRecangles.value, index);
		if (!path) return;

		// untrack: this only *reads* openState to build the next value from it.
		// Without untrack, that read makes openState a dependency of the effect
		// below, and the write on the next line would then re-trigger that same
		// effect forever (new object each time => never equal => infinite loop).
		openState = untrack(() => {
			const nextOpenState = { ...openState };
			for (const ancestorIndex of path.slice(0, -1)) nextOpenState[ancestorIndex] = false;
			return nextOpenState;
		});

		await tick();
		const nodeElement = document.querySelector(
			`[data-node-index=\"${CSS.escape(String(index))}\"]`
		);
		nodeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	$effect(() => {
		if (selectedRectangleIndex.value != null) {
			revealSelectedNode(selectedRectangleIndex.value);
		}
	});

	// Centralized toggle function
	function toggle(id) {
		openState = { ...openState, [id]: !openState[id] };
	}
</script>

<main class="w-full h-full py-2 px-1.5 border-l border-l-slate-200 bg-white text-slate-700 transition-colors duration-300 dark:border-l-slate-800 dark:bg-slate-900 dark:text-slate-300">
	<FavoriteTagsModal />
	<div class="w-full h-full overflow-auto transition-all duration-300 scroll-container flex flex-col gap-1.5">
		<div id="editor-modes" class="w-full px-1 py-0.5">
			<div class="grid grid-cols-2 gap-1">
				<label
					for="customCheckbox"
					class="relative flex items-center gap-2 cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-1 py-1.5 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-indigo-400/50"
				>
					<input
						bind:checked={devMode.value}
						onchange={DEVMODE}
						type="checkbox"
						id="customCheckbox"
						class="sr-only peer"
					/>
					<span
						class="relative inline-block h-4 w-8 rounded-full bg-slate-300 transition-colors dark:bg-slate-600 peer-checked:bg-blue-500 peer-checked:ring-1 peer-checked:ring-indigo-400 peer-checked:ring-offset-1 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-3.5"
					></span>
					<span class="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Dev Mode</span>
				</label>

				<label
					for="drawModeCheckbox"
					class="relative flex items-center gap-2 cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-1 py-1.5 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-indigo-400/50"
				>
					<input
						bind:checked={drawMode.value}
						onchange={DRAWMODE}
						type="checkbox"
						id="drawModeCheckbox"
						class="sr-only peer"
					/>
					<span
						class="relative inline-block h-4 w-9 rounded-full bg-slate-300 transition-colors dark:bg-slate-600 peer-checked:bg-slate-800 peer-checked:ring-1 peer-checked:ring-sky-400 peer-checked:ring-offset-1 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-3"
					></span>
					<span class="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Draw Mode</span>
				</label>
			</div>
		</div>
		<hr />
		<div
			id="favorite_list"
			class="w-full flex flex-col px-1 gap-2 mb-1 0 max-h-[27vh] h-auto overflow-auto transition-all duration-300 scroll-container font-roboto"
		>
			{#if favoriteTags.value.length > 0}
				<div class="w-full flex justify-between h-auto">
					<button
						onclick={() => {
							favoriteTags.value = [];
						}}
						class="text-sm py-0.5 px-1.5 text-white bg-red-500 rounded-sm"
						>Clear all favorite tags</button
					>
					{#if selectedTag.value}
						<button
							onclick={clearSelectedFavoriteTag}
							class="bg-red-500 p-0.5 rounded transition-all duration-200 active:scale-[1.2]"
							><img src="/deleteIcon.svg" alt="delete Icon" class="w-5" /></button
						>
					{/if}
				</div>
			{/if}
			<p class="text-[12.5px] underline font-semibold">Element positioning</p>
			<div class="w-full flex flex-wrap gap-2 text-[12.5px] h-auto">
				{#each positionings as position}
					<button
						class:activePosition={selectedPositioning.value === position}
						onclick={() => {
							selectedPositioning.value = position;
						}}
						class="py-0.5 px-2 min-w-[2.8rem] rounded-md bg-slate-200 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{position}</button
					>
				{/each}
			</div>
			<div class="w-full flex items-center justify-between gap-2">
				<p class="text-[12.5px] underline font-semibold">My Favorite Tags</p>
				<button
					type="button"
					onclick={() => {
						showFavoriteTagsModal.value = true;
					}}
					class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 rounded px-1.5 py-0.5 border border-blue-200 hover:bg-blue-50 dark:text-indigo-300 dark:hover:text-indigo-200 dark:border-indigo-400/30 dark:hover:bg-indigo-500/10"
					aria-label="Add favorite tags">+ Add tags</button
				>
			</div>
			<div class="w-full flex flex-wrap gap-2 text-[12.5px] h-auto">
				{#each favoriteTags.value as tag}
					<button
						class:activeTag={selectedTag.value === tag}
						onclick={() => {
							selectedTag.value = tag;
						}}
						class="py-0.5 px-2 font-semibold rounded-md bg-slate-200 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{tag}</button
					>
				{/each}
			</div>
		</div>
		<hr />
		<div class="flex w-full justify-between text-[0.8rem] font-roboto">
			<h3 class="font-bold">Components</h3>
			<button
				class="p-0.5 px-1.5 rounded bg-blue-500 text-white transition-colors hover:bg-blue-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
				onclick={() => {
					selectedGroup.value = canvas_content.value;
				}}>Reset Parent</button
			>
		</div>

		{#if selectedGroup.value}
			<p class="text-[0.78rem]">
				<span class="font-semibold ml-2">Parent Component</span>:<span
					class="text-blue-800 font-semibold ml-1 underline dark:text-indigo-300">{selectedGroup.value.id}</span
				>
			</p>
		{/if}
		<!--section for the components div ith overflow-->
		<div
			class="flex flex-col gap-0.5 items-start transition-all duration-300 scroll-container overflow-auto text-[0.79rem] font-medium w-full min-h-[10%] max-h-[60%] px-0.5 py-1"
			data-webmold-tree
		>
			<TreeView nodes={allCreatedRecangles.value} {openState} {toggle} />
		</div>
	</div>
</main>

<style>
	/* Styles for the created rectangle */

	/* Mark this style as global so it doesn't get scoped */
	:global(.rectangle) {
		/*position: absolute;*/
		/* background-color: rgb(236, 233, 233); */
		transition: all 0.1s;
	}
	:global(.webmold-selected) {
		outline: 4px solid rgb(139, 92, 246);
		outline-offset: -1px;
	}

	:global(.webmold-hover) {
		outline: 3px solid rgba(99, 102, 241, 0.65);
		outline-offset: -1px;
	}

	:global(.activeTag) {
		background: linear-gradient(#0e4a05de, #069d57);
		box-shadow: #2f9544;
		color: white;
	}
	:global(.activePosition) {
		background: linear-gradient(#066178e6, #097de2ee);
		box-shadow: #2f9544;
		color: white;
	}
</style>
