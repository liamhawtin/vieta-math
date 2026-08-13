import { makeAutoObservable, reaction, runInAction, toJS } from 'mobx';
import lme from 'lme';
import { MMLInspector as ML } from "@utils/MMLInspector";
import { ArrayManager } from "@utils/ArrayManager";
import { TeXProcessor as TP } from '@utils/TeXProcessor';
import { BreadcrumbNavigator } from '@utils/BreadcrumbNavigator';
import { getBrowser, isModernWebKit } from '@utils/deviceCapabilities';
import { ARROW_MAPPINGS, REVERSE_ARROW_MAPPINGS, POS_CHAR } from '@constants';

export class EditorStore {
  cursor = {
    position: { x: 0, y: 0 },
    visible: false,
    element: null
  };

  selection = {
    active: true,
    range: { start: 0, end: 0 },
  };

  visualSelection = {
    removeMode: false,
    direction: undefined,
    active: false,
    lastPosition: null,
    range: { start: null, end: null },
    elements: [],
  };

  renderedMathML = this.getDefaultMathML();

  isDragging = false;
  isEditorActive = false;
  isEditorDisabled = true;
  isEmbedded = false; // If true, allows boundary exit (e.g., in Quill)
  editorRef = null;
  currentScale = 1.0;
  autoZoomEnabled = false;
  origin = { originX: 'center', originY: 'center' };

  hasSeenSmartMenuTip = !!localStorage.getItem('smartMenuTipSeen');

  // Flags
  shouldAutoSelectSpacing = false;

  positions = [0];
  semanticRanges = {
    upperComponents: [],
    lowerComponents: [],
    upperLowerPairs: [],
    termDelimitPoints: [],
    rowWiseMatrixComponents: [],
    negWidthPositions: [],
  };

  highlight = [];
  highlightColor = null;

  rootStore;
  ml;
  mla;

  isDummy = false;

  forceCaretUpdate = false;

  externalOnChange = null;

  constructor(rootStore, initOptions = {}) {
    makeAutoObservable(this, {
      rootStore: false
    });

    this.rootStore = rootStore;
    this.forceCaretUpdate = !!initOptions.focusOnInit;
    this.externalOnChange = initOptions.onChange || null;
    this.am = new ArrayManager();

    const savedZoomSetting = localStorage.getItem('autoZoomEnabled');
    if (savedZoomSetting !== null) {
      runInAction(() => {
        this.autoZoomEnabled = savedZoomSetting === 'true';
      });
    }

    reaction(
      () => this.visualSelection.elements.map(el => el),
      () => {
        if (this.visualSelection.elements.length) {
          const el = this.getLargestFontSizeElement(this.visualSelection.elements);
          this.zoomToElement(el);
          this.rootStore.toolbarStateStore.inspectCurrentContext();
        } else if (this.visualSelection.removeMode) {
          this.visualSelection.removeMode = false;
        }
      }
    );

    reaction(() => this.selection.range, () => {
      this.rootStore.toolbarStateStore.updateHighlightsForCurrentContext();

      if (this.rootStore.smartMenuStore.isOpen) {
        this.rootStore.smartMenuStore.close();
      }

      this.rootStore.toolbarStateStore.clearTargetHighlight();
      this.rootStore.toolbarStateStore.clearDelimiterHighlight();
      this.rootStore.toolbarStateStore.clearLayoutModeHighlight();

    });
  }

  getDefaultMathML() {
    return [
      '<span class="lme">',
        '<math displaystyle="true" xmlns="http://www.w3.org/1998/Math/MathML">',
          '<semantics>',
            '<mrow data-range-start="0" data-range-end="0">',
              '<mi class="affordance">□</mi>',
            '</mrow>',
          '</semantics>',
        '</math>',
      '</span>',
    ].join('');
  }

  setEditorRef(ref) {
    this.editorRef = ref;
    this.observeCaretInsertions(ref);

    if (ref) {
      ref.removeEventListener('focus', this.handleFocus);
      ref.addEventListener('focus', this.handleFocus);
    }
  }

