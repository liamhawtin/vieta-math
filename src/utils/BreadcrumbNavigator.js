import { MMLInspector as ML } from './MMLInspector';
import { TEXT_COMMAND_OPTIONS, ACCENT_MAP } from '@constants';

export class BreadcrumbNavigator {

  static _expression = null;

  /**
   * Generates a breadcrumb trail from the current cursor position or selected element
   * @param {Element} element - The element containing the cursor or the selected element
   * @returns {Array} Array of breadcrumb objects
   */
  static generateBreadcrumbTrail(element, expression) {
    if (!element) return [];

    this._expression = expression;

    const breadcrumbs = [];
    let current = element;

    // If the element is a cursor, start from its parent
    if (element.classList && element.classList.contains('math-cursor')) {
      current = element.parentElement;
    }

    // Traverse up the DOM tree to build the breadcrumb path
    while (current && !ML.isTerminator(current)) {
      const crumb = this.getBreadcrumbInfo(current, breadcrumbs);
      if (crumb) {
        breadcrumbs.unshift(crumb);
      }
      current = current.parentElement;
    }

    return breadcrumbs;
  }

  /**
   * Analyzes an element and returns its breadcrumb information
   * @param {Element} element - The MathML element to analyze
   * @returns {Object|null} - Breadcrumb info or null if not applicable
   */
  static getBreadcrumbInfo(element, breadcrumbs) {
    if (!element || !ML.isMathMLElement(element)) return null;

    const FUNCTIONS = ['∑', '∏', '∐', '⋁', '⋀', '⨁', '⨂', '⨀', '∪', '∩'];
    const OPERATORS = ['∫', '∬', '∭', '∮', '∯', '∰'];
    const FUNC_WITH_CONDITION = ['lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf', 'argmax', 'argmin'];

    const type = element.localName;

    // Handle different MathML element types
    switch (type) {
      case 'mfrac':
        if (!ML.isBinomial(element)) {
          return { type, label: 'frac', description: 'Fraction', element };
        }
        break;
      case 'msqrt':
        return { type, label: 'sqrt', description: 'Square Root', element };
      case 'mroot':
        return { type, label: 'root', description: '', element };
      case 'msup':

        const base = ML.getFirstChild(element);

        if (ML.isLinFunc(base) && breadcrumbs[0]?.label === 'super') {
          const content = ML.getContent(base);
          if (OPERATORS.includes(content)) {
            breadcrumbs[0] &&  (breadcrumbs[0].label = 'upper');
            return { type, label: 'operator', description: '', element };
          } else if (FUNCTIONS.includes(content)) {
            breadcrumbs[0] &&  (breadcrumbs[0].label = 'upper');
          }
          return { type, label: 'function', description: '', element };
        }

        break;

      case 'msub': {

        const base = ML.getFirstChild(element);

        if (ML.isLinFunc(base) && breadcrumbs[0]?.label === 'sub') {
          const content = ML.getContent(base);

          if (OPERATORS.includes(content)) {
            breadcrumbs[0].label = 'lower';
            return { type, label: 'operator', description: '', element };
          } else if (FUNC_WITH_CONDITION.includes(content)) {
            breadcrumbs[0] &&  (breadcrumbs[0].label = 'condition');
          } else if (FUNCTIONS.includes(content)) {
            breadcrumbs[0] &&  (breadcrumbs[0].label = 'lower');
          }

          return { type, label: 'function', description: '', element };
        }

        break;
      }
      case 'msubsup': {
        const base = ML.getFirstChild(element);

        if (ML.isLinFunc(base)) {
          const content = ML.getContent(base);

          if (OPERATORS.includes(content)) {
            if (breadcrumbs[0]?.label === 'sub') breadcrumbs[0].label = 'lower'
            if (breadcrumbs[0]?.label === 'exponent') breadcrumbs[0].label = 'upper'
            return { type, label: 'operator', description: '', element };
          } else if (FUNCTIONS.includes(content)) {
            if (breadcrumbs[0]?.label === 'sub') breadcrumbs[0].label = 'lower'
            if (breadcrumbs[0]?.label === 'exponent') breadcrumbs[0].label = 'upper'
            return { type, label: 'function', description: '', element };
          }

        }

        break;
      }
      case 'mover':
      case 'munder': {
        const children = Array.from(element.children).filter(child =>
          ML.isMathMLElement(child)
        );
        const base = children[0];
        const accentChild = children[1];
        const position = type === 'munder' ? 'under' : 'over';

        if (ML.isLinFunc(base)) {
          const content = ML.getContent(base);

          if (OPERATORS.includes(content)) {
            return { type, label: 'operator', description: '', element };
          }

          if (
            type === 'munder' &&
            FUNC_WITH_CONDITION.includes(content) &&
            breadcrumbs[0]
          ) {
            breadcrumbs[0].label = 'condition';
          }

          return { type, label: 'function', description: '', element };
        }

        // Accent detection (custom or known)
        if (ML.isType(base, 'mrow')) {
          if (ML.isType(accentChild, 'mrow')) {
            return {
              type: 'mrow',
              label: 'custom accent',
              description: 'Manual Accent',
              element,
            };
          }

          const label = this.getAccentLabel(accentChild, position);
          if (label) {
            return { type: 'mrow', label, description: label, element };
          }
        }

        break;
      }
      case 'menclose': {
        const notation = element.getAttribute('notation');
        if (notation === 'bottom') {
          return {
            type: 'menclose',
            label: 'underline (stretch)',
            description: 'Underline (bottom enclosure)',
            element,
          };
        }
        break;
      }
      case 'munderover': {
        const base = ML.getFirstChild(element);
        if (ML.isLinFunc(base)) {
          const content = ML.getContent(base);

          if (OPERATORS.includes(content)) {
            return { type, label: 'operator', description: '', element };
          }

          return { type, label: 'function', description: '', element };
        }
        break;
      }
      case 'mtable': {
        const environmentType = ML.getArrayEnvironmentType(element);

        const hasOnlyRow = ML.hasOnlyChildOfType(element, "mtr");
        const hasOnlyColumn = ML.maxChildGroupSizeAmongChildren(element) === 1;

        if (hasOnlyRow && !hasOnlyColumn) {
          breadcrumbs.splice(0, 1);
        } else if (!hasOnlyRow && hasOnlyColumn) {
          breadcrumbs.splice(1, 2);
        } else if (hasOnlyRow && hasOnlyColumn) {
          breadcrumbs.splice(0, 2);
        }

        switch (environmentType) {
          case 'subarray':
            return { type, label: 'substack', description: 'Substack', element };
          case 'smallmatrix':
            return { type, label: 'small matrix', description: 'Small Matrix', element };
          default:
            return { type, label: 'array', description: 'Array', element };
        }
      }
      case 'mtr':
        const rowIndex = this.getRowIndex(element);
        return { type, label: `row ${rowIndex}`, description: '', element };
      case 'mtd':
        const colIndex = this.getColumnIndex(element);
        return { type, label: `col ${colIndex}`, description: '', element: element.firstElementChild  };
      case 'mrow':
        return this.getMrowBreadcrumbInfo(element);
      case 'mstyle':
        return this.getMstyleBreadcrumbInfo(element);
      case 'mpadded':
        return this.getMpaddedBreadcrumbInfo(element);
      case 'mphantom':
        return this.getMphantomBreadcrumbInfo(element);
      default:
        return null;
    }
  }

