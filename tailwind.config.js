/** @type {import('tailwindcss').Config} */
module.exports = {
	// Use the `dark` class on <html> (set by app.html / theme.svelte.js) instead of the OS setting.
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}' // Ensure paths match your project structure
	],
	theme: {
		extend: {
			fontFamily: {
				roboto: ['Roboto','sans-serif'],
			}
		}
	},
	safelist: [
		/* 	{ pattern: /([a-zA-Z]+)-./,variants: ['hover'], }, */
	],
	plugins: []
};