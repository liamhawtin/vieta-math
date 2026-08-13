import { Plugin, PluginKey } from "prosemirror-state";
import { isHistoryTransaction } from "prosemirror-history";
import { keydownHandler } from "prosemirror-keymap";
import { MarkdownSerializer, defaultMarkdownSerializer, MarkdownParser, defaultMarkdownParser } from "prosemirror-markdown";
import MarkdownIt from "markdown-it";
import lme from "lme";
import { registry } from "@liamhawtin/vieta-math";
import { insertVietaMath, exitActiveVietaMath, ensureMathLineVisible, getVietaMathNodePosition } from './vietaMathCommands'

const isFirefox = /firefox/i.test(navigator.userAgent);

const md = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    vieta_math_inline(state, node) {
      state.write(node.type.spec.leafText?.(node) ?? "");
    },
  },
  defaultMarkdownSerializer.marks
);

function writeMarkdownToClipboard(view, event, isCut) {
  if (!event.clipboardData) return false;

  const slice = view.state.selection.content();
  const node =
    view.state.schema.topNodeType.createAndFill(null, slice.content) ||
    view.state.schema.nodes.paragraph?.createAndFill(null, slice.content) ||
    view.state.schema.topNodeType.createAndFill();

  event.clipboardData.setData("text/plain", md.serialize(node));

  if (isCut) {
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView());
  }

  event.preventDefault();
  return true;
}

function shortId8() {
  return Math.random().toString(36).padEnd(10, '0').slice(2, 10);
}

function addVietaInlineMath(md) {
  md.inline.ruler.after("escape", "vieta_math_inline", function (state, silent) {
    const start = state.pos;

    if (state.src[start] !== "$") return false;

    // Ignore escaped \$
    if (start > 0 && state.src[start - 1] === "\\") return false;

    let pos = start + 1;

    while (pos < state.src.length && state.src[pos] !== "$") {
      pos++;
    }

    if (pos >= state.src.length) return false;

    if (!silent) {
      const token = state.push("vieta_math_inline", "", 0);
      token.content = state.src.slice(start + 1, pos);
    }

    state.pos = pos + 1;
    return true;
  });
}

function createMarkdownParser(schema) {
  const md = new MarkdownIt("zero", {
    html: false,
    breaks: true
  }).enable([
    "emphasis",
    "heading",
    "hr"
  ]);

  addVietaInlineMath(md);

  return new MarkdownParser(schema, md, {
    ...defaultMarkdownParser.tokens,

    vieta_math_inline: {
      node: "vieta_math_inline",
      getAttrs: function (tok) {
        return {
          latex: lme.expandString(tok.content),
          instanceId: "vieta-math-" + shortId8()
        };
      }
    }
  });
}

function swallowWhenMathCaret(view, event) {
  const controller = registry.getActive?.();
  if (!controller?.isActive?.()) return false;

  event.preventDefault();
  return true;
}

let pendingVerticalSnap = null; // { x, originY }

let viewRef = null;

let suppressNextSelectionInsert = false;

let cachedSelectionCtor = null;

export const vietaMathKey = new PluginKey("vietaMathKeymap");

