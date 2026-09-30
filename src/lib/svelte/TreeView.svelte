<script>
	import TreeView from './TreeView.svelte';
	import {
		hoveredRectangleIndex,
		selectedRectangleIndex,
		selectedGroup,
		selectedElement,
		selectedClass,
		editorPanel,
		listDivCss,
		setSeletedElementProps,
		findNodeById,
		elementType,
		allCreatedRecangles
	} from '../js/store.svelte';

	let { nodes, depth = 0, openState = {}, toggle } = $props();

	const INDENT = 10;

	//function to highlight the rectangles whenever the button is clicked
	function highlightButtonToRectangle(element, index) {
		//this block is to reset the class from active to inactive of the select rectangle if it exist
		if (selectedElement.value != null) {
			selectedElement.value.classList.remove('webmold-selected');
		}
		// The root ("body") node isn't selectable like an ordinary element -
		// checking index (always 0 for root) instead of a specific id value
		// keeps this working regardless of what id (if any) the imported/
		// created page's own <body> tag happens to carry.
		if (index === 0) return;
		//here i set the selectedRectangleIndex to the Index
		//inother to respect the svelte class condition for the button to be highlighted
		selectedRectangleIndex.value = index;
		selectedElement.value = element;
		//set th name, ID and type of the selected element
		setSeletedElementProps(element);
		//editorPanel.value = 'styles';
		selectedClass.value = null;
		//i highlight my rectangle
		selectedElement.value.classList.add('webmold-selected');
		listDivCss();
	}
	function createGroup(element) {
		//console.log(allCreatedRecangles.value);
		const target = findNodeById(allCreatedRecangles.value, element.id);
		target.type = elementType.value[1];
		selectedGroup.value = element;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->

{#each nodes as node (node.index)}
	<!-- data-rectangle="{node.label}-{index}" -->
	<main
		data-node-index={node.index}
		class="grid grid-cols-[1fr_24px] w-full mb-1 min-w-[9.4rem] items-center justify-center"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class:hoveredButton={hoveredRectangleIndex.value == node.index}
			class:activeButton={selectedRectangleIndex.value == node.index}
			class:selectedGroup={selectedGroup.value?.dataset.index == node.index}
			onclick={() => highlightButtonToRectangle(node.element, node.index)}
			class="hover:bg-[#cad5e2b7] w-full rounded-[4px] font-medium flex node relative"
			style="margin-left: {INDENT}px;"
		>
			{#if node.children.length}
				<button
					class="toggle-button absolute -left-3"
					onclick={() => toggle(node.index)}
					aria-label={openState[node.index] ? 'Collapse' : 'Expand'}
				>
					{!openState[node.index] ? '▼' : '▶'}
				</button>
			{:else}
				<span class="toggle-button"></span>
			{/if}
			<img src="/html.png" alt="html logo" class="w-5" />
			<span class="truncate">{node.index === 0 ? 'body' : node.element.id} </span>
		</div>
		<button
			onclick={() => createGroup(node.element)}
			class="bg-slate-100 rounded p-0.5 hover:bg-slate-300 z-50"
			><img
				src={node.type === 'element' ? '/element.svg' : '/group.svg'}
				alt=""
				class="w-5"
			/></button
		>
	</main>

	{#if node.children.length && !openState[node.index]}
		<div
			class="w-full pr-2"
			style="
        border-left: 1px solid #ccc;
        margin-left: {INDENT}px;
        padding-left: {INDENT}px;
      "
		>
			<TreeView nodes={node.children} depth={depth + 1} {openState} {toggle} />
		</div>
	{/if}
{/each}

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

	.activeButton {
		background-color: #cad5e2f9;
	}
	.selectedGroup {
		background-color: rgb(139, 92, 246);
		color: white;
	}
	.hoveredButton {
		background-color: #cad5e26f;
		color:black;
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