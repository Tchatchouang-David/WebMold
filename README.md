<p align="center">
  <img src="static/webmold-logo.png" alt="WebMold" width="180" />
</p>

<h1 align="center">WebMold</h1>

<p align="center">
  A visual HTML, CSS & JavaScript editor built around real web code — not a screenshot, not a mockup, and not a proprietary page format.
</p>

<p align="center">
  <a href="https://github.com/Tchatchouang-David/WebMold">Repository</a>
  ·
  <a href="src/routes/docs/+page.svelte">Documentation</a>
  ·
  <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL v3</a>
</p>

---

## What is WebMold?

**WebMold is a visual development environment for building and editing web pages while keeping the underlying HTML, CSS, and JavaScript close at hand.**

Instead of hiding a page behind a proprietary visual representation, WebMold works directly with real DOM elements and real CSS rules. You can draw elements on a canvas, inspect their hierarchy, edit HTML properties, manage classes and selectors, work inside a code editor, import existing HTML/CSS/JS, and export the result as a standalone webpage.

The editor is designed around one central idea:

> **Visual editing should remain connected to the actual web document.**

---

##  Highlights

| Capability | What it does |
| --- | --- |
|  **Visual canvas** | Draw and arrange HTML elements directly on an interactive canvas. |
|  **Zoom & pan** | Navigate large designs with mouse-wheel zooming and middle-button panning. |
|  **Resizable canvas** | Change the canvas dimensions manually to work with different page sizes and responsive layouts. |
|  **DOM hierarchy** | Manage parent/child relationships from the Components tree. |
|  **HTML tag properties** | Edit IDs, names, tag types, text content, image attributes, input attributes, links, labels, and more. |
|  **CSS editing** | Edit element styles through the visual editor and SmartEditor. |
|  **Global classes** | Create, edit, rename, delete, attach, and manage reusable CSS classes. |
|  **Global selectors** | Work with selectors that do not fit the simple class model while keeping their original CSS meaning. |
|  **SmartEditor** | Edit CSS and JavaScript with a code-oriented editing experience. |
|  **HTML / CSS / JS import** | Bring an existing webpage or source files into the canvas. |
|  **HTML / JSON export** | Export the visual document as JSON or generate a standalone HTML document. |
|  **Project persistence** | Save projects locally with isolated project storage using localForage/IndexedDB. |
|  **SVG support** | Preserve namespaces when restoring SVG and other namespaced elements. |

---

##  How WebMold Works

WebMold is intentionally split into two worlds: the **editor application** and the **page being edited**.

```text
┌─────────────────────────────────────────────────────────────┐
│                      WebMold Application                    │
│                                                             │
│  Header / Project Manager / Sidebars / SmartEditor          │
│                         │                                   │
│                         │ editor state                      │
│                         ▼                                   │
│                  Svelte stores + logic                      │
│                         │                                   │
│                         ▼                                   │
│                  WebMoldDOM adapter                         │
│                         │                                   │
│                  iframe document                            │
│                         ▼                                   │
│       ┌─────────────────────────────────────────────┐       │
│       │                Canvas iframe                │       │
│       │                                             │       │
│       │     real <html> / <body> / DOM / CSSOM      │       │
│       │                                             │       │
│       │     imported HTML + CSS + project JS        │       │
│       └─────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. The editor lives in the host document

The surrounding application contains the toolbars, sidebars, dialogs, project management UI, code editor, and application-level state.

### 2. The editable webpage lives inside an iframe

The actual page being created or imported is hosted inside a dedicated iframe document. It has its own:

- `window`
- `document`
- `<html>`
- `<body>`
- CSSOM
- DOM tree


### 3. WebMoldDOM bridges the two environments

`src/lib/js/webmoldDOM.js` provides a small adapter around the iframe's document and window. Editor code can therefore work with canvas elements without repeatedly reaching through `contentDocument` itself.

This architecture is especially important for imported CSS. Selectors such as `:root`, `html`, `body`, and `*` remain meaningful inside the imported page without becoming selectors for WebMold's own interface.

### 4. The DOM itself remains the visual source of truth

The live iframe contains the actual elements the user is editing. At the same time, WebMold maintains a logical parent/child tree for hierarchy management, selection, persistence, and serialization.

### 5. Editor-only state is separated from webpage content

WebMold adds temporary classes and attributes for interaction and bookkeeping — such as selection, hover highlighting, rectangle visualization, and internal indexes.

Before export, the serializer removes these editor-only artifacts so they do not become part of the resulting webpage.

---

### Canvas

The canvas is the main authoring surface. Elements can be drawn directly onto it, selected, highlighted, and arranged as part of the document hierarchy.

The canvas also supports manual width and height resizing, which makes it possible to inspect and author pages at dimensions different from the current application viewport.

### Hierarchy

The Components section reflects the element tree managed by the project. Selecting an element from either the canvas or the hierarchy exposes its editable properties.

### Draw Mode

Draw Mode places a visible border around editable rectangles, making nested elements easier to understand while constructing a layout.

### Zoom and pan

The workspace can be zoomed with the mouse wheel and panned with the middle mouse button. Pointer-aware interaction handling is used so gestures remain stable when the pointer moves across different UI surfaces.

---

## HTML, CSS and JavaScript editing

WebMold intentionally separates different kinds of authoring work.

### HTML properties

The left sidebar can expose properties such as:

- element ID
- name
- tag type
- text content
- image `src` and `alt`
- input type and placeholder
- textarea rows
- anchor `href`
- label `for`
- element classes

These values are applied to the actual DOM element inside the canvas iframe.

### CSS

The SmartEditor can work with:

- direct element styles
- global classes
- global selectors

The project keeps authored CSS data separate from the editor's temporary visual state so that editing remains meaningful when the document is exported later.

### Global classes

Classes can be created, renamed, deleted, edited, and attached to elements. Draggable class chips make it possible to apply a reusable class to the selected element.

### Global selectors

Not every selector is a simple `.class`. WebMold keeps more complex global selectors available without pretending they are ordinary class definitions. This helps preserve the semantics of selectors that involve combinations, descendants, pseudo states, attributes, or other CSS relationships.

### JavaScript

Project-level JavaScript can be edited and imported. Imported scripts are inserted into the canvas iframe's document, meaning `document`, `window`, and DOM queries resolve against the editable webpage rather than the WebMold application shell.

---

## 📥 Import pipeline

WebMold can ingest HTML, CSS, and JavaScript as a single project.

The pipeline is roughly:

```text
HTML / CSS / JS source
          │
          ▼
     Import parser
          │
          ├── HTML → DOM structure
          ├── CSS  → classes / selectors / authored rules
          └── JS   → project script
          │
          ▼
     iframe document
          │
          ▼
  selectable/editable page
