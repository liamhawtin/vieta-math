import { makeAutoObservable } from 'mobx';
import lme from 'lme';
import { TeXProcessor } from '@utils/TeXProcessor';
import { POS_CHAR, FILLER_CHAR, KNOWN_FUNCS } from '@constants';

const ORDERED_KNOWN_FUNCS = Array
  .from(KNOWN_FUNCS)
  .sort((a, b) => b.length - a.length);

export class MathStore {
  expression = '';
  rootStore;

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false
    });
    this.rootStore = rootStore;
  }

  setExpression(value) {
    this.expression = value;
  }

  removeRedundantSpaceBackslashes(expression) {
    const regex = new RegExp(`(?<![\\s${POS_CHAR}])\\\\(?=\\s)`, 'g');
    const matches = [...expression.matchAll(regex)];

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
      const index = match.index;

      // Only remove if we're in text mode
      const inTextMode = TeXProcessor.isTextMode(expression, index);

      result += expression.slice(lastIndex, index);

      if (!inTextMode) {
        result += '\\'; // Keep the backslash if not in text mode
      }
      // else: skip the backslash (remove it)

      lastIndex = index + 1;
    }

    result += expression.slice(lastIndex);

    return result;
  }

  mergeLoneChars(str) {
    return str.replace(
      /(?<!\\)(?:(?<=^)|(?<=[^a-zA-Z0-9\\]))(\s*)((?:\s*[a-zA-Z0-9]){2,})/g,
      (match, leadingSpace, group, offset) => {
        let result = '';
        let i = 0;

        while (i < group.length) {
          const char = group[i];

          if (char === ' ' || char === '\t' || char === '\n') {
            const indexInStr = offset + leadingSpace.length + i;

            if (TeXProcessor.isTextMode(str, indexInStr)) {
              result += char; // keep space
            }

            // else: skip the space (remove it)
            i++;
          } else {
            result += char;
            i++;
          }
        }

        return leadingSpace + result;
      }
    );
  }

  normalizeWhitespace(expression) {
    expression = expression
      .replace(/\s+/g, ' ');                // Collapse multiple spaces into one

    expression = this.removeRedundantSpaceBackslashes(expression);
    expression = this.mergeLoneChars(expression);

    return expression.trim();               // Trim leading/trailing space
  }

  postProcessExpression(expression) {
    let result = this.normalizeWhitespace(expression);
    return result;
  }

  replaceWithFiller(str, start, end) {
    return `${str.slice(0, start)}${FILLER_CHAR.repeat(end - start)}${str.slice(end)}`;
  }

  removeFiller(str) {
    const regex = new RegExp(FILLER_CHAR, 'g');
    return str.replace(regex, '');
  }

  autoCompleteInsert(insertPosition, symbol) {
    const expr = this.expression;

    // =====================================================
    // 1. Autocomplete <= and >=
    // =====================================================
    if (symbol.trim() === "=") {
      let i = insertPosition - 1;
      while (i >= 0 && /\s/.test(expr[i])) i--;

      if (expr[i] === "<") {
        return {
          handled: true,
          newSymbol: "\\leq",
          rangeStart: i,
          rangeEnd: insertPosition + 1
        };
      }

      if (expr[i] === ">") {
        return {
          handled: true,
          newSymbol: "\\geq",
          rangeStart: i,
          rangeEnd: insertPosition + 1
        };
      }
    }

    if (symbol === "-") {
      let i = insertPosition - 1;
      while (i >= 0 && /\s/.test(expr[i])) i--;

      if (expr[i] === "<") {
        return {
          handled: true,
          newSymbol: "\\leftarrow",
          rangeStart: i,
          rangeEnd: insertPosition + 1
        };
      }
    }

    if (symbol === ">") {
      let i = insertPosition - 1;
      while (i >= 0 && /\s/.test(expr[i])) i--;

      if (expr[i] === "-") {
        return {
          handled: true,
          newSymbol: "\\rightarrow",
          rangeStart: i,
          rangeEnd: insertPosition + 1
        };
      }
    }

    // =====================================================
    // 2. Autocomplete math functions (min → \min, etc.)
    // =====================================================

    // Only trigger when user typed a letter
    if (/^[A-Za-z]$/.test(symbol)) {
      const caret = insertPosition;

      // Scan backward collecting contiguous letters only
      let p = caret - 1;
      while (p >= 0 && /[A-Za-z]/.test(expr[p])) p--;

      const start = p + 1;
      const end = caret;

      const fullWord = expr.slice(start, end) + symbol;

      // Try longest suffix match first (sin before in, etc.)
      for (const func of ORDERED_KNOWN_FUNCS) {
        if (fullWord.endsWith(func)) {
          const funcStart = start + fullWord.length - func.length;

          // Block inside text mode
          if (!TeXProcessor.isTextMode(expr, funcStart)) {
            // Block if already escaped
            if (!(funcStart > 0 && expr[funcStart - 1] === "\\")) {
              return {
                handled: true,
                newSymbol: "\\" + func,
                rangeStart: funcStart,
                rangeEnd: end
              };
            }
          }
        }
      }
    }

    // =====================================================
    // Nothing matched
    // =====================================================
    return { handled: false };
  }

  insertSymbol(symbol, range, options) {

    const selection = this.rootStore.editorStore.selection;

    if (!range) {
      const auto = this.autoCompleteInsert(selection.range.start, symbol);
      if (auto.handled) {
        range = {
          start: auto.rangeStart,
          end: auto.rangeEnd
        };
        symbol = auto.newSymbol;
      }
    }

    let posChar = symbol.includes(POS_CHAR) ? '' : POS_CHAR;

    this.rootStore.editorStore.setFocus();

    const endsWithCommand = symbol.match(/[a-zA-Z\\]+(?=[^a-zA-Z\\]*$)$/)?.[0].startsWith('\\');
    symbol += endsWithCommand ? " " : "";

    let selectedText = '';
    let expressionTemp = this.expression;

    if (options?.removeRanges?.length) {
      options.removeRanges.forEach(range => {
        expressionTemp = this.replaceWithFiller(expressionTemp, range[0], range[1]);
      });
    }

    const isNaNs = Number.isNaN(selection.range.start) && Number.isNaN(selection.range.end);
    if (isNaNs) {
      selection.range.start = 0;
      selection.range.end = 0;
    }

    let start = selection.range.start;
    let end = selection.range.end;

    if (range) {

      if (options?.keepCaret) {

        expressionTemp = expressionTemp.slice(0, start) + posChar + expressionTemp.slice(start);
        const caretInBefore = start <= range.start;
        const caretInAfter = start >= range.end;

        if (!caretInBefore && ! caretInAfter) {
          range.start += 1;
        } else if (caretInBefore) {
          range.start += 1;
          range.end += 1;
        }

        posChar = '';

      }

      selectedText = expressionTemp.slice(range.start, range.end);
      expressionTemp = expressionTemp.slice(0, range.start) + expressionTemp.slice(range.end);
      start = range.start;
    } else if (start !== end) {
      selectedText = expressionTemp.slice(start, end);
      expressionTemp = expressionTemp.slice(0, start) + expressionTemp.slice(end);
    }

    if (options?.noInjection) {
      selectedText = "";
    }

    // Recalculate whitespace based on new expressionTemp
    const ensurePrecedingWhitespace = (expr, insertPosition) => {
      return insertPosition > 0 && ![' ', '{', '[', '('].includes(expr[insertPosition - 1])
        ? ' '
        : '';
    };

    const insertPosition = start;
    const precedingSpace = options?.noSurroundingWhitespace
      ? ''
      : ensurePrecedingWhitespace(expressionTemp, insertPosition);

    let latexTemplate = precedingSpace + symbol;
    let latexToInsert = latexTemplate;

    const hasArg1 = TeXProcessor.hasArgument(symbol, 1);
    const hasArg2 = TeXProcessor.hasArgument(symbol, 2);

    if (hasArg1) {
      if (selectedText) {
        // Selected text exists
        if (hasArg2) {
          // Insert selectedText into Ꞩ1, POS_CHAR into Ꞩ2
          latexToInsert = TeXProcessor.replacePlaceholder(latexTemplate, selectedText, 1);
          latexToInsert = TeXProcessor.replacePlaceholder(latexToInsert, posChar, 2);
        } else {
          // Only Ꞩ1 exists: insert selectedText + POS_CHAR *together* into Ꞩ1
          const selectedPlusCaret = `${selectedText}${posChar}`;
          latexToInsert = TeXProcessor.replacePlaceholder(latexTemplate, selectedPlusCaret, 1);
        }
      } else {
        // No selected text: insert POS_CHAR into Ꞩ1
        latexToInsert = TeXProcessor.replacePlaceholder(latexTemplate, posChar, 1);
      }
    } else if (hasArg2) {
      latexToInsert = TeXProcessor.replacePlaceholder(latexTemplate, selectedText || posChar, 2);
    } else {
      latexToInsert += posChar;
    }

    latexToInsert = TeXProcessor.stripPlaceholders(latexToInsert);

    expressionTemp =
      expressionTemp.substring(0, insertPosition) +
      latexToInsert +
      expressionTemp.substring(insertPosition);

    expressionTemp = this.removeFiller(expressionTemp);

    ({ expression: expressionTemp } = this.preserveVisualSpacingInTextCommand(expressionTemp));

    try {
      expressionTemp = lme.expandString(expressionTemp);
    } catch (error) {
      console.error("expandString failed in insertSymbol:", error);
      this.rootStore.notificationStore.showError("Invalid expression");
      return;
    }

    expressionTemp = this.postProcessExpression(expressionTemp);

    const caretPosition = expressionTemp.indexOf(POS_CHAR);

    expressionTemp = expressionTemp.split(POS_CHAR).join("").replace(/\s+/g, ' ').trim();

    if (this.rootStore.externalStore.insertSymbol) {
      this.rootStore.externalStore.insertSymbol(expressionTemp);
      return;
    }

    this.rootStore.editorStore.updateExpression(expressionTemp);

    this.rootStore.editorStore.setSelection({ start: caretPosition, end: caretPosition });
  }

  removeRange(start, end, options) {
    if (start >= end || start < 0 || end > this.expression.length) {
      throw new Error(
        `Invalid range for removal: start=${start}, end=${end}, expression length=${this.expression.length}. `      );
    }

    this.rootStore.editorStore.visualSelection.lastPosition = null;

    let expressionTemp = this.expression;
    let posChar = POS_CHAR;

    if (options?.keepCaret) {

      const selection = this.rootStore.editorStore.selection;

      expressionTemp = expressionTemp.slice(0, selection.range.start) + posChar + expressionTemp.slice(selection.range.start);
      const caretInBefore = selection.range.start <= start;
      const caretInAfter = selection.range.start >= end;

      if (!caretInBefore && !caretInAfter) {
        start += 1;
      } else if (caretInBefore) {
        start += 1;
        end += 1;
      }

      posChar = '';

    }

    // Insert the caret marker at the removal start point
    let beforeRemoval = expressionTemp.substring(0, start);
    const afterRemoval = expressionTemp.substring(end);

    const endsWithCommand = beforeRemoval.match(/[a-zA-Z\\]+(?=[^a-zA-Z\\]*$)$/)?.[0].startsWith('\\');
    beforeRemoval += endsWithCommand ? " " : "";

    expressionTemp = beforeRemoval + posChar + afterRemoval;

    try {
      expressionTemp = lme.expandString(expressionTemp);
    } catch (error) {
      console.error("expandString failed in removeRange:", error);
      this.rootStore.notificationStore.showError("Invalid expression");
      return;
    }

    ({ expression: expressionTemp } = this.preserveVisualSpacingInTextCommand(expressionTemp));

    expressionTemp = this.postProcessExpression(expressionTemp);

    const caretPosition = expressionTemp.indexOf(POS_CHAR);

    expressionTemp = expressionTemp.split(POS_CHAR).join("").replace(/\s+/g, ' ').trim();

    this.rootStore.editorStore.updateExpression(expressionTemp);

    // Update the collapsed caret position
    this.rootStore.editorStore.setSelection({
      start: caretPosition,
      end: caretPosition
    });

    // Cancel selections after cleanup
    //this.rootStore.editorStore.cancelAllSelections();
  }

  // This could be improved a bit to reduce how often it calls getEnclsoingTextCommand.
  // With earlier termination checks.
  preserveVisualSpacingInTextCommand(expression) {
    const caretPosition = expression.indexOf(POS_CHAR);

    const escapedPosChar = POS_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(`(\\s*)${escapedPosChar}(\\s*)`);
    const match = expression.match(regex);

    const left = match?.[1]?.length || 0;
    const right = match?.[2]?.length || 0;

    if (left + right <= 1) {
      return { expression };
    }

    const command = TeXProcessor.getEnclosingTextCommand(expression, caretPosition);
    if (command) {
      const tex = ' ' + (left ? '\\ '.repeat(left - 1) : '') + POS_CHAR + '\\ '.repeat(right);
      expression = expression.replace(regex, tex);
    }

    return { expression };
  }

}
