import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { UIRegistry, VietaMath } from "@liamhawtin/vieta-math";
import "./styles.css";

function StandaloneExample() {
  const editorRef = useRef(null);
  const symbolPadRef = useRef(null);
  const smartMenuRef = useRef(null);
  const instanceRef = useRef(null);
  const [latex, setLatex] = useState("");

  useEffect(() => {
    UIRegistry.mountSymbolPad(symbolPadRef.current);
    UIRegistry.mountSmartMenu(smartMenuRef.current);

    instanceRef.current = new VietaMath(editorRef.current, {
      initialContent: String.raw`\int_0^1 x^2\,dx`,
      focusOnInit: true,
      onChange: setLatex,
    });
    setLatex(instanceRef.current.getLatex());

    return () => {
      instanceRef.current?.destroy();
      UIRegistry.unmountSymbolPad();
      UIRegistry.unmountSmartMenu();
    };
  }, []);

  const showExport = () => {
    setLatex(instanceRef.current?.getSanitizedLatex() ?? "");
  };

  return (
    <main>
      <h1>Standalone VietaMath input</h1>
      <div ref={smartMenuRef} />
      <div ref={editorRef} className="editor" />
      <button type="button" onClick={showExport}>Show export LaTeX</button>
      <pre>{latex}</pre>
      <div ref={symbolPadRef} />
    </main>
  );
}

createRoot(document.querySelector("#root")).render(<StandaloneExample />);
