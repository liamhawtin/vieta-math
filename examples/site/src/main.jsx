import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const pages = [
  ["standalone", "Standalone", "standalone.html"],
  ["prosemirror", "ProseMirror", "prosemirror.html"],
  ["theme", "Theming", "theme.html"],
];

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
    <header className="site-header"><a className="wordmark" href="./index.html">VietaMath</a><nav aria-label="Primary navigation">{pages.map(([key, label, href]) => <a className={key === page ? "active" : ""} href={`./${href}`} key={key}>{label}</a>)}<a href="https://github.com/liamhawtin/vieta-math">GitHub</a></nav></header>
    <main>{children}</main><footer><a href="https://github.com/liamhawtin/vieta-math">GitHub</a><a href="https://www.npmjs.com/package/vieta-math">npm</a><a href="https://github.com/liamhawtin/vieta-math/blob/main/LICENSE">License</a><a href="https://github.com/liamhawtin/vieta-math/blob/main/CONTRIBUTING.md">Contributing</a></footer>
  </div>;
}

function HomePreview() {
  const mount = useRef(null); const smartMenu = useRef(null); const editor = useRef(null);
  const [ready, setReady] = useState(false); const [latex, setLatex] = useState("");
  const systemTheme = useSystemTheme();
  useEffect(() => {
    let active = true;
    let UIRegistry;
    void import("vieta-math").then(({ UIRegistry: registry, VietaMath }) => {
      if (!active) return;
      UIRegistry = registry;
      UIRegistry.mountSmartMenu(smartMenu.current);
      editor.current = new VietaMath(mount.current, { initialContent: String.raw`\int_0^1 x^2\,dx`, focusOnInit: false, smartMenuContainer: smartMenu.current, onChange() { setLatex(editor.current?.getSanitizedLatex() ?? ""); } });
      setLatex(editor.current.getSanitizedLatex());
      setReady(true);
    });
    return () => { active = false; editor.current?.destroy(); UIRegistry?.unmountSmartMenu(); };
  }, []);
  return <section className={`try-editor site-${systemTheme}`} data-theme={systemTheme} id="try-editor" aria-labelledby="try-editor-title"><div className="try-editor-heading"><div><p className="eyebrow">Try the interaction</p><h2 id="try-editor-title">Start with the expression.</h2></div><p>Type directly, then press <kbd>Tab</kbd> to search symbols.</p></div><div ref={smartMenu} /><div ref={mount} className="math-mount preview-mount" /><div className="preview-footer"><span aria-live="polite">{ready ? `LaTeX: ${latex}` : "Loading editor…"}</span><a href="./standalone.html">Open the full standalone demo <span aria-hidden="true">→</span></a></div></section>;
}

function ThemeGuide({ dark }) {
  const hostValues = dark
    ? `.course-editor[data-theme="dark"] {\n  background: #1e2b2d;\n  color: #f5f7f7;\n}`
    : `.course-editor[data-theme="light"] {\n  background: #ffffff;\n  color: #212529;\n}`;
  const uiValues = dark
    ? `.course-editor .vieta-root {\n  --bg-primary: #1e2b2d !important;\n  --text-primary: #f5f7f7 !important;\n  --border-color: rgba(255,255,255,.2) !important;\n}`
    : `.course-editor .vieta-root {\n  --bg-primary: #ffffff !important;\n  --text-primary: #212529 !important;\n  --border-color: #dee2e6 !important;\n}`;
  const mathValues = dark
    ? `.course-editor .vieta-root .interactive-mathml {\n  --mm-text: #f5f7f7 !important;\n  --mm-caret: #a7c2c8 !important;\n  --mm-selection: rgba(167,194,200,.3) !important;\n}`
    : `.course-editor .vieta-root .interactive-mathml {\n  --mm-text: #212529 !important;\n  --mm-caret: #004288 !important;\n  --mm-selection: rgba(0,123,255,.2) !important;\n}`;
  return <section className="theme-guide" aria-labelledby="theme-guide-title"><div className="theme-guide-heading"><div><p className="eyebrow">The working pattern</p><h2 id="theme-guide-title">Style the host and editor together.</h2></div><p>Previewing {dark ? "dark" : "light"} host values.</p></div><div className="theme-rule-grid"><article className="theme-rule-card"><h3>1. Host surface</h3><p>Your application owns the background and chooses the theme.</p><pre><code>{hostValues}</code></pre></article><article className="theme-rule-card"><h3>2. Editor UI</h3><p>Override the VietaMath surface, text, and border variables.</p><pre><code>{uiValues}</code></pre></article><article className="theme-rule-card"><h3>3. Math interaction</h3><p>Set caret and selection values on the math element itself.</p><pre><code>{mathValues}</code></pre></article></div><aside className="theme-warning"><strong>Browser preference is not a host theme.</strong><p>A light site in a dark-preference browser should keep VietaMath light. Set <code>data-theme</code> only where the surrounding surface changes too.</p></aside><a className="theme-reference" href="https://github.com/liamhawtin/vieta-math/blob/main/docs/theming.md">Read the complete variable reference <span aria-hidden="true">→</span></a></section>;
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
      editor.current = new VietaMath(mount.current, { initialContent: String.raw`\int_0^1 x^2\,dx`, focusOnInit: true, symbolPadContainer: symbolPad.current, smartMenuContainer: smartMenu.current, onChange() { setLatex(editor.current?.getSanitizedLatex() ?? ""); } });
      setLatex(editor.current.getSanitizedLatex());
      setReady(true);
    });

    return () => {
      active = false;
      editor.current?.destroy();
      UIRegistry?.unmountSymbolPad();
      UIRegistry?.unmountSmartMenu();
    };
  }, []);
  const content = <><div className="demo-toolbar"><button disabled={!ready} onClick={() => editor.current?.setLatex(String.raw`\sum_{k=1}^{n} k^2`)}>Load a sum</button><button disabled={!ready} onClick={() => setLatex(editor.current?.getSanitizedLatex() ?? "")}>Show LaTeX</button></div><div ref={smartMenu} /><div ref={mount} className="math-mount" /><p className="help">Press <kbd>Tab</kbd> while editing to open the symbol menu.</p><p className="status">Current LaTeX</p><pre>{latex || (ready ? "Start editing the expression above." : "Loading editor…")}</pre><details className="optional-tools"><summary>Optional shared Symbol Pad</summary><p>Hosts can mount the Symbol Pad once and pass its container to every editor in the view.</p><div ref={symbolPad} className="symbol-mount" /></details></>;
  if (!themed) return <section className={`demo-card site-${systemTheme}`} data-theme={systemTheme}>{content}</section>;
  return <section className={`theme-demo ${dark ? "theme-dark" : "theme-light"}`} data-theme={dark ? "dark" : "light"}><div className="demo-toolbar"><button onClick={() => setDark(v => !v)}>Use {dark ? "light" : "dark"} values</button></div>{content}<ThemeGuide dark={dark} /></section>;
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
  return <section className={`demo-card site-${systemTheme}`} data-theme={systemTheme}><div className="demo-toolbar"><button disabled={!ready} onClick={() => { const v = viewRef.current; if (v) commands.current?.insertVietaMath(v.state.schema, String.raw`\sqrt{x^2+y^2}`)(v.state, v.dispatch); }}>Insert math</button><button disabled={!ready} onClick={() => viewRef.current && commands.current?.exitActiveVietaMath(viewRef.current)}>Exit active math</button></div><p className="help">Type <code>$x^2$</code> to make an inline math node. Arrow keys enter and leave an active node.</p><div ref={smartMenu} /><div ref={host} className="prosemirror-mount" /><details className="demo-details"><summary>Inspect document text</summary><pre>{text || (ready ? "The document is empty." : "Loading editor…")}</pre></details><details className="optional-tools"><summary>Optional shared Symbol Pad</summary><p>Mount one pad for the surrounding editor view, then pass its container to VietaMath’s node view.</p><div ref={symbolPad} className="symbol-mount" /></details></section>;
}

