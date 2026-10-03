<script>
	import { onMount, tick, onDestroy } from 'svelte';
	import LeftSidebar from './LeftSidebar.svelte';
	import RightSidebar from './RightSidebar.svelte';
	import Editor from './Editor.svelte';
	import ImportDialog from './ImportDialog.svelte';
	import Toasts from '$lib/svelte/Toasts.svelte';
	import { addToast } from '$lib/js/toastStore.svelte';
	import {
		canvas_content,
		devMode,
		drawMode,
		highlightRectangleToButton,
		highlightHoverRectangleToButton,
		hoveredRectangleIndex,
		elementType,
		selectedElement,
		selectedTag,
		selectedGroup,
		selectedPositioning,
		allCreatedRecangles,
		selectedRectangleIndex,
		styleSheet,
		setNodeStyles,
		countNodes,
		addChildToNode,
		findNodeById,
		removeNodeById,
		updateNode,
		unhighlightHoverRectangle,
		allClasses,
		globalSelectors,
		selectedGlobalSelector,
		selectedClass,
		editorPanel,
		importedCssText,
		importedHasBody,
		globalJs,
		globalScriptElement,
		importedStyleSheet,
		globalClassStyleSheet,
		normalizeStyleArray,
		serializeAllCreatedRecangles,
		syncNodeStyleRule,
		syncAllGlobalClassRules,
		title,
		description
	} from '$lib/js/store.svelte';
	import { parseImportedHtml, parseImportedCss, extractEmbeddedAssets } from '$lib/js/importer';
	import { WebMoldDOM, isElement, isFormField } from '$lib/js/webmoldDOM';
	import {
		listProjects,
		setActiveProjectId,
		getActiveProjectId,
		saveProjectSnapshot,
		loadProjectSnapshot
	} from '$lib/js/persistence';
	import Header from './Header.svelte';
	import { getStarterTemplate } from '$lib/js/starterTemplate';

	//this variable is the creation content container
	let container;
	//the sandboxed canvas surface: every drawn/imported element now lives in
	//this iframe's own document instead of Webmold's, so an imported
	//`:root`/`body`/`*` selector physically cannot reach the rest of the app.
	let canvasFrame;
	let frameReady = $state(false);
	// The canvas is a fixed-size "page" now, not something that auto-fits
	// its own content: default width/height = the visible viewport (or, for
	// an import, whatever the imported page measures at once, right after
	// import - see importProject), then only ever changed by the user
	// explicitly dragging one of the resize handles (see startCanvasResize
	// below). Earlier passes tried making this reactive - resizing the
	// iframe continuously to match scrollWidth/scrollHeight via a
	// ResizeObserver - which is what caused every one of the vibration/
	// wrong-position/zoom-jump/scrollbar bugs already fixed in this file:
	// content sized in vw/vh/% resolves against this very box, so
	// auto-growing the box to fit such content feeds back on itself, and an
	// iframe that can genuinely scroll breaks the assumption that an event's
	// clientX/Y equals its body-space position. A fixed, user-set size
	// removes the entire category: the iframe never scrolls
	// (overflow: hidden, see CANVAS_FRAME_SRCDOC) and never resizes itself.
	let canvasFrameSize = $state({ width: 0, height: 0 });

	// Live dimensions exposed to the left sidebar. This is intentionally
	// measured from the iframe's untransformed layout box so zoom/pan never
	// changes the values shown to the user. The ResizeObserver keeps this
	// synchronized with the real iframe whenever its width or height changes.
	let canvasSize = $state({ width: 0, height: 0 });
	let canvasSizeObserver = null;

	function syncCanvasSizeFromFrame() {
		if (!canvasFrame) return;

		canvasSize = {
			width: Math.round(canvasFrame.offsetWidth || 0),
			height: Math.round(canvasFrame.offsetHeight || 0)
		};
	}

	function observeCanvasFrameSize() {
		if (!canvasFrame || typeof ResizeObserver === 'undefined') return;

		canvasSizeObserver?.disconnect();
		syncCanvasSizeFromFrame();

		canvasSizeObserver = new ResizeObserver(() => {
			syncCanvasSizeFromFrame();
		});
		canvasSizeObserver.observe(canvasFrame);
	}

	const CANVAS_MIN_WIDTH = 320; // px - a page narrower than this isn't a useful "page" anymore
	const CANVAS_MAX_WIDTH = 4000; // px
	const CANVAS_MIN_HEIGHT = 200; // px
	const CANVAS_MAX_HEIGHT = 8000; // px

	function clampCanvasDimension(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	// The size a canvas starts at before the user ever touches a resize
	// handle: the currently-visible viewport, i.e. the same "100vw" a real
	// visitor's browser would give the page.
	function defaultCanvasFrameSize() {
		return {
			width: clampCanvasDimension(container?.clientWidth || 0, CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH),
			height: clampCanvasDimension(container?.clientHeight || 0, CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)
		};
	}

	// Called exactly once, right after an imported page's content has been
	// injected - NOT reactively. Gives an imported project a sensible
	// starting size derived from what it actually measures at, instead of
	// always starting at the bare viewport default like a blank project.
	function measureImportedCanvasFrameSize() {
		if (!WebMoldDOM.isReady()) return defaultCanvasFrameSize();
		const frameDoc = WebMoldDOM.document;
		const viewport = defaultCanvasFrameSize();
		const contentWidth = frameDoc.documentElement?.scrollWidth || 0;
		const contentHeight = frameDoc.documentElement?.scrollHeight || 0;
		return {
			width: clampCanvasDimension(Math.max(viewport.width, contentWidth), CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH),
			height: clampCanvasDimension(
				Math.max(viewport.height, contentHeight),
				CANVAS_MIN_HEIGHT,
				CANVAS_MAX_HEIGHT
			)
		};
	}
	// Minimal document the iframe boots with. The three <style> tags are
	// pre-created here (rather than createElement'd on first use) so every
	// existing `getElementById('imported-styles' | 'dynamic-styles' |
	// 'global-class-editor-styles')` call keeps working unchanged once it's
	// retargeted at this document instead of the host one.
	const CANVAS_FRAME_SRCDOC = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style id="webmold-canvas-reset">
	/* The canvas is a fixed-size page now (see canvasFrameSize inside
	   script), sized once (viewport default, or a one-time measurement on
	   import) and after that changed only by the user dragging a resize
	   handle - never by content, and never scrollable. So overflow is
	   hidden on both axes: anything placed past the current size is
	   genuinely clipped, matching "this isn't part of the page", the same
	   way a real browser clips a page wider than its content only if you
	   deliberately made it that way.
	   overflow lives on <html>, never on body: body is the containing block
	   (position: relative) for absolutely-positioned drawn/imported
	   elements, and if IT also clipped its own overflow, that overflow
	   would be swallowed right there - invisible, and invisible to
	   documentElement.scrollWidth/scrollHeight (used once, at import, to
	   size a new canvas to fit what it imported) - before <html> ever saw
	   it. */
	html, body { margin: 0; padding: 0; }
	html { overflow: hidden; }
	body { position: relative; }
</style>
<!--
	These rules used to be ":global(...)" selectors in this component's own
	<style> block. That block is compiled by Svelte into a stylesheet in the
	HOST document - it never reaches elements that live inside this iframe's
	separate document, no matter how "global" the selector is marked. They're
	moved here, verbatim, for that reason. Keep this in sync with
	wireImportedElement/wireRestoredElement/finalizeElementCreation (the
	.rectangle/.webmold-hover/.webmold-selected class names) and with the
	"draw-mode" class mirrored onto <body> by the $effect near drawMode below.
-->
<style id="webmold-canvas-base">
	.rectangle {
		transition:
			outline-color 0.1s ease,
			box-shadow 0.1s ease,
			background-color 0.1s ease;
	}
	body.draw-mode .rectangle {
		border: 1px solid rgba(128, 128, 128, 0.4);
		box-sizing: border-box;
	}
	.webmold-selected {
		outline: 4px solid rgb(139, 92, 246) !important;
		outline-offset: -1px !important;
	}
	.webmold-hover {
		outline: 3px solid rgba(99, 102, 241, 0.65) !important;
		outline-offset: -1px !important;
		box-shadow:
			rgba(115, 3, 3, 0.16) 0px 3px 6px,
			rgba(86, 2, 2, 0.23) 0px 3px 6px !important;
	}
</style>
<style id="imported-styles"></style>
<style id="dynamic-styles"></style>
<style id="global-class-editor-styles"></style>
</head>
<body id="canvas"></body>
</html>`;
	//this is the variable to determine if we use tailwindcss or purecss
	let style = 'purecss';
	let showImportDialog = $state(false);
	// shall hold the script tag and its js logic
	let importedScriptElement = null;
	// Hide the floating editor while the middle mouse button is used to pan the canvas.
	let hideEditorWhilePanning = $state(false);

	let { projectId = null } = $props();

	let persistenceReady = $state(false);
	let persistenceTimer = null;
	let activeProjectId = null;
	let activeProjectName = $state('');

	function scheduleProjectPersistence() {
		if (!persistenceReady || !activeProjectId) return;
		clearTimeout(persistenceTimer);
		persistenceTimer = setTimeout(async () => {
			try {
				// allClasses.value / globalSelectors.value are live Svelte 5 $state
				// proxies (deeply reactive arrays-of-objects), and IndexedDB's
				// structured-clone algorithm can only clone plain data - handing it
				// a Proxy directly throws DataCloneError. $state.snapshot() takes a
				// deep, plain, non-reactive copy of the whole payload in one go, so
				// this stays safe even if a future field is added here without
				// going through a serializer first.
				await saveProjectSnapshot(
					$state.snapshot({
						version: 1,
						allCreatedRecangles: serializeAllCreatedRecangles(),
						canvasFrameSize,
						allClasses: allClasses.value,
						globalSelectors: globalSelectors.value,
						importedCss: importedCssText.value,
						importedHasBody: importedHasBody.value,
						globalJs: globalJs.value,
						devMode: devMode.value,
						drawMode: drawMode.value
					}),
					activeProjectId
				);
			} catch (error) {
				console.error('Project persistence failed:', error);
			}
		}, 700);
	}

	// Reactive replacement for the old per-store `.subscribe(scheduleProjectPersistence)`
	// wiring. Reading each value here registers it as a dependency, so this effect
	// re-runs (and reschedules persistence) whenever any of them changes -
	// scheduleProjectPersistence itself still no-ops until persistenceReady is true.
	$effect(() => {
		allCreatedRecangles.value;
		canvasFrameSize;
		allClasses.value;
		globalSelectors.value;
		importedCssText.value;
		importedHasBody.value;
		globalJs.value;
		devMode.value;
		drawMode.value;
		scheduleProjectPersistence();
	});

	function initializeEmptyCanvas() {
		if (!canvas_content.value) return;

		canvas_content.value.innerHTML = '';
		clearStylesheet(styleSheet.value);
		clearStylesheet(globalClassStyleSheet.value);
		canvasFrameSize = defaultCanvasFrameSize();

		allCreatedRecangles.value = [
			{
				index: 0,
				element: canvas_content.value,
				label: 'body',
				type: 'group',
				children: [],
				styles: [],
				classes: []
			}
		];

		allClasses.value = [];
		globalSelectors.value = [];
		selectedGlobalSelector.value = null;
		importedCssText.value = '';
		importedHasBody.value = false;
		const importedStyle = WebMoldDOM.getElementById('imported-styles');
		if (importedStyle) importedStyle.textContent = '';
		globalJs.value = '';

		if (importedScriptElement?.parentNode) {
			importedScriptElement.parentNode.removeChild(importedScriptElement);
		}
		importedScriptElement = null;
		globalScriptElement.value = null;

		selectedGroup.value = canvas_content.value;
		selectedElement.value = null;
		selectedClass.value = null;
		selectedGlobalSelector.value = null;
		editorPanel.value = 'styles';
		selectedRectangleIndex.value = null;
	}

	function clearStylesheet(sheet) {
		if (!sheet) return;
		while (sheet.cssRules.length) sheet.deleteRule(sheet.cssRules.length - 1);
	}

	function ensureImportedStyleElements() {
		// All three style tags ship pre-created in CANVAS_FRAME_SRCDOC, so this
		// is now just wiring up the CSSStyleSheet references - but the
		// createElement fallback is kept in case a future srcdoc edit drops one.
		let importedStyle = WebMoldDOM.getElementById('imported-styles');
		if (!importedStyle) {
			importedStyle = WebMoldDOM.createElement('style');
			importedStyle.id = 'imported-styles';
			const dynamicStyle = WebMoldDOM.getElementById('dynamic-styles');
			if (dynamicStyle) WebMoldDOM.head.insertBefore(importedStyle, dynamicStyle);
			else WebMoldDOM.head.appendChild(importedStyle);
		}
		importedStyleSheet.value = importedStyle.sheet;

		let classStyle = WebMoldDOM.getElementById('global-class-editor-styles');
		if (!classStyle) {
			classStyle = WebMoldDOM.createElement('style');
			classStyle.id = 'global-class-editor-styles';
			WebMoldDOM.head.appendChild(classStyle);
		}
		globalClassStyleSheet.value = classStyle.sheet;
	}

	// We check if the script has already been appended to the head, if so, we delete/remove the entire script with all its js logic
	function removeImportedScript() {
		if (importedScriptElement?.parentNode)
			importedScriptElement.parentNode.removeChild(importedScriptElement);
		importedScriptElement = null;
		globalScriptElement.value = null;
	}

	function appendImportedScript(jsText) {
		removeImportedScript();
		if (!jsText.trim() || !WebMoldDOM.isReady()) return;

		const frameDoc = WebMoldDOM.document;
		// checks if the isolated iframe DOM has already been loaded and if
		//  in jsText, there's any code portion that relies on DOMContentLoaded
		const replayDomContentLoaded =
			frameDoc.readyState !== 'loading' && /\bDOMContentLoaded\b/.test(jsText);

		// Executed inside the canvas iframe's own document/window: `document`,
		// `window`, `document.getElementById`, etc. referenced by imported code
		// now resolve to the sandboxed canvas, never to Webmold's real document -
		// this is the piece Shadow DOM could not have given us for free.
		const script = WebMoldDOM.createElement('script');
		script.id = 'imported-project-script';
		script.type = 'text/javascript';
		script.textContent = jsText;
		frameDoc.body.appendChild(script);
		importedScriptElement = script;
		globalScriptElement.value = script;

		// Imported pages are usually injected after the iframe's own
		// DOMContentLoaded event has already fired. Replay the event for
		// imported scripts that explicitly wait for it, so patterns like
		// `DOMContentLoaded -> appear` continue to work when a complete landing
		// page is pasted into Webmold.
		if (replayDomContentLoaded) {
			queueMicrotask(() => {
				// triggers DOMContentLoaded events inside the iframe document
				frameDoc.dispatchEvent(new Event('DOMContentLoaded'));
			});
		}
	}

	// Manual resize handles: drag the right edge to change width, the bottom edge to change height.
	//
	// IMPORTANT: the resize gesture is captured by the exact host-side handle that
	// received pointerdown. The iframe is a separate browsing context, so without
	// pointer capture a drag that crosses into the iframe can stop delivering the
	// host window's pointerup event. That leaves `resizingAxis` stuck and makes later
	// pointer movement resize the canvas even though the mouse button is no longer down.
	//
	// The handle is also the safest event target because the handles themselves are
	// siblings of the iframe in the host document. Capturing the pointer here keeps
	// pointermove/pointerup/pointercancel attached to the same host element for the
	// entire gesture, regardless of what is visually underneath the pointer.
	// getHostPoint() therefore remains in the correct host-space coordinate system,
	// and dividing the host-space drag delta by `scale` converts it into the same
	// canvas-space units used by canvasFrameSize.
	let resizingAxis = null; // 'width' | 'height' | null
	let resizeStartSize = { width: 0, height: 0 };
	let resizeStartPoint = { x: 0, y: 0 };
	let resizeCaptureTarget = null;
	let resizePointerId = null;

	function startCanvasResize(axis) {
		return (event) => {
			event.preventDefault();
			event.stopPropagation(); // don't also start a pan/draw gesture underneath

			const target = event.currentTarget;
			if (!(target instanceof HTMLElement)) return;

			// Defensive cleanup in case an interrupted gesture somehow survived.
			endCanvasResize();

			resizingAxis = axis;
			resizeStartSize = { ...canvasFrameSize };
			resizeStartPoint = getHostPoint(event);
			resizeCaptureTarget = target;
			resizePointerId = event.pointerId;

			// Keep the whole pointer gesture attached to this host-side handle.
			// This is what allows the user to drag across the iframe and still receive
			// the final pointerup/pointercancel here.
			try {
				target.setPointerCapture(event.pointerId);
			} catch (error) {
				// Ignore environments where pointer capture is unavailable.
			}

			target.addEventListener('pointermove', handleCanvasResizeMove);
			target.addEventListener('pointerup', endCanvasResize);
			target.addEventListener('pointercancel', endCanvasResize);
			target.addEventListener('lostpointercapture', endCanvasResize);
		};
	}

	function handleCanvasResizeMove(event) {
		if (!resizingAxis) return;

		const point = getHostPoint(event);

		if (resizingAxis === 'width') {
			const deltaCanvas = (point.x - resizeStartPoint.x) / scale;
			canvasFrameSize = {
				...canvasFrameSize,
				width: clampCanvasDimension(
					resizeStartSize.width + deltaCanvas,
					CANVAS_MIN_WIDTH,
					CANVAS_MAX_WIDTH
				)
			};
		} else {
			const deltaCanvas = (point.y - resizeStartPoint.y) / scale;
			canvasFrameSize = {
				...canvasFrameSize,
				height: clampCanvasDimension(
					resizeStartSize.height + deltaCanvas,
					CANVAS_MIN_HEIGHT,
					CANVAS_MAX_HEIGHT
				)
			};
		}
	}

	function endCanvasResize() {
		const target = resizeCaptureTarget;
		const pointerId = resizePointerId;

		// Clear state first so any re-entrant pointer event cannot resize again.
		resizingAxis = null;
		resizeCaptureTarget = null;
		resizePointerId = null;

		if (!target) return;

		target.removeEventListener('pointermove', handleCanvasResizeMove);
		target.removeEventListener('pointerup', endCanvasResize);
		target.removeEventListener('pointercancel', endCanvasResize);
		target.removeEventListener('lostpointercapture', endCanvasResize);

		if (pointerId != null && target.hasPointerCapture?.(pointerId)) {
			try {
				target.releasePointerCapture(pointerId);
			} catch (error) {
				// Ignore browsers that reject releasing an already-ended capture.
			}
		}
	}

	// Stops links / form submissions inside the canvas iframe from navigating it (or
	// opening new tabs/windows). See the comment where it is registered.
	function blockCanvasNavigation(event) {
		if (event.type === 'submit') {
			event.preventDefault();
			return;
		}
		const target = event.target;
		const link = target?.closest?.('a[href], area[href]');
		if (link) event.preventDefault();
	}

	/**
	 * Called once from the iframe's `load` event. Wires WebMoldDOM to the now-
	 * ready frame document and (re)creates the three canvas stylesheets before
	 * anything else touches the canvas.
	 */
	async function handleCanvasFrameLoad() {
		WebMoldDOM.attach(canvasFrame);
		canvas_content.value = WebMoldDOM.body;
		ensureImportedStyleElements();
		let dynamicStyleEl = WebMoldDOM.getElementById('dynamic-styles');
		styleSheet.value = dynamicStyleEl?.sheet ?? null;

		// Pointer/wheel events dispatched inside the iframe never bubble out to
		// `container`'s listeners in the host document - a same-origin iframe is
		// still a separate Document/Window for event-dispatch purposes. Binding
		// the identical handler set a second time, directly on the iframe's own
		// document, is what makes drawing/panning/zooming work again with the
		// canvas isolated. getCanvasPoint/getRelativePoint/isFrameSourcedEvent
		// (above) are what let every handler stay agnostic to which document a
		// given event actually came from.
		const frameDoc = WebMoldDOM.document;
		bindCanvasFrameKeyboardHandlers();
		frameDoc.addEventListener('mousedown', handleCanvasMiddleMouseDown);
		frameDoc.addEventListener('pointerdown', handleMouseDown);
		frameDoc.addEventListener('pointermove', handleMouseMove);
		frameDoc.addEventListener('pointerup', handleMouseUp);
		frameDoc.addEventListener('pointercancel', handlePointerCancel);
		frameDoc.addEventListener('wheel', handleWheel, { passive: false });

		// Imported pages are content to EDIT here, not to browse. Never let a click
		// inside the canvas navigate. This matters even for `href="#How"`: a srcdoc
		// iframe resolves relative URLs against the HOST page's URL, so a bare fragment
		// link becomes a real navigation to <editor url>#How and loads a second copy of
		// the whole app inside the iframe. Capture phase + preventDefault only (no
		// stopPropagation) so element selection and the page's own click handlers
		// still run.
		frameDoc.addEventListener('click', blockCanvasNavigation, true);
		frameDoc.addEventListener('auxclick', blockCanvasNavigation, true); // middle-click opens a new tab
		frameDoc.addEventListener('submit', blockCanvasNavigation, true);

		// Sizing is manual now (see canvasFrameSize above) - no more
		// content-driven ResizeObserver here. A default gets set once in
		// initializeEmptyCanvas() (and overridden once more by importProject/
		// restoreProjectSnapshot when there's actual content to size against),
		// and after that only startCanvasResize()/handleCanvasResizeMove()
		// ever change it again.
		frameReady = true;

		// Start watching the actual iframe box once the frame exists. The observer
		// remains active during manual resize, import, restore, and reset operations.
		observeCanvasFrameSize();
	}

	// The host document's `draw-mode` class (bound to `container` in the
	// template below) is what "body.draw-mode .rectangle" in
	// CANVAS_FRAME_SRCDOC needs mirrored - a descendant selector can never
	// match across the iframe's document boundary, so drawMode has to be
	// re-applied as its own class inside the iframe's tree too.
	$effect(() => {
		const active = drawMode.value;
		if (!frameReady || !WebMoldDOM.isReady()) return;
		WebMoldDOM.body?.classList.toggle('draw-mode', active);
	});

	function makeUniqueId(requestedId, usedIds, nextIndex) {
		const base = requestedId?.trim() || `imported-${nextIndex}`;
		let candidate = base;
		let suffix = 2;
		while (usedIds.has(candidate) || candidate === 'canvas') {
			candidate = `${base}-${suffix++}`;
		}
		usedIds.add(candidate);
		return candidate;
	}

	function wireImportedElement(element) {
		if (!isElement(element)) return;
		element.classList.add('rectangle');
		element.addEventListener('click', highlightRectangleToButton);
		element.addEventListener('mouseover', highlightHoverRectangleToButton);
		element.addEventListener('mouseout', unhighlightHoverRectangle);
	}

	function buildImportedNode(element, counter, usedIds, cssById) {
		const index = counter.value++;
		const originalId = element.getAttribute('id');
		const id = makeUniqueId(originalId, usedIds, index);
		element.id = id;
		element.dataset.index = index;
		wireImportedElement(element);

		const classes = Array.from(element.classList || []).filter(
			(className) =>
				![
					'rectangle',
					'webmold-selected',
					'webmold-hover',
					'active',
					'inactive',
					'hoverCanvasElement'
				].includes(className)
		);
		const inlineStyles = normalizeStyleArray((element.getAttribute('style') || '').split(';'));
		if (inlineStyles.length) element.removeAttribute('style');
		const styles = normalizeStyleArray([...(cssById.get(originalId || '') || []), ...inlineStyles]);

		const node = {
			index,
			element,
			label: element.tagName.toLowerCase(),
			type: 'element',
			children: [],
			styles,
			classes
		};

		for (const child of Array.from(element.children)) {
			node.children.push(buildImportedNode(child, counter, usedIds, cssById));
		}
		return node;
	}

	// Editor-injected runtime classes that must never be treated as part of
	// an imported body's own persisted identity (see applyBodyAttributes).
	const BODY_RUNTIME_CLASSES = ['draw-mode', 'webmold-selected', 'webmold-hover'];

	/**
	 * Apply an imported/restored <body>'s own attributes directly onto the
	 * real canvas body element (canvas_content). There's no more
	 * `.starterWrapper` stand-in: this iframe's body IS the imported body,
	 * so its id/class/data attributes etc. belong on it directly. Returns the class
	 * list to store on the root's logical tree node (see callers) - kept
	 * separate from the DOM's own classList so a transient runtime class
	 * like `draw-mode` can never leak into what gets persisted/exported.
	 */
	function applyBodyAttributes(attributes = {}) {
		const element = canvas_content.value;
		if (!element) return [];

		for (const runtimeClass of BODY_RUNTIME_CLASSES) {
			element.classList.remove(runtimeClass);
		}
		for (const name of Array.from(element.attributes || [])) {
			if (name.name !== 'class') element.removeAttribute(name.name);
		}
		element.removeAttribute('class');

		const classes = String(attributes.class || '')
			.split(/\s+/)
			.filter(Boolean)
			.filter((name) => !BODY_RUNTIME_CLASSES.includes(name));

		for (const [name, value] of Object.entries(attributes)) {
			if (name === 'class') continue;
			element.setAttribute(name, value ?? '');
		}
		for (const className of classes) {
			element.classList.add(className);
		}

		return classes;
	}

	async function importProject({ html, css, js }) {
		try {
			const embedded = extractEmbeddedAssets(html || '');
			const importedCssSource = [embedded.css, css || '']
				.filter((value) => value.trim())
				.join('\n\n');
			const importedJsSource = [embedded.js, js || ''].filter((value) => value.trim()).join('\n\n');
			await WebMoldDOM.ready();
			const parsedHtml = parseImportedHtml(html || '');
			const hasImportedBody = Boolean(parsedHtml.hasBody);
			const parsedCss = parseImportedCss(importedCssSource);
			// Off-tree parsing only - this <template> is never inserted anywhere,
			// so it's fine for it to belong to the host document.
			const template = document.createElement('template');
			template.innerHTML = parsedHtml.html;

			const importedElements = Array.from(template.content.children);
			if (!importedElements.length && !css.trim() && !js.trim()) {
				throw new Error('The HTML textarea does not contain an importable element.');
			}

			ensureImportedStyleElements();
			const importedSheet = importedStyleSheet.value;
			if (importedSheet) {
				// Written verbatim - no `body`->`.starterWrapper` rewrite needed.
				// This <style> tag lives inside the canvas iframe's own document
				// now, so an imported `body`/`:root`/`*` selector already targets
				// only the iframe's own tree and can't reach Webmold's real UI.
				const styleElement = WebMoldDOM.getElementById('imported-styles');
				styleElement.textContent = importedCssSource;
			}

			clearStylesheet(styleSheet.value);
			clearStylesheet(globalClassStyleSheet.value);
			allClasses.value = parsedCss.classes.map((item) => ({
				classname: item.classname,
				selector: item.selector || `.${item.classname}`,
				styles: normalizeStyleArray(item.styles)
			}));
			globalSelectors.value = (parsedCss.globalSelectors || []).map((item) => ({
				selector: item.selector,
				styles: normalizeStyleArray(item.styles)
			}));
			// Persist the authored source CSS/JS exactly as written - the canvas
			// iframe's own isolation is what keeps it from leaking, not a
			// rewritten copy.
			importedCssText.value = importedCssSource;
			importedHasBody.value = hasImportedBody;
			globalJs.value = importedJsSource;

			canvas_content.value.innerHTML = '';
			const usedIds = new Set(['canvas']);
			const counter = { value: 1 };
			const rootChildren = [];
			const frameDoc = WebMoldDOM.document;

			for (const element of importedElements) {
				// importNode (rather than cloneNode) because `element` belongs to
				// the host-document <template> above; a node must belong to the
				// iframe's document before it can be appended into it.
				const clone = frameDoc.importNode(element, true);
				rootChildren.push(buildImportedNode(clone, counter, usedIds, parsedCss.ids));
				canvas_content.value.appendChild(clone);
			}

			const bodyClasses = applyBodyAttributes(parsedHtml.bodyAttributes);
			// One-time measurement (not reactive - see canvasFrameSize above),
			// so an imported page starts at a size that actually fits what it
			// imported, rather than the bare viewport default.
			canvasFrameSize = measureImportedCanvasFrameSize();

			allCreatedRecangles.value = [
				{
					index: 0,
					element: canvas_content.value,
					label: 'body',
					type: 'group',
					children: rootChildren,
					styles: [],
					classes: bodyClasses
				}
			];

			selectedGroup.value = canvas_content.value;
			selectedElement.value = null;
			selectedClass.value = null;
			editorPanel.value = 'styles';
			selectedRectangleIndex.value = null;

			// ID rules are kept in the editor's dedicated stylesheet so later
			// property edits can override imported CSS without mutating the source text.
			for (const node of rootChildren) {
				renderImportedNodeRules(node);
			}

			syncAllGlobalClassRules();
			appendImportedScript(importedJsSource);
			showImportDialog = false;
			addToast({ message: 'Project imported successfully', type: 'success', dismissible, timeout });
		} catch (error) {
			console.error('Import failed:', error);
			addToast({
				message: error?.message || 'Unable to import the project',
				type: 'error',
				dismissible,
				timeout
			});
		}
	}

	function renderImportedNodeRules(node) {
		if (!node) return;
		if (node.styles?.length) syncNodeStyleRule(node);
		for (const child of node.children || []) renderImportedNodeRules(child);
	}

	//hightlighting the selected element-------------------------------------------------------------------------------------------

	//section to handle the infinite canvas---------------------------------------------------------------------------------

	let mouseX;
	let mouseY;
	let isDragging = false;
	let mouseInitialPosX;
	let mouseInitialPosY;
	let previewDiv = null;
	// the pointerId currently captured by the container, used so we can release
	// capture correctly on pointerup/pointercancel even if state was mutated in between
	let activePointerId = null;
	let activePointerCaptureTarget = null;

	// Zoom and pan variables
	let scale = 1; // Zoom scale
	let offset = { x: 0, y: 0 }; // Pan offset
	let isPanning = false; // Whether the user is panning
	let startPanPosition = { x: 0, y: 0 }; // Last pointer position in HOST client space (see getHostPoint)

	let canvasTransformFrame = null;
	let renderedCanvasTransform = $state('translate3d(0px, 0px, 0) scale3d(1, 1, 1)');

	function scheduleCanvasTransform() {
		if (canvasTransformFrame !== null) return;
		canvasTransformFrame = requestAnimationFrame(() => {
			renderedCanvasTransform = `translate3d(${offset.x}px, ${offset.y}px, 0) scale3d(${scale}, ${scale}, 1)`;
			canvasTransformFrame = null;
		});
	}

	//this variables will store the final data props of our element after its creation
	let finalTop;
	let finalLeft;
	let finalWidth;
	let finalHeight;

	//this function will create the selected tag element and append it to the canvas
	function createELMT() {
		previewDiv = WebMoldDOM.createElement(selectedTag.value);
		previewDiv.classList.add('rectangle');
		// pointer-events: none while the element is still being drawn so the preview itself can
		// never become the hit-test target for subsequent pointermove/pointerup - it can otherwise
		// intercept the drag over existing siblings/children and cause a stuck "not-allowed" cursor.
		const styleString = `position: absolute; left: ${mouseInitialPosX}px; top: ${mouseInitialPosY}px; width: 0px; height: 0px; background-color:#f2f7f4; pointer-events: none;`;

		const length = countNodes(allCreatedRecangles.value);
		previewDiv.id = `${selectedTag.value}-${length}`;
		previewDiv.dataset.index = length;
		// The preview is transient. Keep its drawing-only styles inline so they can
		// never become the logical CSS of the element.
		previewDiv.style.cssText = styleString;
		canvas_content.value.appendChild(previewDiv);
	}

	//this function will update the final css of the created element
	function updateFinalElementCssBeforeAppend(top, left) {
		const styleDeclarations = [
			`position: ${selectedPositioning.value};`,
			`left: ${left}px;`,
			`top: ${top}px;`,
			`width: ${finalWidth}px;`,
			`height: ${finalHeight}px;`,
			`background-color: #f2f7f4;`
		];

		// Remove the transient inline preview styling and make the authored style
		// the node's permanent source of truth.
		previewDiv.removeAttribute('style');
		setNodeStyles(findNodeById(allCreatedRecangles.value, previewDiv.id), styleDeclarations);
	}

	/// this function will Create a preview div that shows the dragged area for esthetic
	function draggedArea() {
		previewDiv.style.top = `${finalTop}px`;
		previewDiv.style.left = `${finalLeft}px`;
		previewDiv.style.width = `${finalWidth}px`;
		previewDiv.style.height = `${finalHeight}px`;
	}

	// Re-parent the freshly drawn element without relying on editor-only data-left/data-top
	// attributes. The preview is drawn in canvas coordinates, but CSS positioning is relative
	// to the element's actual containing block (which may be the selected group, another
	// positioned ancestor, a transformed ancestor, or the viewport for fixed positioning).
	// We therefore measure the desired viewport position first, re-parent the element, place
	// it at 0/0 in its final positioning mode, and then derive the required CSS left/top from
	// the real DOM geometry. This keeps fresh and persisted projects on the same coordinate path.
	function elementParent() {
		if (!previewDiv || !selectedGroup.value) return;

		const positioning = selectedPositioning.value || 'static';
		const desiredRect = previewDiv.getBoundingClientRect();

		// Move the preview first. Its old canvas-relative left/top must not be reused after
		// this point because the CSS containing block may have changed.
		canvas_content.value.removeChild(previewDiv);
		selectedGroup.value.appendChild(previewDiv);

		if (positioning === 'static') {
			// Static positioning has no left/top coordinate in CSS. Keep the normal-flow
			// location and let the browser own its layout.
			updateFinalElementCssBeforeAppend(0, 0);
			return;
		}

		// Probe the real containing block/normal-flow origin using the exact final
		// positioning mode. Keeping width/height identical makes the measured rect
		// representative of the final element.
		previewDiv.style.position = positioning;
		previewDiv.style.left = '0px';
		previewDiv.style.top = '0px';
		previewDiv.style.width = `${finalWidth}px`;
		previewDiv.style.height = `${finalHeight}px`;

		const originRect = previewDiv.getBoundingClientRect();

		// `previewDiv` and `selectedGroup.value` are both inside the SAME
		// canvas iframe document, so getBoundingClientRect() on either one
		// is already reported relative to that iframe's OWN, untransformed
		// viewport - the outer host-side pan/zoom transform applied to the
		// <iframe> element itself is invisible from inside its own document
		// (that's the whole point of it being a real, separate browsing
		// context). desiredRect and originRect are therefore already in the
		// same canvas-space units canvasFrameSize/left/top use; the delta
		// between them needs no further scale correction. Dividing by the
		// outer zoom `scale` here was left over from before the
		// iframe-isolation refactor, when canvas content was a plain
		// transformed div sharing the host document - there,
		// getBoundingClientRect() WOULD have reflected the outer scale, so
		// undoing it made sense. It doesn't anymore, and applying it now
		// made every absolutely/fixed-positioned element land off by
		// whatever the current zoom factor was (visually large, and in
		// whichever direction, at any zoom other than exactly 100%).
		const left = desiredRect.left - originRect.left;
		const top = desiredRect.top - originRect.top;

		updateFinalElementCssBeforeAppend(top, left);
	}

	function initializeElementCreation(e) {
		//this is to reset the selectedElement whenever there's a click on the container rather than on an element
		if (e.target != selectedElement.value && selectedElement.value) {
			selectedElement.value.classList.remove('webmold-selected');
			selectedElement.value = null;
			selectedRectangleIndex.value = null;
		}
		// i want to trigger this function whenever container is clicked or its children -
		// or, now, whenever the event originated inside the canvas iframe (whose nodes
		// are never actual descendants of `container` from the host document's point of view).
		if (!(e.target === container || container.contains(e.target) || isFrameSourcedEvent(e))) return;
		//here i want to deselect the selected html tags
		if (e.button == 2) {
			selectedTag.value = null;
		}
		// Only consider left-click and if a tag has been choosen first else we return
		if (e.button !== 0 || !selectedTag.value) {
			return;
		}
		// Convert to canvas coordinates using the pan offset and zoom scale
		const { x: canvasX, y: canvasY } = getCanvasPoint(e);

		//console.log('Canvas coordinates:', canvasX, canvasY);

		isDragging = true;
		// Store the initial canvas coordinates
		mouseInitialPosX = canvasX;
		mouseInitialPosY = canvasY;
		//next we create the element
		createELMT();
	}

	function PrevisualizeElementCreation(e) {
		//first, we want to remove the hovering effect whenever the mouse is not on a component
		if (!e.target.classList?.contains('rectangle')) {
			hoveredRectangleIndex.value = null;
		}
		// If not dragging, do nothing
		if (!isDragging) return;

		// Recalculate the current canvas coordinates using the pan offset and zoom scale
		const { x: currentCanvasX, y: currentCanvasY } = getCanvasPoint(e);

		// Determine the new top-left position and size of the preview rectangle .This id done to enable the element from being created from the top, bottom,left,right
		finalLeft = Math.min(mouseInitialPosX, currentCanvasX);
		finalTop = Math.min(mouseInitialPosY, currentCanvasY);
		finalWidth = Math.abs(currentCanvasX - mouseInitialPosX);
		finalHeight = Math.abs(currentCanvasY - mouseInitialPosY);

		//for esthetic
		draggedArea();
	}

	function finalizeElementCreation(e) {
		if (!isDragging) return;
		isDragging = false;
		//remove the selected tag
		selectedTag.value = null;
		// Enforce a minimum size of 100px for width and height
		/* if (parseInt(previewDiv.style.width, 10) < 100) {
					previewDiv.style.width = '100px';
				}
				if (parseInt(previewDiv.style.height, 10) < 100) {
					previewDiv.style.height = '100px';
				} */
		const length = countNodes(allCreatedRecangles.value);
		const index = length;
		//properly adding the created element to the allCreatedRectangles array
		//if we have another selectedGroup rather than the canvas, then
		const newElement = {
			index: index,
			element: previewDiv,
			label: selectedTag.value,
			type: elementType.value[0],
			children: [],
			styles: [],
			classes: []
		};
		// Root ("body") isn't tracked in the tree via addChildToNode - compare
		// by reference against the real canvas body rather than by id, since
		// that id now comes from imported content (or is empty) instead of
		// always being the literal string "canvas".
		if (selectedGroup.value !== canvas_content.value) {
			addChildToNode(allCreatedRecangles.value, selectedGroup.value.id, newElement);
			/* console.log(allCreatedRecangles.value); */
			// Trigger reactivity: addChildToNode mutates the tree in place, and a
			// Svelte 5 $state reassignment only invalidates when the reference
			// actually changes (unlike a Svelte 4 writable's .set(), which always
			// notified). `= allCreatedRecangles.value` was therefore a no-op here -
			// a fresh top-level array reference is what actually triggers it.
			allCreatedRecangles.value = [...allCreatedRecangles.value];
		} else {
			allCreatedRecangles.value[0].children.push(newElement);
			// Trigger reactivity: same reasoning as above.
			allCreatedRecangles.value = [...allCreatedRecangles.value];
			/* console.log(allCreatedRecangles.value); */
		}

		previewDiv.addEventListener('click', function (event) {
			highlightRectangleToButton(event);
		});
		previewDiv.addEventListener('mouseover', function (event) {
			highlightHoverRectangleToButton(event);
		});
		previewDiv.addEventListener('mouseout', function (event) {
			unhighlightHoverRectangle(event);
		});
		elementParent();
		//make sure the actual created eleemnt is the selected one
		/* selectedElement = previewDiv; */
	}

	// Using Pointer Events (instead of mouse-only events) with explicit pointer capture on the
	// container. Plain mousedown/mousemove/mouseup only fire on `container` while the event's
	// target is a descendant of it - if the user drags fast and releases the button while the
	// cursor happens to be over a sibling (LeftSidebar, RightSidebar, the toolbar row), `mouseup`
	// never reaches container's listener at all. `isDragging`/`isPanning` then stay stuck true,
	// the orphaned previewDiv keeps following the cursor on the next pointermove, and the next
	// pointerdown starts an entirely new element on top of the still-alive old one.
	// setPointerCapture guarantees every subsequent pointermove/pointerup/pointercancel for that
	// pointerId is delivered to `container` regardless of what's visually underneath the cursor.
	//
	// IFRAME NOTE: none of the events below bubble out of the canvas iframe into this
	// (host) document - iframes are a real document boundary, not just a styling one.
	// handleCanvasFrameLoad() binds this exact same set of handlers a second time,
	// directly on the iframe's document, so they fire regardless of which document
	// the gesture started in. The three helpers below let the rest of this file stay
	// unaware of which case it's in.
	function isFrameSourcedEvent(event) {
		return (
			WebMoldDOM.isReady() && (WebMoldDOM.owns(event.target) || event.view === WebMoldDOM.window)
		);
	}

	// "Host" space: plain clientX/clientY of the HOST document, i.e. real screen
	// position inside the app's window. This is the only space that stays put while the
	// canvas is being panned/zoomed.
	//
	// Events fired inside the iframe report clientX/Y in the iframe's own (already
	// inverse-transformed) viewport. That space MOVES every time the iframe's CSS
	// transform changes, so using deltas of it to drive that same transform is a feedback
	// loop (pointer stays still -> iframe moves -> local clientX changes -> "pointer moved"
	// -> iframe moves again ...) which is what made the page vibrate while panning. We
	// convert to host space using the iframe's CURRENT rendered box, so the result depends
	// only on where the cursor really is on screen.
	function getHostPoint(event) {
		if (!canvasFrame || !isFrameSourcedEvent(event)) {
			return { x: event.clientX, y: event.clientY };
		}
		const rect = canvasFrame.getBoundingClientRect();
		// Rendered scale (what the browser is actually painting right now), NOT the logical
		// `scale` variable which can be a frame ahead of the painted transform.
		const renderedScale = canvasFrame.offsetWidth ? rect.width / canvasFrame.offsetWidth : scale;
		return {
			x: rect.left + event.clientX * renderedScale,
			y: rect.top + event.clientY * renderedScale
		};
	}

	// "Relative" space: host space relative to the canvas container's own untransformed
	// box - the same space offset.x/y are stored in.
	function getRelativePoint(event) {
		const host = getHostPoint(event);
		const rect = container.getBoundingClientRect();
		return { x: host.x - rect.left, y: host.y - rect.top };
	}

	// "Canvas" space: relative space with pan offset and zoom undone - the
	// coordinate system elements are actually positioned in.
	//
	// For an iframe-sourced event, clientX/Y is relative to the iframe's own
	// current viewport, not to body (the actual containing block absolute
	// elements are positioned against). Those only match while the iframe's
	// scroll position is (0,0). With the canvas now a fixed, manually-sized
	// page (see canvasFrameSize) and `overflow: hidden` on both axes (see
	// CANVAS_FRAME_SRCDOC), that's true for anything a user can trigger -
	// but overflow: hidden doesn't forbid a script (e.g. an imported page's
	// own JS) from calling scrollTo(), so this still adds scrollX/scrollY
	// back in defensively rather than assuming either is always 0.
	function getCanvasPoint(event) {
		const frameWin = WebMoldDOM.isReady() ? WebMoldDOM.window : null;
		const scrollX = frameWin?.scrollX || 0;
		const scrollY = frameWin?.scrollY || 0;

		if (isFrameSourcedEvent(event)) {
			return { x: event.clientX + scrollX, y: event.clientY + scrollY };
		}

		// A drag can start over the iframe (frame-sourced) and cross into the
		// surrounding host margin mid-gesture (e.g. drawing past the canvas's
		// edge), or vice versa. Both branches must return the SAME body-space
		// coordinate for the same physical cursor position, or the drawn
		// element jumps the moment the gesture crosses that boundary. Since
		// the iframe can now genuinely scroll (overflow-x: auto - see
		// CANVAS_FRAME_SRCDOC), this branch needs the same +scrollX/Y
		// correction as the one above, not just the frame-sourced one.
		const relative = getRelativePoint(event);
		return {
			x: (relative.x - offset.x) / scale + scrollX,
			y: (relative.y - offset.y) / scale + scrollY
		};
	}

	function setCanvasCursor(value) {
		container.style.cursor = value;
		// Panning is almost always initiated with the pointer over actual canvas
		// content, i.e. inside the iframe - setting the cursor on `container`
		// alone would be invisible while the pointer is over the iframe's own
		// rendering.
		if (WebMoldDOM.isReady()) {
			WebMoldDOM.document.documentElement.style.cursor = value;
			if (WebMoldDOM.body) WebMoldDOM.body.style.cursor = value;
		}
	}

	function handleCanvasMiddleMouseDown(event) {
		if (event.button !== 1) return;

		// Middle-click on the canvas must first clear the currently focused
		// control. Firefox/Linux can paste the PRIMARY selection as part of the
		// middle-button gesture, so doing this on the canvas mousedown is the
		// correct layer to prevent SmartEditor from receiving that paste.
		event.preventDefault();
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		const selection = window.getSelection();
		if (selection) selection.removeAllRanges();
	}

	function handleMouseDown(event) {
		if (event.button === 1) {
			// Middle mouse belongs to the canvas panning interaction. Blur the
			// currently focused control BEFORE the browser performs Linux/Firefox
			// primary-selection paste for the middle click.
			event.preventDefault();
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
			const selection = window.getSelection();
			if (selection) selection.removeAllRanges();

			// Middle mouse button for panning. Hide the editor immediately so the
			// SmartEditor cannot receive subsequent keyboard input while panning.
			hideEditorWhilePanning = true;
			isPanning = true;
			// Track the pan in HOST space (see getHostPoint) - never in iframe-local
			// coordinates, which shift as the iframe itself is moved by the pan.
			startPanPosition = getHostPoint(event);
			setCanvasCursor('grabbing');
			capturePointer(event);
		} else {
			initializeElementCreation(event);
			// Only capture if a new element is actually being drawn.
			// A plain click on an existing rectangle (no selectedTag) leaves
			// isDragging false, so we skip capture and let the click reach
			// the rectangle's own listener normally.
			if (isDragging) {
				capturePointer(event);
			}
		}
	}

	function capturePointer(event) {
		activePointerId = event.pointerId;
		activePointerCaptureTarget = isFrameSourcedEvent(event)
			? WebMoldDOM.document.documentElement
			: container;
		try {
			activePointerCaptureTarget.setPointerCapture(event.pointerId);
		} catch (err) {
			// ignore
		}
	}

	function handleMouseMove(event) {
		if (isPanning) {
			// Host-space delta: independent of the iframe's own transform, so moving the
			// iframe can't feed back into the next pointermove.
			const point = getHostPoint(event);
			offset.x += point.x - startPanPosition.x;
			offset.y += point.y - startPanPosition.y;
			startPanPosition = point;
			scheduleCanvasTransform();
		} else {
			PrevisualizeElementCreation(event);
		}
	}

	function handleMouseUp(event) {
		releaseActivePointerCapture(event);
		if (event.button === 1) {
			isPanning = false;
			hideEditorWhilePanning = false;
			setCanvasCursor('default');
		} else {
			finalizeElementCreation(event);
		}
	}

	// Fires when the browser aborts the pointer gesture (e.g. it decides this is actually a
	// scroll/touch gesture, or focus is lost mid-drag). There is no reliable finished box here,
	// so we discard the in-progress creation instead of trying to finalize it with a
	// possibly-tiny/garbage size, and make sure we don't leave orphaned state or DOM nodes behind.
	function handlePointerCancel(event) {
		releaseActivePointerCapture(event);
		if (isPanning) {
			isPanning = false;
			hideEditorWhilePanning = false;
			setCanvasCursor('default');
		}
		if (isDragging) {
			isDragging = false;
			selectedTag.value = null;
			if (previewDiv && previewDiv.parentNode) {
				previewDiv.parentNode.removeChild(previewDiv);
			}
			previewDiv = null;
		}
	}

	function releaseActivePointerCapture(event) {
		const pointerId = event?.pointerId ?? activePointerId;
		const target =
			activePointerCaptureTarget ??
			(event && isFrameSourcedEvent(event) ? WebMoldDOM.document?.documentElement : container);
		if (pointerId != null && target?.hasPointerCapture?.(pointerId)) {
			target.releasePointerCapture(pointerId);
		}
		activePointerId = null;
		activePointerCaptureTarget = null;
	}

	//meant for zooming in and out of the canvas, the zooming will be done at the position of the mouse
	function handleWheel(event) {
		event.preventDefault();

		// A wheel interaction on the canvas means the user is manipulating
		// the workspace, not typing into the code/property editor. Remove
		// focus from any active form/contenteditable element so the caret
		// cannot remain active and subsequent keyboard input cannot end up
		// editing/pasting into the SmartEditor accidentally.
		const activeElement = document.activeElement;
		if (
			activeElement instanceof HTMLInputElement ||
			activeElement instanceof HTMLTextAreaElement ||
			(activeElement instanceof HTMLElement && activeElement.isContentEditable)
		) {
			activeElement.blur();
		}

		// Explicitly clear the selection/caret as well.
		const selection = window.getSelection();
		if (selection && !selection.isCollapsed) {
			selection.removeAllRanges();
		}

		const zoomFactor = 0.1;
		const newScale = event.deltaY < 0 ? scale * (1 + zoomFactor) : scale * (1 - zoomFactor);
		const clampedScale = Math.max(0.1, Math.min(5, newScale));

		// Cursor position relative to the (untransformed) container box, and the canvas
		// point currently under it. For events from inside the iframe the canvas point comes
		// straight from the browser (clientX/Y), so it is correct even when several wheel
		// events land before the previous transform has been painted.
		const { x: wheelMouseX, y: wheelMouseY } = getRelativePoint(event);
		const { x: canvasX, y: canvasY } = getCanvasPoint(event);
		const frameWin = WebMoldDOM.isReady() ? WebMoldDOM.window : null;
		const scrollX = frameWin?.scrollX || 0;
		const scrollY = frameWin?.scrollY || 0;

		// The outer transform (offset/scale) only rigidly pans/scales whatever
		// is CURRENTLY painted inside the iframe's box - it has no idea the
		// iframe scrolled internally. So the host-space position of a given
		// body-space point isn't `offset + canvasPoint * scale`, it's
		// `offset + (canvasPoint - scroll) * scale` (canvasX/Y from
		// getCanvasPoint is the true, unscrolled body coordinate; subtracting
		// scroll converts it back to "position within what's currently
		// visible", which is what the transform actually operates on).
		// Anchoring the zoom on the raw canvasX/Y here (i.e. without this
		// correction) is exactly what made zooming jump while the canvas was
		// scrolled horizontally.
		offset.x = wheelMouseX - (canvasX - scrollX) * clampedScale;
		offset.y = wheelMouseY - (canvasY - scrollY) * clampedScale;
		scale = clampedScale;
		scheduleCanvasTransform();
	}

	function resetCanvas() {
		// Reset the viewport immediately. Cancelling a queued frame prevents a
		// stale pan transform from being rendered after the reset click.
		if (canvasTransformFrame !== null) {
			cancelAnimationFrame(canvasTransformFrame);
			canvasTransformFrame = null;
		}
		scale = 1;
		offset = { x: 0, y: 0 };
		renderedCanvasTransform = 'translate3d(0px, 0px, 0) scale3d(1, 1, 1)';
	}

	function wireRestoredElement(element) {
		if (!isElement(element)) return;
		element.classList.add('rectangle');
		element.addEventListener('click', highlightRectangleToButton);
		element.addEventListener('mouseover', highlightHoverRectangleToButton);
		element.addEventListener('mouseout', unhighlightHoverRectangle);
	}

	const SVG_NS = 'http://www.w3.org/2000/svg';
	const HTML_NS = 'http://www.w3.org/1999/xhtml';

	// `parentNamespace` lets snapshots saved BEFORE namespaceURI was recorded still
	// restore correctly: everything under an <svg> is SVG (except inside
	// <foreignObject>, whose children are HTML again).
	function restoreNodeFromSnapshot(
		snapshotNode,
		counter = { value: 1 },
		parentNamespace = HTML_NS,
		parentTag = ''
	) {
		if (!snapshotNode || !snapshotNode.tagName) return null;

		const tagName = String(snapshotNode.tagName).toLowerCase();
		const namespace =
			snapshotNode.namespaceURI ||
			(tagName === 'svg'
				? SVG_NS
				: parentNamespace === SVG_NS && parentTag !== 'foreignobject'
					? SVG_NS
					: HTML_NS);

		// createElement() always yields an HTML-namespace element, so an <svg>/<path>
		// built that way is an inert HTMLUnknownElement and never renders - which is
		// why the icon vanished after a refresh. Non-HTML namespaces need createElementNS.
		const element =
			namespace === HTML_NS
				? WebMoldDOM.createElement(tagName)
				: WebMoldDOM.createElementNS(namespace, snapshotNode.tagName);

		for (const [name, value] of Object.entries(snapshotNode.attributes || {})) {
			element.setAttribute(name, value ?? '');
		}

		if (!element.id) {
			element.id = `${element.tagName.toLowerCase()}-${snapshotNode.index ?? counter.value}`;
		}

		const index = Number.isFinite(Number(snapshotNode.index))
			? Number(snapshotNode.index)
			: counter.value;

		counter.value = Math.max(counter.value, index + 1);
		element.dataset.index = index;

		// Restore classes from the persisted logical model. Editor-only classes are
		// runtime concerns and must be recreated by the selection system.
		const persistedClasses = Array.isArray(snapshotNode.classes) ? snapshotNode.classes : [];
		element.classList.remove(
			'rectangle',
			'webmold-selected',
			'webmold-hover',
			'active',
			'inactive',
			'hoverCanvasElement'
		);
		for (const classname of persistedClasses) {
			if (classname) element.classList.add(classname);
		}

		if (!element.children.length && typeof snapshotNode.textContent === 'string') {
			element.textContent = snapshotNode.textContent;
		}

		if ('value' in snapshotNode && isFormField(element)) {
			element.value = snapshotNode.value ?? '';
		}
		if (element.tagName === 'INPUT' && 'checked' in snapshotNode) {
			element.checked = Boolean(snapshotNode.checked);
		}

		wireRestoredElement(element);

		const node = {
			index,
			element,
			label: snapshotNode.label || element.tagName.toLowerCase(),
			type: snapshotNode.type || 'element',
			children: [],
			styles: normalizeStyleArray(snapshotNode.styles || []),
			classes: [...persistedClasses]
		};

		for (const childSnapshot of snapshotNode.children || []) {
			const childNode = restoreNodeFromSnapshot(
				childSnapshot,
				counter,
				element.namespaceURI,
				tagName
			);
			if (!childNode) continue;
			node.children.push(childNode);
			element.appendChild(childNode.element);
		}

		return node;
	}

	async function restoreProjectSnapshot(snapshot) {
		if (!snapshot || !Array.isArray(snapshot.allCreatedRecangles)) return false;

		canvas_content.value.innerHTML = '';
		clearStylesheet(styleSheet.value);
		clearStylesheet(globalClassStyleSheet.value);

		const rootSnapshot = snapshot.allCreatedRecangles[0];
		const counter = { value: 1 };
		const restoredChildren = [];

		for (const childSnapshot of rootSnapshot?.children || []) {
			const node = restoreNodeFromSnapshot(childSnapshot, counter);
			if (!node) continue;
			restoredChildren.push(node);
			canvas_content.value.appendChild(node.element);
		}

		// Reapply the real body's own persisted attributes/classes (id, lang,
		// data-*, etc.) directly onto canvas_content. Snapshots saved before
		// this existed simply have nothing here (the imported body's
		// attributes used to live on a `.starterWrapper` child instead, which
		// still restores fine as an ordinary element below) - applying an
		// empty set is a no-op, so older projects are unaffected.
		const bodyClasses = applyBodyAttributes({
			...(rootSnapshot?.attributes || {}),
			class: (rootSnapshot?.classes || []).join(' ')
		});

		// Restore the user's own manually-set size. Snapshots saved before
		// canvasFrameSize was persisted have no `canvasFrameSize` field at
		// all - fall back to the viewport default rather than leaving the
		// canvas at whatever size a previous project happened to leave it.
		canvasFrameSize = snapshot.canvasFrameSize
			? {
					width: clampCanvasDimension(
						snapshot.canvasFrameSize.width,
						CANVAS_MIN_WIDTH,
						CANVAS_MAX_WIDTH
					),
					height: clampCanvasDimension(
						snapshot.canvasFrameSize.height,
						CANVAS_MIN_HEIGHT,
						CANVAS_MAX_HEIGHT
					)
				}
			: defaultCanvasFrameSize();

		allCreatedRecangles.value = [
			{
				index: 0,
				element: canvas_content.value,
				label: 'body',
				type: 'group',
				children: restoredChildren,
				styles: [],
				classes: bodyClasses
			}
		];

		allClasses.value = Array.isArray(snapshot.allClasses)
			? snapshot.allClasses.map((item) => ({
					classname: item.classname,
					selector: item.selector || `.${item.classname}`,
					styles: normalizeStyleArray(item.styles || [])
				}))
			: [];

		const importedCss = typeof snapshot.importedCss === 'string' ? snapshot.importedCss : '';
		const restoredHasBody =
			typeof snapshot.importedHasBody === 'boolean'
				? snapshot.importedHasBody
				: restoredChildren.some((node) => node?.element?.classList?.contains('starterWrapper'));
		importedHasBody.value = restoredHasBody;
		// Prefer persisted selector metadata so empty/new selectors survive reloads.
		// Older projects may not have this field, so rebuild it from authored CSS.
		if (Array.isArray(snapshot.globalSelectors)) {
			globalSelectors.value = snapshot.globalSelectors
				.map((item) => ({
					selector: item?.selector || '',
					styles: normalizeStyleArray(item?.styles || [])
				}))
				.filter((item) => item.selector);
		} else {
			try {
				const restoredParsedCss = parseImportedCss(importedCss);
				globalSelectors.value = (restoredParsedCss.globalSelectors || []).map((item) => ({
					selector: item.selector,
					styles: normalizeStyleArray(item.styles)
				}));
			} catch (error) {
				console.warn(
					'Could not rebuild global CSS selector metadata; preserving the saved stylesheet.',
					error
				);
				globalSelectors.value = [];
			}
		}

		importedCssText.value = importedCss;
		// Written verbatim into the iframe's own <style> tag - see the note in
		// importProject about why no `body`->`.starterWrapper` rewrite is
		// needed for the live preview anymore.
		const importedStyle = WebMoldDOM.getElementById('imported-styles');
		if (importedStyle) importedStyle.textContent = importedCss;

		devMode.value = Boolean(snapshot.devMode);
		drawMode.value = Boolean(snapshot.drawMode);

		const js = typeof snapshot.globalJs === 'string' ? snapshot.globalJs : '';
		globalJs.value = js;

		for (const node of restoredChildren) renderImportedNodeRules(node);
		syncAllGlobalClassRules();
		appendImportedScript(js);

		selectedGroup.value = canvas_content.value;
		selectedElement.value = null;
		selectedClass.value = null;
		selectedGlobalSelector.value = null;
		editorPanel.value = 'styles';
		selectedRectangleIndex.value = null;

		return true;
	}

	//----------------------------------------------------------------------------section for the chatbox containing the elements classes-------
	// (dynamic-styles/imported-styles/global-class-editor-styles are now
	// created inside the canvas iframe by handleCanvasFrameLoad, once its
	// `load` event fires - see the onMount below, which waits on
	// WebMoldDOM.ready() before touching any of it.)

	//------------------------------------------groups and subgroups handling--------------------------------
	onMount(async () => {
		await tick();
		// The iframe's `load` event (and therefore handleCanvasFrameLoad) fires
		// asynchronously after mount, so everything that touches canvas_content,
		// the three canvas stylesheets, or appends the imported <script> must
		// wait for it first.
		await WebMoldDOM.ready();
		initializeEmptyCanvas();

		try {
			const projectList = await listProjects();
			activeProjectId = projectId || (await getActiveProjectId());
			if (!activeProjectId) {
				window.location.href = '/';
				return;
			}

			const active = projectList.find((project) => project.id === activeProjectId);
			if (!active) {
				await setActiveProjectId(null);
				window.location.href = '/';
				return;
			}

			if (projectId && projectId !== (await getActiveProjectId())) {
				await setActiveProjectId(projectId);
			}

			activeProjectName = active.name;
			const snapshot = await loadProjectSnapshot(activeProjectId);
			const hasSavedContent = Boolean(snapshot?.allCreatedRecangles?.[0]?.children?.length);

			// Seed a brand-new user's very first project with a starter template,
			// if one has been provided (see src/lib/js/starterTemplate/README.md).
			// Both conditions matter: projectList.length === 1 means this really
			// is their first project ever (registry-wide, not just "this one
			// happens to be empty" - editing then clearing a project back to
			// empty shouldn't silently re-seed it), and !hasSavedContent means
			// nothing has actually been drawn/saved into it yet, so this can
			// never clobber real work.
			const isFirstEverProject = projectList.length === 1;
			const starterTemplate = isFirstEverProject && !hasSavedContent ? getStarterTemplate() : null;

			if (starterTemplate) {
				// Reuses the exact same HTML/CSS/JS import pipeline as the manual
				// Import dialog, so the starter content is parsed, serialized, and
				// adjusted by the Webmold engine exactly like any other import.
				await importProject(starterTemplate, {
					successMessage: 'Welcome! Loaded a starter template to get you going.'
				});
			} else if (snapshot) {
				await restoreProjectSnapshot(snapshot);
			}
		} catch (error) {
			console.error('Project initialization failed:', error);
			window.location.href = '/';
			return;
		}

		persistenceReady = true;
	});

	//--------------------------------------------------------------------for copying------------------
	let message = 'Hello, World!';
	let types = ['success', 'error', 'info'];
	let type = 'success';
	let dismissible = true;
	let timeout = 2500;
	//normally i can copy only from the right side bar but tu make it global, i need to enable that globally, the user
	//should not be forced to have the mouse only in the right side bar
	let copiedElement = null;
	// Keyboard handler. This runs for both the host document and the canvas
	// iframe's document. Keyboard events do not cross an iframe boundary.
	function handleKeyboardPress(event) {
		const target = event.target;
		const tagName = String(target?.tagName || '').toLowerCase();
		const isEditingField =
			tagName === 'input' ||
			tagName === 'textarea' ||
			tagName === 'select' ||
			Boolean(target?.isContentEditable);
		if (isEditingField) return;

		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selectedElement.value) {
			event.preventDefault();
			handleCopy();
		} else if (
			(event.ctrlKey || event.metaKey) &&
			event.key.toLowerCase() === 'v' &&
			copiedElement &&
			selectedGroup.value
		) {
			event.preventDefault();
			handlePaste();
		} else if (event.key === 'Delete' && selectedElement.value) {
			event.preventDefault();
			deleteComponent();
		}
	}
	function deepCloneWithElements(obj) {
		if (obj === null || typeof obj !== 'object') {
			return obj; // Return primitives as-is
		}

		// Handle DOM elements (deep clone). Realm-safe: obj may be an element
		// belonging to the canvas iframe's document, not this one.
		if (isElement(obj)) {
			return obj.cloneNode(true); // Key difference: CLONE, not reference
		}

		// Handle arrays
		if (Array.isArray(obj)) {
			return obj.map((item) => deepCloneWithElements(item));
		}

		// Handle plain objects
		const cloned = {};
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				cloned[key] = deepCloneWithElements(obj[key]);
			}
		}
		return cloned;
	}
	function handleCopy() {
		console.log('Ctrl + C pressed!');
		//lets get the selectedElement
		const target = findNodeById(allCreatedRecangles.value, selectedElement.value.id);
		copiedElement = deepCloneWithElements(target);
		console.log(copiedElement);
		message = `Copied ${selectedElement.value.id}`;
		type = 'info';
		addToast({ message, type, dismissible, timeout });
	}

	//to avoid any bug, i dont want the pasting function to be called when the previous pasting has not been completed
	let isPasting = false;
	function handlePaste() {
		if (isPasting) return; // Prevent multiple pastes
		isPasting = true;
		//to handle multiple pasting with the same copied element, we need to save a copy of the copied element
		//  because the next steps completely uses the copiedElement and if i further use it, i will get the error 'duplicate keys for each'
		const savedCopiedElement = deepCloneWithElements(copiedElement);
		//there must be a copiedElement
		//inother for me to paste elements, we need a selected group and not just a selected Element
		//updateNode will make sure the properties of our elements are properly established ie eventsListeners,id's,props, css
		updateNode(copiedElement, 0, countNodes(allCreatedRecangles.value));
		console.log(copiedElement);
		addChildToNode(allCreatedRecangles.value, selectedGroup.value.id, copiedElement);
		// Trigger reactivity: addChildToNode mutates the tree in place, and a
		// Svelte 5 $state reassignment only invalidates when the reference
		// actually changes - a fresh top-level array reference is what actually
		// triggers it (see the equivalent comment in the create-element path).
		allCreatedRecangles.value = [...allCreatedRecangles.value];
		//append the copied element to the selected group in the DOM
		selectedGroup.value.appendChild(copiedElement.element);
		copiedElement = savedCopiedElement;
		message = `Pasted ${copiedElement.id} `;
		type = 'success';
		addToast({ message, type, dismissible, timeout });
		isPasting = false; // Reset the flag after pasting
	}

	function deleteComponent() {
		message = `Deleted ${selectedElement.value.id} `;
		//lets remove this selected element from the allCreatedRecangles array
		const removedElementFromTree = removeNodeById(
			allCreatedRecangles.value,
			selectedElement.value.id
		);
		//trigger reactivity
		allCreatedRecangles.value = removedElementFromTree;
		//next we reset the selectedGroup
		if (selectedGroup.value.id == selectedElement.value.id) {
			selectedGroup.value = canvas_content.value;
		}
		//next we remove the element component from the canvas DOM
		selectedElement.value.remove();
		//next we reset the selectedElement
		selectedElement.value = null;
		//next we reset the selectedRectangleIndex
		selectedRectangleIndex.value = null;
		type = 'error';
		addToast({ message, type, dismissible, timeout });
	}

	/* function to prevent the default browser right-click menu (context menu) */
	function blockContextMenu(event) {
		event.preventDefault();
	}

	let boundCanvasFrameDocument = null;

	function bindCanvasFrameKeyboardHandlers() {
		const frameDoc = WebMoldDOM.document;
		if (!frameDoc) return;

		if (boundCanvasFrameDocument && boundCanvasFrameDocument !== frameDoc) {
			boundCanvasFrameDocument.removeEventListener('keydown', handleKeyboardPress);
			boundCanvasFrameDocument.removeEventListener('contextmenu', blockContextMenu);
		}

		frameDoc.addEventListener('keydown', handleKeyboardPress);
		frameDoc.addEventListener('contextmenu', blockContextMenu);
		boundCanvasFrameDocument = frameDoc;
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyboardPress);
		window.addEventListener('contextmenu', blockContextMenu);
		return () => {
			window.removeEventListener('keydown', handleKeyboardPress);
			window.removeEventListener('contextmenu', blockContextMenu);
		};
	});

	onDestroy(() => {
		if (canvasTransformFrame !== null) cancelAnimationFrame(canvasTransformFrame);
		clearTimeout(persistenceTimer);
		canvasSizeObserver?.disconnect();
		canvasSizeObserver = null;

		// Resize pointer listeners are attached to the active handle itself, so
		// teardown must use the same centralized cleanup path.
		endCanvasResize();

		if (boundCanvasFrameDocument) {
			boundCanvasFrameDocument.removeEventListener('keydown', handleKeyboardPress);
			boundCanvasFrameDocument.removeEventListener('contextmenu', blockContextMenu);
			boundCanvasFrameDocument = null;
		}
	});
