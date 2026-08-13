import React, { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '@stores/StoreContext';
import { MMLInspector as ML } from "@utils/MMLInspector";
import { applyChromiumDelimiterFix } from '@constants';
import './InteractiveMathML.scss';

function isClickInPadding(el, { clientX: x, clientY: y }) {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);

  const l = r.left   + parseFloat(s.paddingLeft  || 0);
  const rgt = r.right  - parseFloat(s.paddingRight || 0);
  const t = r.top    + parseFloat(s.paddingTop   || 0);
  const b = r.bottom - parseFloat(s.paddingBottom|| 0);

  return (
    x >= r.left && x <= r.right &&
    y >= r.top  && y <= r.bottom &&
    (x < l || x > rgt || y < t || y > b)
  );
}

function resolveClosestByEdge(rootEl, { clientX: x, clientY: y }) {
  let best = null;
  let bestDist = Infinity;

  rootEl.querySelectorAll('[data-range-start]').forEach(el => {
    if (ML.isType(el, 'mrow')) return;
    const r = el.getBoundingClientRect();

    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top  - y, 0, y - r.bottom);
    const d = dx * dx + dy * dy;

    if (d < bestDist) {
      bestDist = d;
      best = el;
    }
  });

  return best;
}

function normalizeClickElement(el) {
  if (!el) return null;

  if (el.classList?.contains('affordance')) {
    el = el.parentElement;
  }

  if (ML.isType(el, 'semantics')) {
    el = el.children[0];
  }

  if (!ML.isMathMLElement(el)) return null;

  let rangeEl = el.closest('[data-range-start]');
  if (!rangeEl) return null;

  while (rangeEl && !ML.isValidClickTarget(rangeEl)) {
    rangeEl = rangeEl.parentElement?.closest('[data-range-start]');
  }

  const wrapper = ML.isType(rangeEl, 'mi') && rangeEl.parentElement?.parentElement;
  if (
    wrapper &&
    ML.isType(wrapper, 'mpadded') &&
    wrapper.classList.contains('mathfont')
  ) {
    return wrapper;
  }

  return rangeEl || null;
}

