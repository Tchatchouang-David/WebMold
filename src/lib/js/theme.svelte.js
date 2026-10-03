/**
 * Light / dark theme state.
 *
 * The source of truth for *styling* is the `dark` class on <html>: Tailwind's
 * `dark:` variants key off it (tailwind.config.js -> darkMode: 'class'), and the
 * inline script in src/app.html applies it before first paint so there is no
 * flash. This module only keeps a reactive mirror of that class for components
 * that need to know the current theme (e.g. aria-pressed on the toggle), and
 * handles persistence.
 *
 * Preference order: the user's saved choice, otherwise the OS setting. Until
 * the user explicitly picks a theme, the app keeps following the OS live.
 */

// Keep in sync with the inline script in src/app.html.
const STORAGE_KEY = 'webmold-theme';

// Same `boxed()` pattern as store.svelte.js: a single importable reference
// that reads/writes like `theme.value`, backed by a real rune.
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

/** Current resolved theme: 'light' | 'dark'. */
export const theme = boxed('light');

function readSavedTheme() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		return saved === 'dark' || saved === 'light' ? saved : null;
	} catch {
		// Storage can be blocked (private mode, strict settings) - just fall back to the OS.
		return null;
	}
}

function systemTheme() {
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(next) {
	const root = document.documentElement;
	root.classList.toggle('dark', next === 'dark');
	root.style.colorScheme = next;
	theme.value = next;
}

/**
 * Sync the reactive state with the page and start following OS / other-tab
 * changes. Call once from onMount; returns a cleanup function.
 */
export function initTheme() {
	if (typeof window === 'undefined') return () => {};

	applyTheme(readSavedTheme() ?? systemTheme());

	const media = window.matchMedia?.('(prefers-color-scheme: dark)');

	// Only follow the OS while the user has not made an explicit choice.
	const onSystemChange = () => {
		if (!readSavedTheme()) applyTheme(systemTheme());
	};

	// Keep several open tabs consistent.
	const onStorage = (event) => {
		if (event.key === STORAGE_KEY) applyTheme(readSavedTheme() ?? systemTheme());
	};

	media?.addEventListener?.('change', onSystemChange);
	window.addEventListener('storage', onStorage);

	return () => {
		media?.removeEventListener?.('change', onSystemChange);
		window.removeEventListener('storage', onStorage);
	};
}

/** Explicitly set (and remember) the theme. */
export function setTheme(next) {
	if (typeof window === 'undefined') return;

	const root = document.documentElement;
	// Briefly enable smooth colour transitions (see app.css) for the switch only,
	// so normal hover/drag interactions never inherit them.
	root.classList.add('theme-switching');
	applyTheme(next);

	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Not persisted, but the theme still switches for this session.
	}

	window.setTimeout(() => root.classList.remove('theme-switching'), 350);
}

/** Flip between light and dark, reading the real page state (not the mirror). */
export function toggleTheme() {
	if (typeof window === 'undefined') return;
	setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}
