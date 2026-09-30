import { WebMoldDOM, isElement, isFormField } from './webmoldDOM';

/**
 * Svelte 5 state container.
 *
 * `$state` on a bare module-level `let` only stays reactive for code that
 * lives inside this module (re-assigning an imported binding from another
 * file is not legal JS). Wrapping every value in a small object with a
 * `value` accessor keeps a single mutable reference that every consumer can
 * import, read (`store.value`) and write (`store.value = x`) exactly like a
 * Svelte 4 `writable`'s `get(store)` / `store.set(x)`, but backed by a real
 * rune instead of the store contract (no `.subscribe`, no `get()`).
 */
function boxed(initial) {
	let value = $state(initial);
	return {
		get value() {
			return value;
		},
		set value(next) {
			value = next;
		}
	};
}

// variable that will store the selected element
export const selectedElement = boxed(null);
//this variable is for the developer mode, in this mode, classes can be added
export const devMode = boxed(false);
// Draw mode makes every canvas rectangle visibly traceable with a 1px black border.
export const drawMode = boxed(false);
// Favorite HTML tags are shared between the right-sidebar controls and the tag picker modal.
export const favoriteTags = boxed(['div', 'img', 'p', 'input', 'select', 'a', 'label', 'button']);
export const showFavoriteTagsModal = boxed(false);
//variable for the canvas content
export const canvas_content = boxed(null);
//variable to store all the created elements, the default and first element is our canvas
export const allCreatedRecangles = boxed([]);
// this variable will be used to highlight a button when we hover over a rectangle
export const hoveredRectangleIndex = boxed(null);
//variable to store the selected element indix
export const selectedRectangleIndex = boxed(null);
export const selectedElementName = boxed(null);
export const selectedElementID = boxed(null);
export const selectedElementType = boxed(null);
//variable to store the application title and description
export const title = boxed('Webmold');
export const description = boxed(
	'Bring your frontend knowledge into a visual environment. Build, edit and manage real HTML, CSS and JavaScript visually.'
);

//function to set the 3 common properties of an element
export function setSeletedElementProps(element) {
	//set th name, ID and type of the selected element
	selectedElementName.value = element.name;
	selectedElementID.value = element.id;
	selectedElementType.value = element.tagName.toLowerCase();
}

// this variable stores the styles of our elements and is the editor source of truth.
// The dynamic stylesheet is only a rendering mirror. We never read CSSStyleSheet.cssRules
// to populate the style editor because CSSOM is allowed to normalize authored values.
export const classBox = boxed(null);
export const selectedElementStyles = boxed([]);
export const styleSheet = boxed(null);

// Imported/global CSS classes. Platform-created elements start with an empty
// `classes` array; imported elements populate it from their HTML class attr.
export const allClasses = boxed([]);
// Non-class CSS selectors imported from the authored stylesheet, e.g. `h1`,
// `footer`, `:root`, `a:hover`, and compound selectors. These are editor metadata
// only; the authored stylesheet remains the rendering source of truth.
export const globalSelectors = boxed([]);
export const selectedClass = boxed(null);
export const selectedGlobalSelector = boxed(null);
export const editorPanel = boxed('styles');
export const importedCssText = boxed('');
// True only when the imported HTML actually contained a <body> that was
// converted into the editor's .starterWrapper section.
export const importedHasBody = boxed(false);
export const globalJs = boxed('');
export const globalScriptElement = boxed(null);
export const importedStyleSheet = boxed(null);
export const globalClassStyleSheet = boxed(null);

//function to check if a global class is draggable or not, global selectors such as h1, footer, :root, a:hover, and
// compound selectors are not draggable
export function isDraggableGlobalClass(classname) {
	return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(String(classname || ''));
}

/** Convert a declaration string into [property, value, priority]. */
export function parseCssDeclaration(declaration) {
	const text = String(declaration ?? '')
		.trim()
		.replace(/;+$/, '');
	if (!text) return null;

	const colon = text.indexOf(':');
	if (colon === -1) return null;

	const property = text.slice(0, colon).trim().toLowerCase();
	const value = text.slice(colon + 1).trim();
	if (!property || !value) return null;

	const importantMatch = value.match(/^(.*?)(?:\s*!important\s*)$/i);
	return {
		property,
		value: importantMatch ? importantMatch[1].trim() : value,
		priority: importantMatch ? 'important' : ''
	};
}

