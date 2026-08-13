/**
 * MathMLNormalizer - Utility for normalizing and extracting information from MathML
 * Handles attribute stripping, structure extraction, and cursor/state information
 */
export class MathMLNormalizer {

  /**
   * Strip unwanted attributes from MathML, keeping only specified ones
   */
  static stripAttributes(mathMLString, keepAttributes = ['data-range-start', 'data-range-end']) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(mathMLString, 'text/html');
      const mathElement = doc.querySelector('math');

      if (!mathElement) return mathMLString;

      // Recursively strip attributes
      const stripFromElement = (element) => {
        if (!(element instanceof Element)) return;

        // Get all attributes to remove
        const attributesToRemove = [];
        for (const attr of element.attributes) {
          if (!keepAttributes.includes(attr.name)) {
            attributesToRemove.push(attr.name);
          }
        }

        // Remove unwanted attributes
        attributesToRemove.forEach(attrName => {
          element.removeAttribute(attrName);
        });

        // Process children
        Array.from(element.children).forEach(child => stripFromElement(child));
      };

      stripFromElement(mathElement);
      return mathElement.outerHTML;
    } catch (error) {
      console.warn('Error stripping MathML attributes:', error);
      return mathMLString;
    }
  }

  /**
   * Extract just the element structure without any attributes
   */
  static extractStructure(mathMLString) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(mathMLString, 'text/html');
      const mathElement = doc.querySelector('math');

      if (!mathElement) return null;

      const extractElementStructure = (element) => {
        if (!(element instanceof Element)) return null;

        const structure = {
          type: element.localName,
          content: element.textContent?.trim() || null
        };

        const children = Array.from(element.children)
          .map(child => extractElementStructure(child))
          .filter(child => child !== null);

        if (children.length > 0) {
          structure.children = children;
          // Remove content if we have children (avoid duplication)
          delete structure.content;
        }

        return structure;
      };

      return extractElementStructure(mathElement);
    } catch (error) {
      console.warn('Error extracting MathML structure:', error);
      return null;
    }
  }

  /**
   * Extract cursor information from DOM MathML
   */
  static extractCursorInfo(domMathML) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(domMathML, 'text/html');

      const cursor = doc.querySelector('.math-cursor');
      if (!cursor) {
        return {
          hasCaret: false,
          position: null,
          parentElement: null,
          parentType: null
        };
      }

      const parent = cursor.parentElement;
      const parentRange = parent ? {
        start: parseInt(parent.getAttribute('data-range-start'), 10),
        end: parseInt(parent.getAttribute('data-range-end'), 10)
      } : null;

      return {
        hasCaret: true,
        position: parentRange,
        parentElement: parent?.localName || null,
        parentType: parent?.localName || null,
        parentClasses: parent ? Array.from(parent.classList) : []
      };
    } catch (error) {
      console.warn('Error extracting cursor info:', error);
      return { hasCaret: false, position: null, parentElement: null, parentType: null };
    }
  }

  /**
   * Extract active elements information
   */
  static extractActiveElements(domMathML) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(domMathML, 'text/html');

      const activeElements = doc.querySelectorAll('.active');
      return Array.from(activeElements).map(element => ({
        type: element.localName,
        range: {
          start: parseInt(element.getAttribute('data-range-start'), 10),
          end: parseInt(element.getAttribute('data-range-end'), 10)
        },
        classes: Array.from(element.classList),
        content: element.textContent?.trim() || null
      }));
    } catch (error) {
      console.warn('Error extracting active elements:', error);
      return [];
    }
  }

  /**
   * Extract selected elements information
   */
  static extractSelectedElements(domMathML) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(domMathML, 'text/html');

      const selectedElements = doc.querySelectorAll('.selected');
      return Array.from(selectedElements).map(element => ({
        type: element.localName,
        range: {
          start: parseInt(element.getAttribute('data-range-start'), 10),
          end: parseInt(element.getAttribute('data-range-end'), 10)
        },
        classes: Array.from(element.classList),
        content: element.textContent?.trim() || null
      }));
    } catch (error) {
      console.warn('Error extracting selected elements:', error);
      return [];
    }
  }

  /**
   * Compare two MathML structures ignoring specified attributes
   */
  static compareStructures(mathML1, mathML2, ignoreAttributes = ['class', 'style', 'xmlns']) {
    const normalized1 = this.stripAttributes(mathML1, []);
    const normalized2 = this.stripAttributes(mathML2, []);

    const structure1 = this.extractStructure(normalized1);
    const structure2 = this.extractStructure(normalized2);

    return {
      match: JSON.stringify(structure1) === JSON.stringify(structure2),
      structure1,
      structure2
    };
  }

  /**
   * Validate that cursor is in a specific element type
   */
  static validateCursorInElement(domMathML, expectedElementType) {
    const cursorInfo = this.extractCursorInfo(domMathML);

    if (!cursorInfo.hasCaret) {
      return {
        passed: false,
        message: 'No cursor found in MathML'
      };
    }

    const match = cursorInfo.parentType === expectedElementType;
    return {
      passed: match,
      message: match
        ? `Cursor correctly placed in ${expectedElementType}`
        : `Expected cursor in ${expectedElementType}, found in ${cursorInfo.parentType}`,
      actualParentType: cursorInfo.parentType,
      expectedParentType: expectedElementType
    };
  }

  /**
   * Validate that cursor is in a specific element with exact range
   */
  static validateCursorInElementWithRange(domMathML, expectedElementType, expectedRange) {
    const cursorInfo = this.extractCursorInfo(domMathML);

    if (!cursorInfo.hasCaret) {
      return {
        passed: false,
        message: 'No cursor found in MathML'
      };
    }

    // Check element type
    if (cursorInfo.parentType !== expectedElementType) {
      return {
        passed: false,
        message: `Expected cursor in ${expectedElementType}, found in ${cursorInfo.parentType}`,
        actualParentType: cursorInfo.parentType,
        expectedParentType: expectedElementType,
        actualRange: cursorInfo.position,
        expectedRange
      };
    }

    // Check exact range
    const rangeMatch = cursorInfo.position &&
      cursorInfo.position.start === expectedRange.start &&
      cursorInfo.position.end === expectedRange.end;

    return {
      passed: rangeMatch,
      message: rangeMatch
        ? `Cursor correctly placed in ${expectedElementType} with range ${expectedRange.start}-${expectedRange.end}`
        : `Expected cursor in ${expectedElementType} with range ${expectedRange.start}-${expectedRange.end}, found range ${cursorInfo.position?.start || 'unknown'}-${cursorInfo.position?.end || 'unknown'}`,
      actualParentType: cursorInfo.parentType,
      expectedParentType: expectedElementType,
      actualRange: cursorInfo.position,
      expectedRange
    };
  }

  /**
   * Validate cursor position by crawling the DOM structure
   * Uses a path-based approach to specify exact location in the MathML tree
   * Supports both string arrays and object arrays for path specification
   */
  static validateCursorAtPath(domMathML, expectedPath) {
    try {

      const parser = new DOMParser();
      const doc = parser.parseFromString(domMathML, 'application/xml');

      const cursor = doc.querySelector('.math-cursor');
      if (!cursor) {
        return {
          passed: false,
          message: `No cursor found in MathML`,
          actualPath: null,
          expectedPath,
        };
      }

      // Check if expectedPath uses object format
      if (expectedPath.length > 0 && typeof expectedPath[0] === 'object') {
        const result = this._validateCursorAtObjectPath(doc, cursor, expectedPath);
        return result;
      }

      // Legacy string-based path validation
      const actualPath = this._buildElementPath(cursor.parentElement);
      const pathMatch = this._comparePaths(actualPath, expectedPath);

      return {
        passed: pathMatch.match,
        message: pathMatch.match
          ? `Cursor correctly positioned at path: ${actualPath.join(' > ')}`
          : `Expected cursor at path: ${expectedPath.join(' > ')}, found at: ${actualPath.join(' > ')}`,
        actualPath,
        expectedPath,
        pathComparison: pathMatch,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error validating cursor path: ${error.message}`,
        debugInfo: { error: error.message }
      };
    }
  }

  /**
   * Validate cursor at object-based path specification
   */
  static _validateCursorAtObjectPath(doc, cursor, expectedPath) {
    const math = doc.querySelector('math');
    if (!math) {
      return {
        passed: false,
        message: 'No math element found',
        actualPath: null,
        expectedPath,
        debugInfo: { error: 'No math element in document' }
      };
    }

    let currentElement = math;
    const traversedPath = ['math'];
    const pathDebugInfo = [];

    // Traverse the expected path step by step
    for (let i = 0; i < expectedPath.length; i++) {
      const step = expectedPath[i];
      const { element, index = 0 } = step;

      // Debug: Log current element state
      const currentChildren = Array.from(currentElement.children);
      const availableElements = currentChildren.map(child => child.localName);
      const elementsOfType = currentChildren.filter(child => child.localName === element);

      pathDebugInfo.push({
        step: i + 1,
        searchingFor: `${element}${index > 0 ? `[${index}]` : ''}`,
        currentElement: currentElement.localName,
        availableChildren: availableElements,
        elementsOfTypeFound: elementsOfType.length,
        elementsOfType: elementsOfType.map((el, idx) => ({
          index: idx,
          localName: el.localName,
          classes: Array.from(el.classList),
          textContent: el.textContent?.trim() || '',
          hasChildren: el.children.length > 0
        }))
      });

      // Find the target element
      let targetElement = null;

      if (index === 0) {
        // Find first occurrence of element type
        targetElement = currentElement.querySelector(element);
      } else {
        // Find specific index of element type
        const elements = currentElement.querySelectorAll(`:scope > ${element}`);
        targetElement = elements[index] || null;
      }

      if (!targetElement) {
        return {
          passed: false,
          message: `Path validation failed at step ${i + 1}: Could not find ${element}${index > 0 ? `[${index}]` : ''} in ${currentElement.localName}. Available children: [${availableElements.join(', ')}]. Found ${elementsOfType.length} elements of type '${element}'.`,
          actualPath: traversedPath,
          expectedPath: expectedPath.map(s => `${s.element}${s.index !== undefined && s.index > 0 ? `[${s.index}]` : ''}`),
          failedAtStep: i + 1,
          pathDebugInfo,
          availableAtFailure: availableElements,
          elementsOfTypeAtFailure: elementsOfType.length
        };
      }

      currentElement = targetElement;
      traversedPath.push(`${element}${index > 0 ? `[${index}]` : ''}`);
    }

    // Check if cursor is inside the final target element
    const cursorInTarget = currentElement.contains(cursor);

    // Enhanced debugging for cursor location
    const targetElementDebug = {
      localName: currentElement.localName,
      classes: Array.from(currentElement.classList),
      textContent: currentElement.textContent?.trim() || '',
      innerHTML: currentElement.innerHTML,
      children: Array.from(currentElement.children).map(child => ({
        localName: child.localName,
        classes: Array.from(child.classList),
        textContent: child.textContent?.trim() || ''
      })),
      containsCursor: cursorInTarget,
      cursorParent: cursor.parentElement?.localName || 'none',
      cursorParentClasses: cursor.parentElement ? Array.from(cursor.parentElement.classList) : []
    };

    return {
      passed: cursorInTarget,
      message: cursorInTarget
        ? `Cursor correctly positioned at path: ${traversedPath.join(' > ')}`
        : `Cursor not found in target element at path: ${traversedPath.join(' > ')}. Target element: ${currentElement.localName}, Cursor parent: ${cursor.parentElement?.localName || 'none'}`,
      actualPath: traversedPath,
      expectedPath: expectedPath.map(s => `${s.element}${s.index !== undefined && s.index > 0 ? `[${s.index}]` : ''}`),
      targetElement: currentElement.localName,
      cursorFound: cursorInTarget,
      pathDebugInfo,
      targetElementDebug
    };
  }

  /**
   * Build a path array from element to root, describing the structural position
   */
  static _buildElementPath(element) {
    const path = [];
    let current = element;

    while (current && current.localName !== 'math') {
      const parent = current.parentElement;
      if (!parent) break;

      // Get the index of this element among its siblings of the same type
      const siblings = Array.from(parent.children).filter(child =>
        child.localName === current.localName
      );
      const index = siblings.indexOf(current);

      // Create a descriptor for this level
      const descriptor = siblings.length > 1
        ? `${current.localName}[${index}]`
        : current.localName;

      path.unshift(descriptor);
      current = parent;
    }

    return path;
  }

  /**
   * Compare two paths for structural equivalence
   */
  static _comparePaths(actualPath, expectedPath) {
    if (actualPath.length !== expectedPath.length) {
      return {
        match: false,
        reason: `Path length mismatch: expected ${expectedPath.length}, got ${actualPath.length}`
      };
    }

    for (let i = 0; i < actualPath.length; i++) {
      if (actualPath[i] !== expectedPath[i]) {
        return {
          match: false,
          reason: `Path mismatch at level ${i}: expected '${expectedPath[i]}', got '${actualPath[i]}'`
        };
      }
    }

    return { match: true, reason: 'Paths match exactly' };
  }

  /**
   * Validate cursor is in the denominator of a fraction (specific structural validation)
   */
  static validateCursorInFractionDenominator(domMathML) {
    // Expected path: math > semantics > mrow > mfrac > mrow[1] (second mrow is denominator)
    const expectedPath = ['semantics', 'mrow', 'mfrac', 'mrow[1]'];
    return this.validateCursorAtPath(domMathML, expectedPath);
  }

  /**
   * Validate cursor is in the numerator of a fraction
   */
  static validateCursorInFractionNumerator(domMathML) {
    // Expected path: math > semantics > mrow > mfrac > mrow[0] (first mrow is numerator)
    const expectedPath = ['semantics', 'mrow', 'mfrac', 'mrow[0]'];
    return this.validateCursorAtPath(domMathML, expectedPath);
  }

  /**
   * Validate that specific elements are active
   */
  static validateActiveElements(domMathML, expectedActiveElements) {
    const activeElements = this.extractActiveElements(domMathML);

    if (expectedActiveElements.length === 0) {
      return {
        passed: activeElements.length === 0,
        message: activeElements.length === 0
          ? 'No active elements as expected'
          : `Expected no active elements, found ${activeElements.length}`,
        actualActiveElements: activeElements,
        expectedActiveElements: []
      };
    }

    // Check if all expected elements are active
    const missingElements = [];
    const foundElements = [];

    for (const expected of expectedActiveElements) {
      const found = activeElements.find(active => {
        if (expected.type && active.type !== expected.type) return false;
        if (expected.range && (active.range.start !== expected.range.start || active.range.end !== expected.range.end)) return false;
        if (expected.content && active.content !== expected.content) return false;
        return true;
      });

      if (found) {
        foundElements.push(expected);
      } else {
        missingElements.push(expected);
      }
    }

    const passed = missingElements.length === 0;
    return {
      passed,
      message: passed
        ? `All expected active elements found: ${foundElements.length}`
        : `Missing active elements: ${missingElements.length}`,
      actualActiveElements: activeElements,
      expectedActiveElements,
      foundElements,
      missingElements
    };
  }

  /**
   * Create a detailed DOM state summary
   */
  static createDOMStateSummary(domMathML) {
    return {
      cursor: this.extractCursorInfo(domMathML),
      activeElements: this.extractActiveElements(domMathML),
      selectedElements: this.extractSelectedElements(domMathML),
      structure: this.extractStructure(domMathML),
      normalizedMathML: this.stripAttributes(domMathML)
    };
  }
}
