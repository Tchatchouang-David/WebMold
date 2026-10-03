<script>
	import { tick } from 'svelte';
	import cssCompletionList from '$lib/js/utilities/css_utilities';
	import jsCompletionList from '$lib/js/utilities/js_utilities';

	let { value = $bindable(''), disabled = false, language = 'css', oninput } = $props();

	let editor = $state();
	let editorWrapper = $state();
	let resizeHandle = $state();
	let isResizing = false;
	let resizeStartY = 0;
	let resizeStartHeight = 0;

	// Which completion list drives both autocomplete and keyword highlighting.
	// Reactive because `language` changes at runtime (the Styles/Classes/
	// Selectors panels pass "css", the JS panel passes "js" - same SmartEditor
	// instance, different content).
	let completionList = $derived(language === 'js' ? jsCompletionList : cssCompletionList);
	let keywords = $derived(completionList.map((c) => c.word));

	// For JS highlighting, an identifier is a keyword if it matches any
	// completion word OR any dot-separated part of one (so "console.log"
	// highlights both "console" and "log" when they appear as real
	// identifiers/property accesses in the code, not just the exact phrase).
	const jsKeywordSet = new Set(jsCompletionList.flatMap((c) => c.word.split('.')));
	const JS_TOKEN_PATTERN =
		/(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)/g;

	// State Tracking
	let suggestions = $state([]);
	let showSuggestionsBox = $state(false);
	let selectedIndex = $state(0);
	let boxLeft = $state(0);
	let boxTop = $state(null); // set when there's more room below the caret
	let boxBottom = $state(null); // set when there's more room above the caret
	let maxSuggestionsHeight = $state(300);
	let currentWord = { text: '', start: 0, end: 0 };

	const SUGGESTIONS_MARGIN = 8;
	const SUGGESTIONS_MAX_WIDTH = 320;

	/**
	 * Re-parents the suggestions dropdown to document.body on mount.
	 *
	 * `position: fixed` alone doesn't guarantee escaping a clipped ancestor:
	 * editor-wrapper (or anything between this element and <body>) only needs
	 * a transform/filter/will-change/contain for the browser to treat it as
	 * the fixed-position containing block instead of the viewport, and the
	 * dropdown gets trapped and clipped by that ancestor's overflow again
	 * regardless of top/bottom math. Moving the actual DOM node out to
	 * <body> sidesteps that class of bug entirely rather than depending on
	 * no ancestor ever gaining one of those properties in the future.
	 */
	function portal(node) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove(); // safe no-op if Svelte already detached it
			}
		};
	}

	function startResize(event) {
		if (event.button !== 0 || !editorWrapper || !resizeHandle) return;
		event.preventDefault();
		event.stopPropagation();

		isResizing = true;
		resizeStartY = event.clientY;
		resizeStartHeight = editorWrapper.getBoundingClientRect().height;

		// Keep the pointer stream owned by the resize handle. This prevents
		// canvas pointer handlers from interpreting a resize as a canvas gesture.
		resizeHandle.setPointerCapture?.(event.pointerId);
		resizeHandle.addEventListener('pointermove', handleResize);
		resizeHandle.addEventListener('pointerup', stopResize, { once: true });
		resizeHandle.addEventListener('pointercancel', stopResize, { once: true });
		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'ns-resize';
	}

	function handleResize(event) {
		event.stopPropagation();
		if (!isResizing || !editorWrapper) return;
		const delta = resizeStartY - event.clientY;
		const minHeight = 150;
		const maxHeight = 600;
		const nextHeight = Math.min(maxHeight, Math.max(minHeight, resizeStartHeight + delta));
		editorWrapper.style.height = `${nextHeight}px`;
	}

	function stopResize(event) {
		event?.stopPropagation?.();
		if (!isResizing) return;
		isResizing = false;

		if (resizeHandle) {
			resizeHandle.removeEventListener('pointermove', handleResize);
			resizeHandle.removeEventListener('pointerup', stopResize);
			resizeHandle.removeEventListener('pointercancel', stopResize);
			if (event?.pointerId != null && resizeHandle.hasPointerCapture?.(event.pointerId)) {
				resizeHandle.releasePointerCapture(event.pointerId);
			}
		}

		document.body.style.userSelect = '';
		document.body.style.cursor = '';
	}

	function getCaretPosition(element) {
		let caretOffset = 0;
		const sel = window.getSelection();
		if (sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			const preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(element);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			caretOffset = preCaretRange.toString().length;
		}
		return caretOffset;
	}

	function setCaretPosition(element, offset) {
		const sel = window.getSelection();
		const range = document.createRange();
		let currentOffset = 0;
		let lastTextNode = null;
		let found = false;

		function traverse(node) {
			if (found) return;
			if (node.nodeType === Node.TEXT_NODE) {
				const length = node.textContent.length;
				lastTextNode = node;
				// strict '>' so an exact boundary hands off to the NEXT node
				// (e.g. a <br>) instead of getting stuck at the end of this one
				if (currentOffset + length > offset) {
					range.setStart(node, offset - currentOffset);
					range.collapse(true);
					found = true;
					return;
				}
				currentOffset += length;
			} else if (node.nodeName === 'BR') {
				if (currentOffset === offset) {
					range.setStartAfter(node);
					range.collapse(true);
					found = true;
					return;
				}
			} else {
				for (const child of node.childNodes) {
					traverse(child);
					if (found) return;
				}
			}
		}

		traverse(element);

		if (!found && lastTextNode) {
			// offset was at the very end with nothing after it at all
			range.setStart(lastTextNode, lastTextNode.textContent.length);
			range.collapse(true);
			found = true;
		}

		if (found) {
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}

	function applySyntaxHighlighting() {
		// FIX: Use textContent instead of innerText to perfectly align line breaks
		let text = editor.textContent;

		let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		if (language === 'js') {
			// Real code needs comments/strings/numbers told apart from identifiers,
			// so unlike the CSS branch below this can't just be "wrap every
			// occurrence of every keyword" - `word` in a string or a comment isn't
			// a keyword. Single regex pass, one token type wins per match (first
			// capture group that's set), so nothing gets double-wrapped.
			html = html.replace(
				JS_TOKEN_PATTERN,
				(match, comment, blockComment, string, number, identifier) => {
					if (comment || blockComment) return `<span class="js-comment">${match}</span>`;
					if (string) return `<span class="js-string">${match}</span>`;
					if (number) return `<span class="js-number">${match}</span>`;
					if (identifier && jsKeywordSet.has(identifier)) {
						return `<span class="keyword">${match}</span>`;
					}
					return match;
				}
			);
		} else {
			keywords.forEach((keyword) => {
				const regex = new RegExp(`\\b${keyword}\\b`, 'g');
				html = html.replace(regex, `<span class="keyword">${keyword}</span>`);
			});
		}

		// FIX: Browsers struggle to visually drop the caret to a new line if
		// the text ends with \n. Appending a hidden <br> fixes this instantly.
		if (text.endsWith('\n')) {
			html += '<br>';
		}

		editor.innerHTML = html;
	}

	function handleInput() {
		if (disabled) return;
		const pos = getCaretPosition(editor);
		const text = editor.textContent; // FIX: Switch to textContent
		value = text;
		oninput?.(text);

		applySyntaxHighlighting();
		setCaretPosition(editor, pos);
		checkAutocomplete(pos, text);
	}

	function checkAutocomplete(pos, text) {
		if (disabled) {
			showSuggestionsBox = false;
			return;
		}
		const textBeforeCursor = text.slice(0, pos);
		const match = textBeforeCursor.match(/[a-zA-Z-]+$/);

		if (match) {
			const word = match[0];
			if (word.length >= 1) {
				currentWord = { text: word, start: match.index, end: pos };

				suggestions = completionList.filter((c) =>
					c.word.toLowerCase().startsWith(word.toLowerCase())
				);

				if (suggestions.length > 0) {
					updateSuggestionPosition();
					showSuggestionsBox = true;
					selectedIndex = 0;
					return;
				}
			}
		}
		showSuggestionsBox = false;
	}

	function updateSuggestionPosition() {
		const sel = window.getSelection();
		if (!sel.rangeCount) return;
		const range = sel.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		if (rect.left <= 0 && rect.top <= 0 && rect.width === 0 && rect.height === 0) return;

		// Decide up-vs-down from actual viewport space, not editor-wrapper's
		// bounds - editor-wrapper can be small/clipped/scrolled independently
		// of where the caret actually sits on screen.
		const spaceBelow = window.innerHeight - rect.bottom - SUGGESTIONS_MARGIN;
		const spaceAbove = rect.top - SUGGESTIONS_MARGIN;
		const minDesiredHeight = 120; // room for a handful of suggestion rows

		if (spaceBelow >= minDesiredHeight || spaceBelow >= spaceAbove) {
			// Anchor from the top edge, growing downward.
			boxTop = rect.bottom + 4;
			boxBottom = null;
			maxSuggestionsHeight = Math.max(80, Math.min(300, spaceBelow));
		} else {
			// Not enough room below: anchor from the BOTTOM edge instead, so the
			// box grows upward from the caret's line without needing to know its
			// own rendered height up front (which we can't measure synchronously,
			// since it hasn't been rendered yet at this point).
			boxBottom = window.innerHeight - rect.top + 4;
			boxTop = null;
			maxSuggestionsHeight = Math.max(80, Math.min(300, spaceAbove));
		}

		// Clamp horizontally so a suggestion opened near the right edge of the
		// screen doesn't run off it either.
		boxLeft = Math.min(
			rect.left,
			Math.max(SUGGESTIONS_MARGIN, window.innerWidth - SUGGESTIONS_MAX_WIDTH - SUGGESTIONS_MARGIN)
		);
	}

	async function insertCompletion(suggestion) {
		if (disabled) return;
		const text = editor.textContent; // FIX: Match indices correctly with textContent
		const before = text.slice(0, currentWord.start);
		const after = text.slice(currentWord.end);

		editor.textContent = before + suggestion.insert + after;

		const newPos = currentWord.start + suggestion.insert.length + (suggestion.cursorOffset || 0);

		applySyntaxHighlighting();

		await tick();
		setCaretPosition(editor, newPos);

		showSuggestionsBox = false;
		editor.focus();
	}

	function handleKeydown(e) {
		if (disabled) {
			e.preventDefault();
			return;
		}
		if (showSuggestionsBox) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % suggestions.length;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				insertCompletion(suggestions[selectedIndex]);
			} else if (e.key === 'Escape') {
				showSuggestionsBox = false;
			}
		} else {
			// FIX: Handle normal typing when autocomplete is closed
			if (e.key === 'Tab') {
				e.preventDefault();
				document.execCommand('insertText', false, '    ');
			} else if (e.key === 'Enter') {
				// FIX: Manually insert \n at caret position instead of relying on
				// document.execCommand, which inconsistently handles newlines in
				// contenteditable across browsers.
				e.preventDefault();
				const pos = getCaretPosition(editor);
				const text = editor.textContent;
				const before = text.slice(0, pos);
				const after = text.slice(pos);

				editor.textContent = before + '\n' + after;
				applySyntaxHighlighting();
				setCaretPosition(editor, pos + 1);
			}
		}
	}

	function handlePaste(e) {
		if (disabled) {
			e.preventDefault();
			return;
		}
		e.preventDefault();
		const text = e.clipboardData.getData('text/plain');
		document.execCommand('insertText', false, text);
	}

	$effect(() => {
		if (
			editor &&
			typeof document !== 'undefined' &&
			value !== editor.textContent &&
			document.activeElement !== editor
		) {
			const active = document.activeElement === editor;
			editor.textContent = value || '';
			if (!active) applySyntaxHighlighting();
		}
	});
