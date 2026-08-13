import { ARROW_CHARS } from '@constants';

export class MMLInspector {

  /**
   * Checks if an element is a terminator (i.e., <math> or <semantics>)
   */
  static isTerminator(element) {
    return ["math", "semantics"].includes(element?.localName);
  }

  static isRootMrow(element) {
    return element?.parentElement?.localName === "semantics";
  }

  static getElementType(element) {
    return element?.localName || null;
  }

  /**
   * Checks if an <mrow> is an argument of a **Compositional Function** (fraction, root, etc.).
   */
  static isArgOfCompFunc(element) {
    if (!(element instanceof Element) || element.localName !== "mrow") return false;
    const parent = element.parentElement;
    return parent && parent.localName !== "mrow" && !this.isTerminator(parent);
  }

  /**
   * Given an argument <mrow>, return the **Compositional Function** it belongs to.
   */
  static getCompFuncOpForArg(argumentMrow) {
    return this.isArgOfCompFunc(argumentMrow) ? argumentMrow.parentElement : null;
  }

  /**
   * Checks if an element is a **Linear Function**.
   * THIS IS NOW USED TO DETECT OPERATORS LIKE \SIN
   */
  static isLinFunc(element) {
    return element?.hasAttribute("data-function");
  }

  /**
   * Checks if an element is a **primitive** (i.e., a symbol, number, or operator).
   */
  static isPrimitive(element) {
    return ["mo", "mi", "mn", "mtext"].includes(element?.localName);
  }

  /**
   * Checks if an element is a MathML element.
   */
  static isMathMLElement(element) {
    return (
      element instanceof MathMLElement &&
      !element.classList.contains("math-cursor") &&
      !element.classList.contains("affordance")
    );
  }

  static isNthMathMLElementChild(element, index) {
    const parent = element?.parentElement;
    if (!parent || index < 0) return false;

    const mathMLChildren = Array.from(parent.children).filter(
      (child) => this.isMathMLElement(child)
    );

    return mathMLChildren[index] === element;
  }

  /**
   * Checks if an element is a specific MathML type (e.g., "mrow", "mo").
   */
  static isType(element, type) {
    if (Array.isArray(type)) {
      return type.includes(element?.localName);
    }
    return element?.localName === type;
  }

  static isParentType(element, type) {
    const parent = element?.parentElement?.localName;
    if (Array.isArray(type)) {
      return type.includes(parent);
    }
    return parent === type;
  }

  static isGrandParentType(element, type) {
    const grandParent = element?.parentElement?.parentElement?.localName;
    if (Array.isArray(type)) {
      return type.includes(grandParent);
    }
    return grandParent === type;
  }

  static isFirstChild(element) {
    return element?.parentElement?.firstElementChild === element;
  }

  static isLastChild(element) {
    return element?.parentElement?.lastElementChild === element;
  }

  static getParent(element) {
    return element?.parentElement || null;
  }

  static getGrandParent(element) {
    return element?.parentElement?.parentElement || null;
  }

  static getFinalDescendant(el) {
    while (el?.children?.length === 1) {
      el = el.children[0];
    }
    return el;
  }

  /**
   * Checks if an element has no MathML children.
   */
  static isEmptyElement(element) {
    if (!element || !(element instanceof Element)) return true;
    return ![...element.children].some(child => this.isMathMLElement(child));
  }

  /**
   * Checks if a given <mrow> has no MathML children (i.e., an empty argument).
   */
  static isEmptyArg(argumentMrow) {
    return this.isType(argumentMrow, "mrow") && this.isEmptyElement(argumentMrow);
  }

  static isNonEmptyArg(argumentMrow) {
    return this.isType(argumentMrow, "mrow") && !this.isEmptyElement(argumentMrow);
  }

  /**
 * Extracts the numeric range from an element's data attributes.
 * Returns an object with `start` and `end` as numbers, or null if attributes are missing or invalid.
 */
  static getRangeFromElement(element) {
    if (!element || !(element instanceof Element)) return null;

    const start = parseInt(element.getAttribute('data-range-start'), 10);
    const end = parseInt(element.getAttribute('data-range-end'), 10);

    if (isNaN(start) || isNaN(end)) return null;

    return { start, end };
  }

  static hasOnlyChildOfType(element, type) {
    if (!element || !(element instanceof Element)) return false;
    const mathMLChildren = [...element.children].filter(child => this.isMathMLElement(child));
    return mathMLChildren.length === 1 && this.isType(mathMLChildren[0], type);
  }

