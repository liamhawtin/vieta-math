import { makeAutoObservable, reaction } from 'mobx';
import { MMLInspector as ML } from "@utils/MMLInspector";
import { TeXProcessor as TP } from '@utils/TeXProcessor';
import { ARROW_MAPPINGS, LAYOUT_MODE_OPTIONS } from '@constants';

export class ToolbarStateStore {
  rootStore;
  activeCategory = 'Fonts';
  previousToolbarCategory = null;

  disabledCategories = [];

  // Enhanced hover state management for array toolbar
  hoverState = {
    rowDelete: {
      active: false,
      targetIndex: null
    },
    columnDelete: {
      active: false,
      targetIndex: null
    }
  };

  guidanceState = {
    relevant: new Set()
  };

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false
    });
    this.rootStore = rootStore;
  }

  isTabHighlighted(category) {
    return this.guidanceState.relevant.has(category);
  }

  inspectCurrentContext() {
    const { editorStore, mathStore } = this.rootStore;
    const { visualSelection, editorRef } = editorStore;
    const sel = visualSelection.elements;
    const caret = editorRef?.querySelector('.math-cursor');
    const startEl = sel.length === 1 ? sel[0] : caret;

    if (!startEl) {
      this.guidanceState.relevant = new Set([]);
      return;
    }

    const ctx = new Set();
    let active = 'Fonts';

    //
    // ---- High-Priority Overrides ----
    //

    let delim = null;
    if (sel.length === 1) delim = ML.getDelimiter(sel[0]);
    else if (caret) delim = ML.getDelimiter(caret, 'left');
    if (delim) {
      ctx.add('Delimiters');
      active = 'Delimiters';
    }

    const beforeCaret = caret?.previousElementSibling;
    if (active === 'Fonts' && ML.isType(beforeCaret, 'mspace')) {
      ctx.add('Spacing');
      active = 'Spacing';
    }

    // Stay in the fonts tab
    /*
    if ((active === 'Home' && sel?.length === 1 && (ML.hasMathFontFromMpadded?.(sel[0]) || ML.isType(sel[0], ['mn', 'mi']))) ||
        (this.activeCategory === 'Fonts' && beforeCaret && (ML.hasMathFontFromMpadded?.(beforeCaret) || ML.isType(beforeCaret, ['mn', 'mi'])))) {
      ctx.add('Fonts');
      active = 'Fonts';
    }
    */

    // Stay in advanced tab
    if (this.activeCategory === 'Advanced' &&
        (caret && ML.findAncestor(caret, el => ML.isScripted(el))) ||
         caret?.closest('.layout-style')) {
      ctx.add('Advanced');
      active = 'Advanced';
    }

    const pos = editorStore.selection?.range?.start - 1;
    const expr = mathStore.expression;
    if (active === 'Fonts' && TP.getAllEnclosingTextCommands(expr, pos)?.length) {
      ctx.add('Text');
      active = 'Text';
    }

    //
    // ---- DOM Proximity Context ----
    //
    if (caret) {
      const candidates = [
        { name: 'Arrays', el: caret.closest('mtd') },
        { name: 'Delimiters', el: caret.closest('.delimited-group') },
        { name: 'Visibility', el: caret.closest('mphantom') },
        { name: 'Visibility', el: caret.closest('mpadded') }
      ].filter(c => c.el && (c.name !== 'Visibility' || ML.getPhantomType(c.el)));

      // If multiple match, choose the innermost (closest ancestor)
      if (candidates.length) {
        let closest = candidates[0];
        for (const c of candidates) {
          ctx.add(c.name);
          if (closest.el.contains(c.el)) {
            closest = c;
          }
        }
        if (active === 'Fonts') {
          active = closest.name;
        }
      }
    }

    if (!ctx.size) ctx.add('Fonts');

    this.guidanceState.relevant = ctx;
    this.setActiveCategory(active);
  }

  /**
   * Set the active toolbar category
   */
  setActiveCategory(category) {
    this.activeCategory = category;
  }

  /**
   * Handle clicks on space elements to automatically switch to Spacing tab
   */
  handleSpaceElementClick(element) {
    // Check if element is mspace with range data
    if (ML.isType(element, ['mspace']) && ML.getRangeFromElement(element)) {
      this.setActiveCategory('Spacing');
      return true; // Indicate we handled this click
    }
    return false;
  }

  /**
   * Single entry point for delimiter toolbar state
   * Returns standardized state object with all delimiter-related information
   */
  getDelimiterToolbarState() {
    const delimiterState = this.determineDelimiterState();
    const delimiterGroup = this.determineDelimiterGroup();
    const hasDelimiterInSelection = this.rootStore.editorStore.hasDelimiterInVisualSelection();

    // Check if the current delimiter is part of the detected group
    const isDelimiterInGroup = delimiterState && delimiterGroup &&
      this.isDelimiterPartOfGroup(delimiterState.element, delimiterGroup);

    return {
      isAvailable: Boolean(delimiterState || delimiterGroup || hasDelimiterInSelection),
      currentState: delimiterState,
      actions: {
        // Only allow creating a group if we have a delimiter (not just inside a group)
        canDissolve: Boolean(delimiterGroup),
        // Allow modifying size for any delimiter, but Auto only for delimiters in groups
        canModifySize: Boolean(delimiterState),
        canModifyAuto: Boolean(delimiterState && isDelimiterInGroup),
        canGroupSelection: Boolean(hasDelimiterInSelection)
      },
      metadata: {
        targetElement: delimiterState?.element || null,
        groupElement: delimiterGroup?.groupElement || null,
        delimiters: delimiterGroup?.delimiters || [],
        hasSelectionWithDelimiters: hasDelimiterInSelection,
        isDelimiterInGroup: isDelimiterInGroup
      }
    };
  }

  /**
   * Enhanced delimiter group detection with MathML DOM tree traversal
   * Replaces the limited EditorStore.getCurrentDelimiterGroup() method
   */
  determineDelimiterGroup() {
    if (!this.rootStore.editorStore.editorRef) return null;

    let startElement;
    const caret = this.rootStore.editorStore.editorRef.querySelector('.math-cursor');

    if (caret) {
      startElement = caret;
    } else if (this.rootStore.editorStore.visualSelection.elements.length === 1) {
      startElement = this.rootStore.editorStore.visualSelection.elements[0];
    } else {
      return null;
    }

    // Walk up the MathML DOM tree from cursor position or selected element
    let current = startElement;

    while (current && !ML.isTerminator(current)) {
      // Check if current element is a delimiter group
      if (current.classList && current.classList.contains('delimited-group')) {
        // Extract delimiter information from the group
        const delimiters = this.extractDelimitersFromGroup(current);

        return {
          groupElement: current,
          delimiters: delimiters,
          canDissolve: delimiters.length > 0
        };
      }

      // Move up to parent element
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Extract delimiter information from a delimiter group element
   */
  extractDelimitersFromGroup(groupElement) {
    const delimiters = [];
    const expression = this.rootStore.mathStore.expression;

    // Find all <mo fence="true"> elements within the group
    const fenceElements = Array.from(groupElement.children).filter(el =>
      ML.isMathMLElement(el) && ML.isDelimiter(el)
    );

    fenceElements.forEach(el => {
      const range = ML.getRangeFromElement(el);
      if (range) {
        const delimiterTex = expression.slice(range.start, range.end);
        const delimiterInfo = TP.extractModifierAndDelimiter(delimiterTex);

        delimiters.push({
          element: el,
          range: range,
          modifier: delimiterInfo.modifier,
          delimiter: delimiterInfo.delimiter,
          tex: delimiterTex
        });
      }
    });

    return delimiters;
  }

  /**
   * Determine current delimiter state
   * Moved from EditorStore.getCurrentDelimiterState()
   */
  determineDelimiterState() {
    let delim;
    const caret = this.rootStore.editorStore.editorRef?.querySelector('.math-cursor');

    if (caret) {
      delim = ML.getDelimiter(caret, "left");
    } else if (this.rootStore.editorStore.visualSelection.elements.length === 1) {
      const el = this.rootStore.editorStore.visualSelection.elements[0];
      delim = ML.getDelimiter(el);
    } else {
      return null;
    }

    if (!delim) return null;

    const delimTex = this.rootStore.mathStore.expression.slice(delim.range.start, delim.range.end);
    const delimInfo = TP.extractModifierAndDelimiter(delimTex);
    delimInfo.range = delim.range;
    delimInfo.element = delim.element;

    return delimInfo;
  }

  /**
   * Check if a delimiter element is part of a delimiter group
   */
  isDelimiterPartOfGroup(delimiterElement, delimiterGroup) {
    if (!delimiterElement || !delimiterGroup) return false;

    // Check if the delimiter element is one of the delimiters in the group
    return delimiterGroup.delimiters.some(groupDelim => {
      // Direct match (unwrapped delimiters)
      if (groupDelim.element === delimiterElement) return true;

      // Check if delimiter is inside a wrapper (wrapped delimiters)
      if (ML.isType(groupDelim.element, "mrow") &&
          groupDelim.element.classList.contains("delimiter-wrapper")) {
        const wrappedDelimiter = ML.getFirstChild(groupDelim.element);
        return wrappedDelimiter === delimiterElement;
      }

      return false;
    });
  }

  /**
   * Single entry point for limit toolbar state
   * Returns standardized state object with all limit-related information
   */
  getLimitToolbarState() {
    const limitState = this.determineLimitState();

    return {
      isAvailable: Boolean(limitState),
      currentState: limitState,
      actions: {
        canInsertLower: Boolean(limitState && (limitState.type === null || limitState.type === "over")),
        canInsertUpper: Boolean(limitState && (limitState.type === null || limitState.type === "under"))
      },
      metadata: {
        targetElement: limitState?.element || null,
        limitType: limitState?.type || null
      }
    };
  }

  /**
   * Determine current limit state information
   * Migrated from EditorStore.getCurrentLimitState()
   */
  determineLimitState() {
    const el = this.rootStore.editorStore.getValidCaretSibling('left');
    if (!el) return null;

    if (ML.hasLimit(el)) {
      return { element: el, type: null };
    }

    if (ML.isType(el, ["mover", "munder"])) {
      const child = ML.getFirstChild(el);
      if (ML.hasLimit(child)) {
        const type = ML.isType(el, "mover") ? "over" : "under";
        return { element: child, type };
      }
    }

    return null;
  }

  /**
   * Single entry point for sqrt toolbar state
   * Returns standardized state object with all sqrt-related information
   */
  getSqrtToolbarState() {
    const sqrtState = this.determineSqrtState();

    return {
      isAvailable: Boolean(sqrtState),
      currentState: sqrtState,
      actions: {
        canInsertIndex: Boolean(sqrtState)
      },
      metadata: {
        targetElement: sqrtState || null,
        sqrtType: sqrtState ? 'msqrt' : null
      }
    };
  }

  /**
   * Determine current sqrt state information
   * Migrated from EditorStore.getCurrentSqrtState()
   */
  determineSqrtState() {
    const caret = this.rootStore.editorStore.editorRef?.querySelector('.math-cursor');
    const el = this.rootStore.editorStore.getValidCaretSibling('left');

    if (ML.isType(el, "msqrt")) {
      return el;
    } else if (ML.isGrandParentType(caret, "msqrt")) {
      return caret.parentElement.parentElement;
    }

    return null;
  }

  /**
   * Single entry point for underbrace toolbar state
   * Returns standardized state object with all underbrace-related information
   */
  getUnderbraceToolbarState() {
    const underbraceState = this.determineUnderbraceState();

    return {
      isAvailable: Boolean(underbraceState),
      currentState: underbraceState,
      actions: {
        canInsertSubscript: Boolean(underbraceState)
      },
      metadata: {
        targetElement: underbraceState?.element || null,
        underbraceType: underbraceState ? 'munder' : null
      }
    };
  }

  /**
   * Determine current underbrace state information
   * Migrated from EditorStore.getCurrentUnderbraceState()
   */
  determineUnderbraceState() {
    const caret = this.rootStore.editorStore.editorRef?.querySelector('.math-cursor');
    const el = this.rootStore.editorStore.getValidCaretSibling('left');
    if (!el) return null;

    if (ML.isUnderbrace(el)) {
      return { element: el };
    } else {
      const gp = ML.getGrandParent(caret);
      const ggp = ML.getParent(gp);
      if (ML.isUnderbrace(gp) && !ML.isType(ggp, "munder")) {
        return { element: gp };
      }
    }

    return null;
  }

  /**
   * Single entry point for arrow toolbar state
   * Returns standardized state object with all arrow-related information
   */
  getArrowToolbarState() {
    const arrowState = this.determineArrowState();

    return {
      isAvailable: Boolean(arrowState),
      currentState: arrowState,
      actions: {
        canInsertContent: Boolean(arrowState && !arrowState.isXArrow)
      },
      metadata: {
        targetElement: arrowState?.element || null,
        arrowType: arrowState?.command || null,
        isXArrow: Boolean(arrowState?.isXArrow)
      }
    };
  }

  /**
   * Determine current arrow state information
   * Migrated from EditorStore.getCurrentArrowState()
   */
  determineArrowState() {
    const el = this.rootStore.editorStore.getValidCaretSibling('left');
    if (!el) return null;

    // Check if it's an arrow or x-arrow
    const isArrow = ML.isArrow(el);
    const isXArrow = ML.isXArrow(el);

    if (!isArrow && !isXArrow) return null;

    // Get the base arrow element
    const arrowElement = ML.getArrowBaseElement(el);
    if (!arrowElement) return null;

    // Get the LaTeX representation
    const range = ML.getRangeFromElement(isXArrow ? el : arrowElement);
    if (!range) return null;

    const arrowTex = this.rootStore.mathStore.expression.slice(range.start, range.end);

    // Determine the arrow command
    let arrowCommand = null;
    for (const [cmd, _] of Object.entries(ARROW_MAPPINGS)) {
      if (arrowTex.includes(cmd)) {
        arrowCommand = cmd;
        break;
      }
    }

    // For x-arrows, also get the content range
    let contentRange = null;
    if (isXArrow) {
      const contentElement = Array.from(el.children).find(child =>
        ML.isMathMLElement(child) && !ML.isArrow(child)
      );

      if (contentElement) {
        contentRange = ML.getRangeFromElement(contentElement);
      }
    }

    return {
      element: isXArrow ? el : arrowElement,
      baseElement: arrowElement,
      isXArrow,
      command: arrowCommand,
      range,
      contentRange
    };
  }

  /**
   * Single entry point for script toolbar state
   * Returns standardized state object with all script-related information
   */
  getScriptToolbarState() {
    const scriptState = this.determineScriptState();

    return {
      isAvailable: Boolean(scriptState),
      currentState: scriptState,
      actions: {
        canToggleMode: Boolean(scriptState)
      },
      metadata: {
        scriptElement: scriptState?.element || null,
        scriptType: scriptState?.type || null,
        nestingLevel: scriptState?.level || 0
      }
    };
  }

  /**
   * Determine current script state information
   * Migrated from EditorStore.getCurrentScriptState()
   */
  determineScriptState() {
    // Check caret position for script context
    const caret = this.rootStore.editorStore.editorRef?.querySelector('.math-cursor');
    let scriptElement = null;

    if (caret) {
      scriptElement = ML.findAncestor(caret, el => ML.isScripted(el));
    } else if (this.rootStore.editorStore.visualSelection.elements.length === 1) {
      const selected = this.rootStore.editorStore.visualSelection.elements[0];
      if (ML.isScripted(selected)) {
        scriptElement = selected;
      }
    }

    if (!scriptElement) return null;

    // Analyze script structure
    const scriptInfo = ML.getScriptInfo(scriptElement);
    if (!scriptInfo) return null;

    // Determine attached vs detached mode
    const mode = this.determineScriptMode(scriptElement);

    // Calculate nesting level
    const level = this.calculateScriptLevel(scriptElement);

    const typeMap = {
      'msup': 'superscript',
      'msub': 'subscript',
      'msubsup': 'subsuperscript',
      'mover': 'superscript',
      'munder': 'subscript',
      'munderover': 'subsuperscript'
    };

    return {
      type: typeMap[scriptInfo.type] || null,
      level,
      mode,
      element: scriptElement,
      base: scriptInfo.base,
      scripts: scriptInfo.scripts
    };
  }

  determineScriptMode(scriptElement) {
    if (ML.isType(scriptElement, ["mover", "munder", "munderover"])) {
      return 'attached';
    }

    const internalBase = ML.getMathMLChildren(scriptElement)?.[0];
    if (ML.hasClass(internalBase, 'ghost-base') || !ML.getRangeFromElement(internalBase)) {
      return 'attached';
    }

    return 'detached';
  }

  /**
   * Calculate script nesting level
   * Migrated from EditorStore.calculateScriptLevel()
   */
  calculateScriptLevel(scriptElement) {
    let level = 1;
    let current = scriptElement.parentElement;

    while (current && !ML.isTerminator(current)) {
      if (ML.isScripted(current)) {
        level++;
      }
      current = current.parentElement;
    }

    return level;
  }

  getLayoutToolbarState() {
    const layoutState = this.determineLayoutState();

    return {
      isAvailable: Boolean(layoutState),
      currentState: layoutState,
      actions: {
        canModify: Boolean(layoutState)
      },
      metadata: {
        layoutCommand: layoutState?.layoutCommand ?? null,
        layoutRange: layoutState?.layoutRange ?? null,
        scopeElement: layoutState?.scopeElement ?? null,
        contentElement: layoutState?.contentElement ?? null,
        scopeRange: layoutState?.scopeRange ?? null,
        contentRange: layoutState?.contentRange ?? null
      }
    };
  }

  determineLayoutState() {
    const selected =
      this.rootStore.editorStore.getRootSelectionElements();

    let layoutWrapper = null;

    const caret =
      this.rootStore.editorStore.editorRef
        ?.querySelector('.math-cursor');

    if (caret) {
      layoutWrapper = caret.closest('.layout-style');
      if (!layoutWrapper) return null;

      for (
        let n = caret.parentElement;
        n && n !== layoutWrapper && !ML.isRootMrow(n);
        n = n.parentElement
      ) {
        if (
          ML.isType(n, 'mrow') &&
          n !== layoutWrapper.firstElementChild
        ) {
          return null;
        }
      }
    } else {
      // Selection paths (trusted)
      if (ML.isFullSiblingGroup(selected)) {
        layoutWrapper =
          selected[0]?.parentElement?.parentElement ?? null;
      } else if (
        selected.length === 1 &&
        selected[0].children?.length === 1
      ) {
        layoutWrapper = selected[0].children[0];
      }

      if (!layoutWrapper?.classList.contains('layout-style')) {
        return null;
      }
    }

    const scopeElement = layoutWrapper.parentElement;
    const contentElement = layoutWrapper.firstElementChild;
    if (!scopeElement || !contentElement) return null;

    const scopeRange = ML.getRangeFromElement(scopeElement);
    const contentRange = ML.getRangeFromElement(contentElement);
    if (!scopeRange || !contentRange) return null;

    const expression = this.rootStore.mathStore.expression;

    const raw = expression.slice(
      scopeRange.start,
      contentRange.start
    );

    const layoutTypes = LAYOUT_MODE_OPTIONS
      .map(o => o.type)
      .filter(Boolean);

    let layoutCommand = null;
    let layoutRange = null;

    const match = layoutTypes.reduce(
      (best, type) => {
        const idx = raw.lastIndexOf(type);
        return idx === -1 || (best && best.idx > idx)
          ? best
          : { type, idx };
      },
      null
    );

    if (match) {
      layoutCommand = match.type;
      layoutRange = {
        start: scopeRange.start + match.idx,
        end: scopeRange.start + match.idx + match.type.length
      };
    }

    return {
      type: layoutCommand,
      layoutCommand,
      layoutRange,
      layoutWrapper,
      scopeElement,
      contentElement,
      scopeRange,
      contentRange
    };
  }

  highlightLayoutMode(el) {
    if (!el) return;
    this.clearLayoutModeHighlight();
    el.classList.add('layout-mode-target');
  }

  clearLayoutModeHighlight() {
    if (!this.rootStore.editorStore.editorRef) return;
    const highlightedElements = this.rootStore.editorStore.editorRef.querySelectorAll('.layout-mode-target');
    highlightedElements.forEach(el => {
      el.classList.remove('layout-mode-target');
    });
  }

  /**
   * Highlight delimiter group for visual feedback
   */
  highlightDelimiterGroup(groupElement) {
    if (!groupElement) return;

    // Clear any existing highlights
    this.clearDelimiterHighlight();

    // Add highlight class to the group
    groupElement.classList.add('delimiter-group-highlight');
  }

  /**
   * Clear delimiter group highlighting
   */
  clearDelimiterHighlight() {
    if (!this.rootStore.editorStore.editorRef) return;

    const highlightedElements = this.rootStore.editorStore.editorRef.querySelectorAll('.delimiter-group-highlight');
    highlightedElements.forEach(el => {
      el.classList.remove('delimiter-group-highlight');
    });
  }

  /**
   * Highlight target delimiter for sizing operations
   */
  highlightTargetDelimiter(delimiterElement) {
    this.clearTargetHighlight();
    if (delimiterElement) {
      delimiterElement.classList.add('target-delimiter-highlight');
    }
  }

  /**
   * Clear target delimiter highlighting
   */
  clearTargetHighlight() {
    if (!this.rootStore.editorStore.editorRef) return;
    const highlighted = this.rootStore.editorStore.editorRef.querySelectorAll('.target-delimiter-highlight');
    highlighted.forEach(el => el.classList.remove('target-delimiter-highlight'));
  }

  getSpacingToolbarState(element) {
    const spacingInfo = this.determineSpacingInfo(element);

    return {
      isAvailable: Boolean(spacingInfo),
      currentState: spacingInfo,
      actions: {
        canAdjust: Boolean(spacingInfo),
        canCreate: true
      },
      metadata: {
        direction: spacingInfo?.direction || null,
        targetElement: spacingInfo?.element || null,
        horizontal: spacingInfo?.horizontal || spacingInfo?.value || 0,
        vertical: spacingInfo?.vertical || { height: 0, shift: 0 },
        range: spacingInfo?.range || null
      }
    };
  }

  determineSpacingInfo(element) {
    const caret = this.rootStore.editorStore.editorRef?.querySelector('.math-cursor');
    if (!caret && !element) return null;

    const check = (el, direction) => {
      let range, text;

      // Check mspace elements (mkern)
      if (ML.isType(el, "mspace")) {
        range = ML.getRangeFromElement(el);
        if (!range) return null;
        text = this.rootStore.mathStore.expression.slice(range.start, range.end);
      }
      /*
      // Check mpadded elements (standalone rules)
      else if (ML.isType(el, "mpadded")) {
        const mspace = el.querySelector('mspace[mathbackground]');
        if (!mspace) return null; // Not a rule

        range = ML.getRangeFromElement(el);
        if (!range) return null;
        text = this.rootStore.mathStore.expression.slice(range.start, range.end);
      }
      // CHECK PHANTOM ELEMENTS (phantom-wrapped rules)
      else if (ML.isType(el, "mphantom")) {
        // Look for mpadded -> mspace inside the phantom
        const mpadded = el.querySelector('mpadded');
        const mspace = mpadded?.querySelector('mspace[mathbackground]');
        if (!mspace || !mpadded) return null; // Not a phantom rule

        range = ML.getRangeFromElement(el); // Use the phantom's range
        if (!range) return null;
        text = this.rootStore.mathStore.expression.slice(range.start, range.end);
      }
      */
      else {
        return null;
      }

      const mkernMatch = text.match(/\\mkern\{\s*([+-]?\d*\.?\d+)\s*mu\s*\}/);
      if (mkernMatch) {
        return {
          type: 'mkern',
          horizontal: parseFloat(mkernMatch[1]),
          vertical: { height: 0, shift: 0 },
          direction, range, element: el
        };
      }

      /*
      // Check for phantom-wrapped rule (now guaranteed to be in mu)
      const phantomRuleMatch = text.match(/^\\phantom\{\s*\\rule(?:\[([+-]?\d*\.?\d+)mu\])?\{([+-]?\d*\.?\d+)mu\}\{([+-]?\d*\.?\d+)mu\}\s*\}/);
      if (phantomRuleMatch && !ML.isLinearMathMLChain(el)) {
        return null;
      }
      if (phantomRuleMatch) {
        return {
          type: 'rule',
          horizontal: parseFloat(phantomRuleMatch[2]),
          vertical: {
            height: parseFloat(phantomRuleMatch[3]),
            shift: phantomRuleMatch[1] ? parseFloat(phantomRuleMatch[1]) : 0
          },
          isPhantom: true,
          direction, range, element: el
        };
      }

      // Check for standalone rule (now guaranteed to be in mu)
      const ruleMatch = text.match(/^\\rule(?:\[([+-]?\d*\.?\d+)mu\])?\{([+-]?\d*\.?\d+)mu\}\{([+-]?\d*\.?\d+)mu\}/);
      if (ruleMatch) {
        return {
          type: 'rule',
          horizontal: parseFloat(ruleMatch[2]),
          vertical: {
            height: parseFloat(ruleMatch[3]),
            shift: ruleMatch[1] ? parseFloat(ruleMatch[1]) : 0
          },
          isPhantom: false,
          inPhantom: ML.isGrandParentType(el, "mphantom"),
          direction, range, element: el
        };
      }
      */

      return null;
    };

    if (element) {
      return check(element);
    }

    return (
      check(caret.previousElementSibling, "before") || null
    );
  }

  getTextToolbarState() {
    const chain = this.determineTextChain();

    return {
      isAvailable: chain.length > 0,
      chain,
      current: chain.at(-1) || null,
      actions: {
        canCreate: true,
        canDissolve: chain.length > 0,
        canModify: chain.length > 0,
      },
    };
  }

  determineTextChain() {
    const position = this.rootStore.editorStore.selection.range.start - 1;
    const expression = this.rootStore.mathStore.expression;

    const res = TP.getAllEnclosingTextCommands(expression, position);
    return res || [];
  }

  /**
   * Single entry point for font toolbar state
   * Returns standardized state object with all font-related information
   */
  getFontToolbarState() {
    const fontState = this.determineFontState();

    // De we really need metadata?

    return {
      isAvailable: Boolean(fontState && fontState.previewText),
      currentState: fontState,
      actions: {
        canApply: Boolean(fontState && fontState.range),
        canPreview: Boolean(fontState && fontState.previewText)
      },
      metadata: {
        previewText: fontState?.previewText || 'x',
        currentCommand: fontState?.command || null,
        range: fontState?.range || null,
        targetElement: fontState?.element || null
      }
    };
  }

  /**
   * Determine current font state information
   * Migrated from EditorStore font methods
   */
  determineFontState() {
    if (!this.rootStore.editorStore.editorRef) return null;

    let type = "OTHER" // "UPPER" | "LOWER" | "NUMBER"

    const caret = this.rootStore.editorStore.editorRef.querySelector('.math-cursor');
    // The selected sibling may have any MathML element name.
    let mstyle = caret?.previousElementSibling;
    if (!caret) {
      const filteredElements = this.rootStore.editorStore.getRootSelectionElements();
      if (filteredElements.length === 1) {
        mstyle = filteredElements[0];
      }
    }
    if (!mstyle) return null;

    const expression = this.rootStore.mathStore.expression;
    let previewRange = null;
    let fontableRange = null;
    let currentCommand = null;
    let previewText = null;

    // Check if we have a font-styled element
    if (ML.hasMathFontFromMpadded(mstyle)) {
      const mrow = mstyle.firstElementChild;
      const prim = mrow?.firstElementChild;

      const mrowRange = ML.getRangeFromElement(mrow);
      fontableRange = ML.getRangeFromElement(mstyle);
      previewRange = ML.getRangeFromElement(prim);
      if (!previewRange) return;
      previewText = expression.slice(previewRange.start, previewRange.end).trim();
      if (!(mrowRange && fontableRange && previewRange)) return;
      currentCommand = expression.slice(fontableRange.start, mrowRange.start).trim();

      if (ML.isType(prim, "mi")) {
        if (/^[A-Z]$/.test(previewText)) {
          type = "UPPER";
        } else if (/^[a-z]$/.test(previewText)) {
          type = "LOWER";
        }
      } else if (ML.isType(prim, "mn")) {
        type = "NUMBER"
      }

    }
    // Check if we have a plain <mi> element
    else if (ML.isType(mstyle, "mi") && !ML.isLinFunc(mstyle)) {
      const mi = mstyle;
      previewRange = ML.getRangeFromElement(mi);
      if (!previewRange) return;
      previewText = expression.slice(previewRange.start, previewRange.end).trim();
      fontableRange = ML.getRangeFromElement(mi);
      currentCommand = mi.getAttribute("mathvariant") === "normal" ? "\\mathrm" : "\\mathit";

      if (/^[A-Z]$/.test(previewText)) {
        type = "UPPER";
      } else if (/^[a-z]$/.test(previewText)) {
        type = "LOWER";
      }

    } else if (ML.isType(mstyle, "mn")) {
      const mn = mstyle;
      previewRange = ML.getRangeFromElement(mn);
      if (!previewRange) return;
      previewText = expression.slice(previewRange.start, previewRange.end).trim();
      fontableRange = ML.getRangeFromElement(mn);
      currentCommand = "\\mathrm";
      type = "NUMBER"
    }

    if (!previewRange || !fontableRange || !previewText) return null;

    return {
      type,
      previewText,
      command: currentCommand,
      range: fontableRange,
      element: mstyle
    };
  }

  /**
   * Single entry point for array toolbar state
   * Returns standardized state object with all array-related information
   */
  getArrayToolbarState() {
    const arrayState = this.rootStore.editorStore.determineArrayState();

    return {
      isAvailable: Boolean(arrayState),
      currentState: arrayState,
      actions: {
        canModifyRow: Boolean(arrayState),
        canModifyColumn: Boolean(arrayState),
        canAddRow: Boolean(arrayState),
        canAddColumn: Boolean(arrayState),
        canDeleteRow: Boolean(arrayState),
        canDeleteColumn: Boolean(arrayState)
      },
      metadata: {
        table: arrayState?.table || null,
        rowIndex: arrayState?.rowIndex || 0,
        cellIndex: arrayState?.cellIndex || 0,
        alignment: arrayState?.alignment || 'center',
        spacings: arrayState?.spacings || []
      }
    };
  }

  /**
   * Set hover state for array toolbar elements
   * @param {string} type - 'rowDelete' or 'columnDelete'
   * @param {boolean} isActive - Whether hover is active
   * @param {number} targetIndex - Optional target index for hover
   */
  setHoverState(type, isActive, targetIndex = null) {
    if (!this.hoverState[type]) return;

    this.hoverState[type].active = isActive;
    this.hoverState[type].targetIndex = targetIndex;

    // Immediately update highlights for current context
    this.updateHighlightsForCurrentContext();
  }

  /**
   * Update highlights based on current hover state and array position
   * This is the core method that solves the highlighting synchronization issue
   */
  updateHighlightsForCurrentContext() {
    const arrayState = this.getArrayToolbarState();

    // If no array context, clear highlights and return
    if (!arrayState.isAvailable) {
      this.rootStore.editorStore.clearHighlights();
      return;
    }

    const { table, rowIndex, cellIndex } = arrayState.metadata;

    // Priority system: row delete hover takes precedence over column delete
    if (this.hoverState.rowDelete.active) {
      this.rootStore.editorStore.highlightRow(table, rowIndex);
    } else if (this.hoverState.columnDelete.active) {
      this.rootStore.editorStore.highlightColumn(table, cellIndex);
    } else {
      this.rootStore.editorStore.clearHighlights();
    }
  }

  /**
   * Clear all hover states - used for cleanup
   */
  clearAllHoverStates() {
    this.hoverState.rowDelete.active = false;
    this.hoverState.rowDelete.targetIndex = null;
    this.hoverState.columnDelete.active = false;
    this.hoverState.columnDelete.targetIndex = null;

    this.rootStore.editorStore.clearHighlights();
  }

  /**
   * Check if any hover state is currently active
   */
  get isAnyHoverActive() {
    return this.hoverState.rowDelete.active || this.hoverState.columnDelete.active;
  }

  isTabDisabled(category) {
    return this.disabledCategories.includes(category);
  }

  /**
   * Single entry point for visibility toolbar state
   * Returns standardized state object with all phantom-related information
   */
  getVisibilityToolbarState() {
    const phantomState = this.determinePhantomState();

    return {
      isAvailable: Boolean(phantomState),
      currentState: phantomState,
      actions: {
        canCreate: Boolean(phantomState && phantomState.context === 'creation'),
        canModify: Boolean(phantomState && phantomState.context === 'editing'),
      },
      metadata: {
        targetElement: phantomState?.targetElement || null,
        isInsidePhantom: Boolean(phantomState && phantomState.context === 'editing'),
        hasValidSelection: Boolean(phantomState && phantomState.context === 'creation'),
        phantomType: phantomState?.type || null,
        phantomInfo: phantomState
      }
    };
  }

  determinePhantomState() {
    let phantom;
    const filteredElements = this.rootStore.editorStore.getRootSelectionElements();

    const caret = this.rootStore.editorStore.editorRef?.querySelector('.math-cursor');
    if (caret) {
      // Check if caret is truly inside phantom argument content
      phantom = ML.getPhantomFromCaret(caret);
      if (phantom && this.isCaretInsidePhantomArgument(caret, phantom)) {
        return {
          context: 'editing',
          type: phantom.type,
          commandRange: phantom.commandRange,
          argumentRange: phantom.argumentRange,
          targetElement: phantom.wrapper
        };
      }
    }

    if (filteredElements.length) {
      const el = filteredElements[0];

      // Check if selection is inside a phantom (disable phantom options)
      if (filteredElements.some(el => ML.getPhantomFromCaret(el))) {
        return null;
      }

      if (filteredElements.length === 1) {
        // Single element selected - check if it's a phantom wrapper
        phantom = ML.getPhantom(el);
        if (phantom) {
          return {
            context: 'editing',
            type: phantom.type,
            commandRange: phantom.commandRange,
            argumentRange: phantom.argumentRange,
            targetElement: phantom.wrapper
          };
        }
      }

      // Multiple elements or single non-phantom element - creation context
      if (this.hasValidPhantomSelection(filteredElements)) {
        const els = filteredElements;
        const rangeStart = ML.getRangeFromElement(els[0]);
        const rangeEnd = ML.getRangeFromElement(els[els.length - 1]);
        if (rangeStart && rangeEnd) {
          const range = {
            start: Math.min(rangeStart.start, rangeEnd.start),
            end: Math.max(rangeStart.end, rangeEnd.end)
          };
          return {
            context: 'creation',
            type: 'none',
            commandRange: null,
            argumentRange: range,
            targetElement: els[0]
          };
        }
      }
    }

    return null;
  }

  /**
   * Enhanced validation to ensure caret is truly inside phantom argument content
   * not just adjacent to phantom wrapper
   */
  isCaretInsidePhantomArgument(caret, phantomInfo) {
    if (!caret || !phantomInfo || !phantomInfo.mrow) return false;

    // Check if the caret is contained within the phantom's argument mrow
    const argumentMrow = phantomInfo.mrow;
    return argumentMrow.contains(caret);
  }

  /**
   * Validate that visual selections are appropriate for phantom wrapping
   * Excludes selections that span across phantom boundaries
   */
  hasValidPhantomSelection(elements) {
    if (!elements || elements.length === 0) return false;

    // Check if any selected elements are phantom wrappers or inside phantoms
    for (const el of elements) {
      if (ML.isPhantomWrapper(el) || ML.getPhantomFromCaret(el)) {
        return false;
      }
    }

    // Ensure all elements have valid ranges
    return elements.every(el => ML.getRangeFromElement(el));
  }

  getSolveToolbarState() {
    const hasExpression = Boolean(this.rootStore.mathStore.expression);

    return {
      isAvailable: hasExpression,
      currentState: {
        expression: this.rootStore.mathStore.expression
      },
      actions: {
        canSolve: hasExpression
      },
      metadata: {
        expression: this.rootStore.mathStore.expression
      }
    };
  }
}
