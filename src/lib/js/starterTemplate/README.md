# Starter template

Drop your starter files here to seed a brand-new user's very first project
with a working example instead of a blank canvas:

```
src/lib/js/starterTemplate/
  index.html   (or any name - just needs a .html extension)
  index.css    (or any name - just needs a .css extension)
  index.js     (or any name - just needs a .js extension)
```

## Contract

Just genuine, real HTML/CSS/JS - plain files, exactly as you'd write them
anywhere else. No exports, no wrapping them in JS, nothing Webmold-specific.

The loader (`src/lib/js/starterTemplate.js`) imports each file with Vite's
`?raw` query, which loads its exact text content as a string rather than
trying to parse it as JavaScript - so a `.html` file full of markup, or a
`.js` file full of top-level statements, is exactly what's expected. Only
one file of each type is used (if you have more than one `.html` file, say,
only the first is picked up).

`starterHTML` is then treated exactly like pasting into the "HTML" field of
the Import dialog: it's parsed, serialized, and adjusted by the Webmold
engine the same way any other import is (IDs assigned, styles lifted into
the editor's stylesheet, elements made selectable/draggable, etc.).

## What happens if this folder is empty or missing

Nothing breaks. `getStarterTemplate()` uses Vite's `import.meta.glob`, which
tolerates zero matching files at build time (unlike a plain static import of
a file that doesn't exist, which would fail the build). If no `.html`/`.css`/
`.js` files are found here, new projects just start from an empty canvas,
same as before this feature existed.

## When this runs

Only for a user's first-ever project, and only while it's still empty (never
been drawn in / saved with real content) - checked in
`CanvasEditor.svelte`'s project-loading `onMount`. It never overwrites an
existing project's saved content, and it never applies to anyone's second or
later project.