export function normalizeStyleArray(styles = []) {
	return styles
		.map(parseCssDeclaration)
		.filter(Boolean)
		.map(
			({ property, value, priority }) => `${property}: ${value}${priority ? ' !important' : ''};`
		);
}

/** Find the logical node for a live DOM element. */
export function findNodeByElement(tree, element) {
	for (const node of tree || []) {
		if (node.element === element) return node;
		if (node.children?.length) {
			const found = findNodeByElement(node.children, element);
			if (found) return found;
		}
	}
	return undefined;
}

/** Keep a node's authored declarations synchronized and render them to the stylesheet. */
export function setNodeStyles(node, styles) {
	if (!node) return;
	const normalized = normalizeStyleArray(styles);
	node.styles = normalized;
	syncNodeStyleRule(node);
	allCreatedRecangles.value = [...allCreatedRecangles.value];
}

/** Replace the stylesheet rule for a node from its authored declarations. */
export function syncNodeStyleRule(node) {
	const sheet = styleSheet.value;
	if (!sheet || !node?.element?.id) return;

	const selector = `#${CSS.escape(node.element.id)}`;

	// Remove every duplicate generated rule for this ID, not just the first one.
	for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
		const rule = sheet.cssRules[i];
		if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === selector) {
			sheet.deleteRule(i);
		}
	}

	const declarations = (node.styles || []).join(' ');
	if (declarations) {
		sheet.insertRule(`${selector} { ${declarations} }`, sheet.cssRules.length);
	}
}

/**
 * Convert the live editor tree into a JSON-safe representation.
 *
 * `allCreatedRecangles` remains the single in-memory editor model. The DOM
 * element is deliberately omitted only while producing the persistence
 * payload because HTMLElement instances cannot be serialized/restored by
 * JSON. No second in-memory snapshot is maintained.
 */
export function serializeAllCreatedRecangles(tree = allCreatedRecangles.value) {
	function serializeNode(node) {
		if (!node) return null;
		//corresponds to the element field of a node(allCreatedRecangles structure)
		const element = node.element;
		if (!isElement(element)) return null;

		const attributes = {};
		//we get the element's attributes such as id,src,data-id,title,... except for class,data-index,data-top,data-left
		for (const attribute of Array.from(element.attributes || [])) {
			if (attribute.name.startsWith('data-')) {
				const dataName = attribute.name.slice(5);
				if (['index', 'left', 'top'].includes(dataName)) continue;
			}
			if (attribute.name === 'class') continue;
			attributes[attribute.name] = attribute.value;
		}

		const hasElementChildren = element.children.length > 0;
		const serialized = {
			index: node.index ?? null,
			tagName: element.tagName.toLowerCase(),
			// Needed to rebuild SVG/MathML nodes in the right namespace on restore.
			namespaceURI: element.namespaceURI || null,
			label: node.label || element.tagName.toLowerCase(),
			type: node.type || 'element',
			attributes,
			styles: normalizeStyleArray(node.styles || []),
			classes: Array.isArray(node.classes) ? [...node.classes] : [],
			textContent: hasElementChildren ? '' : element.textContent || '',
			children: (node.children || []).map(serializeNode).filter(Boolean)
		};
		//For form fields, extra options shall be taken into consideration in the serialized object
		if (isFormField(element)) {
			serialized.value = element.value;
		}
		//we add the option checked because we have input type checkbox
		if (element.tagName === 'INPUT') {
			serialized.checked = element.checked;
		}

		return serialized;
	}
	//we always make sure that tree is an array and we apply serializeNode to every nodes inside tree
	return (Array.isArray(tree) ? tree : [tree]).map(serializeNode).filter(Boolean);
}

/** Return the JSON string used by MVP persistence/localForage. */
export function stringifyAllCreatedRecangles(tree = allCreatedRecangles.value) {
	return JSON.stringify(serializeAllCreatedRecangles(tree));
}

export function listElementClasses(element) {
	if (!isElement(element)) return [];

	const editorOnly = new Set([
		'rectangle',
		'webmold-selected',
		'webmold-hover',
		'active',
		'inactive',
		'hoverCanvasElement'
	]);
	const node = findNodeByElement(allCreatedRecangles.value, element);
	const stored = Array.isArray(node?.classes) ? node.classes : [];
	const live = Array.from(element.classList || []);

	// The DOM can change after import (for example `modalOverlay.classList.add('active')`),
	// so use the live classList as well as the logical node's imported class snapshot.
	return [...new Set([...stored, ...live])]
		.map(String)
		.filter(Boolean)
		.filter((classname) => !editorOnly.has(classname));
}

