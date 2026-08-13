# VietaMath

<p align="center">
  <img src="https://raw.githubusercontent.com/liamhawtin/vieta-math/main/assets/vieta-space-mark.png" width="104" alt="VietaSpace" />
</p>

VietaMath is a browser math editor for people working with advanced notation.
It is designed for university-level mathematics and beyond: fractions, scripts,
matrices, limits, delimiters, and other structured expressions can be edited
directly instead of being treated as ordinary text.

The package renders MathML from editable LaTeX and keeps source ranges on the
rendered structure. That lets the editor place a caret, navigate, select, and
modify the expression in the browser. It can be mounted as a standalone input
or used as inline math inside a ProseMirror document.

Try the [live VietaMath demos](https://liamhawtin.github.io/vieta-math/): a
standalone input, a theme override example, and a ProseMirror editor are all
available in the browser.

[![VietaSpace math editing walkthrough](https://raw.githubusercontent.com/liamhawtin/vieta-math/main/assets/vieta-math-demo.gif)](https://liamhawtin.github.io/vieta-math/)

This walkthrough shows VietaSpace editing mathematics in the browser. The live
demo site uses the published VietaMath package.

The published package is [vieta-math on npm](https://www.npmjs.com/package/vieta-math).

## Install

VietaMath does not require your application to use React. The editor currently
uses React internally, however, so React and ReactDOM must be available at
runtime. With npm 7 or later, installing VietaMath normally adds them for you:

```sh
npm install vieta-math
```

If your package manager does not add them automatically, install a compatible
React pair explicitly:

```sh
npm install vieta-math react react-dom
```

VietaMath currently supports React 18 internally. It needs a browser DOM, so
create editor instances only in client-side code.

### Device support

VietaMath is built for desktop-class browsers and a proper physical keyboard.
Phones are not supported in this release. The editing model relies on keyboard
navigation and does not provide a phone-first touch interface.

## Standalone input

```js
import { UIRegistry, VietaMath } from "vieta-math";

const symbolPad = document.querySelector("#symbol-pad");
const smartMenu = document.querySelector("#smart-menu");

UIRegistry.mountSymbolPad(symbolPad);
UIRegistry.mountSmartMenu(smartMenu);

let editor;
function updateExport() {
  console.log(editor.getSanitizedLatex());
}

editor = new VietaMath(document.querySelector("#math-input"), {
  initialContent: String.raw`\int_0^1 x^2\,dx`,
  focusOnInit: true,
  symbolPadContainer: symbolPad,
  smartMenuContainer: smartMenu,
  onChange: updateExport,
});

updateExport();

// When the host view is removed:
editor.destroy();
UIRegistry.unmountSymbolPad();
UIRegistry.unmountSmartMenu();
```

`getLatex()` returns VietaMath's editable internal form.
`getSanitizedLatex()` returns LaTeX prepared for copying, saving, or passing to
another tool. The shared UI registry has one mount point for each optional UI;
mount it once for the host view and unmount it when that view goes away.
Pass each shared-UI container to the editor as well. That lets the editor keep
its active state while a menu or pad takes focus. The Smart Menu positions
itself against the viewport, so its mount can be an ordinary empty element in
the same application view; it does not need host-specific overlay CSS.

#### Smart Menu alignment

Mount the Smart Menu in a normal, empty element and pass that same element as
`smartMenuContainer`. Do not place it inside an absolutely positioned wrapper
or try to position it from your host CSS: VietaMath measures the active caret
against the viewport and places the menu itself, flipping above the caret when
there is not enough room below. This is the arrangement used by the standalone
and ProseMirror examples.

Read the complete [standalone reference](docs/standalone.md) for every
constructor option, the shared-UI lifecycle, output forms, and advanced hooks.
See the runnable standalone example in [`examples/standalone`](examples/standalone).

## ProseMirror

The `vieta-math/prosemirror` entry supplies the schema node, plugins,
commands, and node view. Its implementation is bundled with the package. Your
application still owns its ProseMirror editor, schema, and view, so install the
ProseMirror packages used to make that editor. The basic example uses:

```sh
npm install prosemirror-history prosemirror-model prosemirror-schema-basic \
  prosemirror-state prosemirror-view
```

```js
import { history } from "prosemirror-history";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { VietaMath } from "vieta-math";
import {
  createVietaMathNodeView,
  vietaMathInputRulesPlugin,
  vietaMathNodes,
  vietaMathPlugin,
} from "vieta-math/prosemirror";

const schema = new Schema({
  nodes: basicSchema.spec.nodes.append(vietaMathNodes),
  marks: basicSchema.spec.marks,
});

const state = EditorState.create({
  schema,
  plugins: [
    vietaMathInputRulesPlugin(schema),
    vietaMathPlugin(schema),
    history(),
  ],
});

const view = new EditorView(document.querySelector("#document-editor"), {
  state,
  nodeViews: {
    vieta_math_inline: createVietaMathNodeView(VietaMath),
  },
});
```

Typing a complete `$latex$` expression converts it to an inline VietaMath node.
You can also call `insertVietaMath(schema)` from a command or button. The
runnable ProseMirror example in [`examples/prosemirror`](examples/prosemirror)
shows the optional shared symbol-pad and smart-menu mounts. Read the complete
[ProseMirror reference](docs/prosemirror.md) for node attributes, persistence,
clipboard behavior, keyboard behavior, node-view options, and every public
ProseMirror export.

## Styling and themes

VietaMath injects its component styles with the JavaScript bundle. Its visual
contract is CSS custom properties in two layers:

- `.vieta-root` controls the surrounding UI: backgrounds, text, borders,
  shadows, accents, spacing, radii, and typography.
- `.vieta-root .interactive-mathml` controls direct math interaction: caret,
  selection, overlays, borders, and related MathML states.

The unconfigured default is light. An ancestor with `data-theme="light"` or
`data-theme="dark"` selects a fixed palette explicitly. VietaMath does not
infer dark mode from the browser setting: a light host stays light even when a
visitor's browser prefers dark mode. If the application follows the system
preference, update its own root attribute and its surrounding colors together.
Do not put `data-theme="dark"` on only the editor inside an otherwise light
page; that makes the editor look broken even though the host has chosen two
different themes. Put the attribute on the element that owns both the page
surface and VietaMath, then give that host matching colors:

```css
.course-editor[data-theme="light"] {
  background: #ffffff;
  color: #212529;
}

.course-editor[data-theme="dark"] {
  background: #1e2b2d;
  color: #f5f7f7;
}
```

To apply a host theme, override the variables on the VietaMath root and, where
needed, on its interactive math element. Package styles are injected at
runtime, so use `!important` when the host stylesheet is loaded first:

```css
.course-editor .vieta-root {
  --bg-primary: #ffffff !important;
  --bg-secondary: #f8f9fa !important;
  --text-primary: #212529 !important;
  --border-color: #dee2e6 !important;
  --brand-primary: #405d63 !important;
  --brand-primary-rgb: 64, 93, 99 !important;
}

.course-editor .vieta-root .interactive-mathml {
  --mm-caret: #004288 !important;
  --mm-selection: rgba(0, 123, 255, 0.2) !important;
  --mm-border-medium: rgba(0, 0, 0, 0.18) !important;
}
```

Read the complete variable reference in [theming.md](docs/theming.md). You can
also change both variable layers in the [hosted theme demo](https://liamhawtin.github.io/vieta-math/theme.html).

## Development

Use Node.js 20.19 or newer.

```sh
git clone https://github.com/liamhawtin/vieta-math.git
cd vieta-math
npm ci
npm test
npm run build
npm run build:examples
```

The root build rebuilds the internal LaTeX engine before bundling VietaMath.
Run `npm run pack:check` to inspect the files that would enter the npm package.

## License and contributing

VietaMath code is released under the MIT License. The rendering engine includes
modified KaTeX code under the MIT License; bundled fonts have separate licenses.
Read [NOTICE](NOTICE) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)
before redistributing the package.

Focused bug reports, tests, documentation improvements, and integration fixes
are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull
request.

## Maintainer wanted

Current maintainer: Liam Hawtin.

Interested in becoming a long-term maintainer or collaborator and helping
shape the project? Email liamhawtin@gmail.com.
