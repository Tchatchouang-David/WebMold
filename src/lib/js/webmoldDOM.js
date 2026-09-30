// webmoldDOM.js
//
// Every rectangle the user draws, and every element an imported project
// contributes, now lives inside a sandboxed <iframe> instead of the app's
// own document. That's what actually stops an imported `:root`, `body` or
// `*` selector from ever touching Webmold's own UI - the iframe has its own
// document, its own <html>/<body>, its own CSSOM. No selector rewriting is
// required for isolation to hold.
//
// This module is the single place that owns a reference to that iframe's
// document/window, and it's the layer the rest of the app calls into
// instead of reaching for the global `document`. Call sites that used to do
// `document.getElementById(...)` against canvas content now do
// `WebMoldDOM.getElementById(...)`.
//
// The adapter is intentionally tiny: it does not try to proxy *every*
// document method, only the handful this codebase actually calls
// (createElement, getElementById, querySelector/All, appendChild via
// `.body`). Extend it deliberately rather than reaching back into
// `frame.contentDocument` from call sites, so there's exactly one place
// that knows how the canvas is hosted.

let frameEl = null;
let frameDoc = null;
let frameWin = null;
let readyResolve;
let readyPromise = new Promise((resolve) => {
	readyResolve = resolve;
});

/**
 * Called once by CanvasEditor after the iframe's `load` event fires (i.e.
 * once frame.contentDocument is a real, populated document we can safely
 * touch). Safe to call again on remount - resets the ready promise so
 * `WebMoldDOM.ready()` callers always get the *current* frame.
 * contentDocument and contentWindow are properties provided by JS to interact with an Iframe *document* and *window*
 */
export function attach(iframeElement) {
	frameEl = iframeElement;
	frameDoc = iframeElement.contentDocument;
	frameWin = iframeElement.contentWindow;
	//Any part of your code waiting for readyPromise immediately unblocks, and receives frameDoc as the result intoher to proceed.
	readyResolve(frameDoc);
}

export function detach() {
	frameEl = null;
	frameDoc = null;
	frameWin = null;
	readyPromise = new Promise((resolve) => {
		readyResolve = resolve;
	});
}

/** Resolves once the canvas iframe's document is ready to be queried/mutated. */
export function ready() {
	return readyPromise;
}

/** True once a live frame document is attached. Guards call sites that may run before onMount. */
export function isReady() {
	return Boolean(frameDoc);
}

function requireDoc() {
	if (!frameDoc) {
		throw new Error(
			'WebMoldDOM used before the canvas iframe was ready. Call WebMoldDOM.ready() first, or guard on WebMoldDOM.isReady().'
		);
	}
	return frameDoc;
}

export const WebMoldDOM = {
	attach,
	detach,
	ready,
	isReady,
	get document() {
		return requireDoc();
	},
	get window() {
		if (!frameWin) throw new Error('WebMoldDOM used before the canvas iframe was ready.');
		return frameWin;
	},
	get frameElement() {
		return frameEl;
	},
	get body() {
		return requireDoc().body;
	},
	get head() {
		return requireDoc().head;
	},
	createElement(tag) {
		return requireDoc().createElement(tag);
	},
	/**
	 * Namespace-aware element creation. Required for SVG (and MathML): an <svg> or
	 * <path> made with createElement() lives in the HTML namespace, becomes an inert
	 * HTMLUnknownElement and never paints.
	 */
	createElementNS(namespace, tag) {
		return requireDoc().createElementNS(namespace, tag);
	},
	getElementById(id) {
		return requireDoc().getElementById(id);
	},
	querySelector(selector) {
		return requireDoc().querySelector(selector);
	},
	querySelectorAll(selector) {
		return requireDoc().querySelectorAll(selector);
	},
	/**
	 * True when `node` belongs to the canvas iframe's document rather than
	 * the host app's document. Interaction handlers use this to decide
	 * whether an event needs the "already-transform-adjusted" coordinate
	 * path (see handleMouseDown/handleWheel in CanvasEditor.svelte) or the
	 * legacy host-document path.
	 */
	owns(node) {
		return Boolean(frameDoc) && node?.ownerDocument === frameDoc;
	}
};

/**
 * Realm-safe replacement for `node instanceof HTMLElement`.
 *
 * This is the single most important export in this file, and the easiest
 * thing to miss when moving canvas content into an iframe: an element
 * created via `frameDocument.createElement(...)` belongs to the iframe's
 * own JavaScript realm, so it has its own `window.HTMLElement` constructor -
 * a DIFFERENT function object from the host document's `HTMLElement`.
 * `instanceof` checks the prototype chain against a specific constructor,
 * so `iframeElement instanceof HTMLElement` (using the host's global)
 * silently evaluates to `false` even though the node genuinely is an
 * element. Every "is this a real element" guard around click/hover
 * selection, class editing, and style syncing depends on this check, so
 * getting it wrong doesn't throw - it just makes the whole canvas stop
 * responding to clicks with no error anywhere.
 *
 * `nodeType === 1` (Node.ELEMENT_NODE) is realm-independent and is the
 * standard fix for exactly this problem.
 */
export function isElement(node) {
	//Boolean(node): Ensures node is truthy (i.e., not null, undefined, 0, false, or "") and nodeType === 1 refers to HTML elements (or DOM element node)
	return Boolean(node) && node.nodeType === 1;
}

/** Realm-safe check for <input>/<textarea>/<select>, for the same reason as isElement(). */
export function isFormField(node) {
	if (!isElement(node)) return false;
	return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT';
}

export default WebMoldDOM;