/** Add one real HTML class to the selected/live element and its logical node. */
export function addClassToElement(element, classname) {
	if (!isElement(element)) return false;
	const cleanName = String(classname ?? '')
		.trim()
		.replace(/^\./, '');
	// A compound global selector such as modal-overlay.active is not one HTML class.
	if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(cleanName)) return false;

	const node = findNodeByElement(allCreatedRecangles.value, element);
	if (!node) return false;

	node.classes = Array.isArray(node.classes) ? [...node.classes] : [];
	if (!node.classes.includes(cleanName)) node.classes.push(cleanName);
	element.classList.add(cleanName);

	allCreatedRecangles.value = [...allCreatedRecangles.value];
	return true;
}

/** Remove one real HTML class from the selected/live element and its logical node. */
export function removeClassFromElement(element, classname) {
	if (!isElement(element)) return false;
	const cleanName = String(classname ?? '')
		.trim()
		.replace(/^\./, '');
	// Only actual HTML class names can be removed from an individual element.
	if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(cleanName)) return false;

	const node = findNodeByElement(allCreatedRecangles.value, element);
	if (!node) return false;

	const previousClasses = Array.isArray(node.classes) ? node.classes : [];
	const nextClasses = previousClasses.filter((name) => name !== cleanName);
	const hadLogicalClass = nextClasses.length !== previousClasses.length;
	const hadDomClass = element.classList.contains(cleanName);
	if (!hadLogicalClass && !hadDomClass) return false;

	node.classes = nextClasses;
	element.classList.remove(cleanName);

	allCreatedRecangles.value = [...allCreatedRecangles.value];
	return true;
}

function getImportedStyleRule(selector) {
	const sheet = importedStyleSheet.value;
	if (!sheet || !selector) return null;

	for (const rule of Array.from(sheet.cssRules || [])) {
		if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === selector) {
			return rule;
		}
	}
	return null;
}

function declarationMap(styles = []) {
	const map = new Map();
	for (const declaration of styles) {
		const parsed = parseCssDeclaration(declaration);
		if (!parsed) continue;
		map.set(parsed.property, `${parsed.value}|${parsed.priority}`);
	}
	return map;
}

function styleDeclarationsEqual(styles, importedStyle) {
	if (!importedStyle?.style) return false;

	const imported = [];
	for (let i = 0; i < importedStyle.style.length; i++) {
		const property = importedStyle.style[i];
		imported.push({
			property,
			value: importedStyle.style.getPropertyValue(property).trim(),
			priority: importedStyle.style.getPropertyPriority(property)
		});
	}

	const left = declarationMap(styles);
	const right = declarationMap(
		imported.map(
			({ property, value, priority }) => `${property}: ${value}${priority ? ` !${priority}` : ''};`
		)
	);

	if (left.size !== right.size) return false;
	for (const [property, value] of left) {
		if (right.get(property) !== value) return false;
	}
	return true;
}

/**
 * Keep an edited global class rendered in the canvas, but do not inject a
 * duplicate copy when its declarations still exactly match the imported CSS.
 */
export function syncGlobalClassRule(classname) {
	const sheet = globalClassStyleSheet.value;
	if (!sheet || !classname) return;

	const classData = allClasses.value.find((item) => item.classname === classname);
	const classSelector = classData?.selector || `.${CSS.escape(classData?.classname || '')}`;
	if (!classSelector) return;

	for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
		const rule = sheet.cssRules[i];
		if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === classSelector) {
			sheet.deleteRule(i);
		}
	}

	const declarations = normalizeStyleArray(classData?.styles || []).join(' ');
	if (!declarations) return;

	const importedRule = getImportedStyleRule(classSelector);
	if (styleDeclarationsEqual(classData?.styles || [], importedRule)) return;

	sheet.insertRule(`${classSelector} { ${declarations} }`, sheet.cssRules.length);
}

/**
 * Replace generated class overrides from the authored global class store.
 * Unchanged imported classes are deliberately omitted because their original
 * authored rules are already active in `imported-styles`.
 */
