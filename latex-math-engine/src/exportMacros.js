import { Token } from "./Token";
import MacroExpander from './MacroExpander';
import { noLimitOps, limitOps, specialLimitOps, mkernDecompositions } from "./data/mappings.js";

const exportMacros = {};

// Helper: add to export macro object
function defineExportMacro(name, body) {
  exportMacros[name] = body;
}

defineExportMacro("\\mkern", function(context) {
  const args = context.consumeArgs(1);
  const argTokens = args[0];

  // Tokens come in reverse order → fix
  const value = argTokens.slice().reverse().map(t => t.text).join("");

  const match = value.match(/^(-?\d+(?:\.\d+)?)mu$/);
  if (!match) {
    return { tokens: [new Token(`\\mkern${value}`)], numArgs: 0 };
  }

  const next = context.future().text;
  const needsSpace = next && !['}', ']', " ", "EOF"].includes(next);
  const space = needsSpace ? " " : "";

  const num = parseFloat(match[1]);

  // Rule 1: non-integers → keep as mkern
  if (!Number.isInteger(num)) {
    return { tokens: [new Token(`\\mkern${num}mu${space}`)], numArgs: 0 };
  }

  // Rule 2: ≤ 2 or negative → keep as mkern
  if (num <= 2) {
    return { tokens: [new Token(`\\mkern${num}mu${space}`)], numArgs: 0 };
  }

  // Rule 3: 3..36 → use lookup if available
  if (num >= 3 && num <= 36) {
    const macros = mkernDecompositions[num];
    if (macros) {
      return { tokens: macros.map(m => new Token(m)), numArgs: 0 };
    }
  }

  // Rule 4: >36 → fallback to mkern
  return { tokens: [new Token(`\\mkern${num}mu${space}`)], numArgs: 0 };
});

// Reverse sets
const noLimitSet = new Set(noLimitOps);
const limitSet = new Set(limitOps);

defineExportMacro("\\operatorname@", function(context) {
  const args = context.consumeArgs(1);
  const raw = args[0].slice().reverse().map(t => t.text).join("");
  const key = raw.replace(/\s+/g, "");

  if (noLimitSet.has(key)) {
    return { tokens: [new Token("\\" + key)], numArgs: 0 };
  }
  return { tokens: [new Token(`\\operatorname{${raw}}`)], numArgs: 0 };
});

defineExportMacro("\\operatornamewithlimits", function(context) {
  const args = context.consumeArgs(1);
  const raw = args[0].slice().reverse().map(t => t.text).join("");

  // Normalize KaTeX’s internal spacing (\mkern{3mu}) and regular TeX spacing (\,)
  const key = raw
    .replace(/\\mkern\{3mu\}/g, "")
    .replace(/\\,/g, "")
    .replace(/\s+/g, "");

  // Special ops first
  for (const [name, body] of Object.entries(specialLimitOps)) {
    const bodyKey = body
      .replace(/\\mkern\{3mu\}/g, "")
      .replace(/\\,/g, "")
      .replace(/\s+/g, "");

    if (key === bodyKey) {
      return { tokens: [new Token("\\" + name)], numArgs: 0 };
    }
  }

  // Regular limit ops
  if (limitSet.has(key)) {
    return { tokens: [new Token("\\" + key)], numArgs: 0 };
  }

  // Default fallback
  return { tokens: [new Token(`\\operatorname*{${raw}}`)], numArgs: 0 };
});

defineExportMacro("\\@char", function(context) {
  const args = context.consumeArgs(1);
  const argTokens = args[0];
  const raw = argTokens.slice().reverse().map(t => t.text).join("");

  // raw will be the decimal string inside {}
  return { tokens: [new Token(`\\char${raw}`)], numArgs: 0 };
});

defineExportMacro("\\mathrel", function(context) {
  const args = context.consumeArgs(1);
  const raw = args[0].slice().reverse().map(t => t.text).join("");

  if (raw === "|") {
    return { tokens: [new Token("\\mid")], numArgs: 0 };
  }

  return { tokens: [new Token(`\\mathrel{${raw}}`)], numArgs: 0 };
});

function defineScriptExportMacro(symbol, { handlePrimes = false } = {}) {
    defineExportMacro(symbol, function (context) {
        const args = context.consumeArgs(1);
        const body = args[0].slice().reverse(); // restore natural order
        const contentRaw = body.map(t => t.text).join("");

        const inner = new MacroExpander(
          contentRaw,
          context.settings,
          context.mode,
          exportMacros
        );

        const expandedTokens = [];
        while (true) {
          const tok = inner.expandNextToken();
          if (tok.text === "EOF") break;
          expandedTokens.push(tok);
        }

        const content = expandedTokens.map(t => t.text).join("");

        if (expandedTokens.length === 0) {
          return { tokens: [], numArgs: 0 };
        }

        // Superscript special case: pure primes → apostrophes
        if (handlePrimes && expandedTokens.every(t => t.text === "\\prime")) {
            const apostrophes = "'".repeat(expandedTokens.length);
            return { tokens: [new Token(apostrophes)], numArgs: 0 };
        }

        // Single-token unwrap.
        // Be conservative: only unwrap plain tokens.
        // Control sequences sometimes allow unwrapping (e.g. \pi) but not always,
        // so we keep braces whenever the token starts with "\".
        if (expandedTokens.length === 1) {
            const t = expandedTokens[0].text;

            // If this is a control sequence (starts with \), KEEP braces
            if (t.startsWith("\\")) {
                return { tokens: [new Token(symbol + "{" + content + "}")], numArgs: 0 };
            }

            // Otherwise unwrap
            return { tokens: [new Token(symbol + content)], numArgs: 0 };
        }

        // Otherwise, wrap everything: ^{...} or _{...}
        return { tokens: [new Token(symbol + "{" + content + "}")], numArgs: 0 };
    });
}

// Initialize both
defineScriptExportMacro("^", { handlePrimes: true });
defineScriptExportMacro("_");

export default exportMacros;