  /**
   * Gets specialized breadcrumb info for mrow elements based on context
   * @param {Element} element - The mrow element
   * @returns {Object|null} - Breadcrumb info or null
   */
  static getMrowBreadcrumbInfo(element) {
    if (!ML.isType(element, "mrow")) return null;

    // Check if this mrow is an argument of a compositional function
    if (ML.isArgOfCompFunc(element)) {
      const parent = element.parentElement;
      const children = Array.from(parent.children).filter(child => ML.isMathMLElement(child));
      const index = children.indexOf(element);

      switch (parent.localName) {
        case 'mfrac':
          if (ML.isBinomial(parent)) {
            return {
              type: 'mrow',
              label: index === 0 ? 'upper' : 'lower',
              description: index === 0 ? 'Upper Index' : 'Lower Index',
              element
            };
          }
          return {
            type: 'mrow',
            label: index === 0 ? 'num' : 'denom',
            description: index === 0 ? 'Numerator' : 'Denominator',
            element
          };
        case 'msqrt':
          return { type: 'mrow', label: 'radicand', description: '', element };
        case 'mroot':
          return {
            type: 'mrow',
            label: index === 0 ? 'radicand' : 'index',
            description: '',
            element
          };
        case 'msup':
          if (index !== 0) {
            return {
              type: 'mrow',
              label: 'super',
              description: 'Superscript',
              element
            };
          }
        case 'msub':
          if (index !== 0) {
            return {
              type: 'mrow',
              label: 'sub',
              description: 'Subscript',
              element
            };
          }
          break;
        case 'msubsup':
          if (index === 1) return { type: 'mrow', label: 'sub', description: 'Subscript', element };
          if (index === 2) return { type: 'mrow', label: 'super', description: 'Superscript', element };
          break;
        case 'mover':
          return {
            type: 'mrow',
            label: index === 0 ? 'base' : 'upper',
            description: '',
            element
          };
        case 'munder': {
          return {
            type: 'mrow',
            label: index === 0 ? 'base' : 'lower',
            description: '',
            element
          };
        }
        case 'munderover':
          if (index === 1) return { type: 'mrow', label: 'lower', description: '', element };
          if (index === 2) return { type: 'mrow', label: 'upper', description: '', element };
          break;
      }
    }

    // Check if this is a delimited group
    if (element.classList.contains('delimited-group')) {
      return { type: 'mrow', label: 'delimited group', description: 'A group where delimiters can be set to expand to the height of its contents.', element };
    }

    if (ML.containsBinomial(element)) {
      return { type: 'mrow', label: 'binom', description: 'Binomial Coefficient', element };
    }

    if (!ML.isParentType(element, 'semantics')) {
      //return { type: 'mrow', label: 'group', description: 'Group' };
    }

    // Generic mrow - usually we'll skip these in the breadcrumb trail
    return null;
  }