export function syncAllGlobalClassRules() {
	const sheet = globalClassStyleSheet.value;
	if (!sheet) return;
	while (sheet.cssRules.length) sheet.deleteRule(sheet.cssRules.length - 1);

	for (const classData of allClasses.value) {
		const declarations = normalizeStyleArray(classData?.styles || []).join(' ');
		if (!declarations || !classData?.classname) continue;

		const classSelector = classData?.selector || `.${CSS.escape(classData.classname)}`;
		const importedRule = getImportedStyleRule(classSelector);
		if (styleDeclarationsEqual(classData.styles || [], importedRule)) continue;

		sheet.insertRule(`${classSelector} { ${declarations} }`, sheet.cssRules.length);
	}
}

function findCssRuleRange(source, targetSelector) {
	const text = String(source ?? '');
	const target = String(targetSelector ?? '').trim();
	if (!text || !target) return null;

	const stack = [];
	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (char === '{') {
			const headerStart = stack.length ? stack[stack.length - 1].open + 1 : 0;
			const header = text.slice(headerStart, i).trim();
			const block = { open: i, headerStart, header };
			stack.push(block);
		} else if (char === '}') {
			const block = stack.pop();
			if (block && block.header === target) {
				return { start: block.headerStart, open: block.open, close: i };
			}
		}
	}
	return null;
}

// The imported-styles <style> tag now lives inside the sandboxed canvas
// iframe (see webmoldDOM.js / CanvasEditor.svelte), not the host document.
// scopeImportedBodySelectors's `body`->`.starterWrapper` rewrite is kept
// only for the static HTML export path (serializer.js); the live preview no
// longer needs it at all because the iframe's own `body`/`:root`/`*` simply
// cannot reach anything outside its own document.
function writeImportedStyleTag(cssText) {
	if (!WebMoldDOM.isReady()) return;
	const importedStyle = WebMoldDOM.getElementById('imported-styles');
	if (importedStyle) importedStyle.textContent = cssText;
}

function replaceImportedCssRule(selector, replacement) {
	const source = importedCssText.value;
	const range = findCssRuleRange(source, selector);
	if (!range) return false;
	const before = source.slice(0, range.start);
	const after = source.slice(range.close + 1);
	const nextCss = `${before}${replacement}${after}`;
	importedCssText.value = nextCss;
	writeImportedStyleTag(nextCss);
	return true;
}

function normalizeSelectorName(value) {
	return String(value ?? '').trim();
}

/** Create an editable global selector in the authored stylesheet. */
export function addGlobalSelector(selector) {
	const value = normalizeSelectorName(selector);
	if (!value || globalSelectors.value.some((item) => item.selector === value)) return false;
	globalSelectors.value = [...globalSelectors.value, { selector: value, styles: [] }];
	const source = importedCssText.value.trim();
	const nextCss = `${source}${source ? '\n\n' : ''}${value} { }\n`;
	importedCssText.value = nextCss;
	writeImportedStyleTag(nextCss);
	return true;
}

/** Show one global CSS class in the dev editor. */
export function listGlobalSelectorStyles(selector) {
	const item = globalSelectors.value.find((entry) => entry.selector === selector);
	const styles = normalizeStyleArray(item?.styles || []);
	selectedClass.value = null;
	selectedGlobalSelector.value = selector || null;
	selectedElementStyles.value = [...styles];
	classBox.value = styles.join('\n');
}

/** Update declarations for one imported/global selector and persist its authored CSS. */
export function setGlobalSelectorStyles(selector, styles) {
	if (!selector) return;
	const normalized = normalizeStyleArray(styles);
	const current = globalSelectors.value;
	const item = current.find((entry) => entry.selector === selector);
	if (!item) return;

	item.styles = normalized;
	globalSelectors.value = [...current];

	const declarations = normalized.join(' ');
	const replacement = `${selector} { ${declarations} }`;
	if (!replaceImportedCssRule(selector, replacement)) return;

	selectedElementStyles.value = [...normalized];
	classBox.value = normalized.join('\n');
}