</script>

<svelte:head>
	<!-- Ces balises injecteront les valeurs directement dans le <head> HTML -->
	<title>{title.value} · {activeProjectName}</title>
	<meta name="description" content={description.value} />
</svelte:head>

<Toasts />
{#if showImportDialog}
	<ImportDialog onImport={importProject} onClose={() => (showImportDialog = false)} />
{/if}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main
	class="max-w-screen max-h-screen h-full grid grid-cols-[220px_auto_220px] bg-white transition-colors duration-300 dark:bg-slate-950"
>
	<div
		class="w-full h-[100vh] scroll-container transition-all duration-700 p-2 overflow-auto border-r border-r-slate-200 text-sm bg-white text-gray-600 dark:border-r-slate-800 dark:bg-slate-900 dark:text-slate-300"
	>
		<LeftSidebar {canvasSize} />
	</div>
	<section class="flex flex-col h-[98vh] w-full min-w-[600px]">
		<main class="w-full h-full">
			<!--
				The canvas is the interactive authoring surface. The export
				actions operate on the logical document tree, so zoom/pan state is
				never baked into the generated website.
			-->
			<section class="">
				<Header {resetCanvas} bind:showImportDialog {activeProjectName} />
			</section>

			<!-- Canvas Container -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				bind:this={container}
				aria-roledescription="canvas"
				class="canvas-container"
				class:draw-mode={drawMode.value}
				onmousedown={handleCanvasMiddleMouseDown}
				onpointerdown={handleMouseDown}
				onpointermove={handleMouseMove}
				onpointerup={handleMouseUp}
				onpointercancel={handlePointerCancel}
				onwheel={handleWheel}
			>
				<!-- Canvas Content: a sandboxed iframe, not a div. Everything drawn
				     or imported lives in this iframe's own document, so its CSS/JS
				     is fully isolated from Webmold's own UI - see webmoldDOM.js.
				     Hover/selection highlighting (the .webmold-hover class /
				     outline styles) is applied directly to elements inside this
				     iframe and renders there natively - no host-side overlay is
				     needed for that. -->
				<iframe
					bind:this={canvasFrame}
					title="Webmold canvas"
					id="canvas"
					class="canvas-content"
					style="width: {canvasFrameSize.width}px; height: {canvasFrameSize.height}px; transform: {renderedCanvasTransform};"
					srcdoc={CANVAS_FRAME_SRCDOC}
					onload={handleCanvasFrameLoad}
				></iframe>
				<!-- Resize handles: each wrapper is sized to the exact same
				     width/height as the iframe (not offset via left/top like
				     the previous version), so its own top-left corner sits at
				     the same point as the iframe's - (0,0) in
				     .canvas-container - meaning `transform-origin: top left`
				     pivots both around that identical shared point. The grip
				     strip itself is positioned inside via ordinary right/
				     bottom (plain layout, resolved before the transform), so
				     the whole wrapper+strip moves as one rigid unit with the
				     iframe at any zoom - no origin mismatch left to drift. -->
				<div
					class="canvas-resize-handle canvas-resize-handle-width"
					style="width: {canvasFrameSize.width}px; height: {canvasFrameSize.height}px; transform: {renderedCanvasTransform};"
					onpointerdown={startCanvasResize('width')}
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize page width"
				></div>
				<div
					class="canvas-resize-handle canvas-resize-handle-height"
					style="width: {canvasFrameSize.width}px; height: {canvasFrameSize.height}px; transform: {renderedCanvasTransform};"
					onpointerdown={startCanvasResize('height')}
					role="separator"
					aria-orientation="horizontal"
					aria-label="Resize page height"
				></div>
			</div>

			<!-- Box to display the classes of a rectangle-->
			{#if devMode.value && (selectedElement.value || selectedClass.value || selectedGlobalSelector.value || editorPanel.value === 'js')}
				<div class:editor-hidden-while-panning={hideEditorWhilePanning}>
					<Editor disabled={hideEditorWhilePanning} />
				</div>
			{/if}
			<!-- end Box to display the classes of a rectangle  -->
		</main>
	</section>
	<div class="h-screen overflow-hidden">
		<!--This third section contains some configurations-->
		<RightSidebar />
	</div>
</main>

<style>
	.editor-hidden-while-panning {
		opacity: 0;
		pointer-events: none;
		user-select: none;
	}

	.canvas-container {
		position: relative;
		width: 100%;
		height: 96%;
		overflow: hidden;
		/* A neutral gray backdrop, not white, is what actually delimits the
		   page: a dashed border reads as a "selection" or "placeholder" state
		   in most UI conventions, not as a static page boundary, and it would
		   still need to fight a white-on-white background to be seen. Letting
		   the (also white) iframe page contrast against this instead is the
		   same solution Figma/Webflow/Framer use for their canvas. */
		background: #e2e8f0;
		transition: background-color 0.3s ease;
		/* required for reliable pointer capture during drag: prevents the browser from hijacking
		   the gesture for its own scroll/zoom/selection handling on touch and some trackpads */
		touch-action: none;
	}

	/* Dark theme only recolours the editor's own backdrop and the frame's shadow.
	   The iframe's page (the user's design) is intentionally left white/unchanged. */
	:global(html.dark) .canvas-container {
		background: #0b1120;
	}
	:global(html.dark) .canvas-content {
		box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.18), 0 10px 40px rgba(0, 0, 0, 0.55);
	}
	:global(html.dark) .canvas-resize-handle::after {
		background: rgba(148, 163, 184, 0.3);
	}
	:global(html.dark) .canvas-resize-handle:hover::after,
	:global(html.dark) .canvas-resize-handle:active::after {
		background: #6366f1;
	}

	/* Sizing (width/height) is set inline on the <iframe> from canvasFrameSize
	rather than here, since it's a reactive $state value - fixed once by
	default/import, then only ever changed by the user dragging one of the
	resize handles (see startCanvasResize() in <script>), never by content. */
	.canvas-content {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: top left;
		transform: translate3d(
			0,
			0,
			0
		); /* required for hardware acceleration in order to have smooth animations and transitions*/
		backface-visibility: hidden;
		will-change: transform;
		isolation: isolate;
		/* .canvas-content is now an <iframe>, not a div - reset the chrome a
		   browser gives iframes by default. */
		border: none;
		/* Marks the page's actual boundary against the gray backdrop above -
		   a soft shadow rather than a border/outline so it reads as "this is
		   the page" (depth/elevation) rather than "this is selected"
		   (the meaning outline/dashed border already carries elsewhere in
		   this editor, e.g. .webmold-selected/.webmold-hover). */
		box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08), 0 4px 16px rgba(15, 23, 42, 0.12);
		background: #fff;
		display: block;
	}

	/* Resize handles: each wrapper (.canvas-resize-handle) is sized to
	   exactly match the iframe (see the template) - same position, same
	   size, same transform-origin - so it shares the iframe's own pivot
	   point for scale(). The grip strip (::after) is positioned inside it
	   with plain right/bottom, resolved in ordinary pre-transform layout
	   against the wrapper's own (iframe-matching) box, so it always hugs
	   the true edge at any zoom - a previous version positioned the WRAPPER
	   itself via left/top instead of matching its size, which gave it a
	   different transform-origin than the iframe (each element's own
	   top-left corner, per the "top left" keyword) and made the strip drift
	   away from the edge at any zoom other than exactly 100%.
	   The strip zooms with the canvas like everything else drawn on it
	   (thinner zoomed out, thicker zoomed in) rather than staying a fixed
	   screen size - an acceptable trade-off for reusing the exact same
	   transform already proven correct for the iframe, instead of a second,
	   counter-scaled one.
	   Kept faintly visible at rest (not just on :hover) - an affordance
	   nobody can discover isn't an affordance, and against the gray
	   .canvas-container backdrop a subtle line here doesn't compete with
	   the page itself for attention.
	   pointer-events only turns on for the thin strip itself, never the
	   full wrapper, so it can't steal clicks meant for drawing just
	   because they happen to overlap the same box. */
	.canvas-resize-handle {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: top left;
		background: transparent;
		pointer-events: none;
		z-index: 20;
	}
	.canvas-resize-handle::after {
		content: '';
		position: absolute;
		background: rgba(15, 23, 42, 0.18);
		pointer-events: auto;
		transition:
			background-color 0.1s ease,
			transform 0.1s ease;
	}
	.canvas-resize-handle:hover::after,
	.canvas-resize-handle:active::after {
		background: #3b82f6;
	}
	.canvas-resize-handle-width {
		cursor: ew-resize;
	}
	.canvas-resize-handle-width::after {
		top: 0;
		right: -1.5px;
		width: 3px;
		height: 100%;
	}
	.canvas-resize-handle-width:hover::after,
	.canvas-resize-handle-width:active::after {
		right: -5px;
		width: 10px;
	}
	.canvas-resize-handle-height {
		cursor: ns-resize;
	}
	.canvas-resize-handle-height::after {
		left: 0;
		bottom: -1.5px;
		height: 3px;
		width: 100%;
	}
	.canvas-resize-handle-height:hover::after,
	.canvas-resize-handle-height:active::after {
		bottom: -5px;
		height: 10px;
	}
	/* The .rectangle/.draw-mode/.webmold-selected/.webmold-hover rules that
	   used to live here now live inside CANVAS_FRAME_SRCDOC above (see the
	   comment there) - a :global() selector in this block still only ever
	   reaches the host document, never the canvas iframe's document. */
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