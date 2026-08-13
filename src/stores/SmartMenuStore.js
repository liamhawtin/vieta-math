import React from 'react';
import { makeAutoObservable } from 'mobx';
import symbolData from '@data/symbolpad-data.json';
import { MMLInspector as ML } from '@utils/MMLInspector';
import { TeXProcessor as TP } from '@utils/TeXProcessor';
import { getSearchScore } from '@utils/searchUtils';
import { negatableSymbols } from '@data/symbols';
import {
  ARROW_MAPPINGS,
  DELIMITER_SIZE_OPTIONS,
  FONT_COMMAND_DEFINITIONS,
  FONT_COMMAND_LABELS,
  VALID_LOWER_FONTS,
  VALID_NUMBER_FONTS,
  VALID_OTHER_FONTS,
} from '@constants';

const MATH_FONT_TRANSFORMS = [
  {
    cmd: "\\mathrm",
    name: "math upright",
    keywords: ["math upright", "math roman"]
  },
  {
    cmd: "\\mathit",
    name: "math italic",
    keywords: ["math italic"]
  },
  {
    cmd: "\\mathbf",
    name: "math bold",
    keywords: ["math bold", "math upright bold"]
  },
  {
    cmd: "\\boldsymbol",
    name: "math bold italic",
    keywords: ["math bold italic"]
  },
  {
    cmd: "\\mathsf",
    name: "math sans",
    keywords: ["math sans serif"]
  },
  {
    cmd: "\\mathtt",
    name: "math monospace",
    keywords: ["math monospace"]
  },
  {
    cmd: "\\mathbb",
    name: "math blackboard",
    keywords: ["math blackboard", "double struck"]
  },
  {
    cmd: "\\mathfrak",
    name: "math fraktur",
    keywords: ["math fraktur", "math gothic"]
  },
  {
    cmd: "\\mathcal",
    name: "math calligraphic",
    keywords: ["math calligraphic", "math script"]
  }
];

const PREFIX_TYPES = {
  font: {
    transforms: MATH_FONT_TRANSFORMS,
  }
};

