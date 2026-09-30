<script>
	import { favoriteTags, showFavoriteTagsModal } from '$lib/js/store.svelte';

	const frequentlyUsedTags = [
		'div',
		'section',
		'header',
		'footer',
		'main',
		'nav',
		'aside',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'p',
		'span',
		'a',
		'button',
		'img',
		'ul',
		'ol',
		'li',
		'label',
		'input',
		'textarea',
		'select',
		'option',
		'table',
		'thead',
		'tbody',
		'tfoot',
		'tr',
		'th',
		'td',
		'pre',
		'code',
		'strong',
		'hr',
		'br',
	];

	function close() {
		showFavoriteTagsModal.value = false;
	}

	function isFavorite(tag) {
		return favoriteTags.value.includes(tag);
	}

	function addFavoriteTag(event, tag) {
		event.preventDefault();
		event.stopPropagation();
		if (isFavorite(tag)) return;
		favoriteTags.value = [...favoriteTags.value, tag];
	}

	function handleBackdropContextMenu(event) {
		event.preventDefault();
	}
</script>

{#if showFavoriteTagsModal.value}
	<div
		class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/35 p-4"
		onclick={close}
		oncontextmenu={handleBackdropContextMenu}
		role="presentation"
	>
		<div
			class="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
			oncontextmenu={(event) => event.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="favorite-tags-title"
			tabindex="-1"
		>
			<div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
				<div>
					<h2 id="favorite-tags-title" class="text-sm font-bold text-slate-800">
						Add favorite tags
					</h2>
					<p class="mt-0.5 text-[11px] text-slate-500">
						Press Enter/Space or Right-click a tag to add it to My Favorite Tags.
					</p>
				</div>
				<button
					type="button"
					onclick={close}
					class="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
					aria-label="Close add favorite tags dialog">×</button
				>
			</div>

			<div class="max-h-[calc(80vh-84px)] overflow-auto p-4">
				<div class="flex flex-wrap gap-2">
					{#each frequentlyUsedTags as tag}
						<button
							type="button"
							onclick={(event) => addFavoriteTag(event, tag)}
							oncontextmenu={(event) => addFavoriteTag(event, tag)}
							class:favorite={isFavorite(tag)}
							class="min-w-[3.5rem] rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors"
							title={isFavorite(tag)
								? `<${tag}> is already a favorite`
								: `Click or Right-click to add <${tag}>`}
						>
							&lt;{tag}&gt;
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.favorite {
		background: #dcfce7;
		border-color: #86efac;
		color: #166534;
	}
</style>