  static isOnlyChildType(element, type) {
    if (!element || !element.parentElement) return false;
    return this.hasOnlyChildOfType(element.parentElement, type);
  }

  static isLinearMathMLChain(element) {
    if (!element || !(element instanceof Element)) return false;

    let current = element;

    while (current) {
      const mathMLChildren = Array.from(current.children).filter(
        (child) => this.isMathMLElement(child)
      );

      // If there are no MathML children, we reached the leaf node: success
      if (mathMLChildren.length === 0) return true;

      // If there's more than one MathML child, the chain is broken
      if (mathMLChildren.length !== 1) return false;

      // Move to the only child
      current = mathMLChildren[0];
    }

    return true;
  }

  static getFirstChild(element) {
    if (!element || !(element instanceof Element)) return null;
    return Array.from(element.children).find(child => this.isMathMLElement(child)) || null;
  }

  static getValidSibling(element, direction = 'right') {
    if (!element || !(element instanceof Element)) return null;

    const sibling =
      direction === 'left'
        ? element.previousElementSibling
        : element.nextElementSibling;

    if (
      sibling &&
      this.isMathMLElement(sibling) &&
      this.getRangeFromElement(sibling)
    ) {
      return sibling;
    }

    return null;
  }

  static getNearestAncestorWithRange(element) {
    let current = element;

    while (current && !this.isTerminator(current)) {
      if (this.getRangeFromElement(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  static isSimpleInline(element) {
    if (!element || !(element instanceof Element)) return false;

    const ALLOWED = new Set(["mpadded", "mrow", "mi", "mn", "mo"]);

    const stack = [element];

    while (stack.length) {
      const el = stack.pop();

      const type = el.localName;
      if (!ALLOWED.has(type)) return false;

      for (const child of el.children) {
        if (this.isMathMLElement(child)) {
          stack.push(child);
        }
      }
    }

    return true;
  }

  static isFullSiblingGroup(selectedElements) {
    if (!selectedElements?.length) return false;

    const parent = selectedElements[0].parentElement;
    if (!parent) return false;

    if (!selectedElements.every(el => el.parentElement === parent)) {
      return false;
    }

    const siblings = this.getMathMLChildren(parent);
    return (
      siblings.length > 0 &&
      siblings.every(child => selectedElements.includes(child))
    );
  }

  static hasMathFontFromMpadded(mpadded) {
    if (!this.isType(mpadded, "mpadded")) return false;
    if (!this.hasClass(mpadded, "mathfont")) return false;

    const mrow = mpadded.firstElementChild;
    return this.hasOnlyChildOfType(mpadded, "mrow") &&
           this.hasOnlyChildOfType(mrow, ["mi", "mn"]);
  }

  static isPhantomWrapper(element) {
    return this.getPhantomType(element) !== null;
  }

  /**
   * Identifies the type of phantom: 'phantom', 'hphantom', 'vphantom', or null.
   */
  static getPhantomType(element) {
    if (!element || !(element instanceof Element)) return null;

    // Check for hphantom and vphantom first (mpadded → mphantom)
    if (this.isType(element, "mpadded")) {
      const hasZeroHeightDepth =
        element.getAttribute("height") === "0px" &&
        element.getAttribute("depth") === "0px";

      const hasNoWidthClass = element.classList.contains("no-width");

      const firstChild = element.firstElementChild;
      if (firstChild && this.isType(firstChild, "mphantom")) {
        if (hasZeroHeightDepth) return "hphantom";
        if (hasNoWidthClass) return "vphantom";
      }
    }

    // Check for standalone mphantom (true \phantom)
    if (this.isType(element, "mphantom")) {
      const parent = element.parentElement;
      if (!this.isType(parent, "mpadded")) {
        return "phantom";
      }
    }

    return null;
  }

  static getPhantomMrow(wrapper) {
    if (!this.isPhantomWrapper(wrapper)) return null;

    const phantom = this.isType(wrapper, "mphantom")
      ? wrapper
      : wrapper.firstElementChild;

    const mrow = phantom?.firstElementChild;
    return this.isType(mrow, "mrow") ? mrow : null;
  }

  /**
   * Gets the LaTeX range of the phantom **command** (e.g., \phantom)
   */
  static getPhantomCommandRange(wrapper) {
    if (!this.isPhantomWrapper(wrapper)) return null;

    const start = parseInt(wrapper.getAttribute("data-range-start"), 10);
    const mrow = this.getPhantomMrow(wrapper);
    const end = mrow ? parseInt(mrow.getAttribute("data-range-start"), 10) : null;

    if (isNaN(start) || isNaN(end)) return null;

    return { start, end };
  }

  /**
   * Gets the LaTeX range of the **phantom argument** (e.g., content inside {...}).
   */
  static getPhantomArgumentRange(wrapper) {
    const mrow = this.getPhantomMrow(wrapper);
    if (!mrow) return null;

    const start = parseInt(mrow.getAttribute("data-range-start"), 10);
    const end = parseInt(mrow.getAttribute("data-range-end"), 10);

    if (isNaN(start) || isNaN(end)) return null;

    return { start, end };
  }

  /**
   * Checks if the caret is currently inside a phantom structure.
   */
  static getPhantomFromCaret(caret) {
    if (!caret) return null;

    let current = caret.parentElement;
    while (current && !this.isTerminator(current)) {
      if (this.isPhantomWrapper(current)) {
        return {
          type: this.getPhantomType(current),
          wrapper: current,
          mrow: this.getPhantomMrow(current),
          commandRange: this.getPhantomCommandRange(current),
          argumentRange: this.getPhantomArgumentRange(current),
        };
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Checks if the caret is immediately to the right of a phantom structure.
   */
  static getPhantom(el, direction = null) {
    if (direction === "left") {
      el = el?.previousElementSibling;
    }

    if (!el || !this.isPhantomWrapper(el)) return null;

    return {
      type: this.getPhantomType(el),
      wrapper: el,
      mrow: this.getPhantomMrow(el),
      commandRange: this.getPhantomCommandRange(el),
      argumentRange: this.getPhantomArgumentRange(el),
    };
  }

  static isDelimiter(element) {
    if (!element) return false;
    const hasRange = this.getRangeFromElement(element) !== null;
    if (!hasRange) return false;

    // Check for direct <mo> delimiter
    if (this.isType(element, "mo")) {
      return element.hasAttribute("fence");
    }

    // Check for wrapped delimiter (mrow with delimiter-wrapper class)
    if (this.isType(element, "mrow") && element.classList.contains("delimiter-wrapper")) {
      // Look for the <mo> element inside the wrapper
      const moElement = this.getFirstChild(element);
      return moElement && this.isType(moElement, "mo") && moElement.hasAttribute("fence");
    }

    return false;
  }

  static getDelimiter(el, direction = null) {
    if (direction === "left") {
      el = el?.previousElementSibling;
    }

    if (!el || !this.isDelimiter(el)) return null;

    // Handle wrapped delimiters
    if (this.isType(el, "mrow") && el.classList.contains("delimiter-wrapper")) {
      const moElement = this.getFirstChild(el);
      return {
        element: moElement, // Return the actual <mo> element
        range: this.getRangeFromElement(el), // Use the wrapper's range (includes sizing command)
      };
    }

    // Handle direct <mo> delimiters (existing behavior)
    return {
      element: el,
      range: this.getRangeFromElement(el),
    };
  }

  static isDelimiterPartOfGroup(delimiterElement) {
    if (!delimiterElement) return false;

    const parent = delimiterElement.parentElement;

    // Case 1: plain delimiter directly under group
    if (parent?.classList?.contains('delimited-group')) {
      return true;
    }

    // Case 2: sized delimiter wrapped in mrow.delimiter-wrapper
    if (
      parent?.classList?.contains('delimiter-wrapper') &&
      parent.parentElement?.classList?.contains('delimited-group')
    ) {
      return true;
    }

    return false;
  }

  static getScriptType(element) {
    if (!element || !(element instanceof Element)) return null;

    if (this.isType(element, ["msup", "msub", "msubsup", "munderover"])) {
      return element.localName;
    }

    if (this.isType(element, ["mover", "munder"])) {
      const children = [...element.children].filter(this.isMathMLElement);
      if (children.length !== 2) return null;

      const base = children[0];
      if (!this.hasLimit(base)) return null;

      return element.localName;
    }

    return null;
  }

  static isScripted(element) {
    return this.getScriptType(element) !== null;
  }

  static getScriptBase(scriptElement) {
    if (!this.isScripted(scriptElement)) return null;

    let base = this.getFirstChild(scriptElement);
    if (this.getRangeFromElement(base)) return base;

    // Look for the previous sibling which should be the real base
    let current = scriptElement.previousElementSibling;
    while (current && this.isScripted(current)) {
      current = current.previousElementSibling;
    }

    // Return the base if it's a valid MathML element with range data
    if (current && this.isMathMLElement(current) && this.getRangeFromElement(current)) {
      return current;
    }

    return null;
  }

  static getScriptInfo(element) {
    if (!this.isScripted(element)) return null;

    const base = this.getScriptBase(element);

    const children = [...element.children].filter(child => this.isMathMLElement(child));
    const type = this.getScriptType(element);

    // Skip the ghost base (first child) and get the actual scripts
    const scriptChildren = children.slice(1);
    if (scriptChildren.length === 0) return null;

    const hasDataRange = (el) => {
      if (!el) return false;
      const start = el.getAttribute('data-range-start');
      const end = el.getAttribute('data-range-end');
      return start !== null && end !== null;
    };

    let scripts = {};

    switch (type) {
      case "mover":
      case "munder":
      case "msup":
      case "msub":
        if (scriptChildren.length !== 1) return null;

        const script = scriptChildren[0];
        if (!hasDataRange(script)) return null;

        scripts[type.includes("over") || type.includes("sup") ? "over" : "under"] = script;
        break;

      case "munderover":
      case "msubsup":
        if (scriptChildren.length !== 2) return null;

        const lowerScript = scriptChildren[0];
        const upperScript = scriptChildren[1];

        if (!hasDataRange(lowerScript) || !hasDataRange(upperScript)) return null;

        scripts["under"] = lowerScript;
        scripts["over"] = upperScript;
        break;

      default:
        return null;
    }

    return {
      type,
      base,
      scripts,
    };
  }

  static hasLimit(element) {
    return this.isMathMLElement(element) &&
      element?.hasAttribute("limits") &&
      !this.isType(element, "mrow")
  }

  static findAncestorOfType(element, type) {
    while (element?.parentElement && !this.isTerminator(element)) {
      element = element.parentElement;
      if (this.isType(element, type)) {
        return element;
      }
    }
    return null;
  }

  static findAncestor(element, matcher) {
    while (element?.parentElement && !this.isTerminator(element)) {
      element = element.parentElement;

      if (
        (typeof matcher === "function" && matcher(element)) ||
        (Array.isArray(matcher) && this.isType(element, matcher))
      ) {
        return element;
      }
    }
    return null;
  }

  static hasClass(element, className) {
    return element instanceof Element && element.classList.contains(className);
  }

  static parentHasClass(element, className) {
    const parent = element?.parentElement;
    return parent instanceof Element && parent.classList.contains(className);
  }

  static grandParentHasClass(element, className) {
    const grandParent = element?.parentElement?.parentElement;
    return grandParent instanceof Element && grandParent.classList.contains(className);
  }

  static isUnderbrace(element) {
    if (!this.isType(element, "munder")) return false;

    const children = [...element.children].filter(child => this.isMathMLElement(child));
    if (children.length < 2) return false;

    const mo = children[children.length - 1];
    return (
      this.isType(mo, "mo") &&
      mo.getAttribute("stretchy") === "true" &&
      mo.textContent.trim() === "⏟"
    );
  }

  static isPlainArrow(element) {
    // True only for simple arrow operator tokens (not labeled)
    return this.isType(element, "mo") && ARROW_CHARS.has(element.textContent.trim());
  }

  static isXArrow(element) {
    // True for x-arrow style structures: mover + stretchy arrow base
    if (!this.isType(element, "mover")) return false;
    const baseElement = this.getFirstChild(element);
    return (
      baseElement &&
      this.isType(baseElement, "mo") &&
      baseElement.getAttribute("stretchy") === "true" &&
      ARROW_CHARS.has(baseElement.textContent.trim())
    );
  }

  // Optionally keep isArrow as a convenience alias for "any kind of arrow"
  static isArrow(element) {
    return this.isPlainArrow(element) || this.isXArrow(element);
  }

  static getArrowBaseElement(element) {
    if (this.isType(element, "mo") && this.isArrow(element)) {
      return element;
    }

    if (this.isType(element, "mover")) {
      const baseElement = this.getFirstChild(element);
      if (baseElement && this.isArrow(baseElement)) {
        return baseElement;
      }
    }

    return null;
  }

  static getMathMLChildren(element) {
    if (!element || !(element instanceof Element)) return [];
    return Array.from(element.children).filter(child => this.isMathMLElement(child));
  }

  static getContent(element) {
    if (!this.isMathMLElement(element)) return null;
    return element.textContent?.trim() || null;
  }

  static flipFraction(mfrac, expression) {
    if (!this.isType(mfrac, "mfrac")) return;

    const [num, den] = this.getMathMLChildren(mfrac);
    const range = this.getRangeFromElement(mfrac);
    const numRange = this.getRangeFromElement(num);
    const denRange = this.getRangeFromElement(den);

    const commandTex = expression.slice(range.start, numRange.start);
    const numTex = expression.slice(numRange.start, numRange.end);
    const denTex = expression.slice(denRange.start, denRange.end);

    return commandTex + denTex + numTex;
  }

  static isNotRemovable(element) {

    const isArrayCell = (this.isType(element, "mrow") && this.isParentType(element, "mtd")) || this.isType(element, "mtd");

    return isArrayCell || this.isArgOfCompFunc(element);

  }

  static isValidForVisualSelection(element) {
    return this.getRangeFromElement(element)
          && !this.isNotRemovable(element)
          && !this.isParentType(element, "semantics");
  }

  static dfs(root, matchFn, directionBias = "forward") {
    if (!root || typeof matchFn !== "function") return null;

    const stack = [root];

    while (stack.length > 0) {
      const current = stack.pop();
      if (matchFn(current)) return current;

      const children = this.getMathMLChildren(current);
      const orderedChildren = directionBias === "backward"
        ? [...children].reverse()
        : children;

      for (let child of orderedChildren) {
        stack.push(child);
      }
    }

    return null;
  }

  static findFirstPrimitive(root) {
    return this.dfs(root, this.isPrimitive.bind(this), "forward");
  }

  static getDomOrderedElements(elements) {
    if (!elements || !elements.length) return [];

    // Find common ancestor
    let commonAncestor = elements[0];
    while (commonAncestor) {
      if (elements.every(el => commonAncestor.contains(el))) {
        break;
      }
      commonAncestor = commonAncestor.parentNode;
    }

    if (!commonAncestor) return [];

    const selectionSet = new Set(elements);
    const ordered = Array.from(commonAncestor.querySelectorAll('*'))
      .filter(el => selectionSet.has(el));

    return ordered.length ? ordered : elements;
  }

  static pruneContainedElements(elements) {
    if (!elements.length) return [];

    const set = new Set(elements);

    return elements.filter(el => {
      let parent = el.parentElement;
      while (parent && !this.isTerminator(parent)) {
        if (set.has(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }

  static getElementsInRange(root, start, end) {
    if (!root || start == null || end == null) return [];

    const collected = [];
    const stack = [root];

    while (stack.length) {
      const current = stack.pop();

      if (!(current instanceof Element)) continue;
      if (!this.isMathMLElement(current)) continue;

      const range = this.getRangeFromElement(current);
      if (range) {
        if (
          range.start < end &&
          range.end > start &&
          this.isValidForVisualSelection(current)
        ) {
          collected.push(current);
        }
      }

      const children = this.getMathMLChildren(current);
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }

    const pruned = this.pruneContainedElements(collected);
    return this.getDomOrderedElements(pruned);
  }

  static getFullRange(elements) {
    let minStart = Infinity;
    let maxEnd = -Infinity;

    for (const el of elements) {
      if (!(el instanceof Element)) continue;

      const start = parseInt(el.getAttribute("data-range-start"), 10);
      const end = parseInt(el.getAttribute("data-range-end"), 10);

      if (!isNaN(start) && !isNaN(end)) {
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      }
    }

    if (minStart === Infinity || maxEnd === -Infinity) {
      return null; // No valid ranges found
    }

    return { start: minStart, end: maxEnd };
  }

  static findLowestCommonAncestor(a, b, condition = () => true) {
    if (!a || !b) return null;

    // Build ancestor chain of A
    const ancestorsA = [];
    let node = a;
    while (node && !this.isTerminator(node)) {
      if (condition(node)) ancestorsA.push(node);
      node = node.parentElement;
    }

    // Walk ancestors of B until match
    node = b;
    while (node && !this.isTerminator(node)) {
      if (condition(node) && ancestorsA.includes(node)) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  static getMinimalSiblingRange(startEl, endEl) {
    if (!startEl || !endEl) return [];

    if (startEl === endEl) {
      return [startEl];
    }

    // 1. Find the lowest ancestor that is MathML and acceptable
    let lca = this.findLowestCommonAncestor(
      startEl,
      endEl,
      (el) => this.isMathMLElement(el)
    );

    if (!lca) return [];

    // 2. Collect valid MathML children
    let children = this.getMathMLChildren(lca);
    if (!children.length) return [];
    if (!children.filter(el => this.isValidForVisualSelection(el)).length) {
      while (lca && !this.isValidForVisualSelection(lca)) {
        lca = lca.parentElement;
      }
      if (lca) {
        children = [lca];
      }
    }

    // 3. Identify which child contains startEl and endEl
    const startIndex = children.findIndex(
      (child) => child === startEl || child.contains(startEl)
    );
    const endIndex = children.findIndex(
      (child) => child === endEl || child.contains(endEl)
    );

    if (startIndex === -1 || endIndex === -1) return [];

    // 4. Return the minimal inclusive contiguous slice
    const lo = Math.min(startIndex, endIndex);
    const hi = Math.max(startIndex, endIndex);
    return children.slice(lo, hi + 1);
  }

  static getHorizontalCenter(element, containerElement) {
    const elementRect = element.getBoundingClientRect();
    const scrollContent = containerElement.querySelector('.mathml-scroll-content');
    const containerRect = scrollContent.getBoundingClientRect();

    // Get the transform matrix from the container
    const computedStyle = window.getComputedStyle(containerElement);
    const transform = computedStyle.transform;

    let scaleX = 1;
    if (transform && transform !== 'none') {
      const match = transform.match(/matrix\(([^,]+)/);
      if (match) scaleX = parseFloat(match[1]);
    }

    const relativeLeft = elementRect.left - containerRect.left;
    const paddingReadjustment = 30;
    const center = relativeLeft + (elementRect.width / 2) + paddingReadjustment - 6;

    // Convert from scaled coordinates to canvas coordinates
    return center / scaleX;
  }

  static getArrayEnvironmentType(mtableElement) {
    const scriptLevel = mtableElement.getAttribute('scriptlevel');

    if (scriptLevel === '1') {
      // Find first row and count columns
      const firstRow = this.getMathMLChildren(mtableElement).find(child => this.isType(child, 'mtr'));
      if (firstRow) {
        const columnCount = this.getMathMLChildren(firstRow).filter(child => this.isType(child, 'mtd')).length;
        return columnCount === 1 ? 'subarray' : 'smallmatrix';
      }
    }

    return 'array';
  }

  static isSmallMatrix(mtableElement) {
    return this.getArrayEnvironmentType(mtableElement) === 'smallmatrix';
  }

  static isSubarray(mtableElement) {
    return this.getArrayEnvironmentType(mtableElement) === 'subarray';
  }

  static maxChildGroupSizeAmongChildren(element) {
    if (!element || !(element instanceof Element)) return 0;

    let max = 0;
    const children = this.getMathMLChildren(element);

    for (const child of children) {
      const count = this.getMathMLChildren(child).length;
      if (count > max) {
        max = count;
      }
    }

    return max;
  }

  // Check if an mfrac is a binomial (has linethickness="0")
  static isBinomial(element) {
    return this.isType(element, "mfrac") &&
          element.getAttribute("linethickness") === "0";
  }

  // Check if an mrow contains a binomial mfrac as direct child
  static containsBinomial(element) {
    if (!this.isType(element, "mrow")) return false;
    const children = this.getMathMLChildren(element);
    return children.some(child => this.isBinomial(child));
  }

  // Get the binomial mfrac from an mrow (if it contains one)
  static getBinomialFromMrow(element) {
    if (!this.containsBinomial(element)) return null;
    const children = this.getMathMLChildren(element);
    return children.find(child => this.isBinomial(child)) || null;
  }

  static isProperMrow(element) {
    if (!this.isType(element, "mrow")) return false;

    if (this.containsBinomial(element)) return false;
    if (this.hasClass(element, 'delimiter-wrapper')) return false;

    return true;
  }

  static isValidClickTarget(element) {
    if (!element || !(element instanceof Element)) return false;

    // Rule: disable <mo> that is the first child of munderover, munder, or mover
    if (this.isType(element, "mo")) {
      const parent = element.parentElement;
      if (this.isType(parent, ["munderover", "munder", "mover", "msubsup"])) {
        const firstChild = this.getFirstChild(parent);
        if (firstChild === element) {
          return false;
        }
      }
    }

    return true;
  }

}