function Home() { return <><section className="hero"><div className="product-provenance"><img src="./vieta-space-logo.svg" alt="VietaSpace" /><span>VietaMath by VietaSpace</span></div><p className="eyebrow">Open-source browser math editor</p><h1>Write mathematics as mathematics.</h1><p>VietaMath gives structured expressions a real cursor, keyboard navigation, and clean LaTeX export—inside a standalone field or a ProseMirror document.</p><div className="actions"><a href="#try-editor">Try the editor</a><a href="https://github.com/liamhawtin/vieta-math#install">View installation</a></div></section><HomePreview /><section className="integration-paths" aria-labelledby="paths-title"><div><p className="eyebrow">Choose an integration</p><h2 id="paths-title">Use the editor where your work lives.</h2></div><div className="path-grid"><a href="./standalone.html"><span>01</span><h3>Standalone</h3><p>A focused math field, with optional shared tools and LaTeX export.</p><strong>Explore standalone <span aria-hidden="true">→</span></strong></a><a href="./prosemirror.html"><span>02</span><h3>ProseMirror</h3><p>Inline math nodes that are part of an editable document.</p><strong>Explore ProseMirror <span aria-hidden="true">→</span></strong></a><a href="./theme.html"><span>03</span><h3>Theming</h3><p>Explicit host colors and CSS variables that match the application around it.</p><strong>Explore theming <span aria-hidden="true">→</span></strong></a></div></section><section className="product-preview"><div><p className="eyebrow">VietaSpace workflow</p><h2>See the same editing model in use.</h2><p>A short VietaSpace walkthrough of building and explaining an integral in the browser.</p></div><video controls muted loop playsInline preload="metadata" poster="./vieta-math-demo-poster.png"><source src="./vieta-math-demo.mp4" type="video/mp4" />Your browser does not support this video.</video></section><p className="device-boundary">Built for desktop-class browsers and a physical keyboard. Phones are not supported.</p></> }
function App() { const page = document.body.dataset.page; let child = <Home />; if (page === "standalone") child = <><section className="page-intro"><p className="eyebrow">Standalone input</p><h1>A math field that belongs to your application.</h1><p>Try editing and exporting one expression, then inspect the optional shared tools a host can mount.</p></section><Standalone /></>; if (page === "theme") child = <><section className="page-intro"><p className="eyebrow">Theming contract</p><h1>Make the editor match a real host.</h1><p>VietaMath follows explicit host theme values—not a browser preference alone.</p></section><Standalone themed /></>; if (page === "prosemirror") child = <><section className="page-intro"><p className="eyebrow">ProseMirror integration</p><h1>Inline math that stays part of the document.</h1><p>Insert a node, edit inside it, then continue navigating the surrounding text.</p></section><ProseMirrorDemo /></>; return <Shell>{child}</Shell>; }
createRoot(document.querySelector("#root")).render(<App />);
