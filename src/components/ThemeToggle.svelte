<script>
	import { onMount } from 'svelte';
	import { theme, initTheme, toggleTheme } from '$lib/js/theme.svelte';

	let { class: className = '' } = $props();

	let isDark = $derived(theme.value === 'dark');

	// Sync with the real page state and follow OS / other-tab changes.
	onMount(() => initTheme());
</script>

<!--
	The knob position and icons are driven purely by Tailwind's `dark:` variants
	(i.e. the class on <html>), so the toggle is already correct on first paint,
	before any JavaScript has run. `isDark` only feeds the accessibility state.
-->
<button
	type="button"
	role="switch"
	aria-checked={isDark}
	aria-label="Dark mode"
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={toggleTheme}
	class="group relative inline-flex h-9 w-[4.25rem] shrink-0 items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-colors duration-300 hover:border-indigo-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-400/60 {className}"
>
	<!-- Track icons (the side the knob is NOT on) -->
	<svg
		class="absolute right-2.5 h-4 w-4 text-slate-400 transition-opacity duration-300 dark:opacity-0"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path
			d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
		></path>
	</svg>
	<svg
		class="absolute left-2.5 h-4 w-4 text-slate-500 opacity-0 transition-opacity duration-300 dark:opacity-100"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path
			d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
		></path>
	</svg>

	<!-- Knob -->
	<span
		class="relative z-10 flex h-7 w-7 translate-x-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-md transition-all duration-300 ease-out group-active:scale-90 dark:translate-x-[2rem] dark:from-indigo-500 dark:to-violet-600"
	>
		<!-- Sun (light mode) -->
		<svg
			class="h-4 w-4 dark:hidden"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
			></path>
		</svg>
		<!-- Moon (dark mode) -->
		<svg
			class="hidden h-4 w-4 dark:block"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
			></path>
		</svg>
	</span>
</button>
