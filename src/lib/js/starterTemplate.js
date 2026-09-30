// starterTemplate.js
//
// Loads the optional starter template used to seed a brand-new user's very
// first project, so they have something real to explore/edit rather than a
// blank canvas. See src/lib/js/starterTemplate/README.md for the file
// contract this expects.
//
// { query: '?raw', import: 'default' } tells Vite to load each matched
// file's exact text content as a plain string, rather than trying to parse
// it as JavaScript/CSS/whatever its extension implies. That matters for two
// reasons: a .html file obviously isn't valid JS, so a normal import would
// fail the build outright (as opposed to failing at runtime, which could at
// least be try/caught) - and even for the .js file, we want its contents as
// inert text to hand to the exported page later, not to actually execute as
// a real ES module inside the Webmold app itself.
//
// import.meta.glob tolerates zero matches (unlike a plain static import of
// a file that doesn't exist, which is a build error): this is what makes it
// safe to ship and call before starterTemplate/ has anything in it -
// getStarterTemplate() simply returns null until matching files show up.
const htmlModules = import.meta.glob('./starterTemplate/*.html', {
	query: '?raw',
	import: 'default',
	eager: true
});
const cssModules = import.meta.glob('./starterTemplate/*.css', {
	query: '?raw',
	import: 'default',
	eager: true
});
const jsModules = import.meta.glob('./starterTemplate/*.js', {
	query: '?raw',
	import: 'default',
	eager: true
});

/**
 * @returns {{ html: string, css: string, js: string } | null} the starter
 * template if a .html, .css, or .js file was found under
 * src/lib/js/starterTemplate/, otherwise null. Only the first file of each
 * type is used if more than one is present.
 */
export function getStarterTemplate() {
	const html = Object.values(htmlModules)[0];
	const css = Object.values(cssModules)[0];
	const js = Object.values(jsModules)[0];

	if (html === undefined && css === undefined && js === undefined) return null;

	return { html: html || '', css: css || '', js: js || '' };
}