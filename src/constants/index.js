
export const POS_CHAR = "ꙮ";
export const ARG_ID_CHAR = "ᚖ";
export const FILLER_CHAR = "ꝍ";
export const PLACEHOLDER_CHAR = "Ꞩ";

// Browser detection for Chromium-specific fixes
export const IS_CHROMIUM = CSS?.supports?.(
  [
    "(-webkit-appearance: none)",
    "and (not (-webkit-nbsp-mode: space))",
    "and (not (-moz-appearance: none))",
  ].join(" ")
) ?? false;

// Apply Chromium-specific delimiter positioning fix
export function applyChromiumDelimiterFix(element) {
  if (!IS_CHROMIUM || !element) return;

  const delimiters = element.querySelectorAll(
    'mo[data-delim="["][fence="true"][form="prefix"], ' +
    'mo[data-delim="("][fence="true"][form="prefix"]'
  );

  delimiters.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const isTall = rect.height > 52;

    if (isTall) {
      el.style.transform = 'translateX(-3px)';
    } else {
      el.style.transform = '';
    }
  });
}

export const LAYOUT_MODE_OPTIONS = [
  { type: null, label: 'Default', description: 'Uses the layout style determined by context' },
  { type: '\\displaystyle', label: 'Display', description: 'Forces display-style layout' },
  { type: '\\textstyle', label: 'Inline', description: 'Forces text-style layout' },
  { type: '\\scriptstyle', label: 'Small', description: 'Forces script-style layout' },
  { type: '\\scriptscriptstyle', label: 'Tiny', description: 'Forces scriptscript-style layout' },
];

export const TEXT_COMMANDS = new Set([
  "\\text", "\\textrm", "\\textsf", "\\texttt", "\\textnormal",
  "\\textbf", "\\textmd",
  "\\textit", "\\textup", "\\emph",
]);

export const TEXT_COMMAND_OPTIONS = [
  { label: "Serif", command: "\\textrm" },
  { label: "Sans Serif", command: "\\textsf" },
  { label: "Monospace", command: "\\texttt" },
  { label: "Bold", command: "\\textbf" },
  { label: "Italic", command: "\\textit" },
  { label: "Emphasize", command: "\\emph" },
  { label: "Normal", command: "\\textnormal" },
  { label: "Upright", command: "\\textup" },
  { label: "Medium", command: "\\textmd" },
];

export const KNOWN_FUNCS = new Set([
  "arcsin","arccos","arctan",
  "sin","cos","tan",
  "ln","log","exp","arg",
  "max","min","sup","inf",
  "det","lim","deg","dim"
]);


export const ARROW_CHARS = new Set([
  '←', '→', '↔', '⇐', '⇒', '⇔',
  '⟵', '⟶', '⟷', '⟸', '⟹', '⟺',
  '↦', '↼', '↽', '⇀', '⇁'
]);

export const ARROW_MAPPINGS = {
  // Basic arrows
  "\\leftarrow": "\\xleftarrow",
  "\\rightarrow": "\\xrightarrow",
  "\\leftrightarrow": "\\xleftrightarrow",

  // Double arrows
  "\\Leftarrow": "\\xLeftarrow",
  "\\Rightarrow": "\\xRightarrow",
  "\\Leftrightarrow": "\\xLeftrightarrow",

  // Long arrows
  "\\longleftarrow": "\\xleftarrow",
  "\\longrightarrow": "\\xrightarrow",
  "\\longleftrightarrow": "\\xleftrightarrow",
  "\\Longleftarrow": "\\xLeftarrow",
  "\\Longrightarrow": "\\xRightarrow",
  "\\Longleftrightarrow": "\\xLeftrightarrow",

  // Special arrows
  "\\mapsto": "\\xmapsto",
  "\\leftharpoonup": "\\xleftharpoonup",
  "\\leftharpoondown": "\\xleftharpoondown",
  "\\rightharpoonup": "\\xrightharpoonup",
  "\\rightharpoondown": "\\xrightharpoondown",
};