```

The importer also handles embedded `<style>` and `<script>` content when extracting project assets.

Imported nodes receive the metadata WebMold needs for selection and hierarchy management, while their actual webpage identity remains in the iframe document.

---

## Export pipeline

WebMold supports two complementary export formats.

### JSON

The JSON export produces a DOM-free representation of the visual document. This makes the project structure suitable for persistence, inspection, transmission, versioning, or future compilation work.

### Standalone HTML

The HTML exporter generates a complete HTML document containing the relevant:

- document structure
- element attributes
- authored CSS
- global class styles
- imported CSS
- imported JavaScript

Editor-only classes and bookkeeping attributes are removed during serialization so the exported document is not tied to the editor's internal interaction state.

```text
WebMold DOM
    │
    ▼
Serializer
    │
    ├── remove editor-only state
    ├── collect authored styles
    ├── preserve element hierarchy
    ├── preserve imported CSS/JS
    │
    ▼
Standalone webpage
```

---

##  Projects and persistence

WebMold includes a local project manager.

Each project receives isolated localForage storage, backed by browser storage such as IndexedDB when available. Project snapshots contain the information required to restore the canvas and editor state, including the document tree, canvas dimensions, classes, global selectors, imported CSS/JS, and editor modes.

This means WebMold can behave like a small local development workspace instead of treating the canvas as a one-off session.

> Project persistence is local to the browser environment. It is not a cloud collaboration system.

---

## 🚀 Getting started

### Requirements

WebMold is a SvelteKit application using Vite.

### Install

```bash
git clone https://github.com/Tchatchouang-David/WebMold
cd WebMold
npm install
```

### Run the development server

```bash
npm run dev
```

Then open the local URL printed by Vite.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

---


## 📚 Documentation

WebMold includes an in-app documentation route covering the main editor modules, including canvas navigation, Draw Mode, hierarchy and selection, keyboard shortcuts, global classes, Dev Mode, import, and project persistence.

The documentation source lives in:

```text
src/routes/docs/+page.svelte
```

---

## 🤝 Contributing

Contributions, bug reports, and improvements are welcome.

For changes that modify editor behavior, it is especially useful to keep the following boundaries in mind:

- host application code vs. iframe canvas code
- live DOM state vs. serializable project data
- editor-only classes/attributes vs. exported webpage content
- imported source CSS/JS vs. WebMold-generated rules

These boundaries are core to the architecture and help prevent subtle regressions.

---

## 📜 License

### WebMold source code — GNU AGPL v3.0

**WebMold itself is released under the GNU Affero General Public License version 3 (AGPL v3.0).**

That means the **WebMold software and covered modifications/redistributions of its source code** are governed by the AGPL v3.0 and its copyleft requirements.

At the same time, **creating a website with WebMold does not, by itself, automatically make that separately authored website AGPL-licensed**. Your own HTML, CSS, JavaScript, content, and assets remain subject to the licenses and rights that apply to those materials. The important distinction is between the **WebMold software itself** and the **independent website content you create with the tool**.

Because software licensing can depend on how code is combined and distributed, this README is not a substitute for legal advice. When in doubt about whether your particular integration forms a covered work, review the AGPL and obtain professional legal advice.

The full license text is available from the Free Software Foundation:

**https://www.gnu.org/licenses/agpl-3.0.html**

### ✅ Free to use under AGPL v3

WebMold is intended to be freely usable under the AGPL v3. The license is not a "personal use only" license: the key requirements concern the rights and obligations around the covered WebMold software, especially when it is modified, redistributed, or offered for interaction over a network.

### 💼 Commercial license

Some organizations may need rights that are different from the AGPL model — for example, a proprietary integration, closed-source modifications, embedded redistribution, OEM use, or other commercial arrangements that require permissions outside the AGPL's terms.

**Commercial licensing is available separately.**

For commercial licensing inquiries, please contact the WebMold maintainers through the project repository:

**https://github.com/Tchatchouang-David/WebMold**

Please describe your intended use, how WebMold will be integrated, and the distribution model so the appropriate licensing terms can be discussed.

---

## 🌱 The goal

WebMold is being built as a bridge between **visual editing** and **real web development**.

The long-term goal is not to hide HTML/CSS/JS behind an opaque builder. It is to make the underlying web document easier to create, inspect, manipulate, and export — while keeping developers close to the technologies they already use.

<p align="center">
  <strong>Build visually. Edit the real document. Keep the web code yours.</strong>
</p>