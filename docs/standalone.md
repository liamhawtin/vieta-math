# Standalone VietaMath

Use `VietaMath` when an expression belongs in one place in your application:
a form field, a problem editor, or a custom document surface. It mounts into a
normal browser element; your application does not need to be written in React.

## Smallest useful setup

Create the editor after its mount exists in the browser. Keep the instance so
you can export and destroy it later.

```js
import { VietaMath } from "vieta-math";

const mount = document.querySelector("#answer");
const output = document.querySelector("#latex-output");

let math;
function updateExport() {
  output.value = math.getSanitizedLatex();
}

math = new VietaMath(mount, {
  initialContent: String.raw`\int_0^1 x^2\,dx`,
  onChange: updateExport,
});

updateExport();

// When the host view is removed:
math.destroy();
```

## Export LaTeX, do not expose editor state

VietaMath uses an editable internal form while the cursor and structure are
being managed. That form can contain layout commands such as `\mkern{3mu}`.
It is not the value to show a person or send to another system.

| Method or value | Use it for |
| --- | --- |
| `onChange(rawLatex)` | Reacting to an edit inside the host. Its first value is internal editor state. |
| `getLatex()` | Reading internal state for a tightly coupled integration. Do not display or export it. |
| `getSanitizedLatex()` | Copying, saving, showing a user, or sending LaTeX outside VietaMath. |

The callback is deliberately separate from export. Call
`getSanitizedLatex()` on the instance when your host needs an exported value,
as in the example above.

## Constructor options

```js
new VietaMath(mountOrSelector, options)
```

`mountOrSelector` is either an `HTMLElement` or a selector string. A missing
editor mount throws immediately.

| Option | Default | What it does |
| --- | --- | --- |
| `initialContent` | `""` | LaTeX loaded when the editor is created. It is expanded into VietaMath’s internal form. |
| `focusOnInit` | `false` | Requests focus when the editor first renders. |
| `instanceId` | generated | Stable identifier used by the page-wide active-editor registry. Supply one only when a host needs to associate an editor with its own record. |
| `onChange(rawLatex)` | none | Called after a user edit produces a new internal expression. Use `getSanitizedLatex()` for human-facing output. |
| `toolbarContainer` | `null` | Element or selector for the optional shared toolbar. |
| `symbolPadContainer` | `null` | Element or selector for the optional shared Symbol Pad. |
| `smartMenuContainer` | `null` | Element or selector for the optional shared Smart Menu. |
| `allowBoundaryExit` | `false` | Lets an embedded editor hand navigation back to a surrounding editor. The ProseMirror node view sets this itself; ordinary standalone hosts should leave it off. |
| `externalActions` | `null` | Advanced hooks for a custom embedded host. See below; most integrations should not use these. |

Selector strings are resolved once, during construction. The optional shared UI
containers must therefore already exist. A missing optional container simply
disables that UI; it does not throw.

## Shared toolbar, Symbol Pad, and Smart Menu

The optional UI is mounted separately from each editor:

```js
import { UIRegistry, VietaMath } from "vieta-math";

const toolbar = document.querySelector("#math-toolbar");
const symbolPad = document.querySelector("#symbol-pad");
const smartMenu = document.querySelector("#smart-menu");

UIRegistry.mountToolbar(toolbar);
UIRegistry.mountSymbolPad(symbolPad);
UIRegistry.mountSmartMenu(smartMenu);

const math = new VietaMath("#answer", {
  toolbarContainer: toolbar,
  symbolPadContainer: symbolPad,
  smartMenuContainer: smartMenu,
});

// When the host view is removed:
math.destroy();
UIRegistry.unmountToolbar();
UIRegistry.unmountSymbolPad();
UIRegistry.unmountSmartMenu();
```

There is one shared toolbar, Symbol Pad, and Smart Menu per page. Mounting one
of these in a new container replaces its previous mount. Pass the exact same
containers to every live editor that can use them; that lets VietaMath preserve
its active editor while focus moves to a shared control.

The Smart Menu measures the caret against the viewport and positions itself.
Mount it in an ordinary empty element. Do not put it in a host-specific
absolute-position wrapper or calculate its position in your own CSS.

## Instance methods

| Method | Use |
| --- | --- |
| `getSanitizedLatex()` | Returns exported LaTeX. This is the normal read method for applications. |
| `getLatex()` | Returns editable internal LaTeX. Use only when a surrounding integration stores the editor’s internal state. |
| `setLatex(latex, pushToStack = false, expand = true)` | Replaces the expression. Input is expanded by default. `pushToStack` causes the change callback to run; `expand = false` is for restoring already-expanded internal state. |
| `focus()` / `blur()` | Move focus into or out of the editor. |
| `destroy()` | Unmounts the editor, removes listeners, and unregisters its instance. Call it when the host view goes away. |

`getStores()` and the exported `registry` exist for the package’s own rich
integrations. They are not the normal standalone API and should not be the
starting point for a new host integration.

## Advanced embedded hooks

`externalActions` is used by the ProseMirror node view and other tightly coupled
hosts. It is not needed for a form-style editor.

| Hook | Current behavior |
| --- | --- |
| `onCaretInserted()` | Runs after VietaMath inserts a caret into its rendered math. |
| `onSetSelection(selection)` | Runs when text selection changes. The value has `active` and `range: { start, end }` fields. |
| `insertSymbol(expression)` | Receives the complete next internal expression instead of letting VietaMath apply it itself. A host using it must update its own document and restore the editor state. |
| `methods` | Extra actions consumed by specialised package UI. It is not a general application-extension API. |

Use these only with a browser integration test. In particular, do not combine
them with the ProseMirror node view’s own wiring unless you understand that
node view’s lifecycle.