/** Rename an imported/global selector, preserving its declarations. */
export function renameGlobalSelector(oldSelector, newSelector) {
	const oldValue = normalizeSelectorName(oldSelector);
	const newValue = normalizeSelectorName(newSelector);
	if (!oldValue || !newValue || oldValue === newValue) return false;

	const current = globalSelectors.value;
	if (current.some((item) => item.selector === newValue)) return false;
	const item = current.find((entry) => entry.selector === oldValue);
	if (!item) return false;

	const styles = normalizeStyleArray(item.styles || []);
	const replacement = `${newValue} { ${styles.join(' ')} }`;
	const replaced = replaceImportedCssRule(oldValue, replacement);
	if (!replaced) {
		// Keep metadata and authored CSS in sync even when an older imported rule
		// cannot be located by the lightweight brace parser.
		const source = importedCssText.value;
		const sourceWithoutExact = source.includes(oldValue)
			? source.replace(oldValue, newValue)
			: null;
		if (sourceWithoutExact == null) return false;
		importedCssText.value = sourceWithoutExact;
		writeImportedStyleTag(sourceWithoutExact);
	}

	item.selector = newValue;
	globalSelectors.value = [...current];
	if (selectedGlobalSelector.value === oldValue) selectedGlobalSelector.value = newValue;
	return true;
}

/** Delete an imported/global selector rule from the authored stylesheet. */
export function deleteGlobalSelector(selector) {
	const value = normalizeSelectorName(selector);
	if (!value) return false;
	const current = globalSelectors.value;
	if (!current.some((item) => item.selector === value)) return false;

	if (!replaceImportedCssRule(value, '')) return false;
	globalSelectors.value = current.filter((item) => item.selector !== value);
	if (selectedGlobalSelector.value === value) selectedGlobalSelector.value = null;
	return true;
}

/** Remove a global class definition and detach it from document elements. */
export function deleteGlobalClass(classname) {
	const value = String(classname ?? '')
		.trim()
		.replace(/^\./, '');
	if (!value) return false;
	const current = allClasses.value;
	if (!current.some((item) => item.classname === value)) return false;

	allClasses.value = current.filter((item) => item.classname !== value);
	for (const node of walkNodes(allCreatedRecangles.value)) {
		if (!Array.isArray(node.classes) || !node.classes.includes(value)) continue;
		node.classes = node.classes.filter((name) => name !== value);
		if (isElement(node.element)) node.element.classList.remove(value);
	}
	allCreatedRecangles.value = [...allCreatedRecangles.value];
	if (selectedClass.value === value) selectedClass.value = null;
	syncAllGlobalClassRules();
	return true;
}

/** Show one global class in the dev editor. */
export function listClassStyles(classname) {
	const classData = allClasses.value.find((item) => item.classname === classname);
	const styles = normalizeStyleArray(classData?.styles || []);
	selectedClass.value = classname || null;
	selectedElementStyles.value = [...styles];
	classBox.value = styles.join('\n');
}

/** Update one global class from authored text and mirror it to its CSS rule. */
export function setGlobalJs(value) {
	const code = String(value ?? '');
	globalJs.value = code;
	const script = globalScriptElement.value;
	if (script?.parentNode) {
		// The script belongs to the canvas iframe's document (see
		// CanvasEditor.svelte's appendImportedScript), so its replacement must
		// be created there too - a node made with the host `document` can't be
		// inserted into a different document's tree.
		const replacement = WebMoldDOM.createElement('script');
		replacement.id = 'imported-project-script';
		replacement.type = 'text/javascript';
		replacement.textContent = code;
		script.parentNode.replaceChild(replacement, script);
		globalScriptElement.value = replacement;
	}
}

export function renameGlobalClass(oldName, newName) {
	const oldValue = String(oldName ?? '')
		.trim()
		.replace(/^\./, '');
	const newValue = String(newName ?? '')
		.trim()
		.replace(/^\./, '');
	if (!oldValue || !newValue || oldValue === newValue) return false;
	if (!/^[._a-zA-Z][._a-zA-Z0-9-]*(?:\.[_a-zA-Z][-_a-zA-Z0-9]*)*$/.test(newValue)) return false;

	const classes = allClasses.value;
	if (classes.some((item) => item.classname === newValue)) return false;
	const item = classes.find((entry) => entry.classname === oldValue);
	if (!item) return false;

	item.classname = newValue;
	item.selector = `.${newValue}`;
	allClasses.value = [...classes];

	// Simple classes can be renamed on attached elements. Compound selectors
	// such as modal-overlay.active represent a selector, not one HTML class.
	if (!newValue.includes('.') && !oldValue.includes('.')) {
		for (const node of walkNodes(allCreatedRecangles.value)) {
			if (Array.isArray(node.classes) && node.classes.includes(oldValue)) {
				node.classes = node.classes.map((name) => (name === oldValue ? newValue : name));
				if (isElement(node.element)) {
					node.element.classList.remove(oldValue);
					node.element.classList.add(newValue);
				}
			}
		}
		allCreatedRecangles.value = [...allCreatedRecangles.value];
	}

	if (selectedClass.value === oldValue) selectedClass.value = newValue;
	syncAllGlobalClassRules();
	return true;
}