export class SmartMenuStore {
  menuElement = null;
  isOpen = false;
  searchQuery = '';
  selectedIndex = -1;
  selectedSubIndex = 0;
  position = { x: 0, y: 0 };
  results = [];
  context = {};
  rootStore;

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false
    });
    this.rootStore = rootStore;
  }

  getFontState() {
    let state = null;

    if (this.context.selectedElements.length === 1) {
      const element = this.context.selectedElements[0];
      const expr = this.rootStore.mathStore.expression;

      let range = ML.getRangeFromElement(element);
      let text = null;
      let command = null;
      let type = "OTHER";

      // --- styled font wrapper ---
      if (ML.hasMathFontFromMpadded(element)) {
        const mrow = element.firstElementChild;
        const prim = mrow?.firstElementChild;

        const innerRange = ML.getRangeFromElement(prim);
        const outerRange = ML.getRangeFromElement(element);

        if (prim && innerRange && outerRange) {
          text = expr.slice(innerRange.start, innerRange.end).trim();
          command = expr.slice(outerRange.start, innerRange.start).trim();
          range = outerRange;

          if (ML.isType(prim, "mn")) type = "NUMBER";
          else if (/^[A-Z]$/.test(text)) type = "UPPER";
          else if (/^[a-z]$/.test(text)) type = "LOWER";
        }
      }

      // --- plain <mi> ---
      else if (ML.isType(element, "mi") && !ML.isLinFunc(element) && range) {
        text = expr.slice(range.start, range.end).trim();
        command = element.getAttribute("mathvariant") === "normal" ? "\\mathrm" : "\\mathit";

        if (/^[A-Z]$/.test(text)) type = "UPPER";
        else if (/^[a-z]$/.test(text)) type = "LOWER";
      }

      // --- <mn> ---
      else if (ML.isType(element, "mn") && range) {
        text = expr.slice(range.start, range.end).trim();
        command = "\\mathrm";
        type = "NUMBER";
      }

      // --- validation ---
      if (range && text && command) {
        state = {type, text, command, range, element,};
      }
    }

    return state;
  }

  getDelimiterState() {
    if (this.context.selectedElements.length !== 1) return;
    const element = this.context.selectedElements[0];
    const delim = ML.getDelimiter(element);
    if (!delim) return;

    const tex = this.rootStore.mathStore.expression.slice(
      delim.range.start,
      delim.range.end
    );

    const { delimiter, modifier } = TP.extractModifierAndDelimiter(tex);

    const isInDelimGroup = ML.isDelimiterPartOfGroup(delim.element);

    return {
      delimiter,
      modifier: modifier || '',
      element: delim.element,
      range: delim.range,
      isInDelimGroup,
    };
  }

  buildContextSnapshot() {
    const editorStore = this.rootStore.editorStore;

    this.context.selectedElements = editorStore.getRootSelectionElements();
    this.context.arrayState = editorStore.determineArrayState();
    this.context.hasDelimiter = editorStore.hasDelimiterInVisualSelection();

    this.context.delimiterState = this.getDelimiterState();
    this.context.fontState = this.getFontState();
  }

  open(position) {
    this.isOpen = true;
    this.position = position;
    this.searchQuery = '';
    this.selectedIndex = -1;

    this.buildContextSnapshot();

    this.updateResults();

    if (!this.rootStore.editorStore.hasSeenSmartMenuTip) {
      localStorage.setItem('smartMenuTipSeen', 'true');
      this.rootStore.editorStore.hasSeenSmartMenuTip = true;
    }

  }

  close() {
    this.isOpen = false;
    this.searchQuery = '';
    this.selectedIndex = -1;
    this.results = [];
    this.context = {};
    this.rootStore.editorStore.setFocus();
  }

  setMenuElement(element) {
    this.menuElement = element;
  }


  setSearchQuery(query) {
    this.searchQuery = query;
    if (query.trim()) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = -1;
    }
    this.updateResults();
  }

  selectNext() {
    if (!this.results.length) return;
    if (this.selectedIndex === -1) {
      this.selectedIndex = 0;
      this.selectedSubIndex = 0;
    } else {
      this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
      this.selectedSubIndex = 0;
    }
  }

  selectPrevious() {
    if (!this.results.length) return;

    if (this.selectedIndex === -1) {
      this.selectedIndex = this.results.length - 1;
      this.selectedSubIndex = 0;
    } else {
      this.selectedIndex =
        this.selectedIndex > 0
          ? this.selectedIndex - 1
          : this.results.length - 1;
      this.selectedSubIndex = 0;
    }
  }

  selectNextSubAction() {
    const current = this.results[this.selectedIndex];
    if (!current?.subActions) return;
    this.selectedSubIndex = (this.selectedSubIndex + 1) % current.subActions.length;
  }

  selectPreviousSubAction() {
    const current = this.results[this.selectedIndex];
    if (!current?.subActions) return;
    this.selectedSubIndex = this.selectedSubIndex > 0
      ? this.selectedSubIndex - 1
      : current.subActions.length - 1;
  }

  getSelectedResult() {
    return this.results[this.selectedIndex] || null;
  }

  // Pattern recognizers for natural language input
  recognizeMatrixPattern(query) {
    const matrixPattern = /(\d+)\s*(?:x|by|×)\s*(\d+)/i;
    const match = query.match(matrixPattern);
    if (match) {
      const rows = parseInt(match[1]);
      const cols = parseInt(match[2]);
      return this.generateMatrixTemplates(rows, cols);
    }
    return [];
  }

  recognizeCommentPattern(query) {
    if (query.toLowerCase().includes('comment') || query.toLowerCase().includes('underbrace')) {
      return this.generateCommentTemplates();
    }
    return [];
  }

  recognizeUnitFormattingPattern(query) {
    const queryLower = query.toLowerCase();
    const templates = [];

    // Check for unit formatting requests
    if (queryLower.includes('format') && queryLower.includes('unit')) {
      templates.push({
        id: 'format_as_unit',
        name: 'Format as Unit',
        latex: '\\text{Ꞩ1}',
        type: 'generated_unit',
        category: 'Units',
        keywords: ['unit', 'format', 'text'],
        preview: 'unit',
        score: 95
      });
    }

    return templates;
  }

  // Template generators that build on existing symbols
  generateMatrixTemplates(rows, cols) {
    const templates = [];

    const matrixTypes = [
      { type: 'array', name: 'Matrix', delim: '()' },
      { type: 'pmatrix', name: 'Parentheses Matrix', delim: '()' },
      { type: 'bmatrix', name: 'Bracket Matrix', delim: '[]' },
      { type: 'vmatrix', name: 'Determinant', delim: '||' },
      { type: 'Bmatrix', name: 'Brace Matrix', delim: '{}' },
    ];

    matrixTypes.forEach(matrixType => {
      const latex = this.generateMatrixLatex(matrixType.type, rows, cols);

      let name;

      if (rows === 1 && cols === 1) {
        name = "Scalar";
      } else if (rows === 1 && cols > 1) {
        name = "Row Vector";
      } else if (cols === 1 && rows > 1) {
        name = "Column Vector";
      } else {
        name = matrixType.name;
      }

      templates.push({
        id: `${matrixType.type}_${rows}x${cols}`,
        name,
        latex,
        type: 'generated_matrix',
        category: 'Arrays',
        keywords: [
          'matrix',
          'array',
          'vector',
          matrixType.type
        ],
        preview: `${matrixType.delim[0]}…${matrixType.delim[1]}`,
        score: 100
      });
    });

    return templates;
  }

  generateMatrixLatex(type, rows, cols) {
    let align = (type === "array") ? `{${'c'.repeat(cols)}}` : '';
    let latex = `\\begin{${type}}${align} `;
    let argIndex = 1;

    for (let i = 0; i < rows; i++) {
      const rowItems = [];
      for (let j = 0; j < cols; j++) {
        rowItems.push(`{Ꞩ${argIndex++}}`);
      }
      latex += ` ${rowItems.join(' & ')}`;
      if (i < rows - 1) {
        latex += ' \\\\';
      }
    }

    latex += ` \\end{${type}}`;
    return latex;
  }

  generateCommentTemplates() {
    return [
      {
        id: 'underbrace_comment',
        name: 'Underbrace with Comment',
        latex: '\\underbrace{Ꞩ1}_{\\text{Ꞩ2}}',
        type: 'generated_annotation',
        category: 'Annotations',
        keywords: ['underbrace', 'comment', 'annotation'],
        preview: '⏟comment',
        score: 95
      }
    ];
  }

  generateMathFontTransforms(selectedLatex, query) {
    return MATH_FONT_TRANSFORMS.map(font => {

      // Template structure for scoring + search:
      const templateLatex = `${font.cmd}{Ꞩ1}`;

      // Actual transform to insert into the document:
      const latex = `${font.cmd}{${selectedLatex}}`;

      const keywords = [
        "apply",
        ...font.keywords,
        "font",
        "style"
      ];

      return {
        id: `apply_${font.name.replace(/\s+/g, "_")}`,
        name: `Apply ${font.name}`,

        // actual inserted code
        latex,

        // template used for search scoring
        symbolLatex: templateLatex,

        display: latex,
        category: "Transform",
        type: "transform",
        display: "none",
        keywords,

        score: getSearchScore(
          templateLatex,
          keywords,
          "Transform",
          query
        )*1.1
      };
    });
  }

  recognizeArrayContext(query) {
    const editorStore = this.rootStore.editorStore;
    if (!this.context.arrayState) return [];

    const { table, rowIndex, cellIndex, canAlign } = this.context.arrayState;
    const results = [];

    const makeSubAction = (label, command, arg = null) => ({
      label,
      type: "transform",
      execute: () => editorStore.mutateArray(table, rowIndex, cellIndex, command, arg),
    });

    const makeCompound = (label, keywords, subActions) => ({
      id: `array_${label.replace(/\s+/g, '_').toLowerCase()}`,
      label,
      type: 'compound',
      category: 'Transform',
      keywords,
      subActions,
      score: query ? getSearchScore(null, keywords, 'Transform', query) : 200,
    });

    // Add Column
    results.push(makeCompound(
      'Add Column',
      ['add column', 'add column left', 'add column right', 'insert column'],
      [
        makeSubAction('←', 'createColumnLeft'),
        makeSubAction('→', 'createColumnRight'),
      ]
    ));

    // Move Column
    results.push(makeCompound(
      'Move Column',
      ['move column', 'move column left', 'move column right', 'shift column'],
      [
        makeSubAction('←', 'moveColumnLeft'),
        makeSubAction('→', 'moveColumnRight'),
      ]
    ));

    // Align Column (only if canAlign)
    if (canAlign) {
      results.push(makeCompound(
        'Align Column',
        ['align column', 'align left', 'align center', 'align right'],
        [
          makeSubAction('L', 'setColumnAlign', 'l'),
          makeSubAction('C', 'setColumnAlign', 'c'),
          makeSubAction('R', 'setColumnAlign', 'r'),
        ]
      ));
    }

    // Add Row
    results.push(makeCompound(
      'Add Row',
      ['add row', 'add row above', 'add row below', 'insert row'],
      [
        makeSubAction('↑', 'createRowAbove'),
        makeSubAction('↓', 'createRowBelow'),
      ]
    ));

    // Move Row
    results.push(makeCompound(
      'Move Row',
      ['move row', 'move row up', 'move row down', 'shift row'],
      [
        makeSubAction('↑', 'moveRowUp'),
        makeSubAction('↓', 'moveRowDown'),
      ]
    ));

    // Delete
    results.push(makeCompound(
      'Delete',
      ['delete', 'delete column', 'delete row', 'remove'],
      [
        makeSubAction('Col', 'removeColumn'),
        makeSubAction('Row', 'removeRow'),
      ]
    ));

    return results;
  }

  recognizeQuotedTextPattern(query) {
    // Match "cis" but not partial quotes
    const match = query.match(/^"(.*)"$/);
    if (!match) return [];

    const inner = match[1].trim();
    if (!inner) return [];

    const results = [];

    // Format as text
    results.push({
      id: `quoted_text_${inner}`,
      name: 'Format as text',
      latex: `\\text{${inner}}`,
      display: `\\text{${inner}}`,
      category: 'Text',
      type: 'transform',
      keywords: ['text', 'format as text', 'quoted'],
      score: 300
    });

    // Operator (inline)
    results.push({
      id: `quoted_operator_${inner}`,
      name: 'Format as operator',
      latex: `\\operatorname{${inner}}`,
      display: `\\operatorname{${inner}}`,
      category: 'Operators',
      type: 'transform',
      keywords: ['operator', 'named operator', 'quoted'],
      score: 290
    });

    return results;
  }

  // Search existing symbols from symbolData
  searchExistingSymbols(query, includeCategoryNames = []) {
    const results = [];
    const seen = new Set();

    symbolData.tabs.forEach(tab => {
      tab.categories.forEach(category => {

        // CATEGORY INCLUSION FILTER
        if (includeCategoryNames.length > 0 && !includeCategoryNames.includes(category.name)) {
          return;
        }

        category.symbols.forEach(symbol => {
          if (seen.has(symbol.latex)) return;

          // Base symbol
          let score = getSearchScore(
            symbol.latex,
            symbol.keywords,
            `${category.name} ${tab.name}`,
            query
          );

          if (score > 0) {
            if (symbol.weight) score *= symbol.weight;
            results.push({
              ...symbol,
              category: category.name,
              tab: tab.name,
              type: tab.id,
              score: symbol.priority === 1 ? score + 20 : score
            });
            seen.add(symbol.latex);
          }

          // Variants
          if (symbol.variants?.length) {
            symbol.variants.forEach(variant => {
              if (seen.has(variant.latex)) return;

              const vScore = getSearchScore(
                variant.latex,
                variant.keywords,
                `${category.name} ${tab.name}`,
                query,
                95
              );

              if (vScore > 0) {
                results.push({
                  ...variant,
                  category: category.name,
                  tab: tab.name,
                  type: tab.id,
                  score: vScore,
                  parentSymbol: symbol.latex,
                  parentName: symbol.name || symbol.keywords[0]
                });
                seen.add(variant.latex);
              }
            });
          }

          // Auto-scaled
          if (symbol.autoScaled && !seen.has(symbol.autoScaled.latex)) {
            const aScore = getSearchScore(
              symbol.autoScaled.latex,
              symbol.autoScaled.keywords,
              `${category.name} ${tab.name}`,
              query,
              95
            );

            if (aScore > 0) {
              results.push({
                ...symbol.autoScaled,
                category: category.name,
                tab: tab.name,
                type: tab.id,
                score: aScore,
                isAutoScaled: true,
                originalSymbol: symbol.latex
              });
              seen.add(symbol.autoScaled.latex);
            }
          }
        });
      });
    });

    return results;
  }

  getBestPrefixMatch(prefixQuery) {
    const cleaned = prefixQuery.trim().toLowerCase();
    if (!cleaned) return null;

    let best = null;
    let bestScore = 0;

    for (const [prefixType, config] of Object.entries(PREFIX_TYPES)) {
      const transforms = config.transforms || [];

      for (const transform of transforms) {
        const template = `${transform.cmd}{Ꞩ1}`;

        const score = getSearchScore(
          template,
          transform.keywords,
          transform.name,
          cleaned,
          100
        );

        if (score > bestScore) {
          bestScore = score;
          best = { prefixType, transform, score };
        }
      }
    }

    return bestScore > 0 ? best : null;
  }

  generatePrefixSuggestions(prefixMeta, innerQuery) {
    const { prefixType, transform } = prefixMeta;
    const results = [];

    const isSingleLatin = /^[A-Za-z]$/.test(innerQuery);
    if (isSingleLatin) {
      const latex = `${transform.cmd}{${innerQuery}}`;
      results.push({
        id: `prefix_${transform.cmd}_${innerQuery}`,
        latex,
        display: latex,
        type: "symbol",
        category: "Symbols",
        prefixMeta,
        score: 200
      });
    }

    let symbolCategories;
    switch (prefixType) {
      case "font":
        symbolCategories = ["Greek Letters"];
        break;
      default:
        symbolCategories = ["Greek Letters"];
    }

    const symbols = this.searchExistingSymbols(innerQuery, symbolCategories);

    symbols.forEach(sym => {
      const latex = `${transform.cmd}{${sym.latex}}`;
      results.push({
        ...sym,
        id: `prefix_${transform.cmd}_${sym.latex}`,
        latex,
        display: latex,
        type: "symbol",
        prefixMeta,
        score: sym.score * 1.05
      });
    });

    return results;
  }

  updateResults() {

    const query = this.searchQuery.trim() || "";

    let allResults = [];
    if (!query) {
      allResults = this.getRecentSymbols();
    } else if (this.rootStore.externalStore.methods?.["ai"]) {
      const hasSelection = this.context.selectedElements?.length > 0;
      const verb = hasSelection ? "Modification" : "Generation";
      const lengthBoost = Math.min(query.length * 5, 50);

      allResults.push({
        name: `Natural Language ${verb}`,
        display: "none",
        type: "transform",
        score: 50 + lengthBoost,
        execute: () => this.rootStore.externalStore.methods?.["ai"](query),
      });
    }

    const colonIndex = query.indexOf(":");

    if (colonIndex !== -1) {
      const prefix = query.slice(0, colonIndex).trim();
      const innerQuery = query.slice(colonIndex + 1).trim();

      const match = this.getBestPrefixMatch(prefix);

      if (match) {
        const results = this.generatePrefixSuggestions(match, innerQuery);
        this.results = results.sort((a, b) => b.score - a.score).slice(0, 20);
        return;
      }
    }

    if (this.context.selectedElements.length === 1) {

      if (this.context.delimiterState && !query) {
        const delimiterState = this.context.delimiterState;
        const subActions = [];

        // Add manual size options (exclude current)
        DELIMITER_SIZE_OPTIONS.forEach(({ label, command }) => {
          if (delimiterState.modifier !== command) {
            subActions.push({
              label,
              latex: `${command}${delimiterState.delimiter}`,
              type: "transform",
            });
          }
        });

        // Auto-size (only if in a delimiter group and not already auto)
        if (
          delimiterState.isInDelimGroup &&
          !['\\left', '\\middle', '\\right'].includes(delimiterState.modifier)
        ) {
          subActions.push({
            label: 'Auto',
            latex: `\\middle${delimiterState.delimiter}`,
            type: "transform",
            isGolden: true,
          });
        }

        if (subActions.length > 0) {
          allResults.push({
            id: 'delimiter_size',
            label: 'Delimiter Size',
            type: 'compound',
            category: 'Transform',
            keywords: ['delimiter', 'size'],
            subActions,
            score: 180,
          });
        }
      }

      /* ------------------ FONT ------------------ */
      if (this.context.fontState && !query) {
        const { type, text, command: currentCommand } = this.context.fontState;
        const subActions = [];

        FONT_COMMAND_DEFINITIONS.forEach(({ command }) => {
          // Type-based filtering (same rules as toolbar)
          if (type === "LOWER" && !VALID_LOWER_FONTS.includes(command)) return;
          if (type === "NUMBER" && !VALID_NUMBER_FONTS.includes(command)) return;
          if (type === "OTHER" && !VALID_OTHER_FONTS.includes(command)) return;

          // Exclude current font
          if (command === currentCommand) return;

          subActions.push({
            label: `${command}{${text}}`,
            latex: `${command}{${text}}`,
            type: "transform",
          });
        });

        if (subActions.length > 0) {
          allResults.push({
            id: 'font_style',
            label: '',  // No label, just buttons
            type: 'compound',
            category: 'Transform',
            keywords: ['font', 'style'],
            subActions,
            score: 180,
          });
        }
      }

      let element = this.context.selectedElements[0];

      if (ML.isType(element, ["msubsup", "munderover"])) {
        const [first, second, third] = element.children;

        if (
          first?.hasAttribute("data-function") &&
          second?.firstElementChild?.classList.contains("affordance") &&
          third?.firstElementChild?.classList.contains("affordance")
        ) {
          element = first;
        }
      }

      const range = ML.getRangeFromElement(element);
      if (range) {
        const latex = this.rootStore.mathStore.expression
          .slice(range.start, range.end)
          .trim();

        const symbol = this.findOriginalSymbol(latex);
        if (symbol && symbol.variants && symbol.variants.length > 0) {

          if (symbol.latex !== latex) {
            allResults.push({
              ...symbol,
              category: 'Simple',
              type: 'symbol',
              score: 110,
            });
          }

          symbol.variants.forEach(variant => {
            allResults.push({
              ...variant,
              category: 'Variants',
              type: 'variant',
              score: 100,
              isVariant: true,
              parentSymbol: symbol.latex,
              parentName: symbol.name || symbol.keywords[0],
            });
          });
        }
      }

      if (ML.isType(element, "msqrt") && !query) {
        const arg = ML.getFirstChild(element);
        const argRange = ML.getRangeFromElement(arg);
        if (argRange) {
          const argTex = this.rootStore.mathStore.expression.slice(argRange.start, argRange.end);
          allResults.push({
            latex: `\\sqrt[]{${argTex}}`,
            display: "\\sqrt[Ꞩ2]{\\:}",
            name: "Add index",
            category: "Transform",
            type: "transform",
            keywords: ["root", "nth root", "index"],
            score: 200
          });
        }
      }

      if (ML.isPlainArrow(element) && !query) {
        const range = ML.getRangeFromElement(element);
        if (range) {
          const arrowTex = this.rootStore.mathStore.expression.slice(range.start, range.end);
          let arrowCommand = null;
          for (const [cmd] of Object.entries(ARROW_MAPPINGS)) {
            if (arrowTex.includes(cmd)) {
              arrowCommand = cmd;
              break;
            }
          }
          const xArrowCommand = ARROW_MAPPINGS?.[arrowCommand];
          if (xArrowCommand) {
            allResults.push({
              latex: `${xArrowCommand}{}`,
              name: "Add label",
              category: "Transform",
              type: "transform",
              keywords: ["arrow", "label", "xarrow", "transform"],
              score: 200,
            });
          }
        }
      }
    }

    if (this.context.selectedElements.length > 0) {
      const els = this.context.selectedElements;
      const expr = this.rootStore.mathStore.expression;

      // Gather all range start/end values
      const ranges = els
        .map(el => ML.getRangeFromElement(el))
        .filter(Boolean);

      if (ranges.length > 0) {
        const start = Math.min(...ranges.map(r => r.start));
        const end = Math.max(...ranges.map(r => r.end));
        const slice = expr.slice(start, end).trim();

        const isSimple = els.every(el => ML.isSimpleInline(el));
        let fontTransforms = this.generateMathFontTransforms(slice, query);
        if (!isSimple) {
          fontTransforms = fontTransforms.map(r => ({
            ...r,
            score: Math.floor((r.score || 0) * 0.12) // 88% down-weight
          }));
        }
        allResults.push(...fontTransforms);
      }
    }

    // Array context actions (if inside a matrix or array)
    const arrayActions = this.recognizeArrayContext(query);
    if (arrayActions.length) {
      allResults.push(...arrayActions);
    }

    if (this.context.hasDelimiter && this.context.selectedElements.length > 1) {
      const elements = this.rootStore.editorStore.getOrderedVisualElements();
      const { latex, fullStart, fullEnd } = this.rootStore.editorStore.buildDelimGroupLatex(elements);
      let keywords = ['auto scale'];
      let type = 'transform';
      allResults.push({
        latex: latex,
        display: "\\left(\\begin{array}{c} \\uparrow \\\\ \\downarrow \\\\ \\end{array} \\right)",
        name: `Create Delimiter Group`,
        keywords,
        category: 'Transform',
        type,
        score: query ? getSearchScore(null, keywords, type, query) : 200,
      });
    }

    if (query) {

      const quotedResults = this.recognizeQuotedTextPattern(query);
      allResults.push(...quotedResults);

      // Check for negation request on selected symbol
      if (query.toLowerCase().match(/\b(not|negation)\b/)) {
        if (this.context.selectedElements.length === 1) {
          const element = this.context.selectedElements[0];
          const range = ML.getRangeFromElement(element);

          if (range) {
            const latex = this.rootStore.mathStore.expression.slice(range.start, range.end);

            // Check if this is a negatable symbol
            if (negatableSymbols.includes(latex)) {
              const negatedLatex = `\\not ${latex}`;

              // Add negated version as top result
              allResults.push({
                latex: negatedLatex,
                name: `Not ${latex}`,
                keywords: ['not', 'negation'],
                category: 'Negation',
                type: 'negation',
                score: 200, // Very high score to appear at top
                originalLatex: latex
              });
            }
          }
        }
      }

      // Search existing symbols
      const symbolResults = this.searchExistingSymbols(query);
      allResults.push(...symbolResults);

      // Try pattern recognition for generated templates
      const matrixResults = this.recognizeMatrixPattern(query);
      allResults.push(...matrixResults);

      const commentResults = this.recognizeCommentPattern(query);
      allResults.push(...commentResults);

      const unitFormattingResults = this.recognizeUnitFormattingPattern(query);
      allResults.push(...unitFormattingResults);
    }

    // Sort by score (highest first) and limit results
    this.results = allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20); // Limit to 20 results
  }

  getRecentSymbols() {
    // Get recent symbols from SymbolStore
    const recentSymbols = this.rootStore.symbolStore.recentSymbols || [];
    return recentSymbols.slice(0, 10).map(symbol => ({
      ...symbol,
      type: 'symbol',
      isVariant: false,
      score: 50
    }));
  }

  findOriginalSymbol(latex) {

    // '\not \geq' and '\not\geq' normalizing
    const normalizeLatex = (str) => str.replace(/\s+(?=\\)/g, '').trim();

    const normalizedInput = normalizeLatex(latex);

    for (const tab of symbolData.tabs) {
      for (const category of tab.categories) {
        for (const symbol of category.symbols) {
          const normalizedSymbol = normalizeLatex(symbol.latex);
          if (normalizedSymbol === normalizedInput) {
            return symbol;
          }

          if (symbol.variants && symbol.variants.length > 0) {
            for (const variant of symbol.variants) {
              const normalizedVariant = normalizeLatex(variant.latex);
              if (normalizedVariant === normalizedInput) {
                return symbol;
              }
            }
          }
        }
      }
    }
    return null;
  }

}