function InteractiveMathML() {

  const firstClickElRef = useRef(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  const dragAnchorRef = useRef(null);
  const dragLastFocusRef = useRef(null);
  const isDragSelectingRef = useRef(false);
  const rafPendingRef = useRef(false);

  const editorRef = useRef(null);
  const canvasRef = useRef(null);
  const highlightCanvasRef = useRef(null);

  const mathMLContainerRef = useRef(null);
  const lastRenderedMathMLRef = useRef(null);

  const editorStore = useEditorStore();

  function drawRoundedRect(ctx, x, y, width, height, radius = 2) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  useEffect(() => {
    const drawHighlightGroups = () => {
      const canvas = highlightCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      const editorEl = editorRef.current;

      if (!canvas || !ctx || !editorEl) return;

      const computedStyle = window.getComputedStyle(editorEl);
      const transform = computedStyle.transform || 'matrix(1, 0, 0, 1, 0, 0)';

      const match = transform.match(/^matrix\(([^,]+),[^,]+,[^,]+,([^,]+),/);

      let scaleX = 1;
      let scaleY = 1;

      if (match) {
        scaleX = parseFloat(match[1]);
        scaleY = parseFloat(match[2]);
      }

      const contentEl = editorRef.current?.closest('.vieta-math-root');
      const containerRect = contentEl.getBoundingClientRect();

      const rect = editorEl.getBoundingClientRect();
      canvas.width = contentEl.offsetWidth;
      canvas.height = contentEl.offsetHeight;
      ctx.setTransform(1 / scaleX, 0, 0, 1 / scaleY, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const boxes = editorStore.highlight.map(el => el.getBoundingClientRect());

      const minX = Math.min(...boxes.map(b => b.left)) - containerRect.left;
      const minY = Math.min(...boxes.map(b => b.top)) - containerRect.top;
      const maxX = Math.max(...boxes.map(b => b.right)) - containerRect.left;
      const maxY = Math.max(...boxes.map(b => b.bottom)) - containerRect.top;

      const width = maxX - minX;
      const height = maxY - minY;

      ctx.fillStyle = editorStore.highlightColor || 'rgba(255, 255, 0, 0.3)';
      ctx.beginPath();
      ctx.roundRect(minX, minY, width, height, 2); // 4px border radius
      ctx.fill();
    };

    drawHighlightGroups();

  }, [editorStore.highlight, editorStore.highlightColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const editorEl = editorRef.current;
    const contentEl = editorEl?.closest('.vieta-math-root');
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx || !editorEl || !contentEl) return;

    const redraw = () => {
      const { transform } = getComputedStyle(editorEl);
      const match = transform?.match(/^matrix\(([^,]+),[^,]+,[^,]+,([^,]+),/);
      const scaleX = match ? parseFloat(match[1]) : 1;
      const scaleY = match ? parseFloat(match[2]) : 1;

      const containerRect = contentEl.getBoundingClientRect();
      const editorRect = editorEl.getBoundingClientRect();

      canvas.width = contentEl.offsetWidth;
      canvas.height = contentEl.offsetHeight;

      ctx.setTransform(1 / scaleX, 0, 0, 1 / scaleY, 0, 0);
      ctx.clearRect(0, 0, editorRect.width, editorRect.height);

      const elements = editorStore.getRootSelectionElements();
      if (!elements.length) return;

      const boxes = elements.map(el => el.getBoundingClientRect());

      const minX = Math.min(...boxes.map(b => b.left)) - containerRect.left;
      const minY = Math.min(...boxes.map(b => b.top)) - containerRect.top;
      const maxX = Math.max(...boxes.map(b => b.right)) - containerRect.left;
      const maxY = Math.max(...boxes.map(b => b.bottom)) - containerRect.top;

      const styles = getComputedStyle(editorEl);
      const mode = editorStore.visualSelection.removeMode ? 'remove' : 'select';

      ctx.fillStyle = styles.getPropertyValue(`--math-${mode}-fill`);
      ctx.strokeStyle = styles.getPropertyValue(`--math-${mode}-stroke`);

      drawRoundedRect(ctx, minX, minY, maxX - minX, maxY - minY, 2);
      ctx.fill();
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    // Initial + selection-driven draw
    redraw();

    // Theme-driven redraws (registered once)
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', redraw);

    const observer = new MutationObserver(redraw);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      mql.removeEventListener('change', redraw);
      observer.disconnect();
    };
  }, [editorStore.visualSelection.range]);

  useEffect(() => {
    if (editorRef.current) {
      editorStore.setEditorRef(editorRef.current);
    }
  }, [editorStore]);

  useLayoutEffect(() => {
    if (lastRenderedMathMLRef.current === editorStore.renderedMathML) {
      return;
    }
    mathMLContainerRef.current.innerHTML = editorStore.renderedMathML;
    lastRenderedMathMLRef.current = editorStore.renderedMathML;
  }, [editorStore.renderedMathML]);

  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    if ((document.activeElement === editorEl) || editorStore.forceCaretUpdate) {
      if (editorStore.forceCaretUpdate) {
        editorStore.forceCaretUpdate = false;
        editorStore.enterAtLastPosition();
      } else {
        editorStore.updatePosition();
      }
    }
    editorStore.isGeneratingMathML = false;

    editorStore.rootStore.externalStore.flushAfterMathML();

    // Apply Chromium-specific delimiter positioning fix
    applyChromiumDelimiterFix(editorEl);

    // Proper width. The reason for this is that horizontally stretchy
    // elements, on firefox (at least), will sometimes present the incorrect
    // width on first reflow. And it seems that ancestors don't care about
    // the corrective post-reflow.
    const mathRoot = mathMLContainerRef?.current?.firstElementChild;
    if (!mathRoot) return;
    const updateWidth = () => {
      const rect = mathRoot.getBoundingClientRect();
      if (rect?.width) {
        mathMLContainerRef.current.style.width = `${rect.width}px`;
      }
    };
    updateWidth();

    // resizeObserver + mathRoot.firstElementChild.firstElementChild
    // is the only thing that seems to work reliably across browsers
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(mathRoot.firstElementChild.firstElementChild);

    return () => {
      resizeObserver.disconnect();
    };
  }, [editorStore.renderedMathML]);

  const findAncestor = (el, matchFn, stopEl = null) => {
    while (el && el !== stopEl) {
      if (matchFn(el)) return el;
      el = el.parentElement;
    }
    return null;
  };

  const handleMouseOver = useCallback((e) => {
    const target = findAncestor(
      e.target,
      (el) => {
        if (!ML.isType(el, ["mrow", "mtable"])) return false;
        if (el.classList.contains("delimiter-wrapper")) return false;
        if (el.classList.contains("delimited-frac")) return false;
        if (el.parentElement?.classList.contains("mathfont")) return false;
        return true;
      },
      editorRef.current
    );

    if (target) {
      target.classList.add("hover-highlight");
    }
  }, []);

  const handleMouseOut = useCallback(() => {
    const highlights = editorRef.current?.querySelectorAll('.hover-highlight');
    highlights?.forEach(el => el.classList.remove('hover-highlight'));
  }, []);

  function handleClick(e) {
    const root = editorRef.current;
    if (!root) return;

    const isShift = e.shiftKey;

    // ---- click counting ----
    clickCountRef.current += 1;
    const count = clickCountRef.current;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
      clickTimerRef.current = null;
      firstClickElRef.current = null;
    }, 250);

    // ---- TRIPLE CLICK (global) ----
    if (count === 3) {
      editorStore.selectEntireExpression();
      e.preventDefault();
      return;
    }

    // ---- DOUBLE CLICK (anchor-based) ----
    if (count === 2) {
      if (firstClickElRef.current) {
        editorStore.setSelectionToDoubleClickedElement(
          firstClickElRef.current
        );
      }
      e.preventDefault();
      return;
    }

    // ---- FIRST CLICK: now we resolve target ----

    const hoverEl = editorRef.current?.querySelector('.hover-highlight');
    let rangeEl = normalizeClickElement(
      document.elementFromPoint(e.clientX, e.clientY)
    );
    if (!rangeEl) return;
    if ((rangeEl === hoverEl && !ML.hasClass(rangeEl.firstElementChild, 'affordance')) || !hoverEl.contains(rangeEl)) {
      rangeEl = normalizeClickElement(resolveClosestByEdge(hoverEl, e));
    }
    if (ML.isType(rangeEl, 'mrow')
        && !ML.hasClass(rangeEl, 'delimiter-wrapper')
        && !ML.hasClass(rangeEl, 'delimited-frac')
        && !ML.hasClass(rangeEl.firstElementChild, 'affordance')
        && !isClickInPadding(rangeEl, e)) {
      rangeEl = normalizeClickElement(
        resolveClosestByEdge(editorRef.current, e)
      );
      if (!rangeEl) return;
    }

    if (!rangeEl) {
      rangeEl = normalizeClickElement(resolveClosestByEdge(editorRef.current, e)
      );
    }

    firstClickElRef.current = rangeEl;

    if (isShift && (editorStore.hasCaret() || editorStore.hasVisualSelection())) {
      editorStore.extendSelectionToClick(rangeEl);
      e.preventDefault();
      return;
    }

    const rect = rangeEl.getBoundingClientRect();
    const side =
      e.clientX < rect.left + rect.width / 2 ? 'start' : 'end';

    const pos = editorStore.getValidPosition(rangeEl, side);

    editorStore.setSelection({ start: pos, end: pos });
    editorStore.setCaretBasedOnPosition();
    e.preventDefault();
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragSelectingRef.current) return;
    if (rafPendingRef.current) return;

    rafPendingRef.current = true;

    requestAnimationFrame(() => {
      rafPendingRef.current = false;

      const candidate = ML.getNearestAncestorWithRange(e.target);
      if (!candidate) return;

      // Ignore mrow entirely
      if (ML.isType(candidate, "mrow")) return;

      // Lazily initialize anchor on first valid hit
      if (!dragAnchorRef.current) {
        dragAnchorRef.current = candidate;
        dragLastFocusRef.current = candidate;
        return;
      }

      if (candidate === dragLastFocusRef.current) return;

      dragLastFocusRef.current = candidate;

      editorStore.extendSelectionBetween(
        dragAnchorRef.current,
        candidate
      );
    });
  }, [editorStore]);

  const handleMouseUp = useCallback(() => {
    dragAnchorRef.current = null;
    dragLastFocusRef.current = null;

    setTimeout(() => {
      isDragSelectingRef.current = false;
    }, 0);

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); // stops caret + selection movement (webkit issue)

    if (e.button !== 0) return;

    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorStore.setFocus();
    }

    handleClick(e);

    // Do NOT set anchor here
    dragAnchorRef.current = null;
    dragLastFocusRef.current = null;
    isDragSelectingRef.current = true;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [editorStore]);

  return (
    <div
      className={`interactive-mathml ${
        editorStore.isEditorActive ? '' : 'inactive'
      } ${
        editorStore.isEditorDisabled ? 'disabled' : ''
      }`}
      ref={editorRef}
      tabIndex={editorStore.isEditorDisabled ? -1 : 0}
      //onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseDown={handleMouseDown}
      onMouseOut={handleMouseOut}
      onSelect={(e) => e.preventDefault()}
      contentEditable={!editorStore.isEditorDisabled}
      suppressContentEditableWarning={true}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      inputMode="text"
    >
      <div className="mathml-scroll-content">
        <canvas
          ref={canvasRef}
          className="selection-canvas"
          style={{
            position: 'absolute',
            left: 0,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
        <canvas
          ref={highlightCanvasRef}
          className="highlight-canvas"
          style={{
            position: 'absolute',
            left: 0,
            pointerEvents: 'none',
            zIndex: 9,
          }}
        />
        <div
          ref={mathMLContainerRef}
          style={{ display: 'inline-block' }}
        />
      </div>

      <span className="caret-target">x</span>
    </div>
  );
}

export default observer(InteractiveMathML);
