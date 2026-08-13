import { registry } from "@liamhawtin/vieta-math";

export function getVietaMathNodePosition(state, instanceId) {
  if (!instanceId) return null;

  let foundPos = null;
  let foundNodeSize = null;

  state.doc.descendants((node, pos) => {
    if (
      node.type.name === "vieta_math_inline" &&
      node.attrs &&
      node.attrs.instanceId === instanceId
    ) {
      foundPos = pos;
      foundNodeSize = node.nodeSize;
      return false;
    }
    return true;
  });

  if (foundPos === null) return null;

  return { pos: foundPos, size: foundNodeSize };
}

export function insertVietaMath(schema, explicitLatex) {
  const type = schema.nodes.vieta_math_inline;
  if (!type) return () => false;

  return (state, dispatch) => {
    const { selection } = state;
    const { from, to } = selection;

    // Extract selected text
    const slice = selection.content();
    const selectedText =
      slice.content.size > 0
        ? slice.content.textBetween(0, slice.content.size, " ")
        : "";

    const latex = explicitLatex ?? selectedText;

    if (dispatch) {
      const node = type.create({
        id: `vieta-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        latex,
      });

      dispatch(
        state.tr
          .replaceRangeWith(from, to, node)
          .setMeta("insertVietaMath", true)
          .scrollIntoView()
      );
    }
    return true;
  };
}

export function exitActiveVietaMath(view) {
  const active = registry.getActive?.();
  if (!active || !active.isActive?.()) return false;

  active.clearEverything();

  const instanceId = registry.getActiveId?.();
  if (!instanceId) return true;

  const { state } = view;
  let foundPos = null;
  let foundSize = null;

  state.doc.descendants((node, pos) => {
    if (
      node.type.name === "vieta_math_inline" &&
      node.attrs &&
      node.attrs.instanceId === instanceId
    ) {
      foundPos = pos;
      foundSize = node.nodeSize;
      return false;
    }
    return true;
  });

  if (foundPos !== null && foundSize !== null) {
    const Sel = state.selection.constructor;
    view.dispatch(
      state.tr
        .setSelection(Sel.create(state.doc, foundPos + foundSize))
        .scrollIntoView()
    );
    view.focus();
  }

  return true;
}

export function ensureMathLineVisible(view) {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const caretRange = sel.getRangeAt(0).cloneRange();
  caretRange.collapse(true);

  let anchorRect = caretRange.getClientRects()[0] || null;

  let container =
    caretRange.startContainer instanceof Element
      ? caretRange.startContainer
      : caretRange.startContainer.parentElement;

  if (!container) return;
  // the selection might be inside a math node
  const mathWrapper = container.closest?.(".pm-vieta-math-wrapper");
  if (mathWrapper) {
    container = mathWrapper;
    anchorRect = mathWrapper.getClientRects()[0] || null;;
  }

  if (!anchorRect) return;

  container = container?.closest?.("p, li, div");
  if (!container || !view.dom.contains(container)) return;

  const range = document.createRange();
  range.selectNodeContents(container);

  const rects = Array.from(range.getClientRects());
  if (!rects.length) return;

  const anchorMidY = (anchorRect.top + anchorRect.bottom) / 2;
  const lineRects = rects.filter(
    r => r.top <= anchorMidY && anchorMidY <= r.bottom
  );

  if (!lineRects.length) return;

  let lineTop = Math.min(...lineRects.map(r => r.top));
  let lineBottom = Math.max(...lineRects.map(r => r.bottom));

  // Expand for ProseMirror math mounts
  for (const r of lineRects) {
    const x = (r.left + r.right) / 2;
    const y = (r.top + r.bottom) / 2;

    const el = document.elementFromPoint(x, y);
    const mathWrapper = el?.closest?.(".pm-vieta-math-wrapper");

    if (!mathWrapper) continue;

    const mount = mathWrapper.querySelector(".pm-vieta-math-mount");
    if (!mount) continue;

    const mountRect = mount.getBoundingClientRect();
    lineTop = Math.min(lineTop, mountRect.top);
    lineBottom = Math.max(lineBottom, mountRect.bottom);
  }

  const viewRect = view.dom.getBoundingClientRect();
  const lineTopRel = lineTop - viewRect.top;
  const lineBottomRel = lineBottom - viewRect.top;

  const visibleBottom = view.dom.clientHeight;

  if (lineTopRel < 0) {
    view.dom.scrollTop += lineTopRel;
  } else if (lineBottomRel > visibleBottom) {
    view.dom.scrollTop += lineBottomRel - visibleBottom;
  }
}
