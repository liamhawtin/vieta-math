import {
  TEXT_COMMANDS,
  POS_CHAR,
  ARG_ID_CHAR,
  FILLER_CHAR,
  PLACEHOLDER_CHAR
} from '@constants';
import lme from 'lme';

export class TeXProcessor {
  static replacePlaceholder(latex, value, argNumber = 1) {
    const escaped = PLACEHOLDER_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}${argNumber}(?![0-9])`, 'g');
    return latex.replace(regex, value);
  }

  static stripPlaceholders(latex) {
    return latex.replace(
      new RegExp(`${PLACEHOLDER_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[0-9]+`, 'g'),
      ''
    );
  }

  static stripMarkers(latex) {
    // First reuse existing placeholder-stripping logic
    latex = this.stripPlaceholders(latex);

    // Escape helper
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Characters to remove (standalone)
    const chars = [
      POS_CHAR,
      ARG_ID_CHAR,
      FILLER_CHAR,
      PLACEHOLDER_CHAR, // standalone Ꞩ (since Ꞩ<digits> already removed)
    ].map(esc).join('');

    const regex = new RegExp(`[${chars}]`, 'g');

    return latex.replace(regex, '');
  }

  static getArgumentPosition(template, argIndex) {
    const escaped = PLACEHOLDER_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}${argIndex}(?![0-9])`);
    const match = regex.exec(template);
    return match ? match.index : -1;
  }

  static hasArgument(template, argIndex) {
    const escaped = PLACEHOLDER_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}${argIndex}(?![0-9])`);
    return regex.test(template);
  }

  static extractMathContent(raw) {
    const text = raw.trim();
    const doubleRegex = /\$\s*\$/g;

    const ranges = [];
    let match;

    while ((match = doubleRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      ranges.push([start, end]);
    }

    // $$ ... $$
    if (
      ranges.length > 0 &&
      ranges[0][0] === 0 &&
      ranges[ranges.length - 1][1] === text.length
    ) {
      const contentStart = ranges[0][1];
      const contentEnd = ranges[ranges.length - 1][0];
      return text.slice(contentStart, contentEnd);
    }

    // $ ... $
    if (text.startsWith("$") && text.endsWith("$")) {
      return text.slice(1, -1);
    }

    // \( ... \)
    if (text.startsWith("\\(") && text.endsWith("\\)")) {
      return text.slice(2, -2);
    }

    // \[ ... \]
    if (text.startsWith("\\[") && text.endsWith("\\]")) {
      return text.slice(2, -2);
    }

    return text;
  }

  static extractModifierAndDelimiter(expression) {
    const trimmedExpr = expression.trim();

    const knownModifiers = ['\\mathrel', '\\Bigg', '\\bigg', '\\Big', '\\big', '\\left', '\\right', '\\middle'];

    for (const mod of knownModifiers) {
      if (trimmedExpr.startsWith(mod)) {
        const remaining = trimmedExpr.slice(mod.length).trim();

        // Special handling for \\mathrel which can take braced arguments
        if (mod === '\\mathrel') {
          if (remaining.startsWith('{') && remaining.endsWith('}')) {
            return { modifier: mod, delimiter: remaining.slice(1, -1) };
          } else {
            return { modifier: mod, delimiter: remaining };
          }
        } else {
          return { modifier: mod, delimiter: remaining };
        }
      }
    }

    return { modifier: null, delimiter: trimmedExpr };
  }

  static stripOuterBraces(latex) {
    if (!latex) return latex;
    latex = latex.trim();
    if (latex.startsWith("{") && latex.endsWith("}")) {
      return latex.slice(1, -1).trim();
    }
    return latex;
  }

  static analyzeSingleArray(input) {
    const parseTree = lme.__parse(input, {
      throwOnError: false,
      strict: false,
      displayMode: true
    });

    const arrayNode = parseTree[0];
    if (!arrayNode || arrayNode.type !== 'array') {
      return null;
    }

    let environmentType = 'array';
    if (arrayNode.arraystretch && arrayNode.arraystretch < 1) {
      // It's either subarray or smallmatrix - distinguish by column count
      if (arrayNode.body && arrayNode.body.length > 0) {
        const firstRow = arrayNode.body[0];
        const columnCount = firstRow ? firstRow.length : 0;
        environmentType = columnCount === 1 ? 'subarray' : 'smallmatrix';
      }
    }

    // Extract column alignment from cols attribute
    let maxColumnCount = 0;
    if (arrayNode.body && Array.isArray(arrayNode.body)) {
      maxColumnCount = Math.max(...arrayNode.body.map(row => row.length));
    }

    // Step 2: Extract and fill column alignment
    let columnAlignment = [];
    if (arrayNode.cols && Array.isArray(arrayNode.cols)) {
      columnAlignment = arrayNode.cols.map(col => col.align || 'c');
    }

    // Step 3: Pad with 'c' if needed
    while (columnAlignment.length < maxColumnCount) {
      columnAlignment.push('c');
    }

    // Extract rows from body attribute
    const rows = [];
    if (arrayNode.body && Array.isArray(arrayNode.body)) {
      arrayNode.body.forEach((row, rowIndex) => {
        const cells = row.map(cellNode => {
          // Extract cell content using location ranges from the original input
          if (cellNode && cellNode.loc) {
            const cellContent = input.slice(cellNode.loc.start, cellNode.loc.end);
            return cellContent
          }
          return '';
        });
        const spacing = arrayNode?.rowGaps?.[rowIndex] ?? null;
        rows.push({ cells, spacing });
      });
    }

    return {
      environmentType,
      columnAlignment,
      rows,
    };
  }

  static buildArrayFromStructure({ environmentType: originalType, columnAlignment, rows }, caretRow, caretCol) {

    let environmentType = originalType || 'array';

    if (originalType === 'smallmatrix' || originalType === 'subarray') {
      const maxColumns = Math.max(...rows.map(row => row.cells.length));
      environmentType = maxColumns === 1 ? 'subarray' : 'smallmatrix';
    }

    const requiresAlignment = environmentType !== 'smallmatrix';
    const singleCharAlignment = environmentType === 'subarray';

    let alignmentStr = columnAlignment.join('');
    if (requiresAlignment) {
      if (singleCharAlignment) {
        alignmentStr = columnAlignment[0] || 'c';
      } else {
        alignmentStr = columnAlignment.join('');
      }
    } else {
      alignmentStr = '';
    }

    const targetCell = rows?.[caretRow]?.cells?.[caretCol] ?? '';
    const targetHasMarker = targetCell.includes(POS_CHAR);

    const body = rows
        .map(({ cells, spacing }, rIdx) => {
            const row = cells
                .map((cell, cIdx) => {
                    // If it's the target cell and it doesn't already have POS_CHAR
                    if (rIdx === caretRow && cIdx === caretCol) {
                        if (!targetHasMarker) {
                            return cell.slice(0, 1) + POS_CHAR + cell.slice(1);
                        }
                        return cell;
                    }

                    // For all other cells: remove POS_CHAR if the target didn't already have it
                    const markerRegex = new RegExp(POS_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    return targetHasMarker ? cell : cell.replace(markerRegex, '');
                })
                .join(' & ');
            const spacer = spacing ? `\[${spacing.number.toString()}${spacing.unit}]` : '';
            return `${row} \\\\${spacer}`;
        })
        .join(' ');

    const alignmentPart = alignmentStr ? `{${alignmentStr}}` : '';
    return `\\begin{${environmentType}}${alignmentPart}${body}\\end{${environmentType}}`;
  }

  static mutateArray(input, rowIndex, colIndex, command, commandArg = null) {
    const structure = this.analyzeSingleArray(input);
    if (!structure) return null;

    const numRows = structure.rows.length;
    const numCols = Math.max(...structure.rows.map(row => row.cells.length));

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    let nextRowIndex = rowIndex;
    let nextColIndex = colIndex;

    switch (command) {
        case 'createRowAbove': {
            const insertAt = clamp(rowIndex, 0, numRows);
            const newRow = Array(numCols).fill('');
            structure.rows.splice(insertAt, 0, { cells: newRow, spacing: null });
            nextRowIndex = insertAt;
            break;
        }

        case 'createRowBelow': {
            const insertAt = clamp(rowIndex + 1, 0, numRows);
            const newRow = Array(numCols).fill('');
            structure.rows.splice(insertAt, 0, { cells: newRow, spacing: null });
            nextRowIndex = insertAt;
            break;
        }

        case 'createColumnLeft': {
            const insertAt = clamp(colIndex, 0, numCols);
            structure.columnAlignment.splice(insertAt, 0, 'c');
            structure.rows.forEach(row => row.cells.splice(insertAt, 0, ''));
            nextColIndex = insertAt;
            break;
        }

        case 'createColumnRight': {
            const insertAt = clamp(colIndex + 1, 0, numCols);
            structure.columnAlignment.splice(insertAt, 0, 'c');
            structure.rows.forEach(row => row.cells.splice(insertAt, 0, ''));
            nextColIndex = insertAt;
            break;
        }

        case 'moveRowUp': {
            if (rowIndex > 0) {
                [structure.rows[rowIndex], structure.rows[rowIndex - 1]] =
                    [structure.rows[rowIndex - 1], structure.rows[rowIndex]];
                nextRowIndex = rowIndex - 1;
            }
            break;
        }

        case 'moveRowDown': {
            if (rowIndex < numRows - 1) {
                [structure.rows[rowIndex], structure.rows[rowIndex + 1]] =
                    [structure.rows[rowIndex + 1], structure.rows[rowIndex]];
                nextRowIndex = rowIndex + 1;
            }
            break;
        }

        case 'moveColumnLeft': {
            if (colIndex > 0) {
                [structure.columnAlignment[colIndex], structure.columnAlignment[colIndex - 1]] =
                    [structure.columnAlignment[colIndex - 1], structure.columnAlignment[colIndex]];
                structure.rows.forEach(row => {
                    [row.cells[colIndex], row.cells[colIndex - 1]] =
                        [row.cells[colIndex - 1], row.cells[colIndex]];
                });
                nextColIndex = colIndex - 1;
            }
            break;
        }

        case 'moveColumnRight': {
            if (colIndex < numCols - 1) {
                [structure.columnAlignment[colIndex], structure.columnAlignment[colIndex + 1]] =
                    [structure.columnAlignment[colIndex + 1], structure.columnAlignment[colIndex]];
                structure.rows.forEach(row => {
                    [row.cells[colIndex], row.cells[colIndex + 1]] =
                        [row.cells[colIndex + 1], row.cells[colIndex]];
                });
                nextColIndex = colIndex + 1;
            }
            break;
        }

        case 'removeRow': {
            if (numRows > 1) {
                const removedAt = clamp(rowIndex, 0, numRows - 1);
                structure.rows.splice(removedAt, 1);
                nextRowIndex = Math.min(removedAt, structure.rows.length - 1);
                nextColIndex = Math.min(colIndex, structure.rows[nextRowIndex].cells.length - 1);
            }
            break;
        }

        case 'removeColumn': {
            if (numCols > 1) {
                const removedAt = clamp(colIndex, 0, numCols - 1);
                structure.columnAlignment.splice(removedAt, 1);
                structure.rows.forEach(row => row.cells.splice(removedAt, 1));
                nextColIndex = Math.min(removedAt, numCols - 2);
                nextRowIndex = Math.min(rowIndex, structure.rows.length - 1);
            }
            break;
        }

        case 'setColumnAlign': {
            if (!['l', 'c', 'r'].includes(commandArg)) {
                throw new Error(`Invalid alignment value: ${commandArg}`);
            }
            if (colIndex >= 0 && colIndex < structure.columnAlignment.length) {
                structure.columnAlignment[colIndex] = commandArg;
            }
            break;
        }

        case 'setRowSpacing': {
            if (rowIndex >= 0 && rowIndex < structure.rows.length) {
                structure.rows[rowIndex].spacing = { number: commandArg, unit: "em" };
            }
            break;
        }

        default:
            throw new Error(`Unknown command: ${command}`);
    }

    return this.buildArrayFromStructure(structure, nextRowIndex, nextColIndex);
  }

  static getEnclosingCommandWithPositionAndRange(latex, pos) {
    for (let i = pos, depth = 0; i >= 0; i--) {
      if (latex[i] === '{' || latex[i] === '}') {
        if (i && latex[i - 1] === '\\') { i--; continue; }
        depth += latex[i] === '}' ? 1 : -1;
        if (depth < 0) {
          const slice = latex.slice(0, i);
          const match = slice.match(/\\[a-zA-Z]+\s*$/);
          if (match) {
            const command = match[0].trim();
            const start = slice.length - match[0].length;
            const end = start + command.length;
            return {
              command,
              bracePos: i,
              range: { start, end }
            };
          }
          depth = 0;
        }
      }
    }
    return null;
  }

  static getEnclosingCommand(latex, pos) {
    const result = this.getEnclosingCommandWithPositionAndRange(latex, pos);
    return result ? result.command : null;
  }

  static getAllEnclosingCommands(latex, pos) {
    const commands = [];
    let currentPos = pos;

    while (true) {
      const result = this.getEnclosingCommandWithPositionAndRange(latex, currentPos);
      if (!result) break;

      commands.unshift({
        command: result.command,
        range: result.range
      });

      if (result.bracePos <= 0) break;
      currentPos = result.bracePos - 1;
    }

    return commands;
  }

  // ---- TEXT COMMANDS ----

  static getEnclosingTextCommandWithPositionAndRange(latex, pos) {
    const result = this.getEnclosingCommandWithPositionAndRange(latex, pos);
    if (result && TEXT_COMMANDS.has(result.command)) {
      return result;
    }
    return null;
  }

  static getEnclosingTextCommand(latex, pos) {
    const result = this.getEnclosingTextCommandWithPositionAndRange(latex, pos);
    return result ? result.command : null;
  }

  static getAllEnclosingTextCommands(latex, pos) {
    const commands = [];
    let currentPos = pos;

    while (true) {
      const result = this.getEnclosingTextCommandWithPositionAndRange(latex, currentPos);
      if (!result) break;

      commands.unshift({
        command: result.command,
        range: result.range
      });

      if (result.bracePos <= 0) break;
      currentPos = result.bracePos - 1;
    }

    return commands;
  }

  // ---- TEXT MODE DETECTION ----

  static isTextMode(latex, pos) {
    const enclosing = this.getEnclosingTextCommandWithPositionAndRange(latex, pos);
    if (!enclosing) return false;

    const { range } = enclosing;

    // Walk backwards from `pos` to just after the command's closing name
    for (let i = pos; i >= range.end; i--) {
      // Check for $
      if (latex[i] === '$') {
        if (i > 0 && latex[i - 1] === '\\') continue; // skip escaped \$
        return false;
      }

      // Check for \(
      if (latex.slice(i - 1, i + 1) === '\\(') return false;

      // Check for \begin{math}
      if (latex.slice(i - 12, i + 1) === '\\begin{math}') return false;
    }

    return true;
  }

}
