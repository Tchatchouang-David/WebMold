import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';

/**
 * Strip CSS comments without touching comment-like text inside quoted values.
 */
export function stripCssComments(cssText = '') {
	let result = '';
	let quote = null;
	for (let i = 0; i < cssText.length; i++) {
		const char = cssText[i];
		const next = cssText[i + 1];
		if (quote) {
			result += char;
			if (char === '\\' && next) {
				result += next;
				i++;
			} else if (char === quote) {
				quote = null;
			}
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			result += char;
			continue;
		}
		if (char === '/' && next === '*') {
			i += 2;
			while (i < cssText.length && !(cssText[i] === '*' && cssText[i + 1] === '/')) i++;
			i++;
			result += ' ';
			continue;
		}
		result += char;
	}
	return result;
}

/**
 * Split a CSS block into top-level rules while respecting parentheses,
 * strings, and nested at-rules.
 */
function collectCssRules(cssText, output = []) {
	const css = stripCssComments(cssText);
	let i = 0;
	let preludeStart = 0;
	let quote = null;
	let parenDepth = 0;
	let braceDepth = 0;

	while (i < css.length) {
		const char = css[i];
		const next = css[i + 1];

		if (quote) {
			if (char === '\\' && next) {
				i += 2;
				continue;
			}
			if (char === quote) quote = null;
			i++;
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			i++;
			continue;
		}
		if (char === '(') parenDepth++;
		if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

		if (parenDepth === 0 && char === ';' && braceDepth === 0) {
			const prelude = css.slice(preludeStart, i).trim();
			if (prelude) output.push({ type: 'statement', prelude });
			preludeStart = i + 1;
		}

		if (parenDepth === 0 && char === '{') {
			if (braceDepth === 0) {
				const prelude = css.slice(preludeStart, i).trim();
				let depth = 1;
				let j = i + 1;
				let innerQuote = null;
				let innerParen = 0;
				for (; j < css.length; j++) {
					const c = css[j];
					const n = css[j + 1];
					if (innerQuote) {
						if (c === '\\' && n) j++;
						else if (c === innerQuote) innerQuote = null;
						continue;
					}
					if (c === '"' || c === "'") {
						innerQuote = c;
						continue;
					}
					if (c === '(') innerParen++;
					else if (c === ')') innerParen = Math.max(0, innerParen - 1);
					else if (innerParen === 0 && c === '{') depth++;
					else if (innerParen === 0 && c === '}') {
						depth--;
						if (depth === 0) break;
					}
				}
				if (j < css.length) {
					const body = css.slice(i + 1, j);
					output.push({ type: 'block', prelude, body });
					i = j;
					preludeStart = i + 1;
					braceDepth = 0;
				}
			}
		}
		i++;
	}

	const trailing = css.slice(preludeStart).trim();
	if (trailing) output.push({ type: 'statement', prelude: trailing });
	return output;
}