function* walkNodes(tree) {
	for (const node of tree || []) {
		yield node;
		if (node.children?.length) yield* walkNodes(node.children);
	}
}

export function setGlobalClassStyles(classname, styles) {
	if (!classname) return;
	const normalized = normalizeStyleArray(styles);
	const current = allClasses.value;
	const existing = current.find((item) => item.classname === classname);
	if (!existing) return;
	existing.styles = normalized;
	allClasses.value = [...current];
	syncGlobalClassRule(classname);
	selectedElementStyles.value = [...normalized];
	classBox.value = normalized.join('\n');
}

export function listDivCss() {
	const selected = selectedElement.value;
	if (!isElement(selected)) {
		selectedElementStyles.value = [];
		classBox.value = '';
		return;
	}

	const tree = allCreatedRecangles.value;
	const node = findNodeByElement(tree, selected) || findNodeById(tree, selected.id);
	let styles = normalizeStyleArray(node?.styles || []);

	// A static element ignores top/left. Keep those authored values in node.styles
	// for history/export consistency, but don't show them as active properties.
	const position = styles
		.map((declaration) => declaration.match(/^\s*position\s*:\s*(.*?)(?:\s*!important)?;?$/i)?.[1])
		.find(Boolean)
		?.trim()
		.toLowerCase();
	if (position === 'static') {
		styles = styles.filter((declaration) => !/^\s*(top|left)\s*:/i.test(declaration));
	}

	selectedElementStyles.value = [...styles];
	classBox.value = styles.join('\n');
}
// selected Tag of the element
export const selectedTag = boxed(null);
//selected group where the element shall be appended
export const selectedGroup = boxed(null);
//this variable will store the selected positioning for the element to create
export const selectedPositioning = boxed('absolute');
//constant variable that stores the type of element we have
export const elementType = boxed(['element', 'group']);

//function to highlight the button whenever the rectangle is clicked
export function highlightRectangleToButton(event) {
	//console.log('Clicked element:', event.target);
	// Ensure event.target is an HTMLElement
	if (!isElement(event.target)) {
		console.error('event.target is not an HTMLElement:', event.target);
		return;
	}

	// Reset the class from active to inactive for the previously selected element
	const previousElement = selectedElement.value; // Get the actual HTMLElement from the store
	if (isElement(previousElement)) {
		//console.log('Previous element:', previousElement);
		previousElement.classList.remove('webmold-selected');
	}

	// Update the selected element in the store
	selectedElement.value = event.target;
	//console.log('New selected element:', event.target);

	// Set the name, ID, and type of the selected element
	setSeletedElementProps(event.target);
	//editorPanel.value = 'styles';
	selectedClass.value = null;

	// Get the rectangle index from the element's ID
	const rectangleIndex = parseInt(event.target.dataset.index, 10);

	// Update the selectedRectangleIndex store
	selectedRectangleIndex.value = rectangleIndex;

	// Highlight the new selected element
	event.target.classList.add('webmold-selected');
	event.target.classList.remove('webmold-hover');

	listDivCss();
}
//function to highlight the button whenever the rectangle is hovered so as to let know the user
export function highlightHoverRectangleToButton(event) {
	event.stopPropagation();
	const element = isElement(event.currentTarget) ? event.currentTarget : event.target;
	if (!isElement(element)) return;

	// Hover listeners are wired with mouseenter, so only the rectangle actually
	// entered gets the editor hover marker; ancestors are never promoted.
	element.classList.add('webmold-hover');
	//here i obtain his index
	const rectangleIndex = parseInt(element.dataset.index, 10);
	//here i set the selectedRectangleIndex to the rectangleIndex i got previously
	//inother to respect the svelte class condition for the button to be highlighted
	hoveredRectangleIndex.value = rectangleIndex;
}

