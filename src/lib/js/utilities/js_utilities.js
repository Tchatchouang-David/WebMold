// js_utilities.js
// Completion list for the Smart Editor when editing the project's global
// JavaScript (editorPanel === 'js'). Same { word, insert, cursorOffset }
// shape as css_utilities.js, so it drops into the exact same autocomplete
// and keyword-highlighting logic in SmartEditor.svelte.
//
// `word` is what's matched against what the user is typing (so typing "get"
// surfaces every getElementById/getElementsByTagName/... entry below) and
// what gets bolded in the suggestion list; `insert` is what's actually typed
// into the editor.
//
// Snippets are written with a "§" marker showing where the caret should end
// up (e.g. inside the quotes of `getElementById('§')`) instead of hand
// counting characters from the end - `cursorOffset` is derived from that
// marker automatically below, the same number `css_utilities.js` computes
// by hand for its `prop: ;` entries.
function snippet(word, insertWithMarker) {
	const markerIndex = insertWithMarker.indexOf('§');
	const insert = insertWithMarker.replace('§', '');
	const cursorOffset = markerIndex === -1 ? 0 : markerIndex - insert.length;
	return { word, insert, cursorOffset };
}

export const completionList = [
	// ─── Declarations & control flow ───
	snippet('const', 'const § = ;'),
	snippet('let', 'let § = ;'),
	snippet('var', 'var § = ;'),
	snippet('function', 'function §() {\n\t\n}'),
	snippet('async', 'async function §() {\n\t\n}'),
	snippet('await', 'await §'),
	snippet('return', 'return §;'),
	snippet('if', 'if (§) {\n\t\n}'),
	snippet('else', 'else {\n\t§\n}'),
	snippet('for', 'for (let i = 0; i < §.length; i++) {\n\t\n}'),
	snippet('forof', 'for (const item of §) {\n\t\n}'),
	snippet('forin', 'for (const key in §) {\n\t\n}'),
	snippet('while', 'while (§) {\n\t\n}'),
	snippet('do', 'do {\n\t§\n} while ();'),
	snippet('switch', 'switch (§) {\n\tcase :\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}'),
	snippet('break', 'break;'),
	snippet('continue', 'continue;'),
	snippet('try', 'try {\n\t§\n} catch (error) {\n\t\n}'),
	snippet('catch', 'catch (error) {\n\t§\n}'),
	snippet('finally', 'finally {\n\t§\n}'),
	snippet('throw', 'throw new Error(§);'),
	snippet('new', 'new §()'),
	snippet('class', 'class § {\n\tconstructor() {\n\t\t\n\t}\n}'),
	snippet('extends', 'extends §'),
	snippet('super', 'super(§)'),
	snippet('this', 'this'),
	snippet('typeof', 'typeof §'),
	snippet('instanceof', 'instanceof §'),
	snippet('import', "import { § } from '';"),
	snippet('export', 'export §'),
	snippet('default', 'default:'),
	snippet('delete', 'delete §'),
	snippet('void', 'void §'),
	snippet('null', 'null'),
	snippet('undefined', 'undefined'),
	snippet('true', 'true'),
	snippet('false', 'false'),
	snippet('arrow', '(§) => {\n\t\n}'),

	// ─── Globals ───
	snippet('document', 'document§'),
	snippet('window', 'window§'),
	snippet('navigator', 'navigator§'),
	snippet('location', 'location§'),
	snippet('localStorage', 'localStorage§'),
	snippet('sessionStorage', 'sessionStorage§'),
	snippet('Math', 'Math§'),
	snippet('JSON', 'JSON§'),
	snippet('Array', 'Array§'),
	snippet('Object', 'Object§'),
	snippet('String', 'String§'),
	snippet('Number', 'Number§'),
	snippet('Boolean', 'Boolean§'),
	snippet('Date', 'Date§'),
	snippet('Promise', 'Promise§'),
	snippet('Map', 'Map§'),
	snippet('Set', 'Set§'),
	snippet('RegExp', 'RegExp§'),
	snippet('Error', 'Error§'),

	// ─── DOM: finding elements ───
	snippet('getElementById', "getElementById('§')"),
	snippet('getElementsByClassName', "getElementsByClassName('§')"),
	snippet('getElementsByTagName', "getElementsByTagName('§')"),
	snippet('getElementsByName', "getElementsByName('§')"),
	snippet('querySelector', "querySelector('§')"),
	snippet('querySelectorAll', "querySelectorAll('§')"),
	snippet('closest', "closest('§')"),
	snippet('matches', "matches('§')"),

	// ─── DOM: reading & writing elements ───
	snippet('getAttribute', "getAttribute('§')"),
	snippet('setAttribute', "setAttribute('§', '')"),
	snippet('removeAttribute', "removeAttribute('§')"),
	snippet('hasAttribute', "hasAttribute('§')"),
	snippet('toggleAttribute', "toggleAttribute('§')"),
	snippet('createElement', "createElement('§')"),
	snippet('createTextNode', "createTextNode('§')"),
	snippet('cloneNode', 'cloneNode(§true)'),
	snippet('appendChild', 'appendChild(§)'),
	snippet('removeChild', 'removeChild(§)'),
	snippet('replaceChild', 'replaceChild(§)'),
	snippet('insertBefore', 'insertBefore(§)'),
	snippet('remove', 'remove()§'),
	snippet('append', 'append(§)'),
	snippet('prepend', 'prepend(§)'),
	snippet('classList', 'classList§'),
	snippet('textContent', 'textContent§'),
	snippet('innerHTML', 'innerHTML§'),
	snippet('innerText', 'innerText§'),
	snippet('style', 'style§'),
	snippet('dataset', 'dataset§'),
	snippet('value', 'value§'),
	snippet('checked', 'checked§'),
	snippet('focus', 'focus()§'),
	snippet('blur', 'blur()§'),
	snippet('click', 'click()§'),
	snippet('scrollIntoView', 'scrollIntoView({ behavior: \'smooth\' })§'),
	snippet('getBoundingClientRect', 'getBoundingClientRect()§'),
	snippet('getComputedStyle', 'getComputedStyle(§)'),

	// ─── Events ───
	snippet('addEventListener', "addEventListener('§', () => {\n\t\n})"),
	snippet('removeEventListener', "removeEventListener('§', )"),
	snippet('dispatchEvent', 'dispatchEvent(§)'),
	snippet('preventDefault', 'preventDefault()§'),
	snippet('stopPropagation', 'stopPropagation()§'),

	// ─── Console ───
	snippet('console.log', 'console.log(§)'),
	snippet('console.error', 'console.error(§)'),
	snippet('console.warn', 'console.warn(§)'),
	snippet('console.info', 'console.info(§)'),
	snippet('console.table', 'console.table(§)'),
	snippet('console.group', "console.group('§')"),
	snippet('console.groupEnd', 'console.groupEnd()§'),

	// ─── JSON ───
	snippet('JSON.stringify', 'JSON.stringify(§)'),
	snippet('JSON.parse', 'JSON.parse(§)'),

	// ─── Timers ───
	snippet('setTimeout', 'setTimeout(() => {\n\t§\n}, 1000)'),
	snippet('setInterval', 'setInterval(() => {\n\t§\n}, 1000)'),
	snippet('clearTimeout', 'clearTimeout(§)'),
	snippet('clearInterval', 'clearInterval(§)'),
	snippet('requestAnimationFrame', 'requestAnimationFrame(§)'),

	// ─── Array & Object helpers ───
	snippet('map', 'map((item) => §)'),
	snippet('filter', 'filter((item) => §)'),
	snippet('reduce', 'reduce((acc, item) => §, )'),
	snippet('forEach', 'forEach((item) => {\n\t§\n})'),
	snippet('find', 'find((item) => §)'),
	snippet('findIndex', 'findIndex((item) => §)'),
	snippet('includes', 'includes(§)'),
	snippet('push', 'push(§)'),
	snippet('pop', 'pop()§'),
	snippet('shift', 'shift()§'),
	snippet('unshift', 'unshift(§)'),
	snippet('slice', 'slice(§)'),
	snippet('splice', 'splice(§)'),
	snippet('join', "join('§')"),
	snippet('Object.keys', 'Object.keys(§)'),
	snippet('Object.values', 'Object.values(§)'),
	snippet('Object.entries', 'Object.entries(§)'),
	snippet('Object.assign', 'Object.assign(§)'),
	snippet('Array.from', 'Array.from(§)'),
	snippet('Array.isArray', 'Array.isArray(§)'),

	// ─── DOMContentLoaded (common top-level wrapper for imported pages) ───
	snippet('DOMContentLoaded', "document.addEventListener('DOMContentLoaded', () => {\n\t§\n});")
];

export default completionList;
