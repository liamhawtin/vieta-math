import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const pages = {
  home: ["VietaMath", "index.html"],
  standalone: ["Standalone", "standalone.html"],
  theme: ["Themes", "theme.html"],
  prosemirror: ["ProseMirror", "prosemirror.html"],
};

function useSystemTheme() {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const [theme, setTheme] = useState(query.matches ? "dark" : "light");

  useEffect(() => {
    const update = event => setTheme(event.matches ? "dark" : "light");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [query]);

  return theme;
}

function Shell({ children }) {
  const page = document.body.dataset.page;
  return <div className="site-shell">
    <header className="site-header"><a className="wordmark" href="./index.html"><img src="./favicon-64x64.png" alt="" /><span>VietaMath</span></a><nav>{Object.entries(pages).slice(1).map(([key, [label, href]]) => <a className={key === page ? "active" : ""} href={`./${href}`} key={key}>{label}</a>)}</nav></header>
    <main>{children}</main><footer>Browser math editing for advanced work. <a href="https://github.com/liamhawtin/vieta-math">Source</a> · <a href="https://www.npmjs.com/package/vieta-math">npm</a></footer>
  </div>;
}

function Standalone({ themed = false }) {
  const mount = useRef(null); const symbolPad = useRef(null); const smartMenu = useRef(null); const editor = useRef(null);
  const [latex, setLatex] = useState(""); const [dark, setDark] = useState(false); const [ready, setReady] = useState(false);
  const systemTheme = useSystemTheme();
  useEffect(() => {
    let active = true;
    let UIRegistry;

    void import("vieta-math").then(({ UIRegistry: registry, VietaMath }) => {
      if (!active) return;
      UIRegistry = registry;
      UIRegistry.mountSymbolPad(symbolPad.current);
      UIRegistry.mountSmartMenu(smartMenu.current);
      editor.current = new VietaMath(mount.current, { initialContent: String.raw`\int_0^1 x^2\,dx`, focusOnInit: true, symbolPadContainer: symbolPad.current, smartMenuContainer: smartMenu.current, onChange: setLatex });
      setLatex(editor.current.getLatex());
      setReady(true);
    });

    return () => {
      active = false;
      editor.current?.destroy();
      UIRegistry?.unmountSymbolPad();
      UIRegistry?.unmountSmartMenu();
    };
  }, []);
  const content = <><div className="demo-toolbar"><button disabled={!ready} onClick={() => editor.current?.setLatex(String.raw`\sum_{k=1}^{n} k^2`)}>Load a sum</button><button disabled={!ready} onClick={() => setLatex(editor.current?.getSanitizedLatex() ?? "")}>Show export</button><button disabled={!ready} onClick={() => editor.current?.blur()}>Blur editor</button></div><div ref={smartMenu} /><div ref={mount} className="math-mount" /><p className="help">Press Tab while editing to open the symbol menu.</p><p className="status">Current LaTeX</p><pre>{latex || (ready ? "Start editing the expression above." : "Loading editor…")}</pre><div ref={symbolPad} className="symbol-mount" /></>;
  if (!themed) return <section className={`demo-card site-${systemTheme}`} data-theme={systemTheme}>{content}</section>;
  return <section className={`theme-demo ${dark ? "theme-dark" : "theme-light"}`} data-theme={dark ? "dark" : "light"}><div className="demo-toolbar"><span>Override preview</span><button onClick={() => setDark(v => !v)}>Use {dark ? "light" : "dark"} values</button></div>{content}<aside><strong>Two layers</strong><code>.vieta-root</code><code>.vieta-root .interactive-mathml</code><p>The CSS values here use the same muted-teal visual language as the demo site.</p></aside></section>;
}

function ProseMirrorDemo() {
  const host = useRef(null); const symbolPad = useRef(null); const smartMenu = useRef(null); const viewRef = useRef(null); const [text, setText] = useState(""); const [ready, setReady] = useState(false);
  const systemTheme = useSystemTheme();
  const commands = useRef(null);
  useEffect(() => {
    let active = true;
    let UIRegistry;

    void Promise.all([
      import("vieta-math"),
      import("vieta-math/prosemirror"),
      import("prosemirror-history"),
      import("prosemirror-model"),
      import("prosemirror-schema-basic"),
      import("prosemirror-state"),
      import("prosemirror-view"),
      import("prosemirror-view/style/prosemirror.css"),
    ]).then(([{ UIRegistry: registry, VietaMath }, prosemirror, { history }, { Schema }, { schema: basicSchema }, { EditorState }, { EditorView }]) => {
      if (!active) return;
      UIRegistry = registry;
      const schema = new Schema({ nodes: basicSchema.spec.nodes.append(prosemirror.vietaMathNodes), marks: basicSchema.spec.marks });
      const state = EditorState.create({ schema, plugins: [prosemirror.vietaMathInputRulesPlugin(schema), prosemirror.vietaMathPlugin(schema), history()] });
      const view = new EditorView(host.current, { state, nodeViews: { vieta_math_inline: prosemirror.createVietaMathNodeView(VietaMath, { symbolPadContainer: symbolPad.current, smartMenuContainer: smartMenu.current }) }, dispatchTransaction(tr) { view.updateState(view.state.apply(tr)); setText(view.state.doc.textContent); } });
      commands.current = prosemirror;
      viewRef.current = view;
      UIRegistry.mountSymbolPad(symbolPad.current);
      UIRegistry.mountSmartMenu(smartMenu.current);
      setText(view.state.doc.textContent);
      setReady(true);
    });

    return () => {
      active = false;
      viewRef.current?.destroy();
      UIRegistry?.unmountSymbolPad();
      UIRegistry?.unmountSmartMenu();
    };
  }, []);
  return <section className={`demo-card site-${systemTheme}`} data-theme={systemTheme}><div className="demo-toolbar"><button disabled={!ready} onClick={() => { const v = viewRef.current; if (v) commands.current?.insertVietaMath(v.state.schema, String.raw`\sqrt{x^2+y^2}`)(v.state, v.dispatch); }}>Insert math</button><button disabled={!ready} onClick={() => viewRef.current && commands.current?.exitActiveVietaMath(viewRef.current)}>Exit active math</button></div><p className="help">Type <code>$x^2$</code> to make an inline math node. Arrow keys enter and leave an active node.</p><div ref={smartMenu} /><div ref={host} className="prosemirror-mount" /><p className="status">Document text</p><pre>{text || (ready ? "The document is empty." : "Loading editor…")}</pre><div ref={symbolPad} className="symbol-mount" /></section>;
}

function Home() { return <><section className="hero"><img className="brand-lockup" src="./vieta-space-logo.svg" alt="VietaSpace" /><p className="eyebrow">Open-source browser math editing</p><h1>Work directly with advanced mathematical structure.</h1><p>These demos show VietaMath as a standalone input, a themeable component, and inline ProseMirror content.</p><p><strong>Desktop browser and physical keyboard required.</strong> Phones are not supported in this release.</p><div className="actions"><a href="./standalone.html">Try the editor</a><a href="./prosemirror.html">See ProseMirror</a></div></section><section className="overview"><a href="./standalone.html"><h2>Standalone</h2><p>Mount an editor, optional shared UI, and export clean LaTeX.</p></a><a href="./theme.html"><h2>Theme variables</h2><p>Inspect the two CSS-variable layers in a live host theme.</p></a><a href="./prosemirror.html"><h2>ProseMirror</h2><p>Insert, edit, navigate, and serialize inline math nodes.</p></a></section><section className="product-preview"><div><p className="eyebrow">VietaSpace in use</p><h2>Build and explain mathematics in the browser.</h2><p>This short walkthrough shows a VietaSpace math workflow built around the same editing model.</p></div><video controls muted loop playsInline preload="metadata" poster="./favicon-256x256.png"><source src="./vieta-math-demo.mp4" type="video/mp4" />Your browser does not support this video.</video></section></> }
function App() { const page = document.body.dataset.page; let child = <Home />; if (page === "standalone") child = <><section className="page-intro"><p className="eyebrow">Standalone input</p><h1>A focused math field with optional shared tools.</h1></section><Standalone /></>; if (page === "theme") child = <><section className="page-intro"><p className="eyebrow">Theme contract</p><h1>Override variables without replacing editor behavior.</h1></section><Standalone themed /></>; if (page === "prosemirror") child = <><section className="page-intro"><p className="eyebrow">ProseMirror integration</p><h1>Inline math that belongs in the document.</h1></section><ProseMirrorDemo /></>; return <Shell>{child}</Shell>; }
createRoot(document.querySelector("#root")).render(<App />);