//this function is to unhighlight our rectangle element on the canvas whenever the cursor leaves the element
export function unhighlightHoverRectangle(event) {
	event.stopPropagation();
	const element = isElement(event.currentTarget) ? event.currentTarget : event.target;
	if (!isElement(element)) return;
	element.classList.remove('webmold-hover');
	if (parseInt(element.dataset.index, 10) === hoveredRectangleIndex.value) {
		hoveredRectangleIndex.value = null;
	}
}

//function to get the exact length of a tree
export function countNodes(tree) {
	return getMaxNodeIndex(tree) + 1; // +1 to turn the highest existing index into a fresh, unused one
}
//whenver i copy or add an element, the index of the last element increases and it reflects the length of the tree, but if i delete
//an element, the countNodes will return length -1 but if it is not the last element that is deleted, the next created element
//will have the same index as the deleted element, so i need to get the highest node index across the WHOLE tree as reference
//
//NOTE: this used to walk only the last top-level node and then its last child, and so on (a "spine" walk). That is wrong as
//soon as selectedGroup is not the most-recently-created branch: e.g. canvas -> [div-1, div-2] as siblings, then the user
//re-selects div-1 (not the last sibling) and draws inside it. The old code would keep resolving to div-2's index (since it's
//last in the array) and hand out an index that's already used elsewhere in the tree, producing duplicate ids/CSS rules -
//exactly the "duplicate element / stuck cursor" bug. Walking the entire tree for the true max index fixes that.
export function getMaxNodeIndex(tree) {
	if (!Array.isArray(tree) || tree.length === 0) {
		return -1; // so that countNodes() on an empty tree yields 0, the first valid index
	}

	let max = -1;
	for (const node of tree) {
		if (typeof node.index === 'number' && node.index > max) {
			max = node.index;
		}
		if (node.children && node.children.length > 0) {
			const childMax = getMaxNodeIndex(node.children);
			if (childMax > max) {
				max = childMax;
			}
		}
	}

	return max;
}
export function addChildToNode(tree, targetId, newChild) {
	for (const node of tree) {
		if (node.element.id === targetId) {
			node.children.push(newChild);
			return true; // child added
		}

		if (node.children.length > 0) {
			const added = addChildToNode(node.children, targetId, newChild);
			if (added) return true;
		}
	}
	return false; // target not found
}

export function findNodeById(tree, targetId) {
	for (const node of tree) {
		if (node.element.id === targetId) {
			return node;
		}
		if (node.children && node.children.length > 0) {
			const foundNode = findNodeById(node.children, targetId);
			if (foundNode) {
				return foundNode;
			}
		}
	}
}

export function removeNodeById(tree, targetId) {
	return tree
		.map((node) => {
			if (node.children && node.children.length > 0) {
				node.children = removeNodeById(node.children, targetId);
			}
			return node;
		})
		.filter((node) => node.element.id !== targetId);
}

export function updateNode(tree, step, treeLength) {
	if (!tree) return;

	const nodes = Array.isArray(tree) ? tree : [tree];
	let offset = step;

	for (const node of nodes) {
		if (!node?.element) continue;

		node.index = treeLength + offset;
		node.styles = normalizeStyleArray(node.styles || []);
		node.classes = Array.isArray(node.classes)
			? [...node.classes]
			: Array.from(node.element.classList || []).filter(
					(name) =>
						![
							'rectangle',
							'webmold-selected',
							'webmold-hover',
							'active',
							'inactive',
							'hoverCanvasElement'
						].includes(name)
				);

		// Every copied node gets a fresh ID and its authored styles are rendered
		// under that new ID. Nothing is read back from CSSOM here.
		const newId = `html-${node.index}`;
		node.element.id = newId;
		node.element.dataset.index = node.index;
		syncNodeStyleRule(node);

		node.element.addEventListener('click', function (event) {
			highlightRectangleToButton(event);
		});
		node.element.addEventListener('mouseenter', function (event) {
			highlightHoverRectangleToButton(event);
		});
		node.element.addEventListener('mouseleave', function (event) {
			unhighlightHoverRectangle(event);
		});

		if (node.children?.length) {
			updateNode(node.children, offset + 1, treeLength);
			// Number of descendants plus this node determines the next sibling index.
			offset += countNodes(node.children);
		}

		offset += 1;
	}
}
