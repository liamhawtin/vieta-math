# VietaMath

VietaMath is an interactive math editor for the web. It stores an editable
LaTeX expression, renders it as MathML, and keeps source ranges on the rendered
nodes. This lets a user move a caret through fractions, scripts, matrices,
limits, delimiters, and other mathematical structures.

The project supports two uses:

- a standalone math input;
- inline math nodes inside a ProseMirror document.

VietaMath was developed privately as part of VietaSpace. It is now being
prepared for community use. The Notes service and its backend are separate and
are not part of this repository.

## Status

The public release is under preparation. The npm package name is
`@liamhawtin/vieta-math`. Version 1.1.0 has not been published yet.

## Install

```sh
npm install @liamhawtin/vieta-math react react-dom
```

For the ProseMirror integration, install the ProseMirror packages used by your
editor as well:

```sh
npm install prosemirror-history prosemirror-inputrules prosemirror-keymap \
  prosemirror-model prosemirror-state prosemirror-view
```

VietaMath needs a browser DOM. Create editor instances in client-side code or
inside a React effect.

## Standalone input

```js
import { VietaMath, UIRegistry } from "@liamhawtin/vieta-math";

const editor = new VietaMath(document.querySelector("#math-input"), {
  initialContent: String.raw`\int_0^1 x^2\,dx`,
  focusOnInit: true,
  onChange(rawLatex) {
    console.log(rawLatex);
  },
});

UIRegistry.mountSymbolPad(document.querySelector("#symbol-pad"));
UIRegistry.mountSmartMenu(document.querySelector("#smart-menu"));

const latexForExport = editor.getSanitizedLatex();

// Later:
editor.destroy();
UIRegistry.unmountSymbolPad();
UIRegistry.unmountSmartMenu();
```

`getLatex()` returns VietaMath's editable internal form.
`getSanitizedLatex()` returns cleaner LaTeX for copying, saving outside the
editor, or sending to another tool. See the complete React example in
[`examples/standalone`](examples/standalone).

## ProseMirror integration

Add `vietaMathNodes` to your schema. Install the VietaMath plugin and input
rules. Register the node view when you construct `EditorView`.

```js
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { history } from "prosemirror-history";
import { VietaMath } from "@liamhawtin/vieta-math";
import {
  createVietaMathNodeView,
  vietaMathInputRulesPlugin,
  vietaMathNodes,
  vietaMathPlugin,
} from "@liamhawtin/vieta-math/prosemirror";

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

Type `$` followed by a space to insert a math node, or call
`insertVietaMath(schema)` from a command or button. The example in
[`examples/prosemirror`](examples/prosemirror) includes shared symbol-pad and
smart-menu containers. It follows the integration used by VietaSpace Notes and
Leibniz without their product code.

## LaTeX processing

Input LaTeX goes through `expandString` in the internal LaTeX math engine. This
normalizes macros and structures into a stable editing form. Among other jobs,
it normalizes delimiters and arrays, adds explicit empty script positions where
the editor needs them, and keeps editor markers deterministic.

The renderer is a modified KaTeX 0.16.18 engine. It creates MathML with
`data-range-start` and `data-range-end` attributes. `EditorStore` uses those
ranges to map pointer and keyboard actions back to the LaTeX string.

When content is copied or exported, `exportString` performs the reverse-facing
cleanup. It expands editor-only export macros, joins adjacent font commands,
normalizes arrays, and removes formatting artifacts. It produces LaTeX intended
for people and other math tools.

The main responsibilities in the code are:

- `VietaMath` owns one mounted editor and its public lifecycle.
- `RootStore` creates the stores for that editor instance.
- `MathStore` owns the LaTeX string and structural insertions.
- `EditorStore` owns selection, caret movement, editing commands, paste, copy,
  and interaction with rendered MathML.
- `SymbolStore` owns symbol-pad data, recent symbols, and symbol preferences.
- `TeXProcessor` handles editor-side LaTeX inspection and array changes.
- `latex-math-engine` parses, normalizes, renders, and exports LaTeX.

## Development

Use Node.js 20.19 or newer.

```sh
git clone https://github.com/liamhawtin/vieta-math.git
cd vieta-math
npm ci
npm test
npm run build
```

The root install includes the internal engine workspace. The root build always
rebuilds that engine before bundling VietaMath. It does not depend on another
local repository or a prebuilt ignored directory.

Build the examples after the package:

```sh
npm run build
npm run build:examples
```

Run `npm run pack:check` to inspect the files that would enter the npm package.

## License

VietaMath code is released under the MIT License. The rendering engine contains
modified KaTeX code under the MIT License. Bundled Latin Modern and Libertinus
font material uses separate font licenses. Read [NOTICE](NOTICE) and
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) before redistributing the
package.

## Contributing

Bug reports, focused fixes, tests, and documentation improvements are welcome.
See [CONTRIBUTING.md](CONTRIBUTING.md). The project would also benefit from
people interested in long-term maintenance of math editing, MathML, and LaTeX
processing.