  /**
   * Gets specialized breadcrumb info for mstyle elements based on context
   * @param {Element} element - The mstyle element
   * @returns {Object|null} - Breadcrumb info or null
   */
  static getMstyleBreadcrumbInfo(element) {
    if (!ML.isType(element, "mstyle")) return null;

    if (element.classList.contains("layout-style")) {
      const displaystyle = element.getAttribute("displaystyle") === "true";
      const scriptlevel = Number(element.getAttribute("scriptlevel") ?? 0);

      let label = null;
      let description = null;

      if (scriptlevel === 0 && displaystyle) {
        label = "display style";
        description = "displaystyle";
      } else if (scriptlevel === 0 && !displaystyle) {
        label = "inline style";
        description = "textstyle";
      } else if (scriptlevel === 1) {
        label = "small style";
        description = "scriptstyle";
      } else if (scriptlevel >= 2) {
        label = "tiny style";
        description = "scriptscriptstyle";
      }

      if (!label) return null;

      return {
        type: "mstyle",
        label,
        description,
        element
      };
    }

    // Check if this is a text style wrapper
    if (element.classList.contains('text')) {
      const range = ML.getRangeFromElement(element);
      const tex = this._expression.slice(range.start).trim(); // Notice: slice to the end

      const allOptions = TEXT_COMMAND_OPTIONS;
      const allCommands = allOptions.map(opt => opt.command);
      const command = allCommands.find(cmd => tex.startsWith(cmd));
      if (!command) return { type: 'mstyle', label: 'text', description: 'Text', element };

      const commandToLabelMap = Object.fromEntries(
        allOptions.map(opt => [opt.command, opt.label])
      );

      const label = commandToLabelMap[command];

      return { type: 'mstyle', label: label.toLowerCase(), description: label, element };
    }

    return null;
  }

