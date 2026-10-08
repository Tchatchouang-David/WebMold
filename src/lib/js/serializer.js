import { parseImportedCss } from './importer';
import { isElement } from './webmoldDOM';

/**
 * Serialization helpers for the visual editor.
 *
 * IMPORTANT ARCHITECTURE NOTE
 * ---------------------------
 * The editor currently uses real DOM elements as the visual source of truth,
 * while `allCreatedRecangles` keeps the logical parent/child tree.
 *
 * The serializer deliberately bridges those two worlds without serializing
 * HTMLElement instances themselves. A saved document must be plain data so it
 * can later be persisted, sent to an API, versioned, diffed, or compiled into
 * HTML on another machine.
 */

const EDITOR_ONLY_CLASSES = new Set([
	'rectangle',
	'active',
	'inactive',
	'hoverCanvasElement',
	// Only ever toggled directly on the canvas body (see the drawMode $effect
	// in CanvasEditor.svelte) - a runtime concern, never part of an imported
	// document's own identity, so it must never reach an export.
	'draw-mode',
	'webmold-selected',
	'webmold-hover'
]);

const EDITOR_ONLY_DATA_ATTRIBUTES = new Set([
	'index',
	'left',
	'top'
]);

/**
 * Convert a DOM element's attributes into plain JSON data.
 *
 * The editor adds a few temporary classes/data attributes for selection,
 * hovering, and bookkeeping. Those values are intentionally excluded from
 * exported documents because they belong to the editor UI, not the user's
 * webpage.
 */
function serializeAttributes(element) {
	const attributes = {};

	for (const attribute of Array.from(element.attributes)) {
		if (attribute.name.startsWith('data-')) {
			const dataName = attribute.name.slice(5);
			if (EDITOR_ONLY_DATA_ATTRIBUTES.has(dataName)) continue;
		}

		if (attribute.name === 'class') {
			const classes = attribute.value
				.split(/\s+/)
				.filter(Boolean)
				.filter((className) => !EDITOR_ONLY_CLASSES.has(className));

			if (classes.length > 0) {
				attributes.class = classes.join(' ');
			}
			continue;
		}

		attributes[attribute.name] = attribute.value;
	}

	return attributes;
}

/**
 * Find the stylesheet rule belonging to one of our generated element IDs.
 *
 * Styles are stored in the dynamic stylesheet instead of inline attributes,
 * therefore the export must read them back from CSSStyleSheet.cssRules.
 */
function getElementStyleDeclaration(element, styleSheet) {
	if (!styleSheet || !element?.id) return null;

	for (const rule of Array.from(styleSheet.cssRules)) {
		if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === `#${element.id}`) {
			return rule.style;
		}
	}

	return null;
}

/** Return the node's authored declarations exactly as stored by the editor. */
function getNodeCssText(node) {
	return (node?.styles || []).join(' ');
}

/**
 * Return CSS declarations as a clean string, optionally omitting properties
 * that do not apply to the element's positioning mode.
 *
 * We iterate over CSSStyleDeclaration instead of splitting cssText on `;`.
 * That is safer for values that can themselves contain punctuation such as
 * data URLs or function arguments.
 */
function normalizeStyleDeclaration(styleDecl, positioning) {
	if (!styleDecl) return '';

	const ignoredProperties = positioning === 'static' ? new Set(['top', 'left']) : new Set();
	const declarations = [];

	for (let i = 0; i < styleDecl.length; i++) {
		const property = styleDecl[i];
		if (ignoredProperties.has(property)) continue;

		const value = styleDecl.getPropertyValue(property);
		const priority = styleDecl.getPropertyPriority(property);
		declarations.push(`${property}: ${value}${priority ? ` !${priority}` : ''};`);
	}

	return declarations.join(' ');
}

/**
 * Extract one element into a DOM-free serializable node.
 *
 * `parentId` is stored explicitly so the document remains understandable
 * without reconstructing the DOM. The existing tree is still serialized as
 * nested `children` to make the document convenient to consume.
 */