// Reverse mapping for collapsing
export const REVERSE_ARROW_MAPPINGS = {
  "\\xleftarrow": "\\leftarrow",
  "\\xrightarrow": "\\rightarrow",
  "\\xleftrightarrow": "\\leftrightarrow",
  "\\xLeftarrow": "\\Leftarrow",
  "\\xRightarrow": "\\Rightarrow",
  "\\xLeftrightarrow": "\\Leftrightarrow",
  "\\xmapsto": "\\mapsto",
  "\\xleftharpoonup": "\\leftharpoonup",
  "\\xleftharpoondown": "\\leftharpoondown",
  "\\xrightharpoonup": "\\rightharpoonup",
  "\\xrightharpoondown": "\\rightharpoondown",
};

// Font command definitions with mappings between LaTeX commands and font properties
export const FONT_COMMAND_DEFINITIONS = [
  { command: '\\mathrm', font: 'normal', cssProperty: 'normal' },
  { command: '\\mathit', font: 'italic', cssProperty: 'italic' },
  { command: '\\mathbf', font: 'bold', cssProperty: 'bold' },
  { command: '\\boldsymbol', font: 'bold', cssProperty: 'bold' },
  { command: '\\mathsf', font: 'sans-serif', cssProperty: 'sans-serif' },
  { command: '\\mathtt', font: 'monospace', cssProperty: 'monospace' },
  { command: '\\mathbb', font: 'double-struck', cssProperty: 'double-struck' },
  { command: '\\mathfrak', font: 'fraktur', cssProperty: 'fraktur' },
  { command: '\\mathcal', font: 'script', cssProperty: 'script' },
];

// UI labels for font commands, separated from business logic
export const FONT_COMMAND_LABELS = {
  '\\mathrm': 'Upright',
  '\\mathit': 'Italic',
  '\\mathbf': 'Bold Upright',
  '\\boldsymbol': 'Bold Italic',
  '\\mathsf': 'Sans Serif',
  '\\mathtt': 'Monospace',
  '\\mathbb': 'Blackboard',
  '\\mathfrak': 'Fraktur',
  '\\mathcal': 'Calligraphic',
};

export const VALID_LOWER_FONTS = [
  '\\mathrm', '\\mathit', '\\boldsymbol',
  '\\mathbf', '\\mathsf', '\\mathtt',
  '\\mathfrak'
];

export const VALID_NUMBER_FONTS = [
  '\\mathrm', '\\mathit', '\\mathbf',
  '\\mathsf', '\\mathtt', '\\mathfrak'
];

export const VALID_OTHER_FONTS = [
  '\\mathrm', '\\mathit', '\\boldsymbol',
  '\\mathbf'
];

// Delimiter size options for delimiters and font sizing
export const DELIMITER_SIZE_OPTIONS = [
  { label: 'S', command: '' },
  { label: 'M', command: '\\big' },
  { label: 'L', command: '\\Big' },
  { label: 'XL', command: '\\bigg' },
  { label: 'XXL', command: '\\Bigg' },
];

export const ACCENT_MAP = {
  // Accents
  0x005E: "hat", 0x02C6: "hat", 0x0302: "hat",
  0x007E: "tilde", 0x02DC: "tilde", 0x0303: "tilde",
  0x203E: "overline", 0x00AF: "overline", 0x0305: "overline", 0x02C9: "bar",
  0x0332: "underline",
  0x02D9: "dot",
  0x00A8: "double dot",
  0x02C7: "check",
  0x02CA: "acute",
  0x02CB: "grave",
  0x02D8: "breve",
  0x20D7: "vector",

  // Stretchies
  0x23DE: "overbrace",
  0x23DF: "underbrace",
  0x23DC: "overparen",
  0x23DD: "underparen",

  // Arrows (over/under)
  0x2190: "arrow",
  0x2192: "arrow",
  0x2194: "arrow",
  0x21D0: "arrow",
  0x21D2: "arrow",
  0x21D4: "arrow",
  0x21A6: "mapping",
  0x21BC: "harpoon",
  0x21BD: "harpoon",
  0x21C0: "harpoon",
  0x21C1: "harpoon",
};