  observeCaretInsertions(editorEl) {
    if (!editorEl) return;

    // Clean up previous observer if needed
    if (this.caretObserver) {
      this.caretObserver.disconnect();
    }

    this.caretObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.classList?.contains("math-cursor")) {
              this.onCaretInserted(node);
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.classList?.contains("math-cursor")) {
              this.onCaretRemoved(node);
            }
          });
        }
      }
    });

    this.caretObserver.observe(editorEl, { childList: true, subtree: true });
  }

  onCaretInserted(node) {

    if (this.rootStore.externalStore.onCaretInserted) {
      this.rootStore.externalStore.onCaretInserted();
    }

    this.rootStore.toolbarStateStore.inspectCurrentContext();

    const { range } = this.visualSelection;
    const hasActiveSelection = range?.start !== null || range?.end !== null;
    if (!hasActiveSelection) {
      const left = this.findNextElementWithRange(node, 'left');
      if (left?.element) {
        this.setVisualSelection({ start: left.element, end: left.element });
      }
    }

  }

  onCaretRemoved(node) {

  }

  setFocus() {
    // Guard: Only focus if this editor doesn't already have focus
    // This prevents focus stealing when multiple editors exist
    if (!this.editorRef) return;
    this.isEditorDisabled = false;
    if (document.activeElement === this.editorRef) return;

    this.editorRef.focus();
  }

  handleFocus = () => {
    if (!this.editorRef) return;

    const el = this.editorRef;

    // Ensure a zero-width caret is placed
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(el);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  setEditorActive(isActive) {
    this.isEditorActive = isActive;
  }

  highlightRow(table, rowIndex) {
    const rows = table.querySelectorAll('mtr');
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    const cells = Array.from(row.querySelectorAll('mtd'));
    this.setHighlightedElements(cells, "rgba(255, 0, 0, 0.2)");
  }

  highlightColumn(table, colIndex) {
    const rows = table.querySelectorAll('mtr');
    const cells = [];
    rows.forEach(row => {
      const tds = row.querySelectorAll('mtd');
      if (colIndex >= 0 && colIndex < tds.length) {
        cells.push(tds[colIndex]);
      }
    });
    this.setHighlightedElements(cells, "rgba(255, 0, 0, 0.2)");
  }

  setHighlightedElements(elements, color) {
    this.highlight = elements;
    this.highlightColor = color;
  }

  clearHighlights() {
    this.highlight = [];
    this.highlightColor = null;
  }

  getValidPosition(element, placement) {
    if (!element || !["pre", "post", "start", "end"].includes(placement)) return null;

    const range = ML.getRangeFromElement(element);
    if (!range) return null;

    const { start, end } = range;
    const isMrow = ML.isProperMrow(element);

    if (!isMrow) {
      if (placement === "start") placement = "pre";
      else if (placement === "end") placement = "post";
    }

    let candidates;

    switch (placement) {
      case "pre":
        if (isMrow) {
          candidates = this.getPositions().filter(pos => pos < start);
        } else {
          candidates = this.getPositions().filter(pos => pos <= start);
        }
        return candidates.length ? Math.max(...candidates) : null;

      case "post":
        candidates = this.getPositions().filter(pos => pos >= end);
        return candidates.length ? Math.min(...candidates) : null;

      case "start":
      case "end":
        if (!isMrow) return null;
        candidates = this.getPositions().filter(pos => pos >= start && pos < end);
        if (!candidates.length) return null;
        return placement === "start"
          ? Math.min(...candidates)
          : Math.max(...candidates);
    }

    return null;
  }

  collectPositions(root, expression) {
    const positions = new Set();
    const exclude = new Set();
    const negWidthPositions = new Set();

    const traverse = (node) => {
      if (!node) return;

      const rangeStart = parseInt(node.getAttribute("data-range-start"), 10);
      const rangeEnd = parseInt(node.getAttribute("data-range-end"), 10);

      const isNegWidth = node.classList?.contains("neg-width");

      const internalScriptBase =
        ML.isParentType(node, ["msup", "msub", "msubsup"]) &&
        ML.isNthMathMLElementChild(node, 0) &&
        ML.getRangeFromElement(node);

      if (ML.isEmptyArg(node) && !(internalScriptBase) && !ML.hasClass(node, "delimited-group")) {
        positions.add(rangeEnd - 1);
      }

      if (ML.isType(node, "mrow") && ML.isParentType(node, "mrow")) {
        positions.add(rangeStart);
      }

      if (internalScriptBase) {
        exclude.add(rangeEnd);
      }

      const isStyledPrimitive =
        ML.isParentType(node, "mrow") &&
        ML.isGrandParentType(node, "mpadded") &&
        !ML.grandParentHasClass(node, "text");

      if (!ML.isEmptyArg(node) && ML.isParentType(node, "mrow") && !isStyledPrimitive) {
        if (!isNegWidth && rangeStart !== null) positions.add(rangeStart);

        if (rangeEnd !== null) {
          if (isNegWidth) {
            negWidthPositions.add(rangeEnd);
          } else {
            positions.add(rangeEnd);
          }
        }

        // Add the next sibling's rangeStart to exclude if conditions match
        const nextSibling = node.nextElementSibling;
        if (
          nextSibling &&
          nextSibling.hasAttribute("data-range-start") &&
          rangeEnd !== null
        ) {
          const nextRangeStart = parseInt(
            nextSibling.getAttribute("data-range-start"),
            10
          );
          if (nextRangeStart !== rangeEnd || isNegWidth) {
            exclude.add(nextRangeStart);
          }
        }
      }

      Array.from(node.children).forEach((child) => traverse(child));
    };

    traverse(root);

    positions.add(expression.trimEnd().length);

    const filteredPositions = Array.from(positions).filter(
      (pos) => typeof pos === "number" && pos >= 0 && !exclude.has(pos)
    );

    // Save the neg-width positions to semanticRanges
    this.semanticRanges.negWidthPositions = Array.from(negWidthPositions).sort((a, b) => a - b);

    return filteredPositions.sort((a, b) => a - b);
  }

  collectSemanticRanges(root) {
    const lowerRanges = [];
    const upperRanges = [];
    const upperLowerPairs = [];
    const termDelimitSet = new Set();

    const tags = ['msubsup', 'munderover', 'mfrac', 'munder', 'mover'];

    tags.forEach(tag => {
      root.querySelectorAll(tag).forEach(node => {
        const children = Array.from(node.children).filter(el => ML.isMathMLElement(el));

        let lower = null;
        let upper = null;

        if (tag === 'mfrac') {
          upper = children[0] || null;
          lower = children[1] || null;
        } else if (tag === 'msubsup' || tag === 'munderover') {
          lower = children[1] || null;
          upper = children[2] || null;
        } else if (tag === 'munder') {
          if (ML.isType(children[0], "mrow")) {
            //Underset
            upper = children[0] || null;
            lower = children[1] || null;
          } else {
            // Only used to target underbraces
            upper = children[0] || null;
            if (!ML.isType(upper, 'munder')) return;
            upper = ML.getFirstChild(upper);
            lower = children[1] || null;
          }
        } else if ((tag === 'mover') && ML.isType(children[0], "mrow")) {
            //Overset
            upper = children[0] || null;
            lower = children[1] || null;
        }

        const lowerRange = lower ? ML.getRangeFromElement(lower) : null;
        const upperRange = upper ? ML.getRangeFromElement(upper) : null;

        if (lowerRange) {
          lowerRanges.push([lowerRange.start, lowerRange.end]);
        }

        if (upperRange) {
          upperRanges.push([upperRange.start, upperRange.end]);
        }

        if (lowerRange && upperRange) {
          upperLowerPairs.push({
            upper: [upperRange.start, upperRange.end],
            lower: [lowerRange.start, lowerRange.end]
          });
        }
      });
    });

    const matrixRowRanges = [];

    root.querySelectorAll('mtable').forEach(table => {
      const rowRanges = [];

      // Only consider direct <mtr> children
      Array.from(table.children)
        .filter(row => row.localName === 'mtr')
        .forEach(row => {
          let minStart = Infinity;
          let maxEnd = -Infinity;

          // Only consider direct <mtd> children of this row
          Array.from(row.children)
            .filter(cell => cell.localName === 'mtd')
            .forEach(cell => {
              const mrow = cell.querySelector('mrow');
              if (mrow && ML.isMathMLElement(mrow)) {
                const range = ML.getRangeFromElement(mrow);
                if (range) {
                  minStart = Math.min(minStart, range.start);
                  maxEnd = Math.max(maxEnd, range.end);
                }
              }
            });

          if (minStart !== Infinity && maxEnd !== -Infinity) {
            rowRanges.push([minStart, maxEnd]);
          }
        });

      if (rowRanges.length > 0) {
        matrixRowRanges.push(rowRanges);

        // Add all non-top rows to lowerComponents
        for (let i = 1; i < rowRanges.length; i++) {
          lowerRanges.push(rowRanges[i]);
        }
      }
    });

    root.querySelectorAll('mo, mrow').forEach(el => {
      if (!ML.isMathMLElement(el)) return;

      const range = ML.getRangeFromElement(el);
      if (range) {
        termDelimitSet.add(range.start);
        termDelimitSet.add(range.end);
      }

      if (ML.isType(el, 'mrow')) {
        const children = Array.from(el.children).filter(ML.isMathMLElement);

        for (let child of children) {
          const childRange = ML.getRangeFromElement(child);
          if (childRange) {
            termDelimitSet.add(childRange.start); // inner start
            break;
          }
        }

        for (let i = children.length - 1; i >= 0; i--) {
          const childRange = ML.getRangeFromElement(children[i]);
          if (childRange) {
            termDelimitSet.add(childRange.end); // inner end
            break;
          }
        }
      }
    });

    this.semanticRanges.termDelimitPoints = Array.from(termDelimitSet).sort((a, b) => a - b);
    this.semanticRanges.lowerComponents = lowerRanges;
    this.semanticRanges.upperComponents = upperRanges;
    this.semanticRanges.upperLowerPairs = upperLowerPairs;
    this.semanticRanges.rowWiseMatrixComponents = matrixRowRanges;
  }

  getComplementRangesForPosition(pos) {
    const complements = [];

    // Handle upperLowerPairs
    this.semanticRanges.upperLowerPairs.forEach(pair => {
      const [uStart, uEnd] = pair.upper;
      const [lStart, lEnd] = pair.lower;

      if (pos >= uStart && pos < uEnd) {
        complements.push([lStart, lEnd]);
      } else if (pos >= lStart && pos < lEnd) {
        complements.push([uStart, uEnd]);
      }
    });

    // Handle rowWiseMatrixComponents
    this.semanticRanges.rowWiseMatrixComponents.forEach(matrix => {
      let matchingRowIndex = -1;

      matrix.forEach(([start, end], idx) => {
        if (pos >= start && pos < end) {
          matchingRowIndex = idx;
        }
      });

      if (matchingRowIndex !== -1) {
        matrix.forEach(([start, end], idx) => {
          if (idx !== matchingRowIndex) {
            complements.push([start, end]);
          }
        });
      }
    });

    return complements;
  }

  getPositions() {
    return this.positions;
  }

  updateExpression(expression, pushToStack = true) {
    if (this.rootStore.mathStore.expression === expression) {
      this.updatePosition();
      return;
    }
    try {
      const mathMLString = lme.renderToString(expression, {
        displayMode: true,
        throwOnError: true,
        strict: false,
        output: 'mathml',
        trust: false,
        browser: getBrowser(),
      });

      // Parse the MathML string to a DOM element
      const parser = new DOMParser();
      const mathMLDoc = parser.parseFromString(mathMLString, "application/xml");

      // Call the method to collect positions using the root of the parsed document
      const positions = this.collectPositions(mathMLDoc.documentElement, expression);
      this.positions = positions;

      this.collectSemanticRanges(mathMLDoc.documentElement);


      if (pushToStack) {
        const selection = { ...toJS(this.selection) };
        const data = { selection }
        this.externalOnChange?.(expression, data);
        //this.rootStore.actionStore.pushState();
      }

      runInAction(() => {
        this.isGeneratingMathML = true;
        this.rootStore.mathStore.expression = expression;
        this.renderedMathML = mathMLString;
      });

    } catch (error) {
      // Retry once with expanded lme input
      try {
        const expanded = lme.expandString(expression);
        if (expanded && expanded !== expression) {
          this.updateExpression(expanded, pushToStack);
          return;
        }
      } catch (_) {}

      // Final fallback: reset expression and render default MathML
      if (pushToStack) {
        this.externalOnChange?.("");
      }
      runInAction(() => {
        this.rootStore.mathStore.expression = "";
        this.renderedMathML = this.getDefaultMathML();
      });
      console.error("lme renderToString failed in renderedMathML:", error);
      this.rootStore.notificationStore.showError(
        "This equation appears to be corrupted and was reset"
      );
    }
  }

  hasSelection() {
    const { start, end } = this.selection.range;
    return Number.isInteger(start) && Number.isInteger(end) && start !== end;
  }

  selectionIsCaret() {
    return this.selection.range.start === this.selection.range.end;
  }

  setCaretVisible(visible) {
    this.cursor.visible = visible;
  }

  createCaret(targetElement) {
    let currentElement = targetElement;
    while (currentElement && currentElement.localName !== 'mrow') {
      currentElement = currentElement.parentElement;
    }
    const fontSize = parseFloat(window.getComputedStyle(currentElement).fontSize);
    const cursorHeight = fontSize * 0.7;
    const cursorElement = document.createElementNS('http://www.w3.org/1998/Math/MathML', "mi");
    cursorElement.className = 'math-cursor';

    cursorElement.style.setProperty('--cursor-gap', `${cursorHeight * 0.2}px`);

    Object.assign(cursorElement.style, {
      fontSize: "0.7em",
      transform: "translateY(-0.2em)",
      paddingTop: "0.3em",
    });

    cursorElement.textContent = "|";

    return cursorElement;
  }

  removeCaret() {
    if (this.editorRef) {
      const existingCursor = this.editorRef.querySelector('.math-cursor');
      if (existingCursor) existingCursor.remove();
    }
  }

  hasCaret() {
    if (!this.editorRef) return false;
    return this.editorRef.querySelector('.math-cursor') !== null;
  }

  getCaretElement() {
    if (!this.editorRef) return null;
    return this.editorRef.querySelector('.math-cursor');
  }

  getValidCaretSibling(direction = 'right') {
    if (!this.editorRef) return false;
    const caret = this.editorRef.querySelector('.math-cursor');
    return ML.getValidSibling(caret, direction);
  }

  findNextElementWithRange(startElement, direction = 'left') {
    let selectedElement = null;
    let el = startElement;
    let foundIn = 'sibling';

    if (direction === 'left') {
      // Check previous siblings
      while (el = el.previousElementSibling) {
        if (ML.isValidForVisualSelection(el)) {
          selectedElement = el;
          break;
        }
      }
    } else if (direction === 'right') {
      // Check next siblings
      while (el = el.nextElementSibling) {
        if (ML.isValidForVisualSelection(el)) {
          selectedElement = el;
          break;
        }
      }
    }

    // If no matching sibling found, check ancestors
    if (!selectedElement) {
      el = startElement;
      while (el = el.parentElement) {
        if (ML.isValidForVisualSelection(el)) {
          selectedElement = el;
          foundIn = 'ancestor';
          break;
        }
      }
    }

    return {
      element: selectedElement,
      foundIn
    };
  }

  zoomToElement = (element) => {

    if (ML.isType(element, 'mtable')) {
      element = element.parentElement;
    }

    const clickedFontSize = parseFloat(window.getComputedStyle(element).fontSize);
    const normalizedFontSize = 19.36;
    let scaleFactor = normalizedFontSize / clickedFontSize;

    if (!Number.isInteger(scaleFactor * 100)) {
      scaleFactor = Math.round(scaleFactor * 100) / 100;
    }

    this.currentScale = scaleFactor;

    if (this.editorRef) {
      const parentRect = this.editorRef.getBoundingClientRect();
      const clickedRect = element.getBoundingClientRect();
      const offsetX = clickedRect.left - parentRect.left + clickedRect.width / 2;
      const offsetY = clickedRect.top - parentRect.top + clickedRect.height / 2;
      const originX = (offsetX / parentRect.width) * 100;
      const originY = (offsetY / parentRect.height) * 100;
      this.origin = { originX, originY };

      if (this.autoZoomEnabled) {
        this.editorRef.style.transform = `scale(${scaleFactor})`;
        this.editorRef.style.transformOrigin = `${originX}% ${originY}%`;
      }
    }
  };

  toggleAutoZoom() {

    if (isModernWebKit()) {
      console.warn('Auto-zoom is not supported on WebKit browsers.');
      return;
    }

    this.autoZoomEnabled = !this.autoZoomEnabled;

    localStorage.setItem('autoZoomEnabled', this.autoZoomEnabled.toString());

    if (this.autoZoomEnabled && this.currentScale !== 1.0) {
      this.applyZoom();
    } else if (!this.autoZoomEnabled) {
      this.resetZoom();
    }
  }

  resetZoom() {
    if (this.editorRef) {
      this.editorRef.style.transform = 'scale(1)';
    }
  }

  applyZoom() {
    if (this.editorRef && this.currentScale !== 1.0) {
      const { originX, originY } = this.origin;
      this.editorRef.style.transform = `scale(${this.currentScale})`;
      this.editorRef.style.transformOrigin = `${originX}% ${originY}%`;
    }
  }

  getLargestFontSizeElement(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return null;
    const flattenElements = (arr) =>
      arr.reduce((acc, el) => {
        if (Array.isArray(el)) {
          return acc.concat(flattenElements(el));
        }
        return acc.concat(el);
      }, []);
    const allElements = flattenElements(elements);
    let largestElement = null;
    let largestFontSize = 0;
    allElements.forEach((el) => {
      if (el instanceof Element) {
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
        if (fontSize > largestFontSize) {
          largestFontSize = fontSize;
          largestElement = el;
        }
      }
    });
    return largestElement;
  };

  getDeepestElementByPosition(position) {
    if (!this.editorRef) return null;
    let result = null;
    let resultType = null; // 'start', 'end', or 'inside'
    let maxDepth = -1;

    const traverse = (node, depth) => {
      if (!node) return;

      const start = parseInt(node.getAttribute("data-range-start"), 10);
      const end = parseInt(node.getAttribute("data-range-end"), 10);

      const startMatch = start === position;
      const endMatch = end === position;
      // An empty argument could either have span one char, or two, a bit hard to detect.
      const insideEmptyMrow = ['mrow'].includes(node.localName) &&
        (
          (
            start === position
            && start + 1 === end
          )
          ||
          (
            ML.isEmptyElement(node)
            && start < position
            && position < end
          )
        )

      // If node is a match, determine type and check depth
      if ((startMatch || endMatch || insideEmptyMrow) && depth > maxDepth) {
        if (['mrow'].includes(node.parentElement?.localName) || insideEmptyMrow) {
          result = node;
          resultType = insideEmptyMrow ? "inside" : startMatch ? "start" : "end";
          maxDepth = depth;
        }
      }

      // Traverse children
      Array.from(node.children).forEach(child => traverse(child, depth + 1));
    };

    traverse(this.editorRef, 0);

    if (!result) {
      const firstMrow = this.editorRef.querySelector('mrow');
      if (firstMrow) {
        result = firstMrow;
        resultType = 'inside';
      }
    }

    return result ? { element: result, type: resultType } : null;
  }

  setCaretBasedOnPosition(position = null) {

    // Default to selection.range.end if position is not provided
    if (position === null) {
      const { range } = this.selection;
      if (range.start !== range.end) {
        console.warn("Position not provided, and selection range is not collapsed.");
        return null;
      }
      position = range.end;
    }

    this.clearActiveClasses();
    this.removeCaret();

    const deepestElementData = this.getDeepestElementByPosition(position);
    if (!deepestElementData) return null;

    const { element, type } = deepestElementData;
    const parentMrow = element.parentElement;

    if (type === "start") {
      parentMrow.classList.add("active");
      this.zoomToElement(element);
      const cursorElement = this.createCaret(parentMrow);
      element.parentElement.insertBefore(cursorElement, element);
      const { element: elementPrecedingCaret } = this.findNextElementWithRange(element, 'left')
      this.setVisualSelection(
        { start: elementPrecedingCaret, end: elementPrecedingCaret }
      );
    } else if (type === "end") {
      if (element) {
        parentMrow.classList.add("active");
        this.zoomToElement(element);
        const cursorElement = this.createCaret(parentMrow);
        element.parentElement.insertBefore(cursorElement, element.nextSibling);
        this.setVisualSelection(
          { start: element, end: element }
        );
      }
    } else if (type === "inside") {
      element.classList.add("active");
      this.zoomToElement(element);
      const cursorElement = this.createCaret(element);
      element.appendChild(cursorElement); // Place cursor inside the element
      this.setVisualSelection(
        { start: element, end: element }
      );
    }

    return deepestElementData;
  }

  getBreadcrumbs() {
    if (!this.editorRef) {
      return [];
    }

    // Check if we're in visual selection mode
    if (this.hasVisualSelection()) {
      const elements = this.getRootSelectionElements();
      let startElement = elements?.[0];
      const isFirstLevel = ML.isGrandParentType(startElement, "semantics")
      if (elements.length > 1) {
        startElement = isFirstLevel ? null : startElement.parentElement;
      }
      // For visual selection, use the first selected element as the context
      const breadcrumbs = BreadcrumbNavigator.generateBreadcrumbTrail(startElement, this.rootStore.mathStore.expression);

      // Check if the first selected element is not the final breadcrumb element
      if (breadcrumbs.length > 0) {
        const finalBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
        const isNotFinalBreadcrumb = elements[0] !== finalBreadcrumb.element;
        const allSelected = finalBreadcrumb.element
          ? Array.from(finalBreadcrumb.element.children).every(child => child.classList.contains('selected'))
          : false;

        if (isNotFinalBreadcrumb && (!allSelected || ML.hasClass(finalBreadcrumb.element, "delimited-group"))) {
          breadcrumbs.push({ type: 'other', label: '...', description: 'multiple' });
        }
      } else {
        breadcrumbs.push({ type: 'other', label: '...', description: 'multiple' });
      }

      if (breadcrumbs.length > 0) {
        breadcrumbs[breadcrumbs.length - 1].isSelected = true;
        breadcrumbs[breadcrumbs.length - 1].isRemoveMode = this.visualSelection.removeMode;
      }
      return breadcrumbs;
    }

    // Fallback to cursor-based breadcrumbs
    const caret = this.editorRef?.querySelector('.math-cursor');
    if (!caret) return [];
    return BreadcrumbNavigator.generateBreadcrumbTrail(caret, this.rootStore.mathStore.expression);
  }


  clearVisualSelection() {
    this.visualSelection.elements = [];
    this.visualSelection.direction = undefined;
    this.setVisualSelection({ start: null, end: null })
  }

  checkCaretSiblings() {
    if (!this.editorRef) {
      return { leftSibling: null, rightSibling: null };
    }

    const caret = this.editorRef.querySelector('.math-cursor');
    if (!caret) {
      return { leftSibling: null, rightSibling: null };
    }

    let leftSibling = caret.previousElementSibling;
    let rightSibling = caret.nextElementSibling;

    if (!ML.isMathMLElement(leftSibling)) leftSibling = null;
    if (!ML.isMathMLElement(rightSibling)) rightSibling = null;

    return { leftSibling, rightSibling };
  }

  adjustSelection(direction, termJump = false) {

    const { leftSibling, rightSibling } = this.checkCaretSiblings();
    const caret = this.editorRef?.querySelector('.math-cursor');
    if (ML.isGrandParentType(caret, 'semantics')) {
      if (!leftSibling && !rightSibling) return;
    }

    this.clearActiveClasses();
    if (this.hasVisualSelection() && !this.visualSelection.direction) {
      this.setInitialDirectionAndOrder(direction);
    }
    let elementToSelect = this.visualSelection.range.end;

    let foundIn = null;

    if (!this.visualSelection.direction) {
      this.visualSelection.direction = direction;
      this.visualSelection.lastPosition = this.selection.range.start;
      if (direction === 'right') {
        if (leftSibling) {
          ({ element: elementToSelect, foundIn } = this.findNextElementWithRange(elementToSelect, direction));
        } else {
          elementToSelect = rightSibling || elementToSelect;
        }
      }
    }

    if (this.visualSelection.direction === direction) {
      if (ML.isArgOfCompFunc(elementToSelect)) {
        elementToSelect = ML.getCompFuncOpForArg(elementToSelect);
        foundIn = 'ancestor';
      }

      if (elementToSelect === null) {
        const root = this.editorRef.querySelector('mrow');
        const children = ML.getMathMLChildren(root);
        if (direction === 'left') {
          children.reverse();
        }
        this.visualSelection.elements = children;
        this.setVisualSelection();
        return;
      }

      if (!ML.isValidForVisualSelection(elementToSelect)) {
        ({ element: elementToSelect, foundIn } = this.findNextElementWithRange(elementToSelect));
      }

      if (termJump && foundIn !== 'ancestor' && !elementToSelect.contains(this.visualSelection.elements.at(-1))) {
        let latestElement = elementToSelect;
        let elementsToSelect = [latestElement];
        while (latestElement) {
          let latestElementCand;
          ({ element: latestElementCand, foundIn } = this.findNextElementWithRange(latestElement, direction));
          if (!latestElementCand) break;
          latestElement = latestElementCand;
          if (foundIn === 'sibling' && ML.isType(latestElement, "mo")) {
            if (direction === 'right') elementsToSelect.push(latestElement)
            break;
          } else if (foundIn === 'ancestor') {
            break;
          } else {
            elementsToSelect.push(latestElement)
          }
        }
        this.visualSelection.elements.push(...elementsToSelect);
        elementToSelect = elementsToSelect.at(-1);
      } else {
        this.visualSelection.elements.push(elementToSelect);
      }
      const { element: nextElement } = this.findNextElementWithRange(elementToSelect, direction);
      this.setVisualSelection({ end: nextElement });
    } else {
      let prevElement = null;
      if (termJump) {
        const elems = this.visualSelection.elements;
        let cutIndex = elems.length - 1;

        for (let i = elems.length - 2; i >= 0; i--) {
          if (elems?.[cutIndex]?.contains(elems[i]) && (i !== elems.length - 2)) {
            cutIndex += 1;
            break;
          }
          if (ML.isType(elems[i], "mo") || elems?.[cutIndex]?.contains(elems[i])) {
            if (direction === 'right') cutIndex = i;
            break;
          }
          cutIndex = i;
        }

        prevElement = this.visualSelection.elements.splice(cutIndex).at(0);
      } else {
        prevElement = this.visualSelection.elements.pop();
      }
      const nextVisualElement = Array.isArray(prevElement)
        ? (direction === 'left' ? prevElement[0] : prevElement[1])
        : prevElement;

      if (!this.visualSelection.elements.length) {
        this.visualSelection.direction = undefined;
        this.setVisualSelection({ end: this.visualSelection.range.start });
        if (this.visualSelection.lastPosition !== null) {
          const pos = this.visualSelection.lastPosition;
          this.visualSelection.lastPosition = null;
          this.setSelection({ start: pos, end: pos });
          this.setCaretBasedOnPosition();
        }
        return;
      }
      this.setVisualSelection({ end: nextVisualElement });
    }
  }

  getVisualElements() {
    return this.visualSelection.elements || [];
  }

  // Makes sure 0:th is the left-most.
  getOrderedVisualElements() {
    const flatElements = this.visualSelection.elements || [];
    return ML.getDomOrderedElements(flatElements);
  }

  visualSelectionToTextRange() {
    // Helper function to flatten nested arrays
    const flattenElements = (elements) => {
      return elements.reduce((flat, el) => {
        if (Array.isArray(el)) {
          return flat.concat(flattenElements(el));
        }
        return flat.concat(el);
      }, []);
    };

    // If elements are empty, handle gracefully
    if (!this.visualSelection.elements || !this.visualSelection.elements.length) {
      return null;
    }

    // Flatten elements and collect range values
    const flattenedElements = flattenElements(this.visualSelection.elements);
    if (!flattenedElements.length) {
      return null;
    }

    const rangeValues = flattenedElements.map(el => {
      const start = el.getAttribute('data-range-start');
      const end = el.getAttribute('data-range-end');
      return {
        start: start ? parseInt(start, 10) : null,
        end: end ? parseInt(end, 10) : null
      };
    });

    // Filter out null values
    const starts = rangeValues.map(r => r.start).filter(v => v !== null);
    const ends = rangeValues.map(r => r.end).filter(v => v !== null);

    // Check if there are any valid range values
    if (!starts.length && !ends.length) {
      return null;
    }

    // Compute the min and max values
    const minRange = Math.min(...starts, ...ends);
    const maxRange = Math.max(...starts, ...ends);

    return { min: minRange, max: maxRange };
  }

  getRootSelectionElements() {
    const elements = this.visualSelection.elements?.flat() || [];
    return elements.filter(el => {
      return !elements.some(other => other !== el && other?.contains(el));
    });
  }

  getOrderedRootSelectionElements() {
    return ML.getDomOrderedElements(this.getRootSelectionElements());
  }

  setVisualSelection(range = {}) {
    // Remove all existing "selection" and "to-remove" classes
    document.querySelectorAll('.selected, .to-remove').forEach(el => {
      el.classList.remove('selected', 'to-remove');
    });

    // Update the range
    if (range.start === undefined) range.start = this.visualSelection.range.start;
    if (range.end === undefined) range.end = this.visualSelection.range.end;
    this.visualSelection.range = range;

    // Compute the text selection range
    const selectionRange = this.visualSelectionToTextRange();
    if (selectionRange) {
      this.setSelection({ start: selectionRange.min, end: selectionRange.max });
    }

    // Apply the appropriate class based on removeMode
    if (this.visualSelection.elements && this.visualSelection.elements.length) {

      // Filter out elements that are children of other selected elements
      const filteredElements = this.getRootSelectionElements();

      filteredElements.forEach(el => {
        if (this.visualSelection.removeMode) {
          el.classList.add('to-remove'); // Add "to-remove" class in removeMode
        } else {
          el.classList.add('selected'); // Add "selected" class otherwise
        }
      });
    }
  }

  handleProgressiveSelectAll() {
    if (!this.editorRef) return;

    const { leftSibling, rightSibling } = this.checkCaretSiblings();
    const caret = this.editorRef?.querySelector('.math-cursor');
    if (ML.isGrandParentType(caret, 'semantics')) {
      if (!leftSibling && !rightSibling) return;
    }

    this.clearActiveClasses();

    // Determine starting context - use getRootSelectionElements for target
    let targetElement;
    if (this.hasVisualSelection()) {
      const rootElements = this.getRootSelectionElements();
      targetElement = rootElements[0];
    } else if (this.hasCaret()) {
      targetElement = this.getCaretElement();
    } else {
      // Fallback to entire expression
      const root = this.editorRef.querySelector('mrow');
      if (!root) return;
      this.visualSelection.elements = [root];
      this.setVisualSelection();
      return;
    }

    // Find parent and get valid sibling group
    const siblingGroup = this.findValidParentForProgression(targetElement);

    if (siblingGroup.length === 0) return;

    // Preserve existing direction if it exists
    this.visualSelection.direction = undefined;
    this.visualSelection.elements = siblingGroup;
    this.setVisualSelection();
  }

  findValidParentForProgression(element) {
    let current = element;

    // Walk up to find parent
    if (this.hasCaret()) {
      current = element.parentElement;
    } else {
      current = element.parentElement;
    }

    // Handle edge case: if parent has no valid children, walk up ancestry
    while (current && !ML.isTerminator(current)) {
      if (ML.isValidForVisualSelection(current)) {
        return [current];
      }
      const validChildren = this.getValidSiblingGroup(current);
      if (validChildren.length > 0) {
        // Check if all siblings are already selected
        if (this.areAllSiblingsSelected(current)) {
          current = current.parentElement;
          continue;
        }
        return this.getValidSiblingGroup(current);
      }
      current = current.parentElement;
    }

    // Fallback to root
    return this.getValidSiblingGroup(this.editorRef.querySelector('mrow'));
  }

  getValidSiblingGroup(parent) {
    if (!parent) return [];
    return ML.getMathMLChildren(parent).filter(child =>
      ML.isValidForVisualSelection(child)
    );
  }

  areAllSiblingsSelected(parent) {
    const validSiblings = this.getValidSiblingGroup(parent);
    const currentElements = this.visualSelection.elements;

    return validSiblings.length > 0 &&
          validSiblings.every(sibling => currentElements.includes(sibling));
  }

  setInitialDirectionAndOrder(direction) {
    const currentElements = this.visualSelection.elements;
    const domOrder = ML.getDomOrderedElements(currentElements);

    if (direction === 'left') {
      // For left direction, reverse DOM order for proper shrinking
      this.visualSelection.elements = [...domOrder].reverse();
    } else {
      // For right direction, use DOM order
      this.visualSelection.elements = domOrder;
    }

    // Set the next element for visual selection range
    const lastElement = this.visualSelection.elements[this.visualSelection.elements.length - 1];
    const { element: nextElement } = this.findNextElementWithRange(lastElement, direction);

    this.setVisualSelection({ end: nextElement });
  }

  setSelectionToDoubleClickedElement(targetEl) {
    if (!targetEl || !ML.isMathMLElement(targetEl)) return;

    // Normalize to a selectable MathML element with range
    const el = targetEl.closest('[data-range-start]');
    if (!el) return;

    let elements = [el];

    const isIdent = (node) => ML.isType(node, ['mi', 'mn']);

    if (isIdent(el)) {
      const parent = el.parentElement;
      if (!parent) return;

      const siblings = [...parent.children].filter(ML.isMathMLElement);
      const index = siblings.indexOf(el);

      let l = index;
      let r = index;

      while (l > 0 && isIdent(siblings[l - 1])) l--;
      while (r < siblings.length - 1 && isIdent(siblings[r + 1])) r++;

      elements = siblings.slice(l, r + 1);
    }

    const isScript = ML.isType(el, ['msub', 'msup', 'msubsup']);
    if (isScript) {
      const hasGhostBase = [...el.children].some(child =>
        child.classList?.contains('ghost-base')
      );

      if (hasGhostBase) {
        const parent = el.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter(ML.isMathMLElement);
          const index = siblings.indexOf(el);

          if (index > 0) {
            const prev = siblings[index - 1];
            elements = [prev, ...elements];
          }
        }
      }
    }

    // ---- apply visual + logical selection ----
    this.clearActiveClasses();
    this.removeCaret();

    this.visualSelection.elements = elements;
    this.visualSelection.direction = null;

    const firstRange = ML.getRangeFromElement(elements[0]);
    const lastRange = ML.getRangeFromElement(
      elements[elements.length - 1]
    );

    if (!firstRange || !lastRange) return;

    this.setSelection({
      start: firstRange.start,
      end: lastRange.end,
    });

    this.setVisualSelection({ end: elements[elements.length - 1] });
  }

  selectEntireExpression() {
    if (!this.editorRef) return;

    const root = this.editorRef.querySelector('mrow');
    if (!root) return;

    this.visualSelection.elements = [root];
    this.setVisualSelection();
  }

  selectAllAndMarkForDeletion() {
    if (!this.editorRef) return;

    const root = this.editorRef.querySelector('mrow');
    if (!root) return;

    this.visualSelection.elements = [root];
    this.visualSelection.removeMode = true;
    this.setVisualSelection();
  }

  hasVisualSelection() {
    return this.visualSelection.elements.length > 0;
  }

  setSelection(range, silent=false) {
    this.clearAllToRemove();

    if (range.start === undefined) range.start = this.selection.range.start;
    if (range.end === undefined) range.end = this.selection.range.end;

    if (range.start === range.end) {
      this.clearVisualSelection();
    } else {
      this.removeCaret();
    }

    this.selection.active = true;
    this.selection.range = range;

    if (this.rootStore.externalStore.onSetSelection && !silent) {
      const selection = { ...toJS(this.selection) };
      this.rootStore.externalStore.onSetSelection(selection);
    }

  }

  updatePosition(direction, termJump = false) {
    this.visualSelection.removeMode = false;
    let nextPosition = 0;
    const textSelection = this.visualSelectionToTextRange();

    const excludeCurrentRanges = (ranges, currentPos) => {
      return ranges.filter(([start, end]) => !(currentPos >= start && currentPos < end));
    };

    if (textSelection) {
      const position = direction === 'left' ? textSelection.min : textSelection.max
      nextPosition = this.findNearestAllowedPosition(position);
    } else {
      const currentPos = this.selection.range.end;

      const baseExclusions = excludeCurrentRanges(this.semanticRanges.lowerComponents, currentPos);
      const complementExclusions = this.getComplementRangesForPosition(currentPos);
      const exclusionRanges = [...baseExclusions, ...complementExclusions]
      if (termJump) {
        const nonTermDelimitPoints = this.getPositions().filter(val => !this.semanticRanges.termDelimitPoints.includes(val));
        exclusionRanges.push(...nonTermDelimitPoints);
        const caret = this.getCaretElement();
        if (caret?.parentElement) {
          const niblingPos = [];
          const siblings = ML.getMathMLChildren(caret.parentElement);
          siblings.forEach(el => {
            const descendants = el.querySelectorAll('[data-range-start][data-range-end]');
            descendants.forEach(desc => {
              const range = ML.getRangeFromElement(desc);
              if (range) {
                niblingPos.push([range.start, range.end]);
              }
            });
          });
          exclusionRanges.push(...niblingPos)
        }
      }

      nextPosition = this.findNearestAllowedPosition(currentPos, direction, exclusionRanges);

    }
    this.setSelection({
      start: nextPosition,
      end: nextPosition
    });
    this.setCaretBasedOnPosition();
  }

  jumpToStart() {
    this.visualSelection.removeMode = false;
    this.setSelection({start: 0, end: 0});
    this.setCaretBasedOnPosition();
  }

  jumpToEnd() {
    this.visualSelection.removeMode = false;
    const end = this.rootStore.mathStore.expression?.length ?? 0;
    this.setSelection({start: end, end: end});
    this.setCaretBasedOnPosition();
  }

  clearEverything() {
    if (this.editorRef) {
      // Remove all transient classes
      this.editorRef
        .querySelectorAll('.active, .selected, .to-remove')
        .forEach(el => {
          el.classList.remove('active', 'selected', 'to-remove');
        });
    }

    this.removeCaret();

    // Reset visual selection state
    this.visualSelection.elements = [];
    this.visualSelection.direction = undefined;
    this.visualSelection.removeMode = false;
    this.visualSelection.lastPosition = null;
    this.visualSelection.range = { start: null, end: null };

    this.clearHighlights();

    if (this.rootStore.smartMenuStore.isOpen) {
      this.rootStore.smartMenuStore.close();
    }

    this.isEditorDisabled = true;

  }

  clearSelection() {
    this.selection.active = false;
    this.selection.range = { start: 0, end: 0 };
    this.clearActiveClasses();
  }

  setDragging(value) {
    this.isDragging = value;
  }

  clearActiveClasses() {
    if (this.editorRef) {
      const activeElements = this.editorRef.querySelectorAll('.active');
      activeElements.forEach((el) => el.classList.remove('active'));
    }
  }

  // New methods for DOM operations
  clearAllToRemove() {
    if (!this.editorRef) return;
    const elementsToRemove = this.editorRef.querySelectorAll('.to-remove');
    elementsToRemove.forEach((el) => el.classList.remove('to-remove'));
  }

  extendSelectionBetween(anchorEl, focusEl) {
    if (!anchorEl || !focusEl) return;

    // Determine direction
    const ordered = ML.getDomOrderedElements([anchorEl, focusEl]);
    const direction = ordered[0] === anchorEl ? "right" : "left";
    this.visualSelection.direction = direction;

    let elements = ML.getMinimalSiblingRange(anchorEl, focusEl);

    if (!elements.length) {
      const root = this.editorRef.querySelector("mrow");
      if (!root) return;
      elements = ML.getMathMLChildren(root);
      if (!elements.length) return;
    }

    this.clearActiveClasses();
    this.removeCaret();

    const domOrder = ML.getDomOrderedElements(elements);
    elements = direction === "left" ? [...domOrder].reverse() : domOrder;
    this.visualSelection.elements = elements;

    const lastEl = elements[elements.length - 1];
    const { element: nextElement } =
      this.findNextElementWithRange(lastEl, direction);

    this.setVisualSelection({ end: nextElement });
  }

  extendSelectionToClick(clickedEl) {
    let anchorEl = null;

    if (this.hasCaret()) {
      const caret = this.getCaretElement();
      const left  = caret.previousElementSibling;
      const right = caret.nextElementSibling;

      const ordered = ML.getDomOrderedElements([caret, clickedEl]);
      const direction = ordered[0] === caret ? "right" : "left";
      this.visualSelection.direction = direction;

      anchorEl = direction === "right"
        ? right || caret.parentElement
        : left  || caret.parentElement;

    } else if (this.hasVisualSelection()) {
      const roots = this.getRootSelectionElements();
      anchorEl = roots[0];
    } else {
      return;
    }

    this.extendSelectionBetween(anchorEl, clickedEl);
  }

  tryAdjustKernAmount(caret, delta, direction = "both") {
    const kernCommand = "\\mkern";

    const previous = caret.previousElementSibling;
    const next = caret.nextElementSibling;
    let target = null;

    if (["before", "both"].includes(direction) && ML.isType(previous, "mspace")) {
      target = previous;
    } else if (["after", "both"].includes(direction) && ML.isType(next, "mspace")) {
      target = next;
    } else {
      return false;
    }

    if (!ML.isType(target, "mspace")) return false;
    if (target?.classList.contains("neg-width")) return false;

    const range = ML.getRangeFromElement(target);
    if (!range) return false;
    const kernTex = this.rootStore.mathStore.expression.slice(range.start, range.end);

    const match = kernTex.match(/\\mkern\{\s*([+-]?\d*\.?\d+)\s*mu\s*\}/);
    if (!match) return false;

    const currentValue = parseFloat(match[1]);
    const newValue = currentValue + delta;

    if (newValue <= 0) {
      this.rootStore.mathStore.removeRange(range.start, range.end);
    } else {
      const formattedValue = Number.isInteger(newValue)
        ? newValue
        : newValue.toFixed(1);
      const newKernTex = `${kernCommand}{+${formattedValue}mu}`;
      this.rootStore.mathStore.insertSymbol(newKernTex, range);
    }

    return true;
  }

  // TODO: Expand to support other kerns and not just mkern
  handleSpace() {
    if (!this.editorRef) return;

    const caret = this.editorRef.querySelector('.math-cursor');

    if (!this.tryAdjustKernAmount(caret, 4, "both")) {
      this.insertCharacter("\\mkern{+4mu}");
    }
  }

  handleEscape() {
    if (this.visualSelection.removeMode) {
      this.visualSelection.removeMode = false;
      this.setVisualSelection();
    } else if (this.visualSelection.elements.length) {
      this.cancelAllSelections();
    } else {
      this.clearEverything();
    }
  }

  handleEnter() {
    if (!this.editorRef) return false;

    let source = null;

    // 1. Prefer caret
    const caret = this.editorRef.querySelector('.math-cursor');
    if (caret) {
      source = caret;
    }
    // 2. Otherwise use visual selection
    else if (this.visualSelection.elements?.length) {
      const roots = this.getOrderedRootSelectionElements();
      if (!roots.length) return false;

      source = roots[0];

      // If multiple root elements are selected, lift to parent
      if (roots.length > 1) {
        source = source.parentElement;
      }
    }

    if (!source) return false;

    // 3. Find nearest enclosing ranged container
    const container = source.closest('mrow[data-range-end]');
    if (!container) return false;

    if (ML.isType(container.parentElement, "mtd")) {
      const table = container.closest("mtable[data-range-end]");
      if (table && !ML.isRootMrow(table.parentElement)) {
        const pos = this.getValidPosition(table, "end");
        if (pos != null) {
          this.clearVisualSelection();
          this.setSelection({ start: pos, end: pos });
          this.setCaretBasedOnPosition();
          return true;
        }
      }
    }

    // Do not exit the root container
    if (ML.isRootMrow(container)) {
      return false;
    }

    const pos = this.getValidPosition(container, "end");
    if (pos == null) return false;

    // 4. Normalize state and move caret
    this.clearVisualSelection();
    this.setSelection({ start: pos, end: pos }, false);
    this.updatePosition("right");

    return true;
  }

  cancelAllSelections() {
    this.clearAllToRemove();
    if (this.visualSelection.lastPosition !== null) {
      const pos = this.visualSelection.lastPosition;
      this.visualSelection.lastPosition = null;
      this.setSelection({
        start: pos,
        end: pos
      });
      this.setCaretBasedOnPosition();
    } else {
      this.updatePosition();
    }
  }

  getElementsMarkedForRemoval() {
    if (!this.editorRef) return [];
    return Array.from(this.editorRef.querySelectorAll('.to-remove'));
  }

  markElementsForRemoval(elements) {
    if (Array.isArray(elements)) {
      elements.forEach((element) => {
        if (element) {
          element.classList.add('to-remove');
        }
      });
    } else if (elements) {
      elements.classList.add('to-remove');
    }
  }


  dissolveTextBlock() {
    const caret = this.editorRef.querySelector('.math-cursor');
    if (!caret) return;
    const mrow = caret.parentElement;
    if (!ML.isType(mrow, "mrow")) return;
    const mstyle = mrow.parentElement;
    if (!ML.isType(mstyle, ["mstyle", "munder"])) return;

    const expression = this.rootStore.mathStore.expression;

    const contentRange = ML.getRangeFromElement(mrow);
    const fullRange = ML.getRangeFromElement(mstyle);

    const contentTex = expression.slice(contentRange.start + 1, contentRange.end - 1);

    this.rootStore.mathStore.insertSymbol(contentTex, fullRange, { noSurroundingWhitespace: true });
  }

  hasDelimiterInVisualSelection() {
    if (!this.rootStore.editorStore.hasVisualSelection()) return false;
    const elements = this.rootStore.editorStore.visualSelection.elements || [];
    return elements.some(el => ML.isDelimiter(el));
  }

  enterArrayEditMode(array) {
    this.am.start(array);
  }

  tryCommitDelimGroup() {

    const elements = this.getOrderedVisualElements();

    if (!elements || elements.length === 0) return;

    const { latex, fullStart, fullEnd } = this.buildDelimGroupLatex(elements);

    this.rootStore.mathStore.insertSymbol(latex, { start: fullStart, end: fullEnd });
  }

  buildDelimGroupLatex(elements) {
    const expression = this.rootStore.mathStore.expression;

    let fullStart = Infinity;
    let fullEnd = -Infinity;
    const latexParts = [];

    const safePush = (arr, str) => {
      const last = arr[arr.length - 1] || "";
      const needsSpace = last.length > 0 && !last.endsWith(" ") && !str.startsWith(" ");
      arr.push(needsSpace ? " " + str : str);
    };

    latexParts.push(`\\left.`);

    for (const el of elements) {
      const range = ML.getRangeFromElement(el);
      if (!range) continue;

      if (range.start < fullStart) fullStart = range.start;
      if (range.end > fullEnd) fullEnd = range.end;

      const text = expression.slice(range.start, range.end);
      if (!text) continue;

      if (ML.isDelimiter(el)) {
        const { delimiter } = TP.extractModifierAndDelimiter(text);
        safePush(latexParts, `\\middle${delimiter}`);
      } else {
        safePush(latexParts, text);
      }
    }

    safePush(latexParts, `\\right.`);

    return {
      latex: latexParts.join(""),
      fullStart,
      fullEnd,
    };
  }

  dissolveCurrentGroup() {
    // Use ToolbarStateStore's enhanced group detection instead of direct parent check
    const delimiterGroup = this.rootStore.toolbarStateStore.determineDelimiterGroup();
    if (!delimiterGroup || !delimiterGroup.groupElement) return;

    const group = delimiterGroup.groupElement;
    const elements = [...group.children].filter(el => ML.isMathMLElement(el));
    if (elements.length === 0) return;

    const expression = this.rootStore.mathStore.expression;

    const getText = (el) => {
      const range = ML.getRangeFromElement(el);
      return range ? expression.slice(range.start, range.end) : "";
    };

    const safePush = (arr, str) => {
      const last = arr[arr.length - 1] || "";
      const needsSpace = last.length > 0 && !last.endsWith(" ") && !str.startsWith(" ");
      arr.push(needsSpace ? " " + str : str);
    };

    const newLatexParts = [];

    for (const el of elements) {
      const text = getText(el);
      if (!text) continue;

      if (ML.isDelimiter(el)) {
        const { modifier, delimiter } = TP.extractModifierAndDelimiter(text);
        if (["\\left", "\\middle", "\\right"].includes(modifier)) {
          if (delimiter !== ".") {
            safePush(newLatexParts, delimiter);
          }
        } else {
          safePush(newLatexParts, delimiter);
        }
      } else {
        safePush(newLatexParts, text);
      }
    }

    const finalLatex = newLatexParts.join("");

    const parentRange = ML.getRangeFromElement(group);

    this.rootStore.mathStore.insertSymbol(finalLatex, parentRange);
  }

  determineArrayState() {
    if (this.isGeneratingMathML) return null;

    const caret = this.editorRef?.querySelector('.math-cursor');
    if (!caret) return null;

    const currentCell = ML.findAncestorOfType(caret, "mtd");
    if (!currentCell) return null;

    const currentRow = ML.getParent(currentCell);
    const mtable = ML.getGrandParent(currentCell);
    if (!currentRow || !mtable || !ML.isType(mtable, "mtable")) return null;

    const environmentType = ML.getArrayEnvironmentType(mtable);
    const isSmallMatrix = environmentType === 'smallmatrix';
    const isSubarray = environmentType === 'subarray';

    const rows = Array.from(mtable.children).filter(ML.isMathMLElement);
    const rowIndex = rows.indexOf(currentRow);

    const cells = Array.from(currentRow.children).filter(ML.isMathMLElement);
    const cellIndex = cells.indexOf(currentCell);

    let alignment = currentCell.style.textAlign || "center";
    alignment = alignment.replace(/^-webkit-/, "");

    const range = ML.getRangeFromElement(mtable);
    const input = this.rootStore.mathStore.expression.slice(range.start, range.end);

    const result = TP.analyzeSingleArray(input) || {};
    const spacings = (result.rows || []).map(row => row.spacing);

    return {
      table: mtable,
      rowIndex,
      cellIndex,
      alignment,
      spacings,
      environmentType,
      isSmallMatrix,
      isSubarray,
      canAlign: !isSmallMatrix,
    };
  }

  mutateArray(array, rowIndex, colIndex, command, commandArg = null) {
    const range = ML.getRangeFromElement(array);
    const input = this.rootStore.mathStore.expression.slice(range.start, range.end);
    const relativePos = this.selection.range.end - range.start;
    const updatedInput = input.slice(0, relativePos) + POS_CHAR + input.slice(relativePos);
    const mutatedArray = TP.mutateArray(updatedInput, rowIndex, colIndex, command, commandArg);
    if (!mutatedArray) {
      return;
    }
    this.rootStore.mathStore.insertSymbol(mutatedArray, range);
  }



  tryCollapseEmptyContainer() {
    if (!this.editorRef) return false;

    const caret = this.editorRef.querySelector('.math-cursor');
    if (!caret) return false;

    const deletingArg = caret.parentElement;
    if (!deletingArg) return false;

    const parent = deletingArg?.parentElement;
    const gp = parent?.parentElement;

    if (ML.isType(parent, ["msup", "msub", "mfrac", "munder", "mover"])) {

      if (ML.isType(parent, "mover") && ML.isArrow(ML.getFirstChild(parent))) {
        const funcRange = ML.getRangeFromElement(parent);

        if (!ML.isEmptyElement(deletingArg)) return false;
        if (!funcRange) return false;

        // Get the x-arrow command
        const xArrowTex = this.rootStore.mathStore.expression.slice(funcRange.start, funcRange.end);

        // Find the matching base arrow command
        let baseArrowCommand = null;
        for (const [xCmd, baseCmd] of Object.entries(REVERSE_ARROW_MAPPINGS)) {
          if (xArrowTex.includes(xCmd)) {
            baseArrowCommand = baseCmd;
            break;
          }
        }

        if (baseArrowCommand) {
          this.rootStore.mathStore.insertSymbol(baseArrowCommand, funcRange);
          return true;
        }
      }

      const mathChildren = [...parent.children].filter(child => ML.isMathMLElement(child));
      if (mathChildren[1] !== deletingArg) return false;

      if (!ML.isEmptyElement(deletingArg)) return false;

      const argRange = ML.getRangeFromElement(mathChildren[0]);
      const funcRange = ML.getRangeFromElement(parent);

      if (mathChildren[0].classList.contains('ghost-base')) {
        this.rootStore.mathStore.removeRange(funcRange.start, funcRange.end)
        return true;
      }

      if (!argRange || !funcRange) return false;

      const rawTex = this.rootStore.mathStore.expression.slice(argRange.start, argRange.end);
      const newTex = TP.stripOuterBraces(rawTex);

      this.rootStore.mathStore.insertSymbol(newTex, funcRange);

      return true;
    } else if (ML.isType(parent, ["munderover", "msubsup"])) {
      const mathChildren = [...parent.children].filter(child => ML.isMathMLElement(child));
      if (mathChildren.length !== 3) return false;

      if (!ML.isEmptyElement(deletingArg)) return false;

      const baseArgRange = ML.getRangeFromElement(mathChildren[0]);
      const botArgRange = ML.getRangeFromElement(mathChildren[1]);
      const topArgRange = ML.getRangeFromElement(mathChildren[2]);
      const funcRange = ML.getRangeFromElement(parent);

      if (!botArgRange || !topArgRange || !funcRange) return false;

      const baseTex = baseArgRange
        ? this.rootStore.mathStore.expression.slice(baseArgRange.start, baseArgRange.end)
        : "";

      let newTex = "";

      if (mathChildren[1] === deletingArg) {
        const argTex = this.rootStore.mathStore.expression.slice(topArgRange.start, topArgRange.end);
        newTex = `${baseTex}^${argTex}`;
      } else if (mathChildren[2] === deletingArg) {
        const argTex = this.rootStore.mathStore.expression.slice(botArgRange.start, botArgRange.end);
        newTex = `${baseTex}_${argTex}`;
      } else {
        return false;
      }

      this.rootStore.mathStore.insertSymbol(newTex, funcRange);
      return true;

    } else if (ML.isType(parent, "mroot")) {
      const mathChildren = [...parent.children].filter(child => ML.isMathMLElement(child));
      if (mathChildren.length !== 2) return false;

      if (!ML.isEmptyElement(deletingArg)) return false;

      const radicand = mathChildren[0];
      const index = mathChildren[1];
      const funcRange = ML.getRangeFromElement(parent);

      if (!funcRange) return false;

      if (deletingArg === index) {
        const radicandRange = ML.getRangeFromElement(radicand);
        if (!radicandRange) return false;

        const radicandTex = this.rootStore.mathStore.expression.slice(radicandRange.start, radicandRange.end);
        const newTex = `${POS_CHAR}\\sqrt${radicandTex}`;

        this.rootStore.mathStore.insertSymbol(newTex, funcRange);
        return true;
      }

      return false;
    }

    return false;
  }

  tryDissolveDecoration(direction) {
    const caret = this.editorRef?.querySelector('.math-cursor');
    if (!caret) return false;

    const base = caret.parentElement;
    const parent = base?.parentElement;
    if (!base || !parent) return false;

    if (!ML.isType(parent, ["mover", "munder"])) return false;

    const [first, second] = ML.getMathMLChildren(parent);
    if (!first || !second) return false;

    const baseRange = ML.getRangeFromElement(first);
    const accentRange = ML.getRangeFromElement(second);
    const funcRange = ML.getRangeFromElement(parent);

    if (!baseRange || accentRange || base !== first || !funcRange)
      return false;

    if (ML.getMathMLChildren(first).length === 0) return false;

    const atStart = first.firstElementChild === caret;
    const atEnd   = first.lastElementChild === caret;

    if (
      (direction === "backward" && !atStart) ||
      (direction === "forward" && !atEnd)
    ) return false;

    const baseTex = this.rootStore.mathStore.expression.slice(
      baseRange.start,
      baseRange.end
    );

    const baseTexWithPos =
      direction === "backward"
        ? ` ${POS_CHAR} ${baseTex}`
        : `${baseTex} ${POS_CHAR} `;

    this.rootStore.mathStore.insertSymbol(baseTexWithPos, funcRange);
    return true;
  }

  handleBackspace(requireConfirmation = true, termJump = false) {
    if (this.isAtFirstPosition()) return;
    this._handleErase("backward", requireConfirmation, termJump);
  }

  handleDelete(requireConfirmation = true, termJump = false) {
    if (this.isAtLastPosition()) return;
    this._handleErase("forward", requireConfirmation, termJump);
  }

  _handleErase(direction, requireConfirmation = true, termJump = false) {
    if (!this.editorRef) return;
    if (!this.rootStore.mathStore.expression) return;

    // Shared selection logic
    if (this.hasVisualSelection()) {
      if (!this.visualSelection.removeMode) {
        this.visualSelection.removeMode = true;
        this.setVisualSelection();
        if (requireConfirmation) return;
      }
      this.removeVisualSelection();
      return;
    }

    const caret = this.editorRef.querySelector('.math-cursor');
    if (!caret) return;

    const kernDir = direction === "backward" ? "before" : "after";

    if (!termJump) {
      if (this.tryDissolveDecoration(direction)) return;
      if (this.tryCollapseEmptyContainer()) return;
      if (this.tryAdjustKernAmount(caret, -4, kernDir)) return;

      // Directional primitive/neg-width handling
      if (direction === "backward") {
        // Existing Backspace behavior
        const nextEl = this.visualSelection.range.end;
        if (ML.isPrimitive(nextEl) || ML.hasMathFontFromMpadded(nextEl)) {
          const endRange = ML.getRangeFromElement(nextEl);
          if (!endRange) return;

          let start = endRange.start;

          const prevEl = nextEl.previousElementSibling;
          if (prevEl?.classList.contains('neg-width')) {
            const negRange = ML.getRangeFromElement(prevEl);
            if (negRange) start = negRange.start;
          }

          this.rootStore.mathStore.removeRange(start, endRange.end);
          this.clearActiveClasses();
          this.removeCaret();
          return;
        }
      } else {
        // Forward Delete behavior
        const nextEl = caret.nextElementSibling;
        if (ML.isPrimitive(nextEl) || ML.hasMathFontFromMpadded(nextEl)) {
          const elemRange = ML.getRangeFromElement(nextEl);
          if (!elemRange) return;

          this.rootStore.mathStore.removeRange(elemRange.start, elemRange.end);
          this.clearActiveClasses();
          this.removeCaret();
          return;
        }
      }
    }

    // Fallback: start selection mode in the appropriate direction
    if (this.hasCaret()) {
      this.visualSelection.removeMode = true;
      const selDir = direction === "backward" ? "left" : "right";
      this.adjustSelection(selDir, termJump);
      if (!requireConfirmation) {
        this.removeVisualSelection();
      }
    }
  }

  findClosestEdge(parentEl, xCoord) {
    const candidates = [];

    function traverse(el) {
      if (!ML.isMathMLElement(el)) return;

      const rect = el.getBoundingClientRect();

      const leftDist = Math.abs(rect.left - xCoord);
      const rightDist = Math.abs(rect.right - xCoord);

      candidates.push({
        element: el,
        edge: "start",
        distance: leftDist,
      });

      candidates.push({
        element: el,
        edge: "end",
        distance: rightDist,
      });

      for (const child of el.children) {
        traverse(child);
      }
    }

    for (const child of parentEl.children) {
      traverse(child);
    }

    const ranked = candidates
      .filter(c => ML.getRangeFromElement(c.element))
      .sort((a, b) => a.distance - b.distance);

    if (ranked.length === 0) return null;

    return {
      element: ranked[0].element,
      edge: ranked[0].edge,
    };
  }

  moveVertical(direction) {
    if (!this.editorRef) return;
    const caret = this.editorRef.querySelector('.math-cursor');
    if (!caret) return;

    let current = caret.parentElement;

    while (current && !ML.isTerminator(current)) {
      if (ML.isType(current, "mtd") && ML.isGrandParentType(current, "mtable")) {
        const currentRow = ML.getParent(current);
        const mtable = ML.getGrandParent(current);

        const rows = Array.from(mtable.children).filter(ML.isMathMLElement);
        const rowIndex = rows.indexOf(currentRow);

        const currentCells = Array.from(currentRow.children).filter(ML.isMathMLElement);
        const cellIndex = currentCells.indexOf(current);

        const nextRow = rows[rowIndex + (direction === "down" ? 1 : -1)];
        if (nextRow) {
          const nextCells = Array.from(nextRow.children).filter(ML.isMathMLElement);
          const nextCell = nextCells[cellIndex];

          if (nextCell) {
            const nextCellContent = ML.getFirstChild(nextCell) || nextCell;
            const caretRect = caret.getBoundingClientRect();
            const x = caretRect.left + caretRect.width / 2;
            const { element, edge } = this.findClosestEdge(nextCellContent, x) || {};
            const position = this.getValidPosition(element || nextCellContent, edge || "end");
            this.setSelection({ start: position, end: position });
            this.setCaretBasedOnPosition();
            return;
          }
        }
      }
      if (ML.isType(current, "mfrac")) {
        const [top, bottom] = [...current.children].filter(el => ML.isMathMLElement(el));

        const from = direction === "down" ? top : bottom;
        const to = direction === "down" ? bottom : top;

        if (from.contains(caret)) {
          const caretRect = caret.getBoundingClientRect();
          const x = caretRect.left + caretRect.width / 2;
          const { element, edge } = this.findClosestEdge(to, x) || {};
          const position = this.getValidPosition(element || to, edge || "end");
          this.setSelection({ start: position, end: position });
          this.setCaretBasedOnPosition();
          return;
        }
      } else if (ML.isType(current, "munderover") || ML.isType(current, "msubsup")) {
        const children = [...current.children].filter(el => ML.isMathMLElement(el));
        if (children.length !== 3) return;

        const under = children[1];
        const over = children[2];

        const from = direction === "down" ? over : under;
        const to = direction === "down" ? under : over;

        if (from.contains(caret)) {
          const caretRect = caret.getBoundingClientRect();
          const x = caretRect.left + caretRect.width / 2;
          const { element, edge } = this.findClosestEdge(to, x) || {};
          const position = this.getValidPosition(element || to, edge || "end");
          this.setSelection({ start: position, end: position });
          this.setCaretBasedOnPosition();
          return;
        }
      } else if (ML.isType(current, "munder")) {

        const children = [...current.children].filter(ML.isMathMLElement);
        if (children.length !== 2) return;

        const base = children[0];
        const under = children[1];

        if (!ML.hasLimit(base)) {
          // overset
          const from = direction === "down" ? base : under;
          const to = direction === "down" ? under : base;

          if (ML.isType(to, "munder")) {
            current = to;
            continue;
          }

          // dup code
          if (ML.getRangeFromElement(to)) {
            const caretRect = caret.getBoundingClientRect();
            const x = caretRect.left + caretRect.width / 2;
            const { element, edge } = this.findClosestEdge(to, x) || {};
            const position = this.getValidPosition(element || to, edge || "end");
            this.setSelection({ start: position, end: position });
            this.setCaretBasedOnPosition();
            return;
          }

        }

        // Handle nested munder (underbrace-style)
        if (ML.isType(base, "munder")) {
          const baseBase = ML.getFirstChild(base); // base of underbrace
          const from = direction === "down" ? baseBase : under;
          const to = direction === "down" ? under : baseBase;

          if (from && from.contains(caret)) {
            const caretRect = caret.getBoundingClientRect();
            const x = caretRect.left + caretRect.width / 2;
            const { element, edge } = this.findClosestEdge(to, x) || {};
            const position = this.getValidPosition(element || to, edge || "end");
            this.setSelection({ start: position, end: position });
            this.setCaretBasedOnPosition();
            return;
          }
        }
      } else if (ML.isType(current, "mover")) {
        const children = [...current.children].filter(ML.isMathMLElement);
        if (children.length !== 2) return;

        const base = children[0];
        const over = children[1];

        if (!ML.hasLimit(base)) {
          // overset
          const from = direction === "down" ? over : base;
          const to   = direction === "down" ? base : over;

          if (ML.isType(to, "mover")) {
            current = to;
            continue;
          }

          // dup code
          if (ML.getRangeFromElement(to)) {
            const caretRect = caret.getBoundingClientRect();
            const x = caretRect.left + caretRect.width / 2;
            const { element, edge } = this.findClosestEdge(to, x) || {};
            const position = this.getValidPosition(element || to, edge || "end");
            this.setSelection({ start: position, end: position });
            this.setCaretBasedOnPosition();
            return;
          }
        }

        // Handle nested mover (overbrace-style)
        if (ML.isType(base, "mover")) {
          const baseBase = ML.getFirstChild(base); // base of overbrace
          const from = direction === "down" ? over : baseBase;
          const to   = direction === "down" ? baseBase : over;

          if (from && from.contains(caret)) {
            const caretRect = caret.getBoundingClientRect();
            const x = caretRect.left + caretRect.width / 2;
            const { element, edge } = this.findClosestEdge(to, x) || {};
            const position = this.getValidPosition(element || to, edge || "end");
            this.setSelection({ start: position, end: position });
            this.setCaretBasedOnPosition();
            return;
          }
        }
      }

      current = current.parentElement;
    }
  }

  handleDown() {
    this.moveVertical("down");
  }

  handleUp() {
    this.moveVertical("up");
  }

  removeVisualSelection() {
    if (!this.hasVisualSelection()) return;

    const texRange = this.visualSelectionToTextRange();
    if (!texRange) return;

    // Get ordered visual elements (left-most first)
    const ordered = this.getOrderedVisualElements();
    if (!ordered.length) return;

    let start = texRange.min;
    let end = texRange.max;

    // Check for neg-width before the first selected element
    const firstEl = ordered[0];
    const prevEl = firstEl?.previousElementSibling;

    if (prevEl?.classList.contains('neg-width')) {
      const negRange = ML.getRangeFromElement(prevEl);
      if (negRange) start = Math.min(start, negRange.start);
    }

    // Perform the removal
    this.rootStore.mathStore.removeRange(start, end);
    this.visualSelection.removeMode = false;
  }

  findNearestAllowedPosition(currentPos, direction, excludedRanges = []) {
    const isInExcludedRange = (pos) => {
      return excludedRanges.some(range => {
        if (Array.isArray(range)) {
          const [start, end] = range;
          return pos >= start && pos < end;
        } else {
          return pos === range;
        }
      });
    };

    const sortedPositions = [...this.getPositions()]
      .filter(pos => !isInExcludedRange(pos))
      .sort((a, b) => a - b);

    if (direction === "left") {
      return sortedPositions
        .filter(pos => pos < currentPos)
        .pop() ?? sortedPositions[0];
    } else if (direction === "right") {
      return sortedPositions.find(pos => pos > currentPos) ?? sortedPositions.at(-1);
    } else {
      return sortedPositions.reduce((closest, pos) =>
        Math.abs(pos - currentPos) < Math.abs(closest - currentPos) ? pos : closest,
        sortedPositions[0]
      );
    }
  }

  // A very strange wrapper method that I don't think we need
  insertCharacter(key, range = null, options = null) {
    if (key === '/') return;
    this.rootStore.mathStore.insertSymbol(key, range, options);
  }

  getSymbolContext(symbol, specialTransformations = false) {

    const symbolContext = {
      anchorElement: null,
      injectionRange: null,
      injectionHintElement: null,
      canInject: false,
      modifiedTex: "",
      injectionArgNumber: null,
      options: null,
    }

    const options = {
      removeRanges: []
    };

    const hasCaret = this.hasCaret(); // getCaretElement // (fix method name)
    const caret = hasCaret && this.getCaretElement();
    const hasSelection = !hasCaret && !!this.visualSelection.elements?.length;
    const selectedRoots = hasSelection && this.getOrderedRootSelectionElements();
    const hasMultipleRootSelections = hasSelection && selectedRoots.length > 1;

    const canShowAnchor = TP.hasArgument(symbol.latex, 0);
    let anchorElement = canShowAnchor && (caret || selectedRoots?.[0])?.previousElementSibling

    const argNr = 1;
    const canInjectElements = hasSelection && TP.hasArgument(symbol.latex, argNr);

    const selectionIsPrimative = hasSelection && selectedRoots.length === 1 && ML.isType(selectedRoots[0], ["mn", "mi", "mo"]);
    const injectionHintElement = selectionIsPrimative && selectedRoots[0];

    let modifiedTex = "";


    if (ML.isScripted(anchorElement) && ["sup", "sub", "subsup"].includes(symbol?.id)) {

      if (symbol?.id === "sup" && ML.isType(anchorElement, ["msup", "msubsup"])) {
        modifiedTex = TP.replacePlaceholder(symbol.latex, "{}", 0);
        anchorElement = null;
      }
      if (symbol?.id === "sub" && ML.isType(anchorElement, ["msub", "msubsup"])) {
        modifiedTex = TP.replacePlaceholder(symbol.latex, "{}", 0);
        anchorElement = null;
      }
      if (symbol?.id === "subsup" && ML.isType(anchorElement, ["msup", "msub", "msubsup"])) {
        modifiedTex = TP.replacePlaceholder(symbol.latex, "{}", 0);
        anchorElement = null;
      }

    } else if (canShowAnchor) {
      anchorElement = ML.isType(anchorElement, ["mn", "mi", "mo"]) ? anchorElement : document.createElement("mrow");
    }

    if (canShowAnchor) {
      if (ML.isType(anchorElement, ["msup"]) && symbol?.id === "sub") {

      }

    }

    if (specialTransformations && ML.isArrow(anchorElement) && symbol?.id === "sup") {

      const range = ML.getRangeFromElement(anchorElement);
      if (range) {
        const arrowTex = this.rootStore.mathStore.expression.slice(range.start, range.end);
        const xArrowCommand = ARROW_MAPPINGS[arrowTex.trim()];
        if (xArrowCommand) {
          modifiedTex = `${xArrowCommand}{Ꞩ1}`;
          options.removeRanges.push([range.start, range.end])
        }
      }
    }

    let injectionRange = null;

    if (specialTransformations && hasCaret && symbol?.id === "frac") {
      const beforeCaret = caret.previousElementSibling;
      const validTypes = ["mn", "mi"];
      const matchedElements = [];

      let current = beforeCaret;

      while (current && ML.isType(current, validTypes)) {
        matchedElements.unshift(current); // Add to front to maintain order
        current = current.previousElementSibling;
      }

      injectionRange = ML.getFullRange(matchedElements);

    }

    //symbolContext.anchorElement = anchorElement;
    symbolContext.injectionHintElement = injectionHintElement; // if greater than 1 then obviousl we don't show everything
    symbolContext.injectionRange = injectionRange;
    symbolContext.canInject = true; // Not really sure if this will ever be needed (or maybe matrices?)
    symbolContext.modifiedTex = modifiedTex;
    symbolContext.injectionArgNumber = canInjectElements && argNr || null;
    symbolContext.options = options;

    return symbolContext;
  }

  // Apply a smart-menu result using the active editor selection.
  insertSmartMenuResult(result) {
    const { smartMenuStore, mathStore, symbolStore } = this.rootStore;

    // --- NEW: Support for executable results ---
    if (typeof result.execute === 'function') {
      try {
        result.execute();
      } catch (err) {
        console.error('Smart menu execute() failed:', err);
      }
      smartMenuStore.close();
      return;
    }

    // --- Normal LaTeX insertion fallback ---
    const insertOptions =
      result.category === 'Text Commands'
        ? { noSurroundingWhitespace: true }
        : undefined;

    let latexToInsert = result.latex;

    if (!latexToInsert) {
      console.warn('SmartMenu: result has no latex or execute handler:', result);
      smartMenuStore.close();
      return;
    }

    mathStore.insertSymbol(latexToInsert, null, insertOptions);

    if (!['transform'].includes(result.type)) {
      symbolStore.addRecentSymbol(result);
    }

    smartMenuStore.close();
  }

  async handlePaste(event) {
    try {
      const text = event.clipboardData.getData("text/plain")?.trim()
      if (!text) return

      this.processPastedText(text)
    } catch (err) {
      console.error("Paste failed:", err)
      this.rootStore.notificationStore.showError("Paste failed")
    }
  }

  processPastedText(rawText) {
    try {
      let text = TP.extractMathContent(rawText)?.trim()
      if (!text) return

      const expanded = lme.expandString(text)
      this.rootStore.mathStore.insertSymbol(expanded)

    } catch (err) {
      console.error("Processing pasted text failed:", err)
      this.rootStore.notificationStore.showError("Paste failed")
    }
  }

  handleCut(event) {
    if (!this.hasVisualSelection()) return

    const text = this.getSelectionText()
    if (text) {
      this.copyWithExport({ event, text, silent: true, action: "Cut" })
    }

    this.removeVisualSelection()
  }

  async copySelection(event) {
    const text = this.getSelectionText()
    if (!text) return
    await this.copyWithExport({ event, text, action: "Copied", silent: true})
  }

  async downloadImage(pxPerEm = 32, download = true) {
    const expr = this.rootStore.mathStore.expression;
    if (!expr) return;

    try {
      const exportedLatex = lme.exportString(expr);

      await window.MathJax.startup.promise;

      // Render SVG
      const mj = await window.MathJax.tex2svgPromise(exportedLatex, {
        display: true,
      });

      const svg = mj.querySelector("svg");
      if (!svg) throw new Error("MathJax did not produce SVG.");

      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // -----------------------------------------------------
      // 1. Read MathJax width/height (in `ex`)
      // -----------------------------------------------------
      function parseEx(value) {
        const m = String(value).trim().match(/^([0-9.+-eE]+)ex$/);
        if (!m) throw new Error("Width/height not in ex units.");
        return parseFloat(m[1]);
      }

      const widthEx = parseEx(svg.getAttribute("width"));
      const heightEx = parseEx(svg.getAttribute("height"));

      // -----------------------------------------------------
      // 2. Convert ex → em
      // -----------------------------------------------------
      const exFactor =
        window.MathJax?.startup?.output?.options?.exFactor ?? 0.5;

      const widthEm = widthEx / exFactor;
      const heightEm = heightEx / exFactor;

      // -----------------------------------------------------
      // 3. Final PNG dimensions
      // -----------------------------------------------------
      const finalW = Math.max(1, Math.ceil(widthEm * pxPerEm));
      const finalH = Math.max(1, Math.ceil(heightEm * pxPerEm));

      // -----------------------------------------------------
      // 4. Normalize SVG so rasterizers do not add padding
      // -----------------------------------------------------
      //
      // The internal SVG coordinate system doesn't matter.
      // We simply tell browsers: "this SVG is widthEm × heightEm"
      //
      svg.setAttribute("width", `${widthEm}`);
      svg.setAttribute("height", `${heightEm}`);
      svg.style.width = "";
      svg.style.height = "";

      // Serialize
      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(svgBlob);

      // -----------------------------------------------------
      // 5. Rasterize
      // -----------------------------------------------------
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = finalW;
      canvas.height = finalH;

      const ctx = canvas.getContext("2d");

      // Draw scaled into final resolution
      ctx.drawImage(img, 0, 0, finalW, finalH);

      const pngBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!pngBlob) throw new Error("Canvas.toBlob() failed.");

      const pngUrl = URL.createObjectURL(pngBlob);

      // -----------------------------------------------------
      // 6. Download
      // -----------------------------------------------------
      if (download) {
        const a = document.createElement("a");
        a.href = pngUrl;
        const id = Math.random().toString(36).slice(2, 8);
        a.download = `eq_${id}_${pxPerEm}px.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // copy blob to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob })
        ]);
      }

      URL.revokeObjectURL(svgUrl);
      URL.revokeObjectURL(pngUrl);
    } catch (err) {
      console.error("PNG Export failed:", err);
      this.rootStore.notificationStore.showError(
        "Export failed — invalid expression"
      );
    }
  }

  async copyFullExpression() {
    const expr = this.rootStore.mathStore.expression
    if (!expr) return

    try {
      let exported = lme.exportString(expr)
      if (exported && exported.trim() !== "") {
        exported = `$${exported}$`
      }
      await this.copy({ text: exported, label: "Copied" })
    } catch (err) {
      console.error("Export failed:", err)
      this.rootStore.notificationStore.showError("Copy failed — invalid expression")
    }
  }

  async copyWithExport({ event = null, text, action = "Copied", silent = false }) {
    let toCopy = text
    try {
      let exported = lme.exportString(text)
      if (exported && exported.trim() !== "") {
        exported = `$${exported}$`
      }
      toCopy = exported
    } catch (err) {
      console.error("Export failed for selection:", err)
      this.rootStore.notificationStore.showError(`${action} (raw only — export failed)`)
    }
    await this.copy({ event, text: toCopy, label: action, silent })
  }

  async copy({ event = null, text, label = "Copied", silent = false }) {
    if (!text) return
    try {
      if (event) {
        try {
          event.preventDefault()
          event.clipboardData.setData("text/plain", text)
        } catch {
          await navigator.clipboard.writeText(text)
        }
      } else {
        await navigator.clipboard.writeText(text)
      }

      if (!silent) this.rootStore.notificationStore.showSuccess(label)
    } catch (err) {
      console.error("Clipboard write failed:", err)
      this.rootStore.notificationStore.showError("Clipboard not accessible")
    }
  }

  getSelectionText() {
    const range = this.selection.range
    return this.rootStore.mathStore.expression.slice(range.start, range.end)?.trim()
  }

  setScriptMode(element, newMode) {
    const currentMode = this.rootStore.toolbarStateStore.determineScriptMode(element);
    if (currentMode === newMode) return;

    const scriptInfo = ML.getScriptInfo(element);
    if (!scriptInfo) return;

    const scriptRange = ML.getRangeFromElement(element);
    const expression = this.rootStore.mathStore.expression;

    if (newMode === 'detached' && currentMode === 'attached') {
      let insertionPoint = scriptRange.start;
      if (ML.isType(element, ["mover", "munder", "munderover"])) {
        const components = ML.getMathMLChildren(element);
        const base = components[0];
        const baseRange = ML.getRangeFromElement(base);
        if (baseRange) {
          insertionPoint = baseRange.end;
        }
      }
      this.rootStore.mathStore.insertSymbol('{}', { start: insertionPoint, end: insertionPoint }, { keepCaret: true });
    } else if (newMode === 'attached' && currentMode === 'detached') {
      const baseRange = ML.getRangeFromElement(scriptInfo.base);
      const baseTex = expression.slice(baseRange.start, baseRange.end);
      this.rootStore.mathStore.removeRange(baseRange.start, baseRange.end, { keepCaret: true });
    }
  }

  // Boundary detection for Quill integration
  isAtFirstPosition() {
    const positions = this.getPositions();
    if (positions.length === 0) return false;
    return this.selectionIsCaret() && this.selection.range.start === positions[0];
  }

  isAtLastPosition() {
    const positions = this.getPositions();
    if (positions.length === 0) return false;
    return this.selectionIsCaret() && this.selection.range.start === positions[positions.length - 1];
  }

  // Enter blot at specific position
  enterAtFirstPosition() {
    this.setSelection({ start: 0, end: 0 });
    this.setCaretBasedOnPosition();
    this.setFocus();
  }

  enterAtLastPosition() {
    const positions = this.getPositions();
    if (positions.length > 0) {
      const last = this.rootStore.mathStore.expression.length;
      this.setSelection({ start: last, end: last });
      this.setCaretBasedOnPosition();
      this.setFocus();
    }
  }

}