export function serializeNode(node, styleSheet) {
	const element = node?.element;
	if (!isElement(element)) return null;

	const cssText = getNodeCssText(node);
	const computedPosition =
		node?.styles
			?.map((declaration) => declaration.match(/^\s*position\s*:\s*(.*?)(?:\s*!important)?;?$/i)?.[1])
			.find(Boolean)?.trim().toLowerCase() || '';
	const normalizedCssText = cssText;
	const childNodes = (node.children || [])
		.map((child) => serializeNode(child, styleSheet))
		.filter(Boolean);

	const hasElementChildren = Array.from(element.children).length > 0;
	const textContent = !hasElementChildren ? element.textContent || '' : '';

	return {
		id: element.id || null,
		tagName: element.tagName.toLowerCase(),
		name: element.getAttribute('name') || '',
		label: node.label || element.tagName.toLowerCase(),
		type: node.type || 'element',
		index: node.index ?? null,
		parentId: element.parentElement?.id || null,
		positioning: computedPosition || null,
		attributes: serializeAttributes(element),
		classes: [...(node.classes || [])],
		cssText: normalizedCssText,
		textContent,
		children: childNodes
	};
}

/**
 * Serialize the entire editor document.
 *
 * The root canvas itself is metadata only; the user's created elements are
 * represented by `children`. This avoids leaking the editor's internal canvas
 * implementation into the exported website.
 */
export function serializeDocument(tree, styleSheet, options = {}) {
	const root = Array.isArray(tree) ? tree[0] : null;
	const nodes = root?.children || [];

	return {
		version: 1,
		format: 'visual-web-document',
		createdAt: new Date().toISOString(),
		canvas: {
			id: 'canvas',
			width: options.width ?? null,
			height: options.height ?? null
		},
		globalClasses: options.allClasses || [],
		importedCss: options.importedCss || '',
		// True only when the imported source had a real <body>. Its own
		// attributes (id/class/etc.) live directly on the root element
		// itself now (see `canvas`/root's `attributes`/`classes` above and
		// applyBodyAttributes in CanvasEditor.svelte) - there's no more
		// wrapper element standing in for it, so this flag is now purely
		// informational (e.g. for UI/import-history purposes) rather than
		// something a reload needs to find and unwrap.
		importedHasBody: Boolean(options.hasBody),
		importedJs: options.importedJs || '',
		importedResources: Array.isArray(options.importedResources) ? options.importedResources : [],
		elements: nodes.map((node) => serializeNode(node, styleSheet)).filter(Boolean)
	};
}

/** Escape user-controlled values before writing HTML source. */
function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/**
 * Create clean HTML from an editor DOM node.
 *
 * We clone the real DOM because it already contains the correct parent/child
 * order. Then we remove editor-only classes and data attributes from the clone
 * so the generated page contains only webpage concerns.
 */
function cleanElementForExport(element) {
	const clone = element.cloneNode(true);
	const allElements = [clone, ...clone.querySelectorAll('*')];

	for (const current of allElements) {
		// Inline styles are uncommon in the current editor, but stripping `top`
		// and `left` here too keeps the export correct if a static element ever
		// receives those declarations directly on its `style` attribute.
		const inlinePosition = current.style?.position?.trim().toLowerCase() || '';
		if (inlinePosition === 'static') {
			current.style.removeProperty('top');
			current.style.removeProperty('left');
		}

		if (current.classList) {
			for (const className of EDITOR_ONLY_CLASSES) {
				current.classList.remove(className);
			}

			if (!current.className) {
				current.removeAttribute('class');
			}
		}

		for (const attribute of Array.from(current.attributes || [])) {
			if (!attribute.name.startsWith('data-')) continue;
			const dataName = attribute.name.slice(5);
			if (EDITOR_ONLY_DATA_ATTRIBUTES.has(dataName)) {
				current.removeAttribute(attribute.name);
			}
		}
	}

	return clone;
}

/**
 * Return CSS rules for the actual serialized nodes only.
 *
 * This prevents stale rules from copied/deleted elements from being exported.
 */
function collectDocumentCss(tree) {
	const rules = [];
	const collect = (nodes) => {
		for (const node of nodes || []) {
			if (node?.element?.id && node?.styles?.length) {
				rules.push(`#${CSS.escape(node.element.id)} { ${getNodeCssText(node)} }`);
			}
			collect(node.children);
		}
	};

	collect(Array.isArray(tree) ? tree[0]?.children : []);
	return rules.join('\n');
}

