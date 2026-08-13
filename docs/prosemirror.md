# ProseMirror integration

The `vieta-math/prosemirror` entry adds inline VietaMath nodes to an editor you
own. It does not create a ProseMirror editor for you: your application still
chooses its schema, state, view, persistence format, and surrounding plugins.

## Install

Install VietaMath and the ProseMirror packages used by your editor. The example
below uses the basic schema and history plugin:

```sh
npm install vieta-math \
  prosemirror-history prosemirror-model prosemirror-schema-basic \
  prosemirror-state prosemirror-view
```

## Complete setup

There are five pieces to a working integration:

1. Add `vietaMathNodes` to your schema.
2. Add `vietaMathInputRulesPlugin(schema)`.
3. Add `vietaMathPlugin(schema)`.
4. Register `createVietaMathNodeView(VietaMath, options)`.
5. If you use shared tools, mount them once and pass the same elements to the
   node view.

```js
import { history } from "prosemirror-history";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { UIRegistry, VietaMath } from "vieta-math";
import {
  createVietaMathNodeView,
  vietaMathInputRulesPlugin,
  vietaMathNodes,
  vietaMathPlugin,
} from "vieta-math/prosemirror";

const toolbar = document.querySelector("#math-toolbar");
const symbolPad = document.querySelector("#symbol-pad");
const smartMenu = document.querySelector("#smart-menu");

UIRegistry.mountToolbar(toolbar);
UIRegistry.mountSymbolPad(symbolPad);
UIRegistry.mountSmartMenu(smartMenu);

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
    vieta_math_inline: createVietaMathNodeView(VietaMath, {
      toolbarContainer: toolbar,
      symbolPadContainer: symbolPad,
      smartMenuContainer: smartMenu,
    }),
  },
});

// When the surrounding view is removed:
view.destroy();
UIRegistry.unmountToolbar();
UIRegistry.unmountSymbolPad();
UIRegistry.unmountSmartMenu();
```

The shared tools are page-global. A new `UIRegistry.mount…` call for the same
tool replaces its previous mount. If your document has multiple math nodes,
pass the same tool elements to every node view.

## Node and persistence model

The added schema node is named `vieta_math_inline`. It stores these attributes:

| Attribute | Purpose |
| --- | --- |
| `id` | Persistent node identity. |
| `instanceId` | The active VietaMath instance identity for a rendered node. |
| `latex` | Internal editable LaTeX. Preserve it in a ProseMirror JSON document. |
| `vietaData` | Editor selection data used when restoring node state. |

The node is inline, atomic, selectable, and not draggable. Its DOM and
clipboard text use exported `$...$` LaTeX, while its ProseMirror JSON keeps the
internal `latex` attribute needed to restore the live editor. Do not replace
that stored attribute with a `getSanitizedLatex()` value unless you also verify
that the node can be edited again afterwards.

The VietaMath plugin supplies a Markdown-style clipboard path. Copying a
selection produces plain text with math as `$...$`; pasting plain text parses
that form back into inline math nodes. Test any additional clipboard or
Markdown plugin in your own editor, because another plugin may take precedence.

## Creating and leaving nodes

`vietaMathInputRulesPlugin(schema)` converts a completed `$latex$` sequence
into a node. It does not convert a leading dollar sign by itself.

For an explicit button or command, use `insertVietaMath`:

```js
import { insertVietaMath } from "vieta-math/prosemirror";

button.addEventListener("click", () => {
  insertVietaMath(schema, String.raw`\sqrt{x^2+y^2}`)(
    view.state,
    view.dispatch,
  );
  view.focus();
});
```

When `explicitLatex` is omitted, `insertVietaMath` uses the current text
selection. It returns a normal ProseMirror command: `true` when the schema has
the VietaMath node type, otherwise `false`.

`exitActiveVietaMath(view)` clears the active math caret and puts the document
selection immediately after that node. It returns `false` when no active
VietaMath node exists.

## Node-view options

Pass options only to `createVietaMathNodeView`, not directly to each rendered
node.

| Option | Purpose |
| --- | --- |
| `toolbarContainer` | Optional shared toolbar element or selector. |
| `symbolPadContainer` | Optional shared Symbol Pad element or selector. |
| `smartMenuContainer` | Optional shared Smart Menu element or selector. |
| `externalMethods` | Advanced methods forwarded to specialised VietaMath UI. Use only with a tested custom integration. |

The node view supplies its own internal `allowBoundaryExit`, selection bridge,
and raw-document update callback. A host should not duplicate that wiring.

## Keyboard behavior installed by the plugin

The plugin changes document behavior around a VietaMath node:

- `Tab` in the outer document runs the insert-math command.
- `Tab` inside an active math node is reserved for VietaMath’s Smart Menu.
- Arrow keys enter and leave an inline node at its boundaries.
- Backspace and Delete activate a neighbouring non-empty node before removing
  it; an empty node can be removed.
- Enter continues VietaMath editing when applicable, otherwise exits the
  active node. Ctrl/Cmd+Enter also exits it.

The plugin listens to document selection and pointer events while its
ProseMirror view lives. Always call `view.destroy()` when the host view is
removed.

## Export reference

| Export | Purpose |
| --- | --- |
| `vietaMathNodes` | Schema node spec map containing `vieta_math_inline`. |
| `vietaMathInputRulesPlugin(schema)` | `$latex$` input rule. |
| `vietaMathPlugin(schema)` | Keyboard, selection, paste, clipboard, and document integration. |
| `createVietaMathNodeView(VietaMath, options)` | Node-view factory for `nodeViews`. |
| `insertVietaMath(schema, explicitLatex?)` | Command that replaces the current selection with an inline node. |
| `exitActiveVietaMath(view)` | Leaves the active math node and moves selection after it. |
| `getVietaMathNodePosition(state, instanceId)` | Returns `{ pos, size }` for an existing rendered instance, or `null`. |
| `vietaMathKey` | Plugin key for `vietaMathPlugin`. |
| `vietaMathInputRulesKey` | Plugin key for `vietaMathInputRulesPlugin`. |