</script>

<div class="container">
	<div class="editor-wrapper" bind:this={editorWrapper}>
		<button
			type="button"
			bind:this={resizeHandle}
			class="resize-handle"
			aria-label="Resize editor"
			onpointerdown={startResize}
		></button>
		<div
			bind:this={editor}
			role="textbox"
			aria-label="Éditeur de texte"
			aria-multiline="true"
			tabindex="0"
			class="editor"
			contenteditable={!disabled}
			spellcheck="false"
			oninput={handleInput}
			onkeydown={handleKeydown}
			onpaste={handlePaste}
		></div>
	</div>

	{#if showSuggestionsBox}
		<ul
			class="suggestions"
			use:portal
			style="left: {boxLeft}px; {boxBottom !== null
				? `bottom: ${boxBottom}px;`
				: `top: ${boxTop}px;`} max-height: {maxSuggestionsHeight}px;"
		>
			{#each suggestions as suggestion, i}
				<li class:selected={i === selectedIndex}>
					<button
						type="button"
						class="suggestion-btn"
						onmousedown={(e) => {
						e.preventDefault();
						insertCompletion(suggestion);
					}}
					>
						<span class="word">{suggestion.word}</span>
						<span class="preview">{suggestion.insert}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.container {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		max-width: 1024px;
		margin: 0 auto;
	}

	h2 {
		margin-bottom: 8px;
		color: #1e293b;
	}

	.editor-wrapper {
		position: relative;
		min-height: 170px;
		max-height: 600px;
		height: 170px;
		overflow: hidden;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
	}

	.resize-handle {
		position: absolute;
		top: 0;
		right: 0;
		left: 0;
		height: 8px;
		width: 100%;
		z-index: 5;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: ns-resize;
	}

	.resize-handle::after {
		content: '';
		display: block;
		width: 32px;
		height: 2px;
		margin: 2px auto 0;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.6);
	}

	.editor {
		padding: 16px;
		width: 100%;
		height: 100%;
		min-height: 0;
		outline: none;
		background: #1e1e1e;
		color: #d4d4d4;
		border-radius: 6px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		font-family: 'Fira Code', 'Courier New', Courier, monospace;
		font-size: 14px;
		line-height: 1.6;
		white-space: pre-wrap; /* Crucial for \n handling */
		box-sizing: border-box;
		overflow: auto;
		position: relative;
		height: 100%;
	}

	.editor:focus {
		border-color: #3b82f6;
		box-shadow: none;
		outline: none;
	}

	/* Dark theme: the code surface sits slightly deeper than the dark chrome,
	   and the autocomplete popup (portalled to <body>) follows the theme too.
	   Token colours are unchanged - they already target a dark background. */
	:global(html.dark) .editor-wrapper {
		border-color: #334155;
	}
	:global(html.dark) .editor {
		background: #0f1420;
		box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
	}
	:global(html.dark) .suggestions {
		background: #0f172a;
		border-color: #334155;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
	}
	:global(html.dark) .suggestions li {
		color: #cbd5e1;
	}
	:global(html.dark) .suggestions li.selected,
	:global(html.dark) .suggestions li:hover {
		background: #1e293b;
		color: #f8fafc;
	}
	:global(html.dark) .suggestions li .preview {
		color: #64748b;
	}

	:global(.keyword) {
		color: #9cdcfe;
	}

	/* JS-only token colors, VS Code dark-theme-ish, matching .keyword above */
	:global(.js-string) {
		color: #ce9178;
	}
	:global(.js-number) {
		color: #b5cea8;
	}
	:global(.js-comment) {
		color: #6a9955;
		font-style: italic;
	}

	.suggestions {
		position: fixed;
		background: white;
		border: 1px solid #cbd5e1;
		z-index: 2000;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		overflow-y: auto;
		margin: 0;
		padding: 0;
		list-style: none;
		min-width: 180px;
		max-width: min(320px, calc(100vw - 16px));
	}

	.suggestions li {
		padding: 8px 12px;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		font-family: monospace;
		font-size: 13px;
		color: #334155;
	}

	.suggestions li.selected,
	.suggestions li:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.suggestions li .word {
		font-weight: 600;
		color: #0ea5e9;
	}

	.suggestions li .preview {
		color: #94a3b8;
		font-size: 12px;
	}
</style>