// rename to vietaMathPlugin (rename the file too)
export const vietaMathPlugin = (schema) => {
  const markdownParser = createMarkdownParser(schema);
  const handleKeys = keydownHandler({
    "Tab": insertVietaMath(schema),
  });
  return new Plugin({
    key: vietaMathKey,

    view(view) {
      viewRef = view;

      const dummy = registry.getDummyRootStore();
      dummy.externalStore.setInsertSymbol((initLatex) => {
        return insertVietaMath(
          view.state.schema,
          initLatex
        )(view.state, view.dispatch);
      });

      // this is to prevent the action of a pointer down
      // chaning the selection.
      const handlePointerDown = (e) => {
        const target = e.target;
        if (!(target instanceof Node)) return;

        const wrapper = target.closest?.(".pm-vieta-math-wrapper");
        if (!wrapper) return;

        viewRef?.dom
          .querySelectorAll(".pm-vieta-math-wrapper.fake-caret")
          .forEach(el => el.classList.remove("fake-caret"));

        suppressNextSelectionInsert = true;
      };

      const handleSelectionChange = (e) => {

        if (!pendingVerticalSnap && viewRef?.dom.classList.contains("pm-hide-caret")) {
          viewRef.dom.classList.remove("pm-hide-caret");
        }

        if (pendingVerticalSnap) {
          const snap = pendingVerticalSnap;
          pendingVerticalSnap = null;

          const sel = document.getSelection();

          if (sel && sel.anchorNode) {
            let headPos = null;

            try {
              headPos = viewRef.posAtDOM(sel.anchorNode, sel.anchorOffset);
            } catch {
              headPos = null;
            }

            if (headPos != null) {
              const { x, originY } = snap;
              const coords = viewRef.coordsAtPos(headPos);

              if (coords.top > originY + 0.5) {
                const hit = viewRef.posAtCoords({
                  left: x,
                  top: coords.top + 1,
                });

                if (hit) {
                  suppressNextSelectionInsert = true;
                  const Sel = viewRef.state.selection.constructor;

                  viewRef.dispatch(
                    viewRef.state.tr
                      .setSelection(
                        Sel.near(viewRef.state.doc.resolve(hit.pos), 1)
                      )
                      .setMeta("ignoreFilterTransaction", true)
                  );
                }
              }
            }
          }
        }

        registry.reconcileActive();

        viewRef.dom
          .querySelectorAll(".pm-vieta-math-wrapper.vm-selected")
          .forEach(el => {
            el.classList.remove("vm-selected");
            el.contentEditable = "false";
          });

        const sel = document.getSelection();
        if (!sel?.anchorNode) return;

        let from, to;
        if (!sel.isCollapsed) {
          try {
            const anchorPos = viewRef.posAtDOM(sel.anchorNode, sel.anchorOffset);
            const focusPos  = viewRef.posAtDOM(sel.focusNode, sel.focusOffset);

            from = Math.min(anchorPos, focusPos);
            to   = Math.max(anchorPos, focusPos);

            viewRef.state.doc.nodesBetween(from, to, (node) => {
              if (node.type.name !== "vieta_math_inline") return true;
              const instanceId = node.attrs?.instanceId;
              if (!instanceId) return true;
              const wrapper = viewRef.dom.querySelector(
                `.pm-vieta-math-wrapper[data-instance-id="${instanceId}"]`
              );
              if (wrapper) {
                wrapper.classList.add("vm-selected");
                // needs to be contenteditable true for safari
                wrapper.contentEditable = "true";
              }
              return true;
            });

          } catch {
          }
        } else {

          // Ignore selections outside this ProseMirror view
          const anchor = sel.anchorNode.parentElement;;
          if (!view.dom.contains(anchor)) return;

          // Find enclosing VietaMath wrapper, if any
          const wrapper = anchor.closest?.(".pm-vieta-math-wrapper");
          if (!wrapper) {
            registry.clearActive();
            return;
          }

          const instanceId = wrapper.getAttribute("data-instance-id");
          if (!instanceId) return;

          registry.setActive(instanceId);

          const pmSelection = view.state.selection;
          if (!pmSelection.empty) {
            const found = getVietaMathNodePosition(view.state, instanceId);
            if (!found) return;
            const { pos } = found;

            const SelectionClass =
              typeof pmSelection?.constructor?.create === "function"
                ? pmSelection.constructor
                : cachedSelectionCtor;

            if (!SelectionClass) return;

            view.dispatch(
              view.state.tr
                .setSelection(SelectionClass.create(view.state.doc, pos))
                .scrollIntoView()
                .setMeta("ignoreFilterTransaction", true)
            );
          }

          const controller = registry.getActive?.();
          if (!controller) return;

          if (controller.smartMenuIsOpen()) return;

          // This is to prevent insertCaret
          if (suppressNextSelectionInsert) {
            suppressNextSelectionInsert = false;
            return;
          }

          // Mostly for when we navigate up and down
          if (!controller.isActive?.()) {
            controller.insertCaret?.({ at: "start" }); // could be coordinate based
          }
        }

        // Ignore selections outside this ProseMirror view
        const anchor = sel.anchorNode.parentElement;;
        if (!view.dom.contains(anchor)) return;

        // Make sure the math nodes are visible
        ensureMathLineVisible(view);
      };

      document.addEventListener(
        "pointerdown",
        handlePointerDown,
        { capture: true, passive: false }
      );

      document.addEventListener("selectionchange", handleSelectionChange);

      return {
        destroy() {
          document.removeEventListener(
            "pointerdown",
            handlePointerDown,
            { capture: true }
          );
          document.removeEventListener("selectionchange", handleSelectionChange);
          viewRef = null;
        },
      };
    },

    appendTransaction(transactions, oldState, newState) {
      const historyTr = transactions.find(isHistoryTransaction);
      if (historyTr) {
        let synced = false;
        historyTr.mapping.maps.forEach(map => {
          map.forEach((_, __, from, to) => {
            if (!synced) {
              if (!(from < to && to <= newState.doc.content.size)) return;
              newState.doc.nodesBetween(from, to, node => {
                if (!synced && node.type.name === "vieta_math_inline") {
                  const instanceId = node.attrs.instanceId;
                  registry.getActiveId?.() !== instanceId && registry.setActive(instanceId);
                  const controller = registry.getActive?.();
                  if (controller) {
                    controller.setLatex(node.attrs.latex, false, false);
                    const end = node.attrs.vietaData?.selection?.range?.end;
                    controller.deferAfterMathML(() => {
                      controller.setSelectionWithCaret({ start: end, end });
                      controller.focus();
                    });
                  }
                  synced = true;
                  return false;
                }
                return true;
              });
            }
          });
        });
      }

      // Seems Prosemirror like having nodes persist
      // We need paste to actually replace the nodes
      // and not try to match them with existing nodes
      const isPaste = transactions.some(tr =>
        tr.getMeta("paste") === true || tr.getMeta("uiEvent") === "paste"
      );
      if (!isPaste) return null;
      const seenIds = new Set();
      let trOut = newState.tr;
      let changed = false;

      transactions.forEach(t => {
        if (!(t.getMeta("paste") === true || t.getMeta("uiEvent") === "paste")) {
          return;
        }

        for (let i = 0; i < t.mapping.maps.length; i++) {
          const stepMap = t.mapping.maps[i];
          const mapToFinal = t.mapping.slice(i + 1);

          stepMap.forEach(function (_oldFrom, _oldTo, newFrom, newTo) {
            const from = mapToFinal.map(newFrom, 1);
            const to = mapToFinal.map(newTo, -1);
            if (from >= to) return;

            newState.doc.nodesBetween(from, to, function (node, pos) {
              if (node.type.name !== "vieta_math_inline") return;

              const id = node.attrs && node.attrs.id;
              if (!id || seenIds.has(id)) {
                trOut = trOut.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  id: null,
                  instanceId: null,
                });
                changed = true;
              } else {
                seenIds.add(id);
              }
            });
          });
        }
      });

      return changed ? trOut : null;
    },

    filterTransaction(tr, state) {

      const ctor = state.selection?.constructor;
      if (typeof ctor?.create === "function") {
        cachedSelectionCtor = ctor;
      }

      if (tr.getMeta("ignoreFilterTransaction")) return true;

      const activeId = registry.getActiveId?.();
      if (activeId !== null && !tr.getMeta('vietaMath')) {
        registry.clearActive();
      }

      const sel = tr.selection;
      const { $anchor } = sel;

      const nodeAfter = $anchor.nodeAfter;
      const nodeBefore = $anchor.nodeBefore;

      viewRef?.dom
        .querySelectorAll(".pm-vieta-math-wrapper.fake-caret")
        .forEach(el => el.classList.remove("fake-caret"));

      if (
        nodeAfter?.type.name === "vieta_math_inline" &&
        !(nodeBefore?.isText && nodeBefore.text?.length)
      ) {
        const el = viewRef?.dom.querySelector(
          `.pm-vieta-math-wrapper[data-instance-id="${nodeAfter.attrs.instanceId}"]`
        );
        if (el) el.classList.add("fake-caret");
      }

      if (tr.getMeta('vietaMath')) return true;

      const controller = registry.getActive?.();
      if (!controller?.isActive?.()) return true;

      // While math caret is active, block *all* document changes
      if (tr.docChanged) return false;

      return true;
    },

    props: {
      handleDOMEvents: {
        keydown(view, event) {

          const isCtrl = event.ctrlKey || event.metaKey;
          const isShift = event.shiftKey;

          if (isCtrl && !isShift && ["a"].includes(event.key)) {
            if (swallowWhenMathCaret(view, event)) {
              // unless everything is already selected.
              // If so then actually select everything.
              return true;
            }
          }

          if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey)
          ) {
            if (exitActiveVietaMath(view)) {
              event.preventDefault();
              return true;
            }
          }

          if (event.key === "Enter") {
            const controller = registry.getActive?.();
            if (controller?.isActive?.() && controller?.getRootStore()?.editorStore?.handleEnter()) {
              event.preventDefault();
              event.stopPropagation();
              return true;
            } else if (exitActiveVietaMath(view)) {
              event.preventDefault();
              return true;
            }
          }

          if (event.key === "Tab") {
            const controller = registry.getActive?.();
            if (controller?.isActive?.()) {
              event.preventDefault();
              return true;
            }
            event.stopPropagation();
            return false;
          }

          if (["ArrowUp", "ArrowDown", "Backspace", "Delete"].includes(event.key)) {
            if (swallowWhenMathCaret(view, event)) {
              if (["Backspace", "Delete"].includes(event.key)) {
                const active = registry.getActive?.();
                if (active?.isActive?.() && !active.getLatex().trim()) {
                  const { state, dispatch } = view;
                  const instanceId = registry.getActiveId?.();
                  const found = getVietaMathNodePosition(view.state, instanceId);
                  if (!found) return true;
                  let tr = state.tr.delete(found.pos, found.pos + found.size);
                  const SelectionClass = state.selection.constructor;
                  registry.clearActive();
                  tr = tr.setSelection(SelectionClass.create(tr.doc, found.pos));
                  dispatch(tr.scrollIntoView());
                  view.focus();
                  event.preventDefault();
                  event.stopPropagation();
                  return true;
                }
              }
              return true;
            } else {
              if (["Backspace", "Delete"].includes(event.key)) {
                const { state, dispatch } = view;
                const sel = state.selection;
                if (!sel.empty) return false;

                const { $from } = sel;
                const isBackspace = event.key === "Backspace";
                const node = isBackspace ? $from.nodeBefore : $from.nodeAfter;
                const oppositeNode = isBackspace ? $from.nodeAfter : $from.nodeBefore;

                // also check the other node to see
                if (node?.isText && node.text?.length && oppositeNode?.type?.name === "vieta_math_inline") {
                  event.preventDefault();
                  event.stopPropagation();

                  const from = isBackspace ? $from.pos - 1 : $from.pos;
                  dispatch(state.tr.delete(from, from + 1));
                  return true;
                }

                if (node?.type?.name === "vieta_math_inline") {
                  if (node.attrs.latex.trim()) {
                    registry.setActive(node.attrs.instanceId);
                    const active = registry.getActive?.();
                    active.focus();
                    active?.selectAllAndMarkForDeletion?.()
                  } else {
                    const from = isBackspace ? $from.pos - node.nodeSize : $from.pos;
                    const to = from + node.nodeSize;
                    registry.clearActive();
                    dispatch(state.tr.delete(from, to).scrollIntoView());
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  return true;
                }
                return false;
              }
              if (["ArrowUp", "ArrowDown"].includes(event.key)) {
                if (event.key === "ArrowDown" && !isFirefox) {
                  const sel = view.state.selection;
                  const { $anchor } = sel;

                  const nodeAfter = $anchor.nodeAfter;
                  if (!nodeAfter || nodeAfter.type.name !== "vieta_math_inline") return false;

                  const domSel = window.getSelection();
                  if (!domSel || domSel.rangeCount === 0) return false;

                  const coords = view.coordsAtPos(sel.head);
                  pendingVerticalSnap = { x: coords.left, originY: coords.top };
                  view.dom.classList.add("pm-hide-caret");

                  const start = domSel.getRangeAt(0);
                  if (!start.collapsed) return false;

                  const startWrapper = view.dom.querySelector(
                    `.pm-vieta-math-wrapper[data-instance-id="${nodeAfter.attrs.instanceId}"]`
                  );
                  if (!startWrapper) return false;

                  let current = startWrapper;
                  let next = current.nextSibling;

                  while (
                    next &&
                    next.nodeType === Node.ELEMENT_NODE &&
                    next.classList.contains("pm-vieta-math-wrapper")
                  ) {
                    current = next;
                    next = current.nextSibling;
                  }

                  const range = document.createRange();

                  if (next && next.nodeType === Node.TEXT_NODE) {
                    range.setStart(next, 0);
                  } else {
                    const parent = current.parentNode;
                    const index = Array.prototype.indexOf.call(parent.childNodes, current);
                    range.setStart(parent, index + 1);
                  }

                  range.collapse(true);
                  domSel.removeAllRanges();
                  domSel.addRange(range);

                  return false;
                }
              }
            }
          }

          // Only ArrowLeft / ArrowRight are handled here
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return false;
          }

          const dir = event.key === "ArrowRight" ? "right" : "left";
          const sel = view.state.selection;

          const active = registry.getActive?.();

          // If caret is already inside the math UI, swallow arrows
          if (active?.isActive?.()) {
            if (active.isAtBoundary?.(dir)) {
              active.clearEverything();
              const { state } = view;
              const instanceId = registry.getActiveId?.();
              if (instanceId) {
                let found = null;
                state.doc.descendants((node, pos) => {
                  if (node.type.name === "vieta_math_inline" && node.attrs?.instanceId === instanceId) {
                    found = { node, pos };
                    return false;
                  }
                  return true;
                });
                if (found) {
                  const exitPos = dir === "left" ? found.pos : found.pos + found.node.nodeSize;
                  const SelectionClass = state.selection.constructor;
                  view.dispatch(state.tr.setSelection(SelectionClass.create(state.doc, exitPos)).scrollIntoView());
                  view.focus();
                }
              }
            }
            event.preventDefault();
            return true;
          }

          // Only enter math nodes on collapsed selections
          if (!sel.empty) return false;

          const { $from } = sel;
          const node = (dir === "right") ? $from.nodeAfter : $from.nodeBefore;

          if (node === null) {
            const state = view.state;
            const pos = sel.from;
            const dirBias = dir === "left" ? -1 : 1;
            const target = pos + dirBias;

            if (target < 0 || target > state.doc.content.size) {
              return false;
            }

            const SelectionClass = sel.constructor;

            view.dispatch(
              state.tr
                .setSelection(
                  SelectionClass.near(
                    state.doc.resolve(target),
                    dirBias
                  )
                )
                .scrollIntoView()
            );

            event.preventDefault();
            return true;
          }

          if (!node || node.type.name !== "vieta_math_inline") {
            return false;
          }

          if (isCtrl && !isShift) {
            const { state } = view;
            const { $from } = state.selection;
            const pos =
              dir === "left"
                ? $from.pos - node.nodeSize
                : $from.pos + node.nodeSize;

            view.dispatch(
              state.tr
                .setSelection(state.selection.constructor.create(state.doc, pos))
                .scrollIntoView()
            );

            event.preventDefault();
            return true;
          }
          if (isCtrl && isShift) {
            return false;
          }

          if (isShift) {
            // let's leave this for now
            // I think what we want is
            // to call controller.insertCaret
            // but it needs a callback that is triggered
            // when the caret actually has appeared
            // which then does startSelection

            // we'd need that logic/callback for
            // delete and backspace logic when right in front of
            // a vm node.

            return false;
          }

          // Activate math controller
          registry.setActive(node.attrs.instanceId);
          const controller = registry.getActive?.();
          if (!controller) return false;

          // If activation already created a caret, swallow
          if (controller.isActive?.()) {
            event.preventDefault();
            return true;
          }

          controller.insertCaret?.({
            at: dir === "right" ? "start" : "end",
          });

          event.preventDefault();
          event.stopPropagation();
          return true;
        },

        copy(view, event) {
          if (swallowWhenMathCaret(view, event)) return true;
          return writeMarkdownToClipboard(view, event, false);
        },
        cut(view, event) {
          if (swallowWhenMathCaret(view, event)) return true;
          return writeMarkdownToClipboard(view, event, true);
        },
        paste(view, event) {
          if (swallowWhenMathCaret(view, event)) {
            event.preventDefault();
          } else {
            const text = event.clipboardData?.getData("text/plain");
            event.stopPropagation();
            event.preventDefault();
            if (!text) return true;
            view.pasteText(text, event);
          }
          return false;
        },
      },
      handleKeyDown(view, event) {
        return handleKeys(view, event);
      },
      clipboardTextParser(text) {
        return markdownParser.parse(text).slice(0);
      },
    },
  });
}