function splitSelectors(selectorText) {
	const selectors = [];
	let current = '';
	let quote = null;
	let parenDepth = 0;
	for (let i = 0; i < selectorText.length; i++) {
		const char = selectorText[i];
		if (quote) {
			current += char;
			if (char === '\\' && selectorText[i + 1]) {
				current += selectorText[++i];
			} else if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			current += char;
		} else if (char === '(') {
			parenDepth++;
			current += char;
		} else if (char === ')') {
			parenDepth = Math.max(0, parenDepth - 1);
			current += char;
		} else if (char === ',' && parenDepth === 0) {
			if (current.trim()) selectors.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim()) selectors.push(current.trim());
	return selectors;
}

function parseDeclarations(body) {
	const declarations = [];
	let current = '';
	let quote = null;
	let parenDepth = 0;

	for (let i = 0; i < body.length; i++) {
		const char = body[i];
		if (quote) {
			current += char;
			if (char === '\\' && body[i + 1]) current += body[++i];
			else if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			current += char;
			continue;
		}
		if (char === '(') parenDepth++;
		else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
		if (char === ';' && parenDepth === 0) {
			if (current.trim()) declarations.push(current.trim() + ';');
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim()) declarations.push(current.trim().replace(/;+$/, '') + ';');
	return declarations.filter((declaration) => /^[-\w]+\s*:/.test(declaration.trim()));
}

function getClassSelectorsFromSelector(selector) {
	const value = selector.trim();
	// A global class entry may be a simple class (`.btn`) or a compound class
	// selector (`.modal-overlay.active`). Both are directly editable because
	// the selector is made exclusively from class names. Selectors involving
	// elements, descendants, attributes, pseudo states, etc. remain in the raw
	// imported CSS because flattening them would change their meaning.
	if (!/^(?:\.[_a-zA-Z][-_a-zA-Z0-9]*)+$/.test(value)) return [];
	return [value];
}

function getIdNamesFromSelector(selector) {
	const value = selector.trim();
	const match = value.match(/^#([_a-zA-Z][-_a-zA-Z0-9]*)$/);
	return match ? [match[1]] : [];
}

function mergeDeclarations(target, declarations) {
	const map = new Map();
	for (const declaration of target) {
		const parsed = parseDeclaration(declaration);
		if (parsed) map.set(parsed.property, parsed);
	}
	for (const declaration of declarations) {
		const parsed = parseDeclaration(declaration);
		if (parsed) map.set(parsed.property, parsed);
	}
	return [...map.values()].map(formatParsedDeclaration);
}

function parseDeclaration(declaration) {
	const text = String(declaration || '').trim().replace(/;+$/, '');
	const colon = text.indexOf(':');
	if (colon < 1) return null;
	const property = text.slice(0, colon).trim().toLowerCase();
	let value = text.slice(colon + 1).trim();
	if (!property || !value) return null;
	let priority = '';
	const important = value.match(/\s*!important\s*$/i);
	if (important) {
		priority = 'important';
		value = value.slice(0, important.index).trim();
	}
	return { property, value, priority };
}

function formatParsedDeclaration({ property, value, priority }) {
	return `${property}: ${value}${priority ? ' !important' : ''};`;
}

/**
 * Parse CSS directly from the user's source text. The returned values keep
 * authored representations (e.g. `white`, not CSSOM's `rgb(255, 255, 255)`).
 */
export function parseImportedCss(cssText = '') {
	const classMap = new Map();
	const idMap = new Map();
	const globalSelectorMap = new Map();

	const isSimpleClassSelector = (selector) => /^\.[_a-zA-Z][-_a-zA-Z0-9]*$/.test(selector.trim());
	const isSimpleIdSelector = (selector) => /^#[a-zA-Z_][-_a-zA-Z0-9]*$/.test(selector.trim());

	function visitRules(rules) {
		for (const rule of rules) {
			if (rule.type !== 'block') continue;
			const prelude = rule.prelude.trim();
			if (!prelude) continue;

			// Keep at-rules (media queries, supports blocks, keyframes, etc.)
			// exclusively in the raw imported CSS. We deliberately do not flatten
			// their declarations into the global class editor because doing so
			// would turn responsive/state-specific styles into unconditional rules.
			if (prelude.startsWith('@')) continue;

			const declarations = parseDeclarations(rule.body);
			if (!declarations.length) continue;

			for (const selector of splitSelectors(prelude)) {
				const normalizedSelector = selector.trim();

				if (!isSimpleClassSelector(normalizedSelector) && !isSimpleIdSelector(normalizedSelector)) {
					globalSelectorMap.set(
						normalizedSelector,
						mergeDeclarations(globalSelectorMap.get(normalizedSelector) || [], declarations)
					);
				}

				for (const classSelector of getClassSelectorsFromSelector(selector)) {
					const classname = classSelector.slice(1);
					classMap.set(classname, mergeDeclarations(classMap.get(classname) || [], declarations));
				}
				for (const idName of getIdNamesFromSelector(selector)) {
					idMap.set(idName, mergeDeclarations(idMap.get(idName) || [], declarations));
				}
			}
		}
	}

	visitRules(collectCssRules(cssText));

	return {
		classes: [...classMap.entries()].map(([classname, styles]) => ({
			classname,
			selector: `.${classname}`,
			styles
		})),
		globalSelectors: [...globalSelectorMap.entries()].map(([selector, styles]) => ({
			selector,
			styles
		})),
		ids: idMap
	};
}

function isElementNode(node) {
	return node && node.type === 'tag' && typeof node.name === 'string';
}

function cloneWithoutScriptAndStyle(node) {
	if (!node) return null;
	if (node.type === 'script' || node.type === 'style') return null;
	if (isElementNode(node)) {
		return {
			...node,
			children: (node.children || []).map(cloneWithoutScriptAndStyle).filter(Boolean)
		};
	}
	return node;
}

function findBody(ast) {
	const queue = [...(ast.children || [])];
	while (queue.length) {
		const node = queue.shift();
		if (isElementNode(node) && node.name.toLowerCase() === 'body') return node;
		if (node.children) queue.push(...node.children);
	}
	return null;
}

/**
 * Extract inline CSS/JS embedded in a complete HTML document.
 * AI-generated pages commonly place their stylesheet and scripts directly
 * inside the HTML instead of separate CSS/JS files.
 */
export function extractEmbeddedAssets(htmlText = '') {
	const ast = parseDocument(htmlText, { decodeEntities: false });
	const cssBlocks = [];
	const jsBlocks = [];

	function visit(node) {
		if (!node) return;

		if (node.type === 'style') {
			cssBlocks.push((node.children || []).map((child) => child.data || '').join(''));
			return;
		}

		if (node.type === 'script' && !node.attribs?.src) {
			jsBlocks.push((node.children || []).map((child) => child.data || '').join(''));
			return;
		}

		for (const child of node.children || []) visit(child);
	}

	for (const node of ast.children || []) visit(node);

	return {
		css: cssBlocks.filter((value) => value.trim()).join('\n\n'),
		js: jsBlocks.filter((value) => value.trim()).join('\n\n')
	};
}

/**
 * Parse HTML with htmlparser2, then re-serialize it for browser DOM creation.
 *
 * `canvas_content` is a real `<body>` belonging to the canvas iframe's own,
 * fully isolated document (see webmoldDOM.js) - not a div standing in for
 * one inside Webmold's own page. So an imported `<body>` no longer needs to
 * be downgraded into a wrapper element to avoid colliding with anything:
 * its children import as ordinary top-level nodes, and its own attributes
 * (returned here as `bodyAttributes`) get applied directly onto the real
 * canvas body by the caller (see importProject in CanvasEditor.svelte).
 */
export function parseImportedHtml(htmlText = '') {
	const ast = parseDocument(htmlText, { decodeEntities: false });
	const body = findBody(ast);
	const sourceNodes = body ? body.children || [] : ast.children || [];
	const cleanNodes = sourceNodes.map(cloneWithoutScriptAndStyle).filter(Boolean);
	return {
		ast,
		hasBody: Boolean(body),
		bodyAttributes: body ? { ...(body.attribs || {}) } : {},
		html: cleanNodes.map((node) => render(node, { encodeEntities: false })).join('\n')
	};
}