/** Serialize imported head resources without flattening script types or attributes. */
function serializeImportedResource(resource) {
	if (!resource?.kind) return '';

	const attributes = resource.attributes || {};
	const attributeString = Object.entries(attributes)
		.filter(([name, value]) => name && value !== null && value !== undefined)
		.map(([name, value]) => ` ${name}="${escapeHtml(value === true ? '' : value)}"`)
		.join('');

	if (resource.kind === 'link') return `<link${attributeString}>`;
	if (resource.kind === 'base') return `<base${attributeString}>`;
	if (resource.kind === 'script') {
		const content = resource.content || '';
		return `<script${attributeString}>${content}<\/script>`;
	}
	return '';
}

/**
 * Produce a standalone HTML document from the current visual document.
 *
 * This is intentionally an HTML/CSS export, not a screenshot export. The
 * positioning semantics chosen in the editor (absolute/static/relative/
 * fixed/sticky) remain in the resulting CSS, so static elements will naturally
 * participate in normal document flow when the exported page is opened. For
 * static elements, `top` and `left` are intentionally omitted because they do
 * not affect static positioning and would only represent stale values from a
 * previous positioning mode.
 */
export function serializeHtml(tree, styleSheet, options = {}) {
	const root = Array.isArray(tree) ? tree[0] : null;
	const nodes = root?.children || [];
	const nodeCss = collectDocumentCss(tree);

	// Imported CSS is the source of truth for classes until a user edits one.
	// Export only changed class rules so an untouched imported stylesheet is not
	// duplicated in the generated HTML.
	const importedClassRules = new Map(
		parseImportedCss(options.importedCss || '').classes.map((item) => [
			item.classname,
			(item.styles || []).join(' ')
		])
	);
	const classCss = (options.allClasses || [])
		.filter((item) => item?.classname)
		.filter((item) => {
			const current = (item.styles || []).join(' ');
			const imported = importedClassRules.get(item.classname);
			return imported === undefined || imported !== current;
		})
		.map((item) => `${item.selector || `.${CSS.escape(item.classname)}`} { ${(item.styles || []).join(' ')} }`)
		.join('\n');

	const css = [options.importedCss || '', nodeCss, classCss].filter(Boolean).join('\n');

	/**
	 * `root.element` is canvas_content itself - the canvas iframe's real,
	 * isolated `<body>` (see webmoldDOM.js) - so whatever the imported
	 * document's `<body>` tag carried (id, class, lang, data-*, ...) already
	 * lives directly on it; no wrapper element to find and unwrap here
	 * anymore. Export just reads it straight off, stripping editor-only
	 * classes/data attributes the same way any other element does.
	 */
	let bodyAttributes = {};
	if (isElement(root?.element)) {
		const clone = cleanElementForExport(root.element);
		bodyAttributes = serializeAttributes(clone);
	}
	const bodyHtml = nodes
		.map((node) => {
			if (!isElement(node?.element)) return '';
			return cleanElementForExport(node.element).outerHTML;
		})
		.filter(Boolean)
		.join('\n');

	const bodyAttributeString = Object.entries(bodyAttributes)
		.map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
		.join('');

	const hasImportedResourceArray = Array.isArray(options.importedResources);
	const importedResources = hasImportedResourceArray ? options.importedResources : [];
	const headResourcesHtml = importedResources
		.filter((resource) => resource?.location !== 'body')
		.map(serializeImportedResource)
		.filter(Boolean)
		.map((resource) => `  ${resource}`)
		.join('\n');
	const bodyResourcesHtml = importedResources
		.filter((resource) => resource?.location === 'body')
		.map(serializeImportedResource)
		.filter(Boolean)
		.map((resource) => `  ${resource}`)
		.join('\n');

	// Backward compatibility for callers that only provide the legacy importedJs
	// string. New project snapshots/export calls provide importedResources.
	const legacyJsHtml = !hasImportedResourceArray && options.importedJs
		? `  <script>\n${options.importedJs}\n  <\/script>`
		: '';

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Website</title>
${headResourcesHtml}
  <style>
${css}
  </style>
</head>
<body${bodyAttributeString}>
${bodyHtml}
${bodyResourcesHtml}${legacyJsHtml ? `\n${legacyJsHtml}` : ''}
</body>
</html>`;
}

/** Download a text payload in the browser without adding an extra dependency. */
export function downloadTextFile(content, fileName, mimeType) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
}