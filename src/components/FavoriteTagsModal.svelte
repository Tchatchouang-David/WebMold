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
		class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px] dark:bg-black/60"
		onclick={close}
		oncontextmenu={handleBackdropContextMenu}
		role="presentation"
	>
		<div
			class="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
			oncontextmenu={(event) => event.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="favorite-tags-title"
			tabindex="-1"
		>
			<div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
				<div>
					<h2 id="favorite-tags-title" class="text-sm font-bold text-slate-800 dark:text-slate-100">
						Add favorite tags
					</h2>
					<p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
						Press Enter/Space or Right-click a tag to add it to My Favorite Tags.
					</p>
				</div>
				<button
					type="button"
					onclick={close}
					class="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
							class="min-w-[3.5rem] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300"
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

	/* `html.dark` keeps this stronger than Tailwind's own dark:/hover: utilities. */
	:global(html.dark) .favorite,
	:global(html.dark) .favorite:hover {
		background: rgb(16 185 129 / 0.15);
		border-color: rgb(52 211 153 / 0.45);
		color: #6ee7b7;
	}
</style>
