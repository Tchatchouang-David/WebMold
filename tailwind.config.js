/** @type {import('tailwindcss').Config} */
module.exports = {
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