  /**
   * Gets the row index (1-based) for an mtr element
   * @param {Element} element - The mtr element
   * @returns {number} - Row index (1-based) or -1 if not found
   */
  static getRowIndex(element) {
    if (!ML.isType(element, "mtr")) return -1;
    const parent = element.parentElement;
    if (!parent) return -1;

    const rows = Array.from(parent.children).filter(child => ML.isType(child, "mtr"));
    return rows.indexOf(element) + 1;
  }

  /**
   * Gets the column index (1-based) for an mtd element
   * @param {Element} element - The mtd element
   * @returns {number} - Column index (1-based) or -1 if not found
   */
  static getColumnIndex(element) {
    if (!ML.isType(element, "mtd")) return -1;
    const parent = element.parentElement;
    if (!parent) return -1;

    const cells = Array.from(parent.children).filter(child => ML.isType(child, "mtd"));
    return cells.indexOf(element) + 1;
  }

  /**
   * Checks if an element should be included in breadcrumbs
   * @param {Element} element - The element to check
   * @returns {boolean} - Whether the element should be included
   */
  static shouldIncludeInBreadcrumbs(element) {
    if (!element || !ML.isMathMLElement(element)) return false;

    const crumb = this.getBreadcrumbInfo(element);
    return crumb !== null;
  }

  static getMpaddedBreadcrumbInfo(element) {
    if (!ML.isType(element, "mpadded")) return null;

    if (ML.hasMathFontFromMpadded(element)) {
      // Known font classes to detect
      const fontClasses = new Set([
        'normal',
        'italic',
        'bold-italic',
        'bold',
        'fraktur',
        'sans-serif',
        'monospace'
      ]);

      // Find the first matching class (if any)
      const classes = Array.from(element.classList);
      const match = classes.find(cls => fontClasses.has(cls));

      const label = match || 'styled';

      return {
        type: 'mstyle',
        label,
        description: `${label} text`,
        element
      };
    }

    // Check if this mpadded is a phantom wrapper
    const hasPhantomChild = element.querySelector('mphantom');
    if (!hasPhantomChild) return null;

    // Determine phantom type based on mpadded attributes
    const height = element.getAttribute('height');
    const depth = element.getAttribute('depth');
    const hasNoWidth = element.classList.contains('no-width');

    let phantomType = null;
    let label = null;
    let description = null;

    if (hasNoWidth) {
      phantomType = 'vphantom';
      label = 'no width';
      description = 'Content with no width';
    } else if (height === '0px' && depth === '0px') {
      phantomType = 'hphantom';
      label = 'no height';
      description = 'Content with no height';
    } else {
      return null;
    }

    return {
      type: 'phantom',
      label,
      description,
      element,
      phantomType
    };
  }

  static getMphantomBreadcrumbInfo(element) {
    if (ML.isParentType(element, "mpadded")) return null;
    if (!ML.isType(element, "mphantom")) return null;

    return { type: 'phantom', label: "invisible", description: 'Invisible content (takes up space)', element };
  }

  /**
   * Gets a simplified breadcrumb trail with only essential elements
   * @param {Element} cursorElement - The element containing the cursor
   * @returns {Array} - Simplified breadcrumb array
   */
  static getSimplifiedBreadcrumbs(cursorElement) {
    const fullTrail = this.generateBreadcrumbTrail(cursorElement);

    // Filter out redundant or less important elements
    return fullTrail.filter((crumb, index, array) => {
      // Always include the last (most specific) element
      if (index === array.length - 1) return true;

      // Skip generic mrow elements unless they provide specific context
      if (crumb.type === 'mrow' && crumb.label === 'mrow') return false;

      // Include all other elements
      return true;
    });
  }

  static getAccentLabel(mo, position = "over") {
    const text = mo?.textContent || "";
    if (!text) return null;

    const cp = text.codePointAt(0);
    let base = ACCENT_MAP[cp];
    if (!base) return null;

    // Stretchy → mark as "Wide"
    if (mo.getAttribute("stretchy") === "true") {
      base = base.toLowerCase() + " (stretch)";
    }

    return base;
  